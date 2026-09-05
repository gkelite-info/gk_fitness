import { useQuery } from '@tanstack/react-query';
import { fetchTrainerWorkoutPlanDayExercises } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';

export function useTrainerWorkoutPlanDayExercises(planDayId: string | null | undefined) {
  return useQuery({
    queryKey: ['trainerWorkoutPlanDayExercises', planDayId],
    queryFn: async () => {
      if (!planDayId) return [];
      return await fetchTrainerWorkoutPlanDayExercises(planDayId);
    },
    enabled: !!planDayId,
  });
}
