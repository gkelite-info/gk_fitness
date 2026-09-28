import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

function guessCategory(exerciseName: string): string {
  const name = (exerciseName || '').toLowerCase();
  if (name.includes('chest') || name.includes('bench') || name.includes('pec') || name.includes('pushup') || name.includes('fly')) return 'Chest';
  if (name.includes('back') || name.includes('row') || name.includes('pull') || name.includes('lat') || name.includes('chin') || name.includes('deadlift')) return 'Back';
  if (name.includes('leg') || name.includes('squat') || name.includes('press') || name.includes('curl') || name.includes('extension') || name.includes('calf') || name.includes('lunge')) return 'Legs';
  if (name.includes('shoulder') || name.includes('delt') || name.includes('raise') || name.includes('overhead')) return 'Shoulders';
  if (name.includes('arm') || name.includes('bicep') || name.includes('tricep') || name.includes('curl') || name.includes('extension') || name.includes('pushdown')) return 'Arms';
  if (name.includes('core') || name.includes('abs') || name.includes('crunch') || name.includes('plank') || name.includes('situp')) return 'Core';
  return 'Other';
}

export interface StrengthRecord {
  exerciseName: string;
  category: string;
  maxWeight: number;
  totalVolume: number;
  totalSets: number;
}

export function useStrengthData() {
  const { userId } = useUser();

  return useQuery({
    queryKey: ['strengthData', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Fetch user's planned exercises to ensure the screen is never empty
      let activePlan = null;
      let isTrainerPlan = false;

      // Try customer plans first
      const customerPlans = await fetchCustomerWorkoutPlans(userId);
      activePlan = customerPlans?.find((p: any) => p.isActive);

      // If no active customer plan, try trainer plans
      if (!activePlan) {
        const { fetchTrainerWorkoutPlans } = await import('@/helpers/trainerWorkoutPlans/trainerWorkoutPlans');
        const trainerPlans = await fetchTrainerWorkoutPlans(userId);
        activePlan = trainerPlans?.find((p: any) => p.isActive) || trainerPlans?.[0];
        isTrainerPlan = !!activePlan;
      }
      
      const exerciseMap: Record<string, StrengthRecord> = {};
      
      if (activePlan) {
        if (isTrainerPlan) {
          const { fetchTrainerWorkoutPlanDays } = await import('@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays');
          const { fetchTrainerWorkoutPlanDayExercises } = await import('@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises');
          const days = await fetchTrainerWorkoutPlanDays(activePlan.planId);
          for (const d of days) {
            if (d.workoutType && d.workoutType !== 'Rest') {
              const exs = await fetchTrainerWorkoutPlanDayExercises(d.planDayId);
              exs?.forEach((ex: any) => {
                if (!exerciseMap[ex.exerciseName]) {
                  exerciseMap[ex.exerciseName] = {
                    exerciseName: ex.exerciseName,
                    category: (ex.category && ex.category.toLowerCase() !== 'other' && ex.category.toLowerCase() !== 'exercise') ? ex.category : guessCategory(ex.exerciseName),
                    maxWeight: 0,
                    totalVolume: 0,
                    totalSets: 0,
                  };
                }
              });
            }
          }
        } else {
          const days = await fetchWorkoutPlanDays(activePlan.planId);
          for (const d of days) {
            if (d.workoutType && d.workoutType !== 'Rest') {
              const exs = await fetchWorkoutPlanDayExercises(d.planDayId);
              exs?.forEach((ex: any) => {
                if (!exerciseMap[ex.exerciseName]) {
                  exerciseMap[ex.exerciseName] = {
                    exerciseName: ex.exerciseName,
                    category: (ex.category && ex.category.toLowerCase() !== 'other' && ex.category.toLowerCase() !== 'exercise') ? ex.category : guessCategory(ex.exerciseName),
                    maxWeight: 0,
                    totalVolume: 0,
                    totalSets: 0,
                  };
                }
              });
            }
          }
        }
      }

      // 2. Fetch logged data to populate the stats
      const { data: logs, error } = await supabase
        .from('customer_workout_set_logs')
        .select(`
          weight,
          reps,
          dayExerciseId,
          workout_plan_day_exercises ( exerciseName, category )
        `)
        .eq('userId', userId)
        .eq('isCompleted', true);

      if (error) {
        console.error('[useStrengthData] Error:', error);
      }

      if (logs && logs.length > 0) {
        logs.forEach((log: any) => {
          if (!log.weight || !log.reps) return;
          
          let exName = log.workout_plan_day_exercises?.exerciseName;
          let exCategory = log.workout_plan_day_exercises?.category || 'Other';
          
          if (!exName) {
            // fallback if it was a trainer plan or deleted exercise
            exName = 'Logged Exercise';
          }
          
          if (exCategory.toLowerCase() === 'other' || exCategory.toLowerCase() === 'exercise') {
            exCategory = guessCategory(exName);
          }

          if (!exerciseMap[exName]) {
            exerciseMap[exName] = {
              exerciseName: exName,
              category: exCategory,
              maxWeight: 0,
              totalVolume: 0,
              totalSets: 0,
            };
          }

          const stats = exerciseMap[exName];
          const volume = log.weight * log.reps;

          if (log.weight > stats.maxWeight) {
            stats.maxWeight = log.weight;
          }

          stats.totalVolume += volume;
          stats.totalSets += 1;
        });
      }

      // 3. Return sorted by maxWeight, then alphabetically
      return Object.values(exerciseMap)
        .filter(x => x.exerciseName !== 'Logged Exercise')
        .sort((a, b) => {
          if (b.maxWeight !== a.maxWeight) return b.maxWeight - a.maxWeight;
          return a.exerciseName.localeCompare(b.exerciseName);
        });
    },
    enabled: !!userId,
  });
}
