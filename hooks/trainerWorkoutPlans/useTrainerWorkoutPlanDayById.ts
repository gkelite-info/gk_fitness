import { useQuery } from '@tanstack/react-query';
import { fetchTrainerWorkoutPlanDayById } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays';

export function useTrainerWorkoutPlanDayById(planDayId: string | null | undefined) {
  return useQuery({
    queryKey: ['trainerWorkoutPlanDay', planDayId],
    queryFn: async () => {
      if (!planDayId) return null;
      return await fetchTrainerWorkoutPlanDayById(planDayId);
    },
    enabled: !!planDayId,
  });
}
