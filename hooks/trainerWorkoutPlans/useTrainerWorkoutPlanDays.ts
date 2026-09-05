import { useQuery } from '@tanstack/react-query';
import { fetchTrainerWorkoutPlanDays } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays';

export function useTrainerWorkoutPlanDays(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['trainerWorkoutPlanDays', planId],
    queryFn: async () => {
      if (!planId) return [];
      return await fetchTrainerWorkoutPlanDays(planId);
    },
    enabled: !!planId,
  });
}
