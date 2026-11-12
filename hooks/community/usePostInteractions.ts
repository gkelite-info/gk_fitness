import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toggleLike, toggleSave, fetchComments, addComment, deleteComment } from '@/helpers/community/interactionsHelper';

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId, gymId }: { postId: string, userId: string, gymId?: string | null }) => {
      return await toggleLike(postId, userId);
    },
    onMutate: async ({ postId }: { postId: string, userId: string, gymId?: string | null }) => {
      await queryClient.cancelQueries({ queryKey: ['community-feed'] });

      queryClient.setQueriesData({ queryKey: ['community-feed'] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) =>
            page.map((post: any) => {
              if (post.gymCommunityPostId === postId) {
                const wasLiked = post.isLikedByMe;
                return {
                  ...post,
                  isLikedByMe: !wasLiked,
                  likesCount: wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1
                };
              }
              return post;
            })
          )
        };
      });

      return {};
    },
    onError: (err) => {
      console.error('[useToggleLike] Mutation error:', err);
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    },
    onSuccess: (result: any, variables: any) => {
      if (result && typeof result.isLiking === 'boolean') {
        queryClient.setQueriesData({ queryKey: ['community-feed'] }, (oldData: any) => {
          if (!oldData || !oldData.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) =>
              page.map((post: any) => {
                if (post.gymCommunityPostId === variables.postId) {
                  return {
                    ...post,
                    isLikedByMe: result.isLiking,
                  };
                }
                return post;
              })
            )
          };
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    }
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId, gymId }: { postId: string, userId: string, gymId?: string | null }) => {
      return await toggleSave(postId, userId);
    },
    onMutate: async ({ postId }: { postId: string, userId: string, gymId?: string | null }) => {
      await queryClient.cancelQueries({ queryKey: ['community-feed'] });

      queryClient.setQueriesData({ queryKey: ['community-feed'] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
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

      return {};
    },
    onError: (err) => {
      console.error('[useToggleSave] Mutation error:', err);
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    },
    onSuccess: (result: any, variables: any) => {
      if (result && typeof result.isSaving === 'boolean') {
        queryClient.setQueriesData({ queryKey: ['community-feed'] }, (oldData: any) => {
          if (!oldData || !oldData.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) =>
              page.map((post: any) => {
                if (post.gymCommunityPostId === variables.postId) {
                  return {
                    ...post,
                    isSavedByMe: result.isSaving,
                  };
                }
                return post;
              })
            )
          };
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
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
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    },
    onError: (err) => {
      console.error('[useAddComment] Error in mutation:', err);
    }
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, userId, role }: { commentId: string, userId: string, role?: string }) => {
      return await deleteComment(commentId, userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
    }
  });
}
