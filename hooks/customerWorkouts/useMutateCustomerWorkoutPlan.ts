import { softDeleteEntireCustomerPlan } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { useUser } from '@/context/UserContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveWorkoutPlanDayExercise, deleteWorkoutPlanDayExercise } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import { saveWorkoutPlanDay } from '@/helpers/customerWorkoutPlans/workoutPlansDays';

export function useSaveWorkoutDayExercises() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      deletedExerciseIds = [],
      exercises,
      newExercises,
      currentPlanDayId
    }: {
      deletedExerciseIds: string[];
      exercises?: any[];
      newExercises?: any[];
      currentPlanDayId: string;
    }) => {
      for (const id of deletedExerciseIds) {
        await deleteWorkoutPlanDayExercise(id);
      }
      
      const listToSave = exercises || newExercises || [];
      for (let i = 0; i < listToSave.length; i++) {
        const ex = listToSave[i];
        await saveWorkoutPlanDayExercise({
          dayExerciseId: ex.dayExerciseId || undefined,
          planDayId: currentPlanDayId,
          workoutVideoId: ex.workoutVideoId,
          exerciseName: ex.exerciseName,
          category: ex.category || 'General',
          reps: ex.reps?.toString().trim() || '10-12',
          order: i,
          sets: Number(ex.sets) > 0 ? Number(ex.sets) : 3,
          image: ex.image || null,
          videoUrl: ex.videoUrl || null,
        });
      }
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workoutPlanDayExercises', variables.currentPlanDayId] }),
        queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['customerDashboardData'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlanDay'] })
      ]);
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['customerDashboardData'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlanDay'] })
      ]);
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
            workoutId: targetData.workoutId,
            durationMinutes: targetData.durationMinutes,
            weekNumber: sourceData.weekNumber || 1,
          });

          await saveWorkoutPlanDay({
            ...targetData,
            planDayId: targetPlanDayId,
            workoutType: sourceData.workoutType,
            workoutId: sourceData.workoutId,
            durationMinutes: sourceData.durationMinutes,
            weekNumber: targetData.weekNumber || 1,
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
            workoutId: sourceData.workoutId,
            durationMinutes: sourceData.durationMinutes,
            weekNumber: sourceData.weekNumber || 1,
          });

          await saveWorkoutPlanDay({
            ...sourceData,
            planDayId: sourcePlanDayId,
            workoutType: 'Rest',
            workoutId: null,
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
            workoutId: targetData.workoutId,
            durationMinutes: targetData.durationMinutes,
            weekNumber: targetData.weekNumber || 1,
          });

          await saveWorkoutPlanDay({
            ...targetData,
            planDayId: targetPlanDayId,
            workoutType: 'Rest',
            workoutId: null,
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



export function useResetCustomerWorkoutPlan() {
  const queryClient = useQueryClient();
  const { userId } = useUser();

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      return await softDeleteEntireCustomerPlan(userId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customerDashboardData'] }),
        queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan'] }),
        queryClient.invalidateQueries({ queryKey: ['customerWorkoutPlans'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlanDay'] }),
        queryClient.invalidateQueries({ queryKey: ['workoutPlanDayExercises'] }),
      ]);
    },
  });
}
