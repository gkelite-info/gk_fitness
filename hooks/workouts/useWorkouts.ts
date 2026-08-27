import { useQuery } from '@tanstack/react-query';
import { fetchWorkouts } from '@/helpers/workouts/workoutHelper';

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const data = await fetchWorkouts();
      return data;
    },
  });
}
