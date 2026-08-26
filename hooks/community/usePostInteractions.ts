import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toggleLike, toggleSave, fetchComments, addComment, deleteComment } from '@/helpers/community/interactionsHelper';

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId, gymId }: { postId: string, userId: string, gymId: string }) => {
      return await toggleLike(postId, userId);
    },
    onMutate: async ({ postId, userId, gymId }: { postId: string, userId: string, gymId: string }) => {
      // Optimistic update for feed
      await queryClient.cancelQueries({ queryKey: ['community-feed', gymId, userId] });
      
      const previousData = queryClient.getQueryData(['community-feed', gymId, userId]);
      
      queryClient.setQueryData(['community-feed', gymId, userId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => 
            page.map((post: any) => {
              if (post.gymCommunityPostId === postId) {
                const wasLiked = post.isLikedByMe;
                return {
                  ...post,
                  isLikedByMe: !wasLiked,
                  likesCount: wasLiked ? post.likesCount - 1 : post.likesCount + 1
                };
              }
              return post;
            })
          )
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['community-feed', variables.gymId, variables.userId], context.previousData);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.gymId, variables.userId] });
    }
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId, gymId }: { postId: string, userId: string, gymId: string }) => {
      return await toggleSave(postId, userId);
    },
    onMutate: async ({ postId, userId, gymId }: { postId: string, userId: string, gymId: string }) => {
      await queryClient.cancelQueries({ queryKey: ['community-feed', gymId, userId] });
      
      const previousData = queryClient.getQueryData(['community-feed', gymId, userId]);
      
      queryClient.setQueryData(['community-feed', gymId, userId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => 
            page.map((post: any) => {
              if (post.gymCommunityPostId === postId) {
                return { ...post, isSavedByMe: !post.isSavedByMe };
              }
              return post;
            })
          )
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['community-feed', variables.gymId, variables.userId], context.previousData);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.gymId, variables.userId] });
    }
  });
}

export const usePostComments = (postId: string | null, userId: string | null, sortBy: 'newest' | 'oldest' = 'oldest') => {
  return useQuery({
    queryKey: ['comments', postId, sortBy],
    queryFn: () => {
      if (!postId || !userId) return [];
      return fetchComments(postId, userId, sortBy);
    },
    enabled: !!postId && !!userId,
  });
};

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId, content, parentId }: { postId: string, userId: string, content: string, parentId?: string }) => {
      return await addComment(postId, userId, content, parentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      // We should also invalidate feed to update comment counts, but this might be expensive.
      // queryClient.invalidateQueries(['community-feed']);
    }
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, userId, role }: { commentId: string, userId: string, role?: string }) => {
      return await deleteComment(commentId, userId, role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    }
  });
}
