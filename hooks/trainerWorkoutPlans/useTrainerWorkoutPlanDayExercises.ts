import { useQuery } from '@tanstack/react-query';
import { fetchTrainerWorkoutPlanDayExercises } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';

export function useTrainerWorkoutPlanDayExercises(planDayId: string | null | undefined, userGender?: string) {
  return useQuery({
    queryKey: ['trainerWorkoutPlanDayExercises', planDayId, userGender],
    queryFn: async () => {
      if (!planDayId) return [];
      return await fetchTrainerWorkoutPlanDayExercises(planDayId, userGender);
    },
    enabled: !!planDayId,
  });
}
