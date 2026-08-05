import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutPlanDayById } from '@/helpers/customerWorkoutPlans/workoutPlansDays';

export function useWorkoutPlanDayById(dayId: string | null | undefined) {
  return useQuery({
    queryKey: ['workoutPlanDay', dayId],
    queryFn: async () => {
      if (!dayId) return null;
      return await fetchWorkoutPlanDayById(dayId);
    },
    enabled: !!dayId,
  });
}
