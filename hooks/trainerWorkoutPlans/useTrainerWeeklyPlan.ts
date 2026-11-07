import { useQuery } from '@tanstack/react-query';
import { fetchTrainerWorkoutPlans } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlans';
import { fetchTrainerWorkoutPlanDays } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays';
import { fetchTrainerWorkoutPlanDayExercises } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';
import { fetchIndividualTrainerWorkoutPlans } from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlan';
import { fetchIndividualTrainerWorkoutPlanDays } from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlanDay';
import { fetchIndividualTrainerWorkoutPlanDayExercises } from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlanDayExercise';

export function useTrainerWeeklyPlan(
  userId: string | null | undefined,
  fallbackUserId?: string | null,
  isGlobalTrainer?: boolean
) {
  return useQuery({
    queryKey: ['trainerWeeklyPlan', userId, fallbackUserId, isGlobalTrainer],
    queryFn: async () => {
      if (!userId && !fallbackUserId) return null;
      
      // If global trainer, STRICTLY query individual_trainer_workout_plans
      if (isGlobalTrainer) {
        let indPlans = await fetchIndividualTrainerWorkoutPlans(userId || undefined);
        if ((!indPlans || indPlans.length === 0) && fallbackUserId && fallbackUserId !== userId) {
          indPlans = await fetchIndividualTrainerWorkoutPlans(fallbackUserId);
        }
        const activeIndPlan = indPlans?.find((p: any) => p.isActive);
        if (activeIndPlan) {
          const indDays = await fetchIndividualTrainerWorkoutPlanDays(activeIndPlan.planId);
          const loadedIndPlanDays: any = {};

          const activeIndDays = indDays.filter((d: any) => d.workoutType && d.workoutType !== 'Rest');
          const fetchIndPromises = activeIndDays.map(async (d: any) => {
            const exs = await fetchIndividualTrainerWorkoutPlanDayExercises(d.planDayId);
            return { d, exs };
          });
          const indResults = await Promise.all(fetchIndPromises);

          for (const { d, exs } of indResults) {
            loadedIndPlanDays[d.dayOfWeek] = {
              dayOfWeek: d.dayOfWeek,
              workoutType: d.workoutType,
              workoutId: d.workoutId || null,
              durationMinutes: d.durationMinutes,
              exercises: exs,
              planDayId: d.planDayId,
            };
          }
          return loadedIndPlanDays;
        }
        return null;
      }

      // Otherwise gym trainer workout plans
      let plans = await fetchTrainerWorkoutPlans(userId || undefined);
      if ((!plans || plans.length === 0) && fallbackUserId && fallbackUserId !== userId) {
        plans = await fetchTrainerWorkoutPlans(fallbackUserId);
      }
      const activePlan = plans?.find((p: any) => p.isActive);
      
      if (activePlan) {
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
      }

      return null;
    },
    enabled: !!(userId || fallbackUserId),
  });
}
