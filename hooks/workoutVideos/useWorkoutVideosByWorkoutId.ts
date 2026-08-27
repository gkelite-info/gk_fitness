import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutVideosByWorkoutId } from '@/helpers/workoutVideos/workoutVideoHelper';

export function useWorkoutVideosByWorkoutId(workoutId: string) {
  return useQuery({
    queryKey: ['workoutVideos', workoutId],
    queryFn: async () => {
      const data = await fetchWorkoutVideosByWorkoutId(workoutId);
      return data;
    },
    enabled: !!workoutId,
  });
}
