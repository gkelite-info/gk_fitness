import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutVideos } from '@/helpers/workoutVideos/workoutVideoHelper';

export function useWorkoutVideos(
  page: number = 1,
  limit: number = 10,
  workoutType: string = 'all',
  role: string = 'all',
  isStretching: string = 'all',
  searchQuery: string = ''
) {
  return useQuery({
    queryKey: ['workoutVideos', page, limit, workoutType, role, isStretching, searchQuery],
    queryFn: async () => {
      const data = await fetchWorkoutVideos(page, limit, workoutType, role, isStretching, searchQuery);
      return data;
    },
  });
}
