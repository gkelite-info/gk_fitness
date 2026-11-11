import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { base64ToArrayBuffer, compressImage } from '@/components/imageCompressor';

export interface CommunityPost {
  gymCommunityPostId: string;
  gymId: string;
  caption: string;
  imagePath: string | null;
  createdBy: string;
  createdAt: string;
  users: {
    name: string;
    role: string;
    profilePhoto?: string | null;
  };
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  isSavedByMe: boolean;
}

export function resolveCommunityPostImageUrl(
  imagePath?: string | null,
  gymId?: string | null,
  createdBy?: string | null
): string | null {
  if (!imagePath) return null;
  const trimmed = imagePath.trim();
  if (!trimmed) return null;

  // 1. If it's already a full HTTP/HTTPS URL (legacy posts)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 2. If it contains a folder path already (e.g. "uuid/file.jpg" or "global/...")
  if (trimmed.includes('/')) {
    const { data } = supabase.storage.from('community-posts').getPublicUrl(trimmed);
    return data?.publicUrl || trimmed;
  }

  // 3. If it's just the filename (e.g. "e71dccd2-901b-4be3-8fb4-deeffc02e862.jpg"):
  // Stored under gymId if gym post, or createdBy if individual/global post
  const folder = gymId || createdBy;
  const storagePath = folder ? `${folder}/${trimmed}` : trimmed;
  const { data } = supabase.storage.from('community-posts').getPublicUrl(storagePath);
  return data?.publicUrl || trimmed;
}

export async function fetchCommunityPosts(
  gymId: string | null, 
  currentUserId: string, 
  page = 0, 
  limit = 10,
  role?: string | null
) {
  try {
    console.log('[communityHelper] fetchCommunityPosts request:', { gymId, currentUserId, page, limit, role });
    
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase().replace(/[\s_-]/g, '') : '';
    const isGlobalOnlyRole = normalizedRole === 'individual' || normalizedRole === 'globaltrainer';
    const isCustomerRole = normalizedRole === 'customer';

    let rawData: any[] = [];
    let rpcSucceeded = false;

    try {
      const { data, error } = await supabase.rpc('get_community_feed', {
        p_gym_id: isGlobalOnlyRole ? null : (gymId ?? null),
        p_user_id: currentUserId,
        p_offset: page * limit,
        p_limit: limit
      });

      if (!error && Array.isArray(data)) {
        rawData = data;
        rpcSucceeded = true;
        console.log('[communityHelper] fetchCommunityPosts RPC returned count:', data.length);
      } else if (error) {
        console.warn('[communityHelper] fetchCommunityPosts RPC returned error, using direct table fallback:', error);
      }
    } catch (rpcErr) {
      console.warn('[communityHelper] fetchCommunityPosts RPC exception, using direct table fallback:', rpcErr);
    }

    // Direct table fallback if RPC failed or returned empty
    if (!rpcSucceeded || rawData.length === 0) {
      console.log('[communityHelper] Fetching posts directly from gym_community_posts table...');
      let query = supabase
        .from('gym_community_posts')
        .select(`
          gymCommunityPostId,
          gymId,
          caption,
          imagePath,
          createdBy,
          createdAt,
          users:createdBy (
            name,
            role,
            profilePhoto
          )
        `)
        .eq('is_deleted', false)
        .order('createdAt', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (isGlobalOnlyRole) {
        query = query.is('gymId', null);
      } else if (isCustomerRole && gymId) {
        query = query.eq('gymId', gymId);
      } else if (gymId) {
        query = query.or(`gymId.eq.${gymId},gymId.is.null`);
      }

      const { data: directData, error: directErr } = await query;
      let directPosts = (!directErr && Array.isArray(directData) && directData.length > 0) ? directData : null;

      if (!directPosts && isGlobalOnlyRole) {
        // If there are no null gymId posts in the table yet, query all posts so the feed is not blank
        const { data: allDirect } = await supabase
          .from('gym_community_posts')
          .select(`
            gymCommunityPostId,
            gymId,
            caption,
            imagePath,
            createdBy,
            createdAt,
            users:createdBy (
              name,
              role,
              profilePhoto
            )
          `)
          .eq('is_deleted', false)
          .order('createdAt', { ascending: false })
          .range(page * limit, (page + 1) * limit - 1);

        if (allDirect && allDirect.length > 0) {
          directPosts = allDirect;
        }
      }

      if (directPosts && directPosts.length > 0) {
        const postIds = directPosts.map((d: any) => d.gymCommunityPostId);

        // Fetch real likes dynamically for these posts
        const { data: likesRows } = await supabase
          .from('gym_community_likes')
          .select('gymCommunityPostId, likedBy')
          .in('gymCommunityPostId', postIds)
          .eq('is_deleted', false);

        // Fetch real comments dynamically for these posts
        const { data: commentsRows } = await supabase
          .from('gym_community_comments')
          .select('gymCommunityPostId')
          .in('gymCommunityPostId', postIds)
          .eq('is_deleted', false);

        // Fetch real saves dynamically for current user
        const { data: savesRows } = currentUserId
          ? await supabase
              .from('gym_community_saves')
              .select('gymCommunityPostId, is_deleted')
              .in('gymCommunityPostId', postIds)
              .eq('savedBy', currentUserId)
              .or('is_deleted.eq.false,is_deleted.is.null')
          : { data: [] };

        const likesList = likesRows || [];
        const commentsList = commentsRows || [];
        const savesList = savesRows || [];

        rawData = directPosts.map((post: any) => {
          const postLikes = likesList.filter((l: any) => l.gymCommunityPostId === post.gymCommunityPostId);
          const postComments = commentsList.filter((c: any) => c.gymCommunityPostId === post.gymCommunityPostId);
          const isLiked = postLikes.some((l: any) => l.likedBy === currentUserId);
          const isSaved = savesList.some((s: any) => s.gymCommunityPostId === post.gymCommunityPostId && !s.is_deleted);

          return {
            gymCommunityPostId: post.gymCommunityPostId,
            gymId: post.gymId,
            caption: post.caption,
            imagePath: post.imagePath,
            createdBy: post.createdBy,
            createdAt: post.createdAt,
            author_name: post.users?.name,
            author_role: post.users?.role,
            author_photo: post.users?.profilePhoto,
            likes_count: postLikes.length,
            comments_count: postComments.length,
            is_liked_by_me: isLiked,
            is_saved_by_me: isSaved,
          };
        });
      }
    }

    console.log('[communityHelper] Final rawData count before formatting:', rawData.length);

    // If global only role, filter for null gymId posts if any exist
    if (isGlobalOnlyRole && rawData.length > 0) {
      const globalOnly = rawData.filter((post: any) => !post.gymId);
      if (globalOnly.length > 0) {
        rawData = globalOnly;
      }
    } else if (isCustomerRole && gymId && rawData.length > 0) {
      // Customer must ONLY see posts belonging to their gym, never null gymId individual posts
      rawData = rawData.filter((post: any) => post.gymId === gymId);
    }

    const formattedPosts: CommunityPost[] = rawData.map((post: any) => ({
      gymCommunityPostId: post.gymCommunityPostId,
      gymId: post.gymId,
      caption: post.caption,
      imagePath: resolveCommunityPostImageUrl(post.imagePath, post.gymId, post.createdBy),
      createdBy: post.createdBy,
      createdAt: post.createdAt,
      users: {
        name: post.author_name || post.users?.name || 'User',
        role: post.author_role || post.users?.role || 'Member',
        profilePhoto: post.author_photo || post.users?.profilePhoto || null
      },
      likesCount: Number(post.likes_count ?? post.likesCount) || 0,
      commentsCount: Number(post.comments_count ?? post.commentsCount) || 0,
      isLikedByMe: Boolean(post.is_liked_by_me ?? post.isLikedByMe ?? false),
      isSavedByMe: Boolean(post.is_saved_by_me ?? post.isSavedByMe ?? false),
    }));

    return formattedPosts;
  } catch (error) {
    console.error('[communityHelper] fetchCommunityPosts Error:', error);
    return [];
  }
}

export async function createCommunityPost(
  gymId: string | null, 
  createdBy: string, 
  caption: string, 
  imageUri?: string | null
) {
  try {
    console.log('[communityHelper] createCommunityPost started:', { gymId, createdBy, caption, hasImage: !!imageUri });
    const postId = Crypto.randomUUID();
    let imagePath = null;

    if (imageUri) {
      let finalUri = imageUri;
      try {
        console.log('[communityHelper] Ensuring image is compressed:', imageUri);
        const compressed = await compressImage(imageUri, { maxWidth: 1200, compress: 0.7 });
        finalUri = compressed.uri;
      } catch (compressErr) {
        console.warn('[communityHelper] Compression warning, using provided URI:', compressErr);
      }

      const base64 = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
      const arrayBuffer = base64ToArrayBuffer(base64);
      const ext = finalUri.split('.').pop()?.toLowerCase() || 'jpg';
      const imageFileName = `${postId}.${ext}`;

      // Determine folder: for gym users use gymId; for individuals use createdBy (both are valid UUIDs)
      const folder = gymId || createdBy;
      const candidatePaths = [
        folder ? `${folder}/${imageFileName}` : imageFileName,
        imageFileName,
        `global/${imageFileName}`
      ];

      let uploadSuccess = false;
      let uploadError: any = null;
      let finalStoragePath = '';

      for (const candidatePath of candidatePaths) {
        if (!candidatePath) continue;
        console.log('[communityHelper] Trying upload to path:', candidatePath);
        const { error } = await supabase.storage
          .from('community-posts')
          .upload(candidatePath, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

        if (!error) {
          uploadSuccess = true;
          finalStoragePath = candidatePath;
          console.log('[communityHelper] Upload succeeded at path:', finalStoragePath);
          break;
        } else {
          console.warn('[communityHelper] Upload attempt failed for', candidatePath, ':', error.message);
          uploadError = error;
        }
      }

      if (!uploadSuccess) {
        console.error('[communityHelper] All upload attempts failed:', uploadError);
        throw uploadError;
      }

      // Save only the filename e.g. "e71dccd2-901b-4be3-8fb4-deeffc02e862.jpg" into the database column
      imagePath = imageFileName;
      console.log('[communityHelper] Storing relative imagePath in column:', imagePath);
    }

    const newPost = {
      gymCommunityPostId: postId,
      gymId,
      createdBy,
      caption,
      imagePath,
      is_deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('[communityHelper] Inserting post into gym_community_posts:', newPost);
    const { data, error } = await supabase
      .from('gym_community_posts')
      .insert([newPost])
      .select()
      .single();

    if (error) {
      console.error('[communityHelper] Insert post error:', error);
      throw error;
    }

    console.log('[communityHelper] Post inserted successfully:', data);
    return data;
  } catch (error) {
    console.error('[communityHelper] createCommunityPost Error:', error);
    throw error;
  }
}

export async function deleteCommunityPost(postId: string, userId: string, role?: string) {
  try {
    console.log('[communityHelper] deleteCommunityPost started:', { postId, userId, role });

    // 1. Try RPC delete_community_post (runs with SECURITY DEFINER to bypass any restrictive RLS)
    try {
      const { data: rpcSuccess, error: rpcError } = await supabase.rpc('delete_community_post', {
        p_post_id: postId,
        p_user_id: role === 'superadmin' ? null : userId
      });
      if (!rpcError && rpcSuccess) {
        console.log('[communityHelper] deleteCommunityPost succeeded via RPC');
        return true;
      }
      if (rpcError) {
        console.warn('[communityHelper] deleteCommunityPost RPC returned error, trying direct update fallback:', rpcError);
      }
    } catch (rpcErr) {
      console.warn('[communityHelper] deleteCommunityPost RPC exception, trying direct update fallback:', rpcErr);
    }

    // 2. Direct table update fallback
    let query = supabase
      .from('gym_community_posts')
      .update({ 
        is_deleted: true, 
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('gymCommunityPostId', postId);
      
    if (role !== 'superadmin') {
      query = query.eq('createdBy', userId);
    }
    
    const { data: updatedRows, error } = await query.select();

    if (error) {
      console.error('[communityHelper] deleteCommunityPost direct update error:', error);
      throw error;
    }
    console.log('[communityHelper] deleteCommunityPost SUCCESS, rows updated:', updatedRows?.length);
    return true;
  } catch (error) {
    console.error('[communityHelper] deleteCommunityPost Error:', error);
    throw error;
  }
}
