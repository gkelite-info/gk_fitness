import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveWorkoutVideo, SaveWorkoutVideoParams } from '@/helpers/workoutVideos/workoutVideoHelper';

export function useSaveWorkoutVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveWorkoutVideoParams) => saveWorkoutVideo(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workoutVideos'] });
      if (variables.workoutId) {
        queryClient.invalidateQueries({ queryKey: ['workoutVideos', variables.workoutId] });
      }
      if (variables.workoutVideoId) {
        queryClient.invalidateQueries({ queryKey: ['workoutVideo', variables.workoutVideoId] });
      }
    },
  });
}
