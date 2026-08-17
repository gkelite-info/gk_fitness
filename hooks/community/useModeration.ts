import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { blockUser, unblockUser, reportContent, fetchBlocklist } from '@/helpers/community/moderationHelper';

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockerId, blockedId }: { blockerId: string, blockedId: string }) => {
      return await blockUser(blockerId, blockedId);
    },
    onSuccess: (_, variables) => {
      // Invalidate the feed so the blocked user's posts disappear immediately
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      queryClient.invalidateQueries({ queryKey: ['post-comments'] });
    }
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockerId, blockedId }: { blockerId: string, blockedId: string }) => {
      return await unblockUser(blockerId, blockedId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    }
  });
}

export function useReportContent() {
  return useMutation({
    mutationFn: async ({ 
      reporterId, 
      reason, 
      reportedUserId, 
      postId, 
      commentId 
    }: { 
      reporterId: string, 
      reason: string, 
      reportedUserId?: string, 
      postId?: string, 
      commentId?: string 
    }) => {
      return await reportContent(reporterId, reason, reportedUserId, postId, commentId);
    }
  });
}

export function useBlocklist(userId: string | null) {
  return useQuery({
    queryKey: ['community-blocklist', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await fetchBlocklist(userId);
    },
    enabled: !!userId,
  });
}
