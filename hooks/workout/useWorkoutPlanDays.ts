import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';

export function useWorkoutPlanDays(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['workoutPlanDays', planId],
    queryFn: async () => {
      if (!planId) return [];
      return await fetchWorkoutPlanDays(planId);
    },
    enabled: !!planId,
  });
}
