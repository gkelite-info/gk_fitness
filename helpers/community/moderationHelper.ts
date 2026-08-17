import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export async function blockUser(blockerId: string, blockedId: string) {
  try {
    // Check if already blocked
    const { data: existingBlock } = await supabase
      .from('gym_community_blocks')
      .select('*')
      .eq('blockerId', blockerId)
      .eq('blockedId', blockedId)
      .single();

    if (existingBlock) {
      if (existingBlock.is_deleted) {
        await supabase
          .from('gym_community_blocks')
          .update({ is_deleted: false, updatedAt: new Date().toISOString(), deletedAt: null })
          .eq('gymCommunityBlockId', existingBlock.gymCommunityBlockId);
      }
      return true;
    }

    const { error } = await supabase
      .from('gym_community_blocks')
      .insert([{
        gymCommunityBlockId: Crypto.randomUUID(),
        blockerId,
        blockedId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[moderationHelper] blockUser Error:', error);
    throw error;
  }
}

export async function unblockUser(blockerId: string, blockedId: string) {
  try {
    const { error } = await supabase
      .from('gym_community_blocks')
      .update({ is_deleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq('blockerId', blockerId)
      .eq('blockedId', blockedId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[moderationHelper] unblockUser Error:', error);
    throw error;
  }
}

export async function reportContent(
  reporterId: string,
  reason: string,
  reportedUserId?: string,
  postId?: string,
  commentId?: string
) {
  try {
    const { error } = await supabase
      .from('gym_community_reports')
      .insert([{
        gymCommunityReportId: Crypto.randomUUID(),
        reportedId: reportedUserId || null,
        gymCommunityPostId: postId || null,
        gymCommunityCommentId: commentId || null,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[moderationHelper] reportContent Error:', error);
    throw error;
  }
}

export async function fetchBlocklist(blockerId: string) {
  try {
    const { data, error } = await supabase
      .from('gym_community_blocks')
      .select(`
        gymCommunityBlockId,
        blockedId,
        createdAt,
        users!gym_community_blocks_blockedId_fkey(userId, name)
      `)
      .eq('blockerId', blockerId)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[moderationHelper] fetchBlocklist Error:', error);
    return [];
  }
}
