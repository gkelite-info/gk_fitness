import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { base64ToArrayBuffer } from '@/components/imageCompressor';

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

export async function fetchCommunityPosts(gymId: string, currentUserId: string, page = 0, limit = 10) {
  try {
    // 1. Fetch blocked users (both ways) to comply with Apple UGC
    const [blockedByMe, blockedMe] = await Promise.all([
      supabase.from('gym_community_blocks').select('blockedId').eq('blockerId', currentUserId).eq('is_deleted', false),
      supabase.from('gym_community_blocks').select('blockerId').eq('blockedId', currentUserId).eq('is_deleted', false)
    ]);
    
    const blockedUserIds = [
      ...(blockedByMe.data?.map(d => d.blockedId) || []),
      ...(blockedMe.data?.map(d => d.blockerId) || [])
    ];

    // 2. Fetch posts
    let query = supabase
      .from('gym_community_posts')
      .select(`
        *,
        users (name, role, profilePhoto),
        gym_community_likes (likedBy, is_deleted),
        gym_community_comments (gymCommunityCommentId, is_deleted),
        gym_community_saves (savedBy, is_deleted)
      `)
      .eq('gymId', gymId)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (blockedUserIds.length > 0) {
      query = query.not('createdBy', 'in', `(${blockedUserIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 3. Format data
    const formattedPosts: CommunityPost[] = (data || []).map((post: any) => {
      const activeLikes = post.gym_community_likes?.filter((l: any) => !l.is_deleted) || [];
      const activeComments = post.gym_community_comments?.filter((c: any) => !c.is_deleted) || [];
      const activeSaves = post.gym_community_saves?.filter((s: any) => !s.is_deleted) || [];

      return {
        gymCommunityPostId: post.gymCommunityPostId,
        gymId: post.gymId,
        caption: post.caption,
        imagePath: post.imagePath,
        createdBy: post.createdBy,
        createdAt: post.createdAt,
        users: Array.isArray(post.users) ? post.users[0] : post.users,
        likesCount: activeLikes.length,
        commentsCount: activeComments.length,
        isLikedByMe: activeLikes.some((l: any) => l.likedBy === currentUserId),
        isSavedByMe: activeSaves.some((s: any) => s.savedBy === currentUserId),
      };
    });

    return formattedPosts;
  } catch (error) {
    console.error('[communityHelper] fetchCommunityPosts Error:', error);
    throw error;
  }
}

export async function createCommunityPost(
  gymId: string, 
  createdBy: string, 
  caption: string, 
  imageUri?: string | null
) {
  try {
    const postId = Crypto.randomUUID();
    let imagePath = null;

    if (imageUri) {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      const arrayBuffer = base64ToArrayBuffer(base64);
      const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${gymId}/${postId}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('community-posts')
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}` });
        
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage
        .from('community-posts')
        .getPublicUrl(fileName);
        
      imagePath = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('gym_community_posts')
      .insert([{
        gymCommunityPostId: postId,
        gymId,
        createdBy,
        caption,
        imagePath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[communityHelper] createCommunityPost Error:', error);
    throw error;
  }
}

export async function deleteCommunityPost(postId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('gym_community_posts')
      .update({ 
        is_deleted: true, 
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('gymCommunityPostId', postId)
      .eq('createdBy', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[communityHelper] deleteCommunityPost Error:', error);
    throw error;
  }
}
