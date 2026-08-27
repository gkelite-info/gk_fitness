import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutVideos } from '@/helpers/workoutVideos/workoutVideoHelper';

export function useWorkoutVideos(page: number = 1, limit: number = 10, workoutType: string = 'all') {
  return useQuery({
    queryKey: ['workoutVideos', page, limit, workoutType],
    queryFn: async () => {
      const data = await fetchWorkoutVideos(page, limit, workoutType);
      return data;
    },
  });
}
