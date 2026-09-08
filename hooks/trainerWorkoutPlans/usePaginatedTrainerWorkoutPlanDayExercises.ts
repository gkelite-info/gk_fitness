import { useQuery } from '@tanstack/react-query';
import { fetchPaginatedTrainerWorkoutPlanDayExercises } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';

export function usePaginatedTrainerWorkoutPlanDayExercises(planDayId: string | null | undefined, page: number, limit: number) {
  return useQuery({
    queryKey: ['trainerWorkoutPlanDayExercisesPaginated', planDayId, page, limit],
    queryFn: async () => {
      if (!planDayId) return { data: [], total: 0 };
      return await fetchPaginatedTrainerWorkoutPlanDayExercises(planDayId, page, limit);
    },
    enabled: !!planDayId,
    staleTime: 1000 * 60 * 5,
  });
}
