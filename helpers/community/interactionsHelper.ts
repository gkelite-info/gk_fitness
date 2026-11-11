import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { fetchBlockedUsers } from './blockCache';
import { sendCommunityPushNotification } from '@/lib/services/notificationService';

export async function toggleLike(postId: string, userId: string) {
  try {
    console.log('[interactionsHelper] toggleLike called:', { postId, userId });
    
    const { data: existingLikes, error: fetchError } = await supabase
      .from('gym_community_likes')
      .select('*')
      .eq('gymCommunityPostId', postId)
      .eq('likedBy', userId)
      .order('createdAt', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('[interactionsHelper] toggleLike fetch existing error:', fetchError);
      throw fetchError;
    }

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;
    console.log('[interactionsHelper] toggleLike existing record:', existingLike);

    let isLiking = false;

    if (existingLike) {
      if (existingLike.is_deleted) {
        // Restore like
        console.log('[interactionsHelper] Restoring soft-deleted like...');
        const { error: updateError } = await supabase
          .from('gym_community_likes')
          .update({ is_deleted: false, updatedAt: new Date().toISOString(), deletedAt: null })
          .eq('gymCommunityLikesId', existingLike.gymCommunityLikesId);

        if (updateError) {
          console.error('[interactionsHelper] toggleLike restore error:', updateError);
          throw updateError;
        }
        isLiking = true;
      } else {
        // Remove like
        console.log('[interactionsHelper] Soft-deleting like...');
        const { error: updateError } = await supabase
          .from('gym_community_likes')
          .update({ is_deleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .eq('gymCommunityLikesId', existingLike.gymCommunityLikesId);

        if (updateError) {
          console.error('[interactionsHelper] toggleLike soft-delete error:', updateError);
          throw updateError;
        }
        isLiking = false;
      }
    } else {
      // Create new like
      console.log('[interactionsHelper] Creating brand new like...');
      const newLike = {
        gymCommunityLikesId: Crypto.randomUUID(),
        gymCommunityPostId: postId,
        likedBy: userId,
        is_deleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('gym_community_likes')
        .insert([newLike]);

      if (insertError) {
        console.error('[interactionsHelper] toggleLike insert error:', insertError);
        throw insertError;
      }
      isLiking = true;
    }

    console.log('[interactionsHelper] toggleLike complete! isLiking:', isLiking);

    if (isLiking) {
      // Trigger community notification in background (non-blocking)
      (async () => {
        try {
          const { data: post } = await supabase
            .from('gym_community_posts')
            .select('createdBy, imagePath')
            .eq('gymCommunityPostId', postId)
            .maybeSingle();

          if (post?.createdBy && post.createdBy !== userId) {
            await sendCommunityPushNotification({
              targetUserId: post.createdBy,
              actorUserId: userId,
              type: 'like',
              postId,
              postImage: post.imagePath,
            });
          }
        } catch (notifErr) {
          console.warn('[toggleLike] Notification dispatch error:', notifErr);
        }
      })();
    }

    return { isLiking };
  } catch (error) {
    console.error('[interactionsHelper] toggleLike Error:', error);
    throw error;
  }
}

export async function toggleSave(postId: string, userId: string): Promise<{ isSaving: boolean }> {
  try {
    console.log('[interactionsHelper] toggleSave called:', { postId, userId });
    const { data: existingSaves, error: fetchError } = await supabase
      .from('gym_community_saves')
      .select('*')
      .eq('gymCommunityPostId', postId)
      .eq('savedBy', userId)
      .order('createdAt', { ascending: false });

    if (fetchError) {
      console.error('[interactionsHelper] toggleSave fetch error:', fetchError);
      throw fetchError;
    }

    let isSaving = false;
    const activeSave = existingSaves?.find((s: any) => !s.is_deleted);

    if (activeSave) {
      // Post is currently saved -> unsave it (soft-delete)
      const { error: updateError } = await supabase
        .from('gym_community_saves')
        .update({ is_deleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .eq('gymCommunityPostId', postId)
        .eq('savedBy', userId);
      if (updateError) throw updateError;
      isSaving = false;
    } else if (existingSaves && existingSaves.length > 0) {
      // Row exists but is soft-deleted -> reactivate the latest save
      const targetId = existingSaves[0].gymCommunitySaveId;
      const { error: updateError } = await supabase
        .from('gym_community_saves')
        .update({ is_deleted: false, updatedAt: new Date().toISOString(), deletedAt: null })
        .eq('gymCommunitySaveId', targetId);
      if (updateError) throw updateError;
      isSaving = true;
    } else {
      // No save row exists yet -> insert new save
      const newSave = {
        gymCommunitySaveId: Crypto.randomUUID(),
        gymCommunityPostId: postId,
        savedBy: userId,
        is_deleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const { error: insertError } = await supabase
        .from('gym_community_saves')
        .insert([newSave]);
      if (insertError) throw insertError;
      isSaving = true;
    }

    console.log('[interactionsHelper] toggleSave complete! isSaving:', isSaving);
    return { isSaving };
  } catch (error) {
    console.error('[interactionsHelper] toggleSave Error:', error);
    throw error;
  }
}

export async function fetchComments(postId: string, currentUserId: string, sortBy: 'newest' | 'oldest' = 'oldest') {
  try {
    console.log('[interactionsHelper] fetchComments called:', { postId, currentUserId, sortBy });
    // 1. Fetch blocked users (both ways)
    const blockedUserIds = await fetchBlockedUsers(currentUserId);

    let query = supabase
      .from('gym_community_comments')
      .select(`
        *,
        users!gym_community_comments_authorId_fkey (name, role, profilePhoto)
      `)
      .eq('gymCommunityPostId', postId)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: sortBy === 'oldest' });

    if (blockedUserIds.length > 0) {
      query = query.not('authorId', 'in', `(${blockedUserIds.join(',')})`);
    }

    let { data, error } = await query;

    // Fallback if explicit fkey join fails
    if (error) {
      console.warn('[interactionsHelper] fetchComments join failed, trying fallback query:', error);
      let fallbackQuery = supabase
        .from('gym_community_comments')
        .select('*')
        .eq('gymCommunityPostId', postId)
        .eq('is_deleted', false)
        .order('createdAt', { ascending: sortBy === 'oldest' });

      if (blockedUserIds.length > 0) {
        fallbackQuery = fallbackQuery.not('authorId', 'in', `(${blockedUserIds.join(',')})`);
      }

      const { data: rawComments, error: rawError } = await fallbackQuery;
      if (rawError) {
        console.error('[interactionsHelper] fetchComments fallback query error:', rawError);
        throw rawError;
      }

      // Fetch user info for authors
      const authorIds = Array.from(new Set((rawComments || []).map((c: any) => c.authorId).filter(Boolean)));
      const userMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: userData } = await supabase
          .from('users')
          .select('userId, name, role, profilePhoto')
          .in('userId', authorIds);

        (userData || []).forEach((u: any) => {
          userMap[u.userId] = u;
        });
      }

      data = (rawComments || []).map((c: any) => ({
        ...c,
        users: userMap[c.authorId] || { name: 'User', role: 'customer', profilePhoto: null }
      }));
    } else {
      data = (data || []).map((comment: any) => ({
        ...comment,
        users: Array.isArray(comment.users) ? comment.users[0] : comment.users
      }));
    }

    console.log('[interactionsHelper] fetchComments resolved count:', data?.length);
    return data;
  } catch (error) {
    console.error('[interactionsHelper] fetchComments Error:', error);
    throw error;
  }
}

export async function addComment(postId: string, userId: string, content: string, parentId?: string) {
  try {
    console.log('[interactionsHelper] addComment started:', { postId, userId, content, parentId });
    const commentId = Crypto.randomUUID();
    const commentRecord = {
      gymCommunityCommentId: commentId,
      gymCommunityPostId: postId,
      authorId: userId,
      parentId: parentId || null,
      content,
      is_deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // First try insert with join
    let insertedComment: any = null;
    const { data, error } = await supabase
      .from('gym_community_comments')
      .insert([commentRecord])
      .select(`*, users!gym_community_comments_authorId_fkey (name, role, profilePhoto)`)
      .maybeSingle();

    if (error || !data) {
      console.warn('[interactionsHelper] addComment with join select failed, falling back to plain insert:', error);
      const { data: plainData, error: plainError } = await supabase
        .from('gym_community_comments')
        .insert([commentRecord])
        .select()
        .single();

      if (plainError) {
        console.error('[interactionsHelper] addComment plain insert error:', plainError);
        throw plainError;
      }

      // Fetch user profile info
      const { data: authorData } = await supabase
        .from('users')
        .select('name, role, profilePhoto')
        .eq('userId', userId)
        .maybeSingle();

      insertedComment = {
        ...plainData,
        users: authorData || { name: 'User', role: 'customer', profilePhoto: null }
      };
    } else {
      insertedComment = {
        ...data,
        users: Array.isArray(data.users) ? data.users[0] : data.users
      };
    }

    console.log('[interactionsHelper] addComment SUCCESS:', insertedComment);

    // Trigger community notification in background (non-blocking)
    (async () => {
      try {
        if (parentId) {
          // Reply to a comment: notify parent comment author
          const { data: parentComment } = await supabase
            .from('gym_community_comments')
            .select('authorId')
            .eq('gymCommunityCommentId', parentId)
            .maybeSingle();

          if (parentComment?.authorId && parentComment.authorId !== userId) {
            await sendCommunityPushNotification({
              targetUserId: parentComment.authorId,
              actorUserId: userId,
              type: 'reply',
              postId,
              commentId: insertedComment.gymCommunityCommentId,
              commentText: content,
            });
          }
        } else {
          // Top-level comment: notify post creator
          const { data: post } = await supabase
            .from('gym_community_posts')
            .select('createdBy, imagePath')
            .eq('gymCommunityPostId', postId)
            .maybeSingle();

          if (post?.createdBy && post.createdBy !== userId) {
            await sendCommunityPushNotification({
              targetUserId: post.createdBy,
              actorUserId: userId,
              type: 'comment',
              postId,
              postImage: post.imagePath,
              commentId: insertedComment.gymCommunityCommentId,
              commentText: content,
            });
          }
        }
      } catch (notifErr) {
        console.warn('[addComment] Notification dispatch error:', notifErr);
      }
    })();

    return insertedComment;
  } catch (error) {
    console.error('[interactionsHelper] addComment Error:', error);
    throw error;
  }
}

export async function deleteComment(commentId: string, userId: string, role?: string) {
  try {
    console.log('[interactionsHelper] deleteComment started:', { commentId, userId, role });
    let query = supabase
      .from('gym_community_comments')
      .update({ is_deleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq('gymCommunityCommentId', commentId);
      
    if (role !== 'superadmin') {
      query = query.eq('authorId', userId);
    }
    
    const { error } = await query;

    if (error) {
      console.error('[interactionsHelper] deleteComment error:', error);
      throw error;
    }
    console.log('[interactionsHelper] deleteComment SUCCESS');
    return true;
  } catch (error) {
    console.error('[interactionsHelper] deleteComment Error:', error);
    throw error;
  }
}
