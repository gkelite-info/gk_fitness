import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutVideos } from '@/helpers/workoutVideos/workoutVideoHelper';

export function useWorkoutVideos(
  page: number = 1,
  limit: number = 10,
  workoutType: string = 'all',
  role: string = 'all',
  isStretching: string = 'all',
  searchQuery: string = '',
  options?: { enabled?: boolean; strictRole?: boolean }
) {
  return useQuery({
    queryKey: ['workoutVideos', page, limit, workoutType, role, isStretching, searchQuery, options?.strictRole],
    queryFn: async () => {
      const data = await fetchWorkoutVideos(page, limit, workoutType, role, isStretching, searchQuery, options?.strictRole);
      return data;
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}
