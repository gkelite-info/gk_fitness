import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';

interface StreakData {
  currentStreak: number;
  bestStreak: number;
}

export function useWorkoutStreak() {
  const { userId } = useUser();

  return useQuery<StreakData>({
    queryKey: ['workout_streak', userId],
    queryFn: async () => {
      if (!userId) return { currentStreak: 0, bestStreak: 0 };

      // Fetch all user workout logs, sorted newest first
      const { data: logs, error } = await supabase
        .from('customer_workout_logs')
        .select('completedAt')
        .eq('userId', userId)
        .order('completedAt', { ascending: false });

      if (error) throw error;
      if (!logs || logs.length === 0) {
        return { currentStreak: 0, bestStreak: 0 };
      }

      // Convert timestamps to local date strings safely for React Native
      const uniqueDates = Array.from(new Set(
        logs.map(log => {
          const d = new Date(log.completedAt);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        })
      ));

      // Fetch active plan to determine scheduled days
      const plans = await fetchCustomerWorkoutPlans(userId);
      const activePlan = plans?.find((p: any) => p.isActive);

      let scheduledDays = new Set<number>();
      if (activePlan) {
        const planDays = await fetchWorkoutPlanDays(activePlan.planId);
        const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        planDays.forEach((d: any) => {
          if (d.workoutType !== 'Rest') {
            const idx = dayOrder.indexOf(d.dayOfWeek.toLowerCase());
            if (idx !== -1) scheduledDays.add(idx);
          }
        });
      }

      const loggedDaysSet = new Set(uniqueDates);
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;

      const oldestDateStr = uniqueDates[uniqueDates.length - 1]; // Array is newest first, so last is oldest
      const oldestDate = new Date(oldestDateStr);
      oldestDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let d = new Date(oldestDate);
      const hasScheduledDays = scheduledDays.size > 0;

      while (d <= today) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const isLogged = loggedDaysSet.has(dateStr);
        const dayOfWeek = d.getDay(); // 0-6 (Sunday-Saturday)
        const isScheduled = hasScheduledDays ? scheduledDays.has(dayOfWeek) : true;

        if (isLogged) {
          tempStreak++;
        } else {
          // Not logged.
          if (isScheduled) {
            // Missed a scheduled day. Streak breaks!
            // Except for today, which doesn't break the streak since the day isn't over yet
            const isToday = d.getTime() === today.getTime();
            if (!isToday) {
              if (tempStreak > bestStreak) bestStreak = tempStreak;
              tempStreak = 0;
            }
          } else {
            // Rest day, not logged. Streak stays alive.
          }
        }

        // Move to next day
        d.setDate(d.getDate() + 1);
      }

      currentStreak = tempStreak;
      if (tempStreak > bestStreak) bestStreak = tempStreak;

      return { currentStreak, bestStreak };
    },
    enabled: !!userId,
  });
}
