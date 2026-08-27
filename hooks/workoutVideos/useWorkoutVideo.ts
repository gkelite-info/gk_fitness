import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutVideoById } from '@/helpers/workoutVideos/workoutVideoHelper';

export function useWorkoutVideo(workoutVideoId: string) {
  return useQuery({
    queryKey: ['workoutVideo', workoutVideoId],
    queryFn: async () => {
      const data = await fetchWorkoutVideoById(workoutVideoId);
      return data;
    },
    enabled: !!workoutVideoId,
  });
}
