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

export async function fetchCommunityPosts(gymId: string | null, currentUserId: string, page = 0, limit = 10) {
  try {
    const { data, error } = await supabase.rpc('get_community_feed', {
      p_gym_id: gymId,
      p_user_id: currentUserId,
      p_offset: page * limit,
      p_limit: limit
    });

    if (error) throw error;

    const formattedPosts: CommunityPost[] = (data || []).map((post: any) => ({
      gymCommunityPostId: post.gymCommunityPostId,
      gymId: post.gymId,
      caption: post.caption,
      imagePath: post.imagePath,
      createdBy: post.createdBy,
      createdAt: post.createdAt,
      users: {
        name: post.author_name,
        role: post.author_role,
        profilePhoto: post.author_photo
      },
      likesCount: Number(post.likes_count) || 0,
      commentsCount: Number(post.comments_count) || 0,
      isLikedByMe: post.is_liked_by_me || false,
      isSavedByMe: post.is_saved_by_me || false,
    }));

    return formattedPosts;
  } catch (error) {
    console.error('[communityHelper] fetchCommunityPosts Error:', error);
    throw error;
  }
}

export async function createCommunityPost(
  gymId: string | null, 
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
      const baseFolder = gymId ? gymId : 'global';
      const fileName = `${baseFolder}/${postId}.${ext}`;
      
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

export async function deleteCommunityPost(postId: string, userId: string, role?: string) {
  try {
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
    
    const { error } = await query;

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[communityHelper] deleteCommunityPost Error:', error);
    throw error;
  }
}
