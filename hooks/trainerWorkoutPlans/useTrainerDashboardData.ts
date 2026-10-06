import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchTrainerWorkoutPlans } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlans';
import { fetchTrainerWorkoutPlanDays } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays';
import { fetchTrainerWorkoutPlanDayExercises } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';

export function useTrainerDashboardData(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['trainerDashboardData', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const [plans, userLogsRes] = await Promise.all([
        fetchTrainerWorkoutPlans(userId),
        supabase.from('customer_workout_logs').select('planDayId').eq('userId', userId)
      ]);
      const userLogs = userLogsRes.data;

      const activePlan = plans?.find((p: any) => p.isActive) || plans?.[0];
      
      if (!activePlan) {
        return { hasPlan: false, weeklyPlanDays: [], todayWorkout: null, yesterdayWorkout: null, planId: null };
      }

      const planCreatedAt = new Date(activePlan.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - planCreatedAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const currentWeekNumber = Math.min(Math.ceil(diffDays / 7), 4) || 1;

      let allDays = await fetchTrainerWorkoutPlanDays(activePlan.planId);
      let days = allDays.filter((d: any) => (d.weekNumber || 1) === currentWeekNumber);

      if (days.length === 0) {
        days = allDays.filter((d: any) => (d.weekNumber || 1) === 1);
      }
      
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const currentDayIndex = new Date().getDay();
      const todayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
      const todayString = dayOrder[todayIndex];
      const yesterdayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
        
      const completedPlanDayIds = new Set(userLogs?.map(l => l.planDayId) || []);

      const formattedDays = dayOrder.map(dayStr => {
        const dayData = days.find((d: any) => d.dayOfWeek?.toLowerCase() === dayStr);
        const isToday = dayStr === todayString;
        const dayIdx = dayOrder.indexOf(dayStr);
        let status = 'rest';
        let isCompleted = false;
        
        if (dayData && dayData.workoutType !== 'Rest') {
          isCompleted = completedPlanDayIds.has(dayData.planDayId);
        }
        
        if (isToday) {
          status = 'active';
        } else if (dayData && dayData.workoutType !== 'Rest') {
          if (isCompleted) {
            status = 'completed';
          } else {
            status = dayIdx < todayIndex ? 'missed' : 'pending';
          }
        }

        return {
          dayStr,
          dayAbbr: dayStr.charAt(0).toUpperCase() + dayStr.slice(1, 3),
          type: dayData && dayData.workoutType !== 'Rest' ? dayData.workoutType : 'Rest',
          status,
          duration: dayData?.durationMinutes || 45,
          exercisesCount: 0,
          dayId: dayData?.planDayId,
          isCompleted,
        };
      });

      const todayFormatted = formattedDays.find(d => d.dayStr === todayString);
      if (todayFormatted && todayFormatted.type !== 'Rest') {
        const rawTodayData = days.find((d: any) => d.dayOfWeek?.toLowerCase() === todayString);
        if (rawTodayData) {
          const exs = await fetchTrainerWorkoutPlanDayExercises(rawTodayData.planDayId);
          todayFormatted.exercisesCount = exs?.length || 0;
        }
      }

      const yesterdayString = dayOrder[yesterdayIndex];
      let yesterdayFormatted = formattedDays.find(d => d.dayStr === yesterdayString);

      // If yesterday was Sunday and today is Monday, yesterday belongs to the previous week
      if (todayIndex === 0) {
        const prevWeekNumber = currentWeekNumber > 1 ? currentWeekNumber - 1 : currentWeekNumber;
        const prevWeekDays = allDays.filter((d: any) => (d.weekNumber || 1) === prevWeekNumber);
        const prevWeekDayData = prevWeekDays.find((d: any) => d.dayOfWeek?.toLowerCase() === yesterdayString);
        
        if (prevWeekDayData) {
          yesterdayFormatted = {
            dayStr: yesterdayString,
            dayAbbr: yesterdayString.charAt(0).toUpperCase() + yesterdayString.slice(1, 3),
            type: prevWeekDayData.workoutType !== 'Rest' ? prevWeekDayData.workoutType : 'Rest',
            status: completedPlanDayIds.has(prevWeekDayData.planDayId) ? 'completed' : 'missed',
            duration: prevWeekDayData.durationMinutes || 45,
            exercisesCount: 0,
            dayId: prevWeekDayData.planDayId,
            isCompleted: completedPlanDayIds.has(prevWeekDayData.planDayId),
          };
        }
      }

      if (yesterdayFormatted && yesterdayFormatted.type !== 'Rest') {
        // We must pull from allDays using the specific dayId to avoid week-boundary bugs
        const rawYesterdayData = allDays.find((d: any) => d.planDayId === yesterdayFormatted!.dayId);
        if (rawYesterdayData) {
          const exs = await fetchTrainerWorkoutPlanDayExercises(rawYesterdayData.planDayId);
          yesterdayFormatted.exercisesCount = exs?.length || 0;
        }
      }

      return {
        hasPlan: true,
        weeklyPlanDays: formattedDays,
        todayWorkout: todayFormatted,
        yesterdayWorkout: yesterdayFormatted,
        planId: activePlan.planId,
      };
    },
    enabled: !!userId,
  });
}
