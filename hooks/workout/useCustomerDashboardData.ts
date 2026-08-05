import { useQuery } from '@tanstack/react-query';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export function useCustomerDashboardData(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerDashboardData', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const plans = await fetchCustomerWorkoutPlans(userId);
      const activePlan = plans?.find((p: any) => p.isActive);
      
      if (!activePlan) {
        return { hasPlan: false, weeklyPlanDays: [], todayWorkout: null, yesterdayWorkout: null };
      }

      const days = await fetchWorkoutPlanDays(activePlan.planId);
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const currentDayIndex = new Date().getDay();
      const todayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
      const todayString = dayOrder[todayIndex];

      const formattedDays = dayOrder.map(dayStr => {
        const dayData = days.find((d: any) => d.dayOfWeek.toLowerCase() === dayStr);
        const isToday = dayStr === todayString;
        const dayIdx = dayOrder.indexOf(dayStr);
        let status = 'rest';
        
        if (isToday) {
          status = 'active';
        } else if (dayData && dayData.workoutType !== 'Rest') {
          status = dayIdx < todayIndex ? 'completed' : 'pending';
        }

        return {
          dayStr,
          dayAbbr: dayStr.charAt(0).toUpperCase() + dayStr.slice(1, 3),
          type: dayData && dayData.workoutType !== 'Rest' ? dayData.workoutType : 'Rest',
          status,
          duration: dayData?.durationMinutes || 45,
          exercisesCount: 0,
          dayId: dayData?.planDayId,
        };
      });

      const todayFormatted = formattedDays.find(d => d.dayStr === todayString);
      if (todayFormatted && todayFormatted.type !== 'Rest') {
        const rawTodayData = days.find((d: any) => d.dayOfWeek.toLowerCase() === todayString);
        if (rawTodayData) {
          const exs = await fetchWorkoutPlanDayExercises(rawTodayData.planDayId);
          todayFormatted.exercisesCount = exs?.length || 0;
        }
      }

      const yesterdayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
      const yesterdayString = dayOrder[yesterdayIndex];
      const yesterdayFormatted = formattedDays.find(d => d.dayStr === yesterdayString);

      if (yesterdayFormatted && yesterdayFormatted.type !== 'Rest') {
        const rawYesterdayData = days.find((d: any) => d.dayOfWeek.toLowerCase() === yesterdayString);
        if (rawYesterdayData) {
          const exs = await fetchWorkoutPlanDayExercises(rawYesterdayData.planDayId);
          yesterdayFormatted.exercisesCount = exs?.length || 0;
        }
      }

      return {
        hasPlan: true,
        weeklyPlanDays: formattedDays,
        todayWorkout: todayFormatted,
        yesterdayWorkout: yesterdayFormatted
      };
    },
    enabled: !!userId,
  });
}
