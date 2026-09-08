import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveTrainerWorkoutPlanDayExercise, deleteTrainerWorkoutPlanDayExercise } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';
import { saveTrainerWorkoutPlanDay } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays';

export function useSaveTrainerWorkoutDayExercises() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deletedExerciseIds, newExercises, currentPlanDayId }: { deletedExerciseIds: string[], newExercises: any[], currentPlanDayId: string }) => {
      for (const id of deletedExerciseIds) {
        await deleteTrainerWorkoutPlanDayExercise(id);
      }
      
      for (const ex of newExercises) {
        await saveTrainerWorkoutPlanDayExercise({
          planDayId: currentPlanDayId,
          workoutVideoId: ex.workoutVideoId,
          exerciseName: ex.exerciseName,
          category: ex.category,
          reps: ex.reps,
          order: ex.order,
          image: ex.image,
          videoUrl: ex.videoUrl,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlanDayExercises', variables.currentPlanDayId] });
      queryClient.invalidateQueries({ queryKey: ['trainerWeeklyPlan'] });
      queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlans'] });
    },
  });
}

export function useMakeTrainerRestDay() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ planDayId, planId, dayOfWeek }: { planDayId: string, planId: string, dayOfWeek: string }) => {
      await saveTrainerWorkoutPlanDay({
        planDayId,
        planId,
        dayOfWeek,
        workoutType: 'Rest',
        durationMinutes: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerWeeklyPlan'] });
      queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlans'] });
      queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlanDay'] });
    }
  });
}

export function useSwapTrainerWorkoutDays() {
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
      const { fetchTrainerWorkoutPlanDayById } = await import('@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays');
      const { fetchTrainerWorkoutPlanDayExercises } = await import('@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises');
      
      if (sourcePlanDayId && targetPlanDayId) {
        const sourceData = await fetchTrainerWorkoutPlanDayById(sourcePlanDayId);
        const targetData = await fetchTrainerWorkoutPlanDayById(targetPlanDayId);
        const sourceExs = await fetchTrainerWorkoutPlanDayExercises(sourcePlanDayId) || [];
        const targetExs = await fetchTrainerWorkoutPlanDayExercises(targetPlanDayId) || [];

        if (sourceData && targetData) {
          await saveTrainerWorkoutPlanDay({
            ...sourceData,
            planDayId: sourcePlanDayId,
            workoutType: targetData.workoutType,
            workoutId: targetData.workoutId,
            durationMinutes: targetData.durationMinutes,
          });

          await saveTrainerWorkoutPlanDay({
            ...targetData,
            planDayId: targetPlanDayId,
            workoutType: sourceData.workoutType,
            workoutId: sourceData.workoutId,
            durationMinutes: sourceData.durationMinutes,
          });

          for (const ex of sourceExs) {
            await saveTrainerWorkoutPlanDayExercise({ ...ex, planDayId: targetPlanDayId });
          }
          for (const ex of targetExs) {
            await saveTrainerWorkoutPlanDayExercise({ ...ex, planDayId: sourcePlanDayId });
          }
        }
      } else if (sourcePlanDayId && !targetPlanDayId) {
        const sourceData = await fetchTrainerWorkoutPlanDayById(sourcePlanDayId);
        const sourceExs = await fetchTrainerWorkoutPlanDayExercises(sourcePlanDayId) || [];

        if (sourceData) {
          const newTarget = await saveTrainerWorkoutPlanDay({
            planId: activePlanId,
            dayOfWeek: targetDayOfWeek,
            workoutType: sourceData.workoutType,
            workoutId: sourceData.workoutId,
            durationMinutes: sourceData.durationMinutes,
          });

          await saveTrainerWorkoutPlanDay({
            ...sourceData,
            planDayId: sourcePlanDayId,
            workoutType: 'Rest',
            workoutId: null,
            durationMinutes: 0,
          });

          if (newTarget) {
            for (const ex of sourceExs) {
              await saveTrainerWorkoutPlanDayExercise({ ...ex, planDayId: newTarget.planDayId });
            }
          }
        }
      } else if (!sourcePlanDayId && targetPlanDayId) {
        const targetData = await fetchTrainerWorkoutPlanDayById(targetPlanDayId);
        const targetExs = await fetchTrainerWorkoutPlanDayExercises(targetPlanDayId) || [];

        if (targetData) {
          const newSource = await saveTrainerWorkoutPlanDay({
            planId: activePlanId,
            dayOfWeek: sourceDayOfWeek,
            workoutType: targetData.workoutType,
            workoutId: targetData.workoutId,
            durationMinutes: targetData.durationMinutes,
          });

          await saveTrainerWorkoutPlanDay({
            ...targetData,
            planDayId: targetPlanDayId,
            workoutType: 'Rest',
            workoutId: null,
            durationMinutes: 0,
          });

          if (newSource) {
            for (const ex of targetExs) {
              await saveTrainerWorkoutPlanDayExercise({ ...ex, planDayId: newSource.planDayId });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerWeeklyPlan'] });
      queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlans'] });
      queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlanDay'] });
      queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlanDayExercises'] });
    }
  });
}
