import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export function useWorkoutPlanDayExercises(planDayId: string | null | undefined) {
  return useQuery({
    queryKey: ['workoutPlanDayExercises', planDayId],
    queryFn: async () => {
      if (!planDayId) return [];
      return await fetchWorkoutPlanDayExercises(planDayId);
    },
    enabled: !!planDayId,
  });
}
