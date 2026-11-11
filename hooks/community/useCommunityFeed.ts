import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCommunityPosts, createCommunityPost, deleteCommunityPost } from '@/helpers/community/communityHelper';

export function useCommunityFeed(gymId: string | null, userId: string | null, role?: string | null) {
  return useInfiniteQuery({
    queryKey: ['community-feed', gymId, userId, role],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      if (!userId) return [];
      return await fetchCommunityPosts(gymId, userId, pageParam, 10, role);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any[], allPages: any[]) => {
      // If the last page returned less than 10 items, there are no more pages
      return lastPage.length === 10 ? allPages.length : undefined;
    },
    enabled: !!userId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gymId, userId, caption, imageUri }: { gymId: string | null, userId: string, caption: string, imageUri?: string }) => {
      return await createCommunityPost(gymId, userId, caption, imageUri);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    }
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, userId, gymId, role }: { postId: string, userId: string, gymId: string | null, role?: string }) => {
      console.log('[useDeletePost] Running mutation for postId:', postId);
      return await deleteCommunityPost(postId, userId, role);
    },
    onMutate: async ({ postId }: { postId: string, userId: string, gymId: string | null, role?: string }) => {
      await queryClient.cancelQueries({ queryKey: ['community-feed'] });
      
      // Optimistically remove the deleted post immediately from all pages in the cache
      queryClient.setQueriesData({ queryKey: ['community-feed'] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) =>
            page.filter((post: any) => post.gymCommunityPostId !== postId)
          )
        };
      });
      return {};
    },
    onSuccess: (_, variables) => {
      queryClient.setQueriesData({ queryKey: ['community-feed'] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) =>
            page.filter((post: any) => post.gymCommunityPostId !== variables.postId)
          )
        };
      });
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    },
    onError: (err) => {
      console.error('[useDeletePost] Mutation error:', err);
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    }
  });
}
