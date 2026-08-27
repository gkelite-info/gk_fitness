import { useQuery } from '@tanstack/react-query';
import { fetchPaginatedWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export function usePaginatedWorkoutPlanDayExercises(planDayId: string | null | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: ['workoutPlanDayExercisesPaginated', planDayId, page, limit],
    queryFn: async () => {
      if (!planDayId) return { data: [], total: 0 };
      return await fetchPaginatedWorkoutPlanDayExercises(planDayId, page, limit);
    },
    enabled: !!planDayId,
    staleTime: 1000 * 60 * 5,
  });
}
