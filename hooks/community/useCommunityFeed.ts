import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCommunityPosts, createCommunityPost, deleteCommunityPost } from '@/helpers/community/communityHelper';

export function useCommunityFeed(gymId: string | null, userId: string | null) {
  return useInfiniteQuery({
    queryKey: ['community-feed', gymId, userId],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      if (!userId) return [];
      return await fetchCommunityPosts(gymId, userId, pageParam, 10);
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.gymId, variables.userId] });
    }
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, userId, gymId, role }: { postId: string, userId: string, gymId: string | null, role?: string }) => {
      return await deleteCommunityPost(postId, userId, role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.gymId, variables.userId] });
    }
  });
}
