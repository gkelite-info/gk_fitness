import { useQuery } from '@tanstack/react-query';
import { fetchTrainerWorkoutPlans } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlans';
import { fetchTrainerWorkoutPlanDays } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays';
import { fetchTrainerWorkoutPlanDayExercises } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';

export function useTrainerWeeklyPlan(userId: string | null | undefined, fallbackUserId?: string | null) {
  return useQuery({
    queryKey: ['trainerWeeklyPlan', userId, fallbackUserId],
    queryFn: async () => {
      if (!userId && !fallbackUserId) return null;
      
      let plans = await fetchTrainerWorkoutPlans(userId || undefined);
      if ((!plans || plans.length === 0) && fallbackUserId && fallbackUserId !== userId) {
        plans = await fetchTrainerWorkoutPlans(fallbackUserId);
      }
      const activePlan = plans?.find((p: any) => p.isActive);
      
      if (!activePlan) return null;

      const days = await fetchTrainerWorkoutPlanDays(activePlan.planId);
      const loadedPlanDays: any = {};
      
      const activeDays = days.filter((d: any) => d.workoutType && d.workoutType !== 'Rest');
      const fetchPromises = activeDays.map(async (d: any) => {
        const exs = await fetchTrainerWorkoutPlanDayExercises(d.planDayId);
        return { d, exs };
      });
      const results = await Promise.all(fetchPromises);
      
      for (const { d, exs } of results) {
        loadedPlanDays[d.dayOfWeek] = {
          dayOfWeek: d.dayOfWeek,
          workoutType: d.workoutType,
          workoutId: d.workoutId || null,
          durationMinutes: d.durationMinutes,
          exercises: exs,
          planDayId: d.planDayId
        };
      }
      return loadedPlanDays;
    },
    enabled: !!(userId || fallbackUserId),
  });
}
