import { useQuery } from '@tanstack/react-query';
import { fetchPaginatedWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export function usePaginatedWorkoutPlanDayExercises(planDayId: string | null | undefined, page: number, limit: number, userGender?: string) {
  return useQuery({
    queryKey: ['workoutPlanDayExercisesPaginated', planDayId, page, limit, userGender],
    queryFn: async () => {
      if (!planDayId) return { data: [], total: 0 };
      return await fetchPaginatedWorkoutPlanDayExercises(planDayId, page, limit, userGender);
    },
    enabled: !!planDayId,
    staleTime: 1000 * 60 * 5,
  });
}
