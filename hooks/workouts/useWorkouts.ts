import { useQuery } from '@tanstack/react-query';
import { fetchWorkouts } from '@/helpers/workouts/workoutHelper';

export function useWorkouts(role: string = 'all') {
  return useQuery({
    queryKey: ['workouts', role],
    queryFn: async () => {
      const data = await fetchWorkouts(role);
      return data;
    },
  });
}
