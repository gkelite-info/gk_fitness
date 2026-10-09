import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/dateUtils';

export interface WaterStreakData {
  currentStreak: number;
  bestStreak: number;
  niceJobText: string;
  weeklyHistory: { date: string; dayName: string; completed: boolean; amountL: number; goalL: number }[];
}

export function useWaterStreak(userId: string | null) {
  return useQuery<WaterStreakData>({
    queryKey: ['water_streak', userId],
    queryFn: async () => {
      if (!userId) {
        return {
          currentStreak: 0,
          bestStreak: 0,
          niceJobText: 'Start today!',
          weeklyHistory: [],
        };
      }

      // Fetch daily health summaries for user
      const { data: summaries, error } = await supabase
        .from('daily_health_summaries')
        .select('date, waterIntake, waterGoal')
        .eq('userId', userId)
        .order('date', { ascending: false });

      if (error) {
        console.warn('Error fetching daily summaries for water streak:', error);
      }

      const summaryMap = new Map<string, { intake: number; goal: number }>();
      (summaries || []).forEach((s) => {
        summaryMap.set(s.date, {
          intake: Number(s.waterIntake) || 0,
          goal: Number(s.waterGoal) || 2.5,
        });
      });

      const today = new Date();
      const todayStr = getLocalDateString(today);
      const todayData = summaryMap.get(todayStr);
      const todayGoal = todayData?.goal || 2.5;
      const todayIntake = todayData?.intake || 0;
      const isTodayCompleted = todayIntake >= todayGoal && todayIntake > 0;

      // 1. Calculate Current Streak
      let currentStreak = 0;
      if (isTodayCompleted) {
        currentStreak = 1;
      }

      // Check backwards from yesterday
      let checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);

      while (true) {
        const dStr = getLocalDateString(checkDate);
        const dayRecord = summaryMap.get(dStr);
        if (!dayRecord) {
          break;
        }

        const met = dayRecord.intake >= (dayRecord.goal || 2.5) && dayRecord.intake > 0;
        if (met) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // 2. Calculate Best Streak across all history
      const sortedDates = Array.from(summaryMap.keys()).sort();
      let bestStreak = 0;
      let tempStreak = 0;

      for (let i = 0; i < sortedDates.length; i++) {
        const dStr = sortedDates[i];
        const record = summaryMap.get(dStr);
        const met = record && record.intake >= (record.goal || 2.5) && record.intake > 0;

        if (met) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }

      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }

      // Generate last 7 days history
      const weeklyHistory = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const pastDate = new Date(today);
        pastDate.setDate(pastDate.getDate() - i);
        const pStr = getLocalDateString(pastDate);
        const pRec = summaryMap.get(pStr);
        const intake = pRec?.intake || 0;
        const goal = pRec?.goal || 2.5;
        weeklyHistory.push({
          date: pStr,
          dayName: days[pastDate.getDay()],
          completed: intake >= goal && intake > 0,
          amountL: intake,
          goalL: goal,
        });
      }

      let niceJobText = 'Start today!';
      const displayStreak = Math.max(bestStreak, currentStreak);
      if (displayStreak >= 7) {
        niceJobText = 'Nice job!';
      } else if (displayStreak >= 3) {
        niceJobText = 'Keep it up!';
      } else if (displayStreak >= 1) {
        niceJobText = 'Great start!';
      }

      return {
        currentStreak,
        bestStreak: Math.max(bestStreak, currentStreak),
        niceJobText,
        weeklyHistory,
      };
    },
    enabled: !!userId,
  });
}
