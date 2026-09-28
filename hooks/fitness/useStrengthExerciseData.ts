import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ExerciseAnalyticsData {
  maxWeight: number;
  totalVolume: number;
  totalSets: number;
  estimated1RM: number;
  logs: any[];
}

export function useStrengthExerciseData(userId: string | null, exerciseName: string | undefined, selectedMonth: Date) {
  return useQuery({
    queryKey: ['strengthExerciseData', userId, exerciseName, selectedMonth.toISOString().substring(0, 7)],
    queryFn: async (): Promise<ExerciseAnalyticsData> => {
      if (!userId || !exerciseName) {
        return {
          maxWeight: 0,
          totalVolume: 0,
          totalSets: 0,
          estimated1RM: 0,
          logs: [],
        };
      }

      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const firstOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
      const lastOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();
      
      const { data: logs, error } = await supabase
        .from('customer_workout_set_logs')
        .select(`
          customerWorkoutSetLogId,
          weight,
          reps,
          sessionDate,
          dayExerciseId,
          workout_plan_day_exercises ( exerciseName, category )
        `)
        .eq('userId', userId)
        .gte('sessionDate', firstOfMonth)
        .lte('sessionDate', lastOfMonth)
        .eq('isCompleted', true);

      if (error) {
        console.error('[useStrengthExerciseData] error:', error);
      }

      const missingIds = new Set<string>();
      (logs || []).forEach((log: any) => {
        if (!log.workout_plan_day_exercises) {
          missingIds.add(log.dayExerciseId);
        }
      });

      const categoryMap: Record<string, {name: string, category: string}> = {};
      
      if (missingIds.size > 0) {
        const idArray = Array.from(missingIds);
        
        const { data: trainerExs } = await supabase
          .from('trainer_workout_plan_day_exercises')
          .select('dayExerciseId, exerciseName, category')
          .in('dayExerciseId', idArray);
          
        trainerExs?.forEach(ex => {
          categoryMap[ex.dayExerciseId] = { name: ex.exerciseName, category: ex.category || 'Other' };
        });

        const { data: customerExs } = await supabase
          .from('workout_plan_day_exercises')
          .select('dayExerciseId, exerciseName, category')
          .in('dayExerciseId', idArray);
          
        customerExs?.forEach(ex => {
          categoryMap[ex.dayExerciseId] = { name: ex.exerciseName, category: ex.category || 'Other' };
        });
      }

      const filteredLogs = (logs || []).filter((log: any) => {
        const mappedEx = categoryMap[log.dayExerciseId];
        let rawName = log.workout_plan_day_exercises?.exerciseName || mappedEx?.name || 'Logged Exercise';
        return rawName.toLowerCase() === exerciseName.toLowerCase();
      });

      let maxWeight = 0;
      let totalVolume = 0;
      let totalSets = filteredLogs.length;
      let max1RM = 0;

      const processedLogs = filteredLogs.map((log: any) => {
        const weight = log.weight || 0;
        const reps = log.reps || 0;
        const volume = weight * reps;
        const e1rm = reps > 1 ? weight * (1 + reps / 30) : weight;

        if (weight > maxWeight) maxWeight = weight;
        totalVolume += volume;
        if (e1rm > max1RM) max1RM = e1rm;

        return {
          id: log.customerWorkoutSetLogId,
          date: log.sessionDate.split('T')[0],
          weight,
          reps,
          volume,
          e1rm
        };
      });
      
      processedLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        maxWeight,
        totalVolume,
        totalSets,
        estimated1RM: Math.round(max1RM),
        logs: processedLogs,
      };
    },
    enabled: !!userId && !!exerciseName,
  });
}
