import { useQuery } from '@tanstack/react-query';
import { fetchTrainerWorkoutPlans } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlans';
import { fetchTrainerWorkoutPlanDays } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays';
import { fetchTrainerWorkoutPlanDayExercises } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';

export function useTrainerWeeklyPlan(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['trainerWeeklyPlan', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const plans = await fetchTrainerWorkoutPlans(userId);
      const activePlan = plans?.find((p: any) => p.isActive);
      
      if (!activePlan) return null;

      const days = await fetchTrainerWorkoutPlanDays(activePlan.planId);
      const loadedPlanDays: any = {};
      
      for (const d of days) {
        if (d.workoutType && d.workoutType !== 'Rest') {
          const exs = await fetchTrainerWorkoutPlanDayExercises(d.planDayId);
          loadedPlanDays[d.dayOfWeek] = {
            dayOfWeek: d.dayOfWeek,
            workoutType: d.workoutType,
            workoutId: d.workoutId || null,
            durationMinutes: d.durationMinutes,
            exercises: exs,
            planDayId: d.planDayId
          };
        }
      }
      return loadedPlanDays;
    },
    enabled: !!userId,
  });
}
