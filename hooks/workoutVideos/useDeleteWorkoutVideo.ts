import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkoutVideo } from '@/helpers/workoutVideos/workoutVideoHelper';

export function useDeleteWorkoutVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workoutVideoId: string) => deleteWorkoutVideo(workoutVideoId),
    onSuccess: (_, workoutVideoId) => {
      queryClient.invalidateQueries({ queryKey: ['workoutVideos'] });
      queryClient.invalidateQueries({ queryKey: ['workoutVideo', workoutVideoId] });
      // Note: We might also want to invalidate ['workoutVideos', workoutId] if we knew the workoutId here.
      // Usually, just invalidating the general list is enough if they are refetched on focus, or 
      // the caller can invalidate it manually if needed.
    },
  });
}
