import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export async function toggleLike(postId: string, userId: string) {
  try {
    // Check if like exists
    const { data: existingLike } = await supabase
      .from('gym_community_likes')
      .select('*')
      .eq('gymCommunityPostId', postId)
      .eq('likedBy', userId)
      .single();

    if (existingLike) {
      if (existingLike.is_deleted) {
        // Restore like
        await supabase
          .from('gym_community_likes')
          .update({ is_deleted: false, updatedAt: new Date().toISOString(), deletedAt: null })
          .eq('gymCommunityLikesId', existingLike.gymCommunityLikesId);
      } else {
        // Remove like
        await supabase
          .from('gym_community_likes')
          .update({ is_deleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .eq('gymCommunityLikesId', existingLike.gymCommunityLikesId);
      }
    } else {
      // Create new like
      await supabase
        .from('gym_community_likes')
        .insert([{
          gymCommunityLikesId: Crypto.randomUUID(),
          gymCommunityPostId: postId,
          likedBy: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]);
    }
  } catch (error) {
    console.error('[interactionsHelper] toggleLike Error:', error);
    throw error;
  }
}

export async function toggleSave(postId: string, userId: string) {
  try {
    const { data: existingSave } = await supabase
      .from('gym_community_saves')
      .select('*')
      .eq('gymCommunityPostId', postId)
      .eq('savedBy', userId)
      .single();

    if (existingSave) {
      if (existingSave.is_deleted) {
        await supabase
          .from('gym_community_saves')
          .update({ is_deleted: false, updatedAt: new Date().toISOString(), deletedAt: null })
          .eq('gymCommunitySaveId', existingSave.gymCommunitySaveId);
      } else {
        await supabase
          .from('gym_community_saves')
          .update({ is_deleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .eq('gymCommunitySaveId', existingSave.gymCommunitySaveId);
      }
    } else {
      await supabase
        .from('gym_community_saves')
        .insert([{
          gymCommunitySaveId: Crypto.randomUUID(),
          gymCommunityPostId: postId,
          savedBy: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]);
    }
  } catch (error) {
    console.error('[interactionsHelper] toggleSave Error:', error);
    throw error;
  }
}

export async function fetchComments(postId: string, currentUserId: string, sortBy: 'newest' | 'oldest' = 'oldest') {
  try {
    // 1. Fetch blocked users
    const [blockedByMe, blockedMe] = await Promise.all([
      supabase.from('gym_community_blocks').select('blockedId').eq('blockerId', currentUserId).eq('is_deleted', false),
      supabase.from('gym_community_blocks').select('blockerId').eq('blockedId', currentUserId).eq('is_deleted', false)
    ]);
    
    const blockedUserIds = [
      ...(blockedByMe.data?.map(d => d.blockedId) || []),
      ...(blockedMe.data?.map(d => d.blockerId) || [])
    ];

    let query = supabase
      .from('gym_community_comments')
      .select(`
        *,
        users!gym_community_comments_authorId_fkey (name, role)
      `)
      .eq('gymCommunityPostId', postId)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: sortBy === 'oldest' });

    if (blockedUserIds.length > 0) {
      query = query.not('authorId', 'in', `(${blockedUserIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map((comment: any) => ({
      ...comment,
      users: Array.isArray(comment.users) ? comment.users[0] : comment.users
    }));
  } catch (error) {
    console.error('[interactionsHelper] fetchComments Error:', error);
    throw error;
  }
}

export async function addComment(postId: string, userId: string, content: string, parentId?: string) {
  try {
    const { data, error } = await supabase
      .from('gym_community_comments')
      .insert([{
        gymCommunityCommentId: Crypto.randomUUID(),
        gymCommunityPostId: postId,
        authorId: userId,
        parentId: parentId || null,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select(`*, users!gym_community_comments_authorId_fkey (name, role)`)
      .single();

    if (error) throw error;
    return {
      ...data,
      users: Array.isArray(data.users) ? data.users[0] : data.users
    };
  } catch (error) {
    console.error('[interactionsHelper] addComment Error:', error);
    throw error;
  }
}

export async function deleteComment(commentId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('gym_community_comments')
      .update({ is_deleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq('gymCommunityCommentId', commentId)
      .eq('authorId', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[interactionsHelper] deleteComment Error:', error);
    throw error;
  }
}
