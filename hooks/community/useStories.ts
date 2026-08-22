import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchActiveStories, 
  createStory, 
  markStoryViewed, 
  deleteStory,
  fetchStoryViewers,
  toggleStoryLike,
  fetchStoryComments,
  addStoryComment
} from '@/helpers/community/storiesHelper';

export function useActiveStories(gymId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['community-stories', gymId, userId],
    queryFn: async () => {
      if (!gymId || !userId) return [];
      return await fetchActiveStories(gymId, userId);
    },
    enabled: !!gymId && !!userId,
    refetchInterval: 60000, // Refetch every minute to prune expired stories
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      gymId, 
      createdBy, 
      mediaUri, 
      caption,
      captionPositions 
    }: { 
      gymId: string, 
      createdBy: string, 
      mediaUri: string,
      caption?: string,
      captionPositions?: string[]
    }) => createStory(gymId, createdBy, mediaUri, caption, captionPositions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-stories', variables.gymId] });
    },
  });
}

export function useMarkStoryViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, viewedBy, gymId }: { storyId: string, viewedBy: string, gymId: string }) => 
      markStoryViewed(storyId, viewedBy),
    onSuccess: (_, variables) => {
      // Optimistically update the UI if needed, or just invalidate
      queryClient.invalidateQueries({ queryKey: ['community-stories', variables.gymId] });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, userId, gymId }: { storyId: string, userId: string, gymId: string }) => 
      deleteStory(storyId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-stories', variables.gymId] });
    },
  });
}

export function useToggleStoryLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gymId, storyId, userId, isCurrentlyLiked }: { gymId: string, storyId: string, userId: string, isCurrentlyLiked: boolean }) => 
      toggleStoryLike(gymId, storyId, userId, isCurrentlyLiked),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-stories', variables.gymId] });
    },
  });
}

export function useStoryComments(storyId: string | null) {
  return useQuery({
    queryKey: ['story-comments', storyId],
    queryFn: () => fetchStoryComments(storyId!),
    enabled: !!storyId,
  });
}

export function useAddStoryComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gymId, storyId, userId, content }: { gymId: string, storyId: string, userId: string, content: string }) => 
      addStoryComment(gymId, storyId, userId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['story-comments', variables.storyId] });
      queryClient.invalidateQueries({ queryKey: ['community-stories', variables.gymId] });
    }
  });
}

export function useStoryViewers(storyId: string | null) {
  return useQuery({
    queryKey: ['story-viewers', storyId],
    queryFn: async () => {
      if (!storyId) return [];
      return await fetchStoryViewers(storyId);
    },
    enabled: !!storyId,
  });
}
