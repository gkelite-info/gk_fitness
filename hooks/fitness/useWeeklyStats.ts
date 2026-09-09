import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';

export interface DailySummary {
  date: string;
  steps: number;
  stepGoal: number;
  activeCalories: number;
  calorieGoal: number;
  waterIntake: number; // in liters
  waterGoal: number; // in liters
  streak: number;
  activeMinutes: number;
}

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useWeeklyStats(userId: string | null) {
  return useQuery({
    queryKey: ['weeklyStats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const today = new Date();
      const startOfThisWeek = getStartOfWeek(today);
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      const endOfThisWeek = new Date(startOfThisWeek);
      endOfThisWeek.setDate(endOfThisWeek.getDate() + 6);
      endOfThisWeek.setHours(23, 59, 59, 999);

      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
      endOfLastWeek.setHours(23, 59, 59, 999);

      // Fetch summaries for the last 14 days
      const { data, error } = await supabase
        .from('daily_health_summaries')
        .select('*')
        .eq('userId', userId)
        .gte('date', startOfLastWeek.toISOString().split('T')[0])
        .lte('date', endOfThisWeek.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching weekly stats:', error);
        throw error;
      }

      const summaries = data || [];

      // Fetch user profile for goals
      const profile = await fetchCustomerOnboarding(userId);
      const workoutDays = profile?.workoutDays || [];
      const workoutGoal = workoutDays.length || 6;
      
      const thisWeekData: Record<string, DailySummary> = {};
      const lastWeekData: Record<string, DailySummary> = {};

      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      // Initialize empty days
      for (let i = 0; i < 7; i++) {
        const dThis = new Date(startOfThisWeek);
        dThis.setDate(dThis.getDate() + i);
        const dateStrThis = dThis.toISOString().split('T')[0];
        
        thisWeekData[dateStrThis] = {
          date: dateStrThis,
          steps: 0,
          stepGoal: 10000,
          activeCalories: 0,
          calorieGoal: profile?.targetCalories || 1800,
          waterIntake: 0,
          waterGoal: 2.5,
          streak: 0,
          activeMinutes: 0
        };

        const dLast = new Date(startOfLastWeek);
        dLast.setDate(dLast.getDate() + i);
        const dateStrLast = dLast.toISOString().split('T')[0];

        lastWeekData[dateStrLast] = {
          date: dateStrLast,
          steps: 0,
          stepGoal: 10000,
          activeCalories: 0,
          calorieGoal: profile?.targetCalories || 1800,
          waterIntake: 0,
          waterGoal: 2.5,
          streak: 0,
          activeMinutes: 0
        };
      }

      // Populate data
      summaries.forEach(s => {
        const date = s.date;
        const entry = {
          date: s.date,
          steps: s.steps || 0,
          stepGoal: s.stepGoal || 10000,
          activeCalories: s.activeCalories || 0,
          calorieGoal: s.calorieGoal || profile?.targetCalories || 1800,
          waterIntake: s.waterIntake || 0,
          waterGoal: s.waterGoal || 2.5,
          streak: s.streak || 0,
          activeMinutes: s.activeMinutes || 0
        };
        
        if (thisWeekData[date]) {
          thisWeekData[date] = entry;
        } else if (lastWeekData[date]) {
          lastWeekData[date] = entry;
        }
      });

      const thisWeekArr = Object.values(thisWeekData).sort((a, b) => a.date.localeCompare(b.date));
      const lastWeekArr = Object.values(lastWeekData).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate totals
      const totalsThisWeek = {
        calories: thisWeekArr.reduce((sum, d) => sum + d.activeCalories, 0),
        calorieGoal: thisWeekArr[0]?.calorieGoal * 7 || 1800 * 7,
        water: thisWeekArr.reduce((sum, d) => sum + d.waterIntake, 0),
        waterGoal: thisWeekArr[0]?.waterGoal * 7 || 2.5 * 7,
        steps: thisWeekArr.reduce((sum, d) => sum + d.steps, 0),
        stepGoal: thisWeekArr[0]?.stepGoal * 7 || 10000 * 7,
        workouts: thisWeekArr.filter(d => d.activeMinutes > 0).length,
        workoutGoal,
        bestStreak: Math.max(...thisWeekArr.map(d => d.streak), 0),
        currentStreak: thisWeekArr[thisWeekArr.length - 1]?.streak || 0
      };

      const totalsLastWeek = {
        calories: lastWeekArr.reduce((sum, d) => sum + d.activeCalories, 0),
        water: lastWeekArr.reduce((sum, d) => sum + d.waterIntake, 0),
        steps: lastWeekArr.reduce((sum, d) => sum + d.steps, 0),
        workouts: lastWeekArr.filter(d => d.activeMinutes > 0).length,
        bestStreak: Math.max(...lastWeekArr.map(d => d.streak), 0)
      };

      const calculatePercentageDiff = (thisVal: number, lastVal: number) => {
        if (lastVal === 0) return thisVal > 0 ? 100 : 0;
        return Math.round(((thisVal - lastVal) / lastVal) * 100);
      };

      const trends = {
        calories: calculatePercentageDiff(totalsThisWeek.calories, totalsLastWeek.calories),
        water: calculatePercentageDiff(totalsThisWeek.water, totalsLastWeek.water),
        steps: calculatePercentageDiff(totalsThisWeek.steps, totalsLastWeek.steps),
        workouts: totalsThisWeek.workouts - totalsLastWeek.workouts,
        streak: totalsThisWeek.currentStreak - totalsLastWeek.bestStreak
      };

      return {
        thisWeek: thisWeekArr,
        totals: totalsThisWeek,
        trends
      };
    },
    enabled: !!userId,
  });
}
