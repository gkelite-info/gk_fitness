import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export function useWorkoutPlanDayExercises(planDayId: string | null | undefined, userGender?: string) {
  return useQuery({
    queryKey: ['workoutPlanDayExercises', planDayId, userGender],
    queryFn: async () => {
      if (!planDayId) return [];
      return await fetchWorkoutPlanDayExercises(planDayId, userGender);
    },
    enabled: !!planDayId,
  });
}
