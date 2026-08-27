import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveWorkoutPlanDayExercise, deleteWorkoutPlanDayExercise } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import { saveWorkoutPlanDay } from '@/helpers/customerWorkoutPlans/workoutPlansDays';

export function useSaveWorkoutDayExercises() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deletedExerciseIds, newExercises, currentPlanDayId }: { deletedExerciseIds: string[], newExercises: any[], currentPlanDayId: string }) => {
      for (const id of deletedExerciseIds) {
        await deleteWorkoutPlanDayExercise(id);
      }
      
      for (const ex of newExercises) {
        await saveWorkoutPlanDayExercise({
          planDayId: currentPlanDayId,
          exerciseName: ex.exerciseName,
          category: ex.category,
          reps: ex.reps,
          order: ex.order,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlanDayExercises', variables.currentPlanDayId] });
      queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan'] });
      queryClient.invalidateQueries({ queryKey: ['customerDashboardData'] });
    },
  });
}

export function useMakeRestDay() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ planDayId, planId, dayOfWeek }: { planDayId: string, planId: string, dayOfWeek: string }) => {
      await saveWorkoutPlanDay({
        planDayId,
        planId,
        dayOfWeek,
        workoutType: 'Rest',
        durationMinutes: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan'] });
      queryClient.invalidateQueries({ queryKey: ['customerDashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['workoutPlanDay'] });
    }
  });
}

export function useSwapWorkoutDays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourcePlanDayId,
      targetPlanDayId,
      sourceDayOfWeek,
      targetDayOfWeek,
      activePlanId
    }: {
      sourcePlanDayId: string | null;
      targetPlanDayId: string | null;
      sourceDayOfWeek: string;
      targetDayOfWeek: string;
      activePlanId: string;
    }) => {
      // Import the helper functions dynamically or ensure they are imported at the top of the file
      const { fetchWorkoutPlanDayById } = await import('@/helpers/customerWorkoutPlans/workoutPlansDays');
      const { fetchWorkoutPlanDayExercises } = await import('@/helpers/customerWorkoutPlans/workoutPlanDayExercises');
      
      if (sourcePlanDayId && targetPlanDayId) {
        const sourceData = await fetchWorkoutPlanDayById(sourcePlanDayId);
        const targetData = await fetchWorkoutPlanDayById(targetPlanDayId);
        const sourceExs = await fetchWorkoutPlanDayExercises(sourcePlanDayId) || [];
        const targetExs = await fetchWorkoutPlanDayExercises(targetPlanDayId) || [];

        if (sourceData && targetData) {
          await saveWorkoutPlanDay({
            ...sourceData,
            planDayId: sourcePlanDayId,
            workoutType: targetData.workoutType,
            durationMinutes: targetData.durationMinutes,
          });

          await saveWorkoutPlanDay({
            ...targetData,
            planDayId: targetPlanDayId,
            workoutType: sourceData.workoutType,
            durationMinutes: sourceData.durationMinutes,
          });

          for (const ex of sourceExs) {
            await saveWorkoutPlanDayExercise({ ...ex, planDayId: targetPlanDayId });
          }
          for (const ex of targetExs) {
            await saveWorkoutPlanDayExercise({ ...ex, planDayId: sourcePlanDayId });
          }
        }
      } else if (sourcePlanDayId && !targetPlanDayId) {
        const sourceData = await fetchWorkoutPlanDayById(sourcePlanDayId);
        const sourceExs = await fetchWorkoutPlanDayExercises(sourcePlanDayId) || [];

        if (sourceData) {
          const newTarget = await saveWorkoutPlanDay({
            planId: activePlanId,
            dayOfWeek: targetDayOfWeek,
            workoutType: sourceData.workoutType,
            durationMinutes: sourceData.durationMinutes,
          });

          await saveWorkoutPlanDay({
            ...sourceData,
            planDayId: sourcePlanDayId,
            workoutType: 'Rest',
            durationMinutes: 0,
          });

          if (newTarget) {
            for (const ex of sourceExs) {
              await saveWorkoutPlanDayExercise({ ...ex, planDayId: newTarget.planDayId });
            }
          }
        }
      } else if (!sourcePlanDayId && targetPlanDayId) {
        const targetData = await fetchWorkoutPlanDayById(targetPlanDayId);
        const targetExs = await fetchWorkoutPlanDayExercises(targetPlanDayId) || [];

        if (targetData) {
          const newSource = await saveWorkoutPlanDay({
            planId: activePlanId,
            dayOfWeek: sourceDayOfWeek,
            workoutType: targetData.workoutType,
            durationMinutes: targetData.durationMinutes,
          });

          await saveWorkoutPlanDay({
            ...targetData,
            planDayId: targetPlanDayId,
            workoutType: 'Rest',
            durationMinutes: 0,
          });

          if (newSource) {
            for (const ex of targetExs) {
              await saveWorkoutPlanDayExercise({ ...ex, planDayId: newSource.planDayId });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan'] });
      queryClient.invalidateQueries({ queryKey: ['customerDashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['workoutPlanDay'] });
      queryClient.invalidateQueries({ queryKey: ['workoutPlanDayExercises'] });
    }
  });
}

