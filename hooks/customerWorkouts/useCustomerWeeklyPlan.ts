import { useQuery } from '@tanstack/react-query';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export function useCustomerWeeklyPlan(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerWeeklyPlan', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const plans = await fetchCustomerWorkoutPlans(userId);
      const activePlan = plans?.find((p: any) => p.isActive);
      
      if (!activePlan) return null;

      const days = await fetchWorkoutPlanDays(activePlan.planId);
      const loadedPlanDays: any = {};
      
      for (const d of days) {
        if (d.workoutType && d.workoutType !== 'Rest') {
          const exs = await fetchWorkoutPlanDayExercises(d.planDayId);
          loadedPlanDays[d.dayOfWeek] = {
            dayOfWeek: d.dayOfWeek,
            workoutType: d.workoutType,
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
