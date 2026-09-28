import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { progressService } from '@/lib/services/progressService';

export interface MonthlyAnalysisData {
  workoutDaysCount: number;
  workoutLogDates: string[];
  weightPoints: { date: string; weight: number }[];
  categoryDistribution: { name: string; percentage: number }[];
}

function guessCategory(exerciseName: string): string {
  const name = (exerciseName || '').toLowerCase();
  
  if (name.includes('chest') || name.includes('bench') || name.includes('pec') || name.includes('pushup') || name.includes('fly')) return 'Chest';
  if (name.includes('back') || name.includes('row') || name.includes('pull') || name.includes('lat') || name.includes('chin')) return 'Back';
  if (name.includes('leg') || name.includes('squat') || name.includes('press') || name.includes('curl') || name.includes('extension') || name.includes('calf') || name.includes('lunge')) return 'Legs';
  if (name.includes('shoulder') || name.includes('delt') || name.includes('raise') || name.includes('overhead')) return 'Shoulders';
  if (name.includes('arm') || name.includes('bicep') || name.includes('tricep') || name.includes('curl') || name.includes('extension') || name.includes('pushdown')) return 'Arms';
  if (name.includes('core') || name.includes('abs') || name.includes('crunch') || name.includes('plank') || name.includes('situp')) return 'Core';
  
  return 'Other';
}

export function useMonthlyAnalysis(userId: string | null, selectedMonth: Date) {
  return useQuery({
    queryKey: ['monthlyAnalysis', userId, selectedMonth.toISOString().substring(0, 7)],
    queryFn: async (): Promise<MonthlyAnalysisData> => {
      if (!userId) {
        return {
          workoutDaysCount: 0,
          workoutLogDates: [],
          weightPoints: [],
          categoryDistribution: [],
        };
      }

      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const firstOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
      const lastOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

      // Query 1: Workout Logs (for heatmap and days count)
      const { data: workoutLogs, error: workoutLogsError } = await supabase
        .from('customer_workout_logs')
        .select('completedAt')
        .eq('userId', userId)
        .gte('completedAt', firstOfMonth)
        .lte('completedAt', lastOfMonth);

      if (workoutLogsError) {
        console.error('[useMonthlyAnalysis] workoutLogsError:', workoutLogsError);
      }

      const workoutLogDates = Array.from(new Set(
        (workoutLogs || []).map(log => log.completedAt.split('T')[0])
      ));
      const workoutDaysCount = workoutLogDates.length;

      // Query 2: Weight Measurements for Chart
      const measurementHistory = await progressService.getMeasurementHistory(userId);
      const weightPoints = measurementHistory
        .filter(m => m.weight && m.loggedAt >= firstOfMonth && m.loggedAt <= lastOfMonth)
        .map(m => ({ date: m.loggedAt.split('T')[0], weight: m.weight! }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Query 3: Set Logs by Category (Distribution)
      // Step A: Fetch set logs first
      const { data: setLogs, error: setLogsError } = await supabase
        .from('customer_workout_set_logs')
        .select(`
          dayExerciseId,
          workout_plan_day_exercises ( exerciseName, category )
        `)
        .eq('userId', userId)
        .gte('sessionDate', firstOfMonth)
        .lte('sessionDate', lastOfMonth)
        .eq('isCompleted', true);

      if (setLogsError) {
        console.error('[useMonthlyAnalysis] setLogsError:', setLogsError);
      }

      // Step B: Identify logs that are missing exercise details (usually from trainer plans)
      const missingIds = new Set<string>();
      (setLogs || []).forEach((log: any) => {
        if (!log.workout_plan_day_exercises) {
          missingIds.add(log.dayExerciseId);
        }
      });

      // Step C: Batch fetch missing categories
      const categoryMap: Record<string, {name: string, category: string}> = {};
      
      if (missingIds.size > 0) {
        const idArray = Array.from(missingIds);
        
        // Try trainer plan exercises
        const { data: trainerExs } = await supabase
          .from('trainer_workout_plan_day_exercises')
          .select('dayExerciseId, exerciseName, category')
          .in('dayExerciseId', idArray);
          
        trainerExs?.forEach(ex => {
          categoryMap[ex.dayExerciseId] = { name: ex.exerciseName, category: ex.category || 'Other' };
        });

        // Try customer plan exercises (just in case they weren't caught by the join)
        const { data: customerExs } = await supabase
          .from('workout_plan_day_exercises')
          .select('dayExerciseId, exerciseName, category')
          .in('dayExerciseId', idArray);
          
        customerExs?.forEach(ex => {
          categoryMap[ex.dayExerciseId] = { name: ex.exerciseName, category: ex.category || 'Other' };
        });
      }

      // Step D: Calculate category distribution
      const categoryCounts: Record<string, number> = {};
      let totalSets = 0;

      (setLogs || []).forEach((log: any) => {
        const mappedEx = categoryMap[log.dayExerciseId];
        
        let rawCategory = log.workout_plan_day_exercises?.category || mappedEx?.category || 'Other';
        let rawName = log.workout_plan_day_exercises?.exerciseName || mappedEx?.name || '';
        
        let category = (rawCategory || '').trim();
        const catLower = category.toLowerCase();
        
        if (catLower === 'other' || catLower === 'exercise' || catLower === 'exercises' || !category) {
          const guessed = guessCategory(rawName);
          category = guessed === 'Other' ? 'General' : guessed;
        }
        
        category = category.charAt(0).toUpperCase() + category.slice(1);
        
        if (!categoryCounts[category]) {
          categoryCounts[category] = 0;
        }
        categoryCounts[category]++;
        totalSets++;
      });

      const categoryDistribution = Object.entries(categoryCounts)
        .map(([name, count]) => ({
          name,
          percentage: totalSets > 0 ? Math.round((count / totalSets) * 100) : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      return {
        workoutDaysCount,
        workoutLogDates,
        weightPoints,
        categoryDistribution,
      };
    },
    enabled: !!userId,
  });
}
