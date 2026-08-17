import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCommunityPosts, createCommunityPost, deleteCommunityPost } from '@/helpers/community/communityHelper';

export function useCommunityFeed(gymId: string | null, userId: string | null) {
  return useInfiniteQuery({
    queryKey: ['community-feed', gymId, userId],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      if (!gymId || !userId) return [];
      return await fetchCommunityPosts(gymId, userId, pageParam, 10);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any[], allPages: any[]) => {
      // If the last page returned less than 10 items, there are no more pages
      return lastPage.length === 10 ? allPages.length : undefined;
    },
    enabled: !!gymId && !!userId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gymId, userId, caption, imageUri }: { gymId: string, userId: string, caption: string, imageUri?: string }) => {
      return await createCommunityPost(gymId, userId, caption, imageUri);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.gymId, variables.userId] });
    }
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, userId, gymId }: { postId: string, userId: string, gymId: string }) => {
      return await deleteCommunityPost(postId, userId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.gymId, variables.userId] });
    }
  });
}
