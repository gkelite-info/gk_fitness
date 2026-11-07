import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualTrainerWorkoutPlanDayExercises,
  fetchIndividualTrainerWorkoutPlanDayExerciseById,
  fetchPaginatedIndividualTrainerWorkoutPlanDayExercises,
  saveIndividualTrainerWorkoutPlanDayExercise,
  saveMultipleIndividualTrainerWorkoutPlanDayExercises,
  deleteIndividualTrainerWorkoutPlanDayExercise,
  deleteIndividualTrainerWorkoutPlanDayExercisesByPlanDayId,
  reorderIndividualTrainerWorkoutPlanDayExercises,
  IndividualTrainerWorkoutPlanDayExerciseAttributes,
  SaveIndividualTrainerWorkoutPlanDayExerciseParams,
} from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlanDayExercise';

export type {
  IndividualTrainerWorkoutPlanDayExerciseAttributes,
  SaveIndividualTrainerWorkoutPlanDayExerciseParams,
};

export function useIndividualTrainerWorkoutPlanDayExercises(
  planDayId?: string | null,
  targetGender?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerWorkoutPlanDayExercises', planDayId, targetGender],
    queryFn: async () => {
      if (!planDayId) return [];
      return await fetchIndividualTrainerWorkoutPlanDayExercises(planDayId, targetGender);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!planDayId,
  });
}

export function useIndividualTrainerWorkoutPlanDayExerciseById(
  dayExerciseId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerWorkoutPlanDayExercise', dayExerciseId],
    queryFn: async () => {
      if (!dayExerciseId) return null;
      return await fetchIndividualTrainerWorkoutPlanDayExerciseById(dayExerciseId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!dayExerciseId,
  });
}

export function usePaginatedIndividualTrainerWorkoutPlanDayExercises(
  planDayId?: string | null,
  page: number = 1,
  limit: number = 10,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['paginatedIndividualTrainerWorkoutPlanDayExercises', planDayId, page, limit],
    queryFn: async () => {
      return await fetchPaginatedIndividualTrainerWorkoutPlanDayExercises(planDayId, page, limit);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!planDayId,
  });
}

export function useSaveIndividualTrainerWorkoutPlanDayExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exerciseData: SaveIndividualTrainerWorkoutPlanDayExerciseParams) => {
      return await saveIndividualTrainerWorkoutPlanDayExercise(exerciseData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlanDayExercises', variables.planDayId],
      });
      if (variables.dayExerciseId) {
        queryClient.invalidateQueries({
          queryKey: ['individualTrainerWorkoutPlanDayExercise', variables.dayExerciseId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['paginatedIndividualTrainerWorkoutPlanDayExercises', variables.planDayId],
      });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlanDays'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlanDay', variables.planDayId] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

export function useSaveMultipleIndividualTrainerWorkoutPlanDayExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planDayId,
      exercises,
    }: {
      planDayId: string;
      exercises: SaveIndividualTrainerWorkoutPlanDayExerciseParams[];
    }) => {
      return await saveMultipleIndividualTrainerWorkoutPlanDayExercises(planDayId, exercises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlanDayExercises', variables.planDayId],
      });
      queryClient.invalidateQueries({
        queryKey: ['paginatedIndividualTrainerWorkoutPlanDayExercises', variables.planDayId],
      });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlanDays'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlanDay', variables.planDayId] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

export function useDeleteIndividualTrainerWorkoutPlanDayExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dayExerciseId,
      planDayId,
    }: {
      dayExerciseId: string;
      planDayId?: string;
    }) => {
      return await deleteIndividualTrainerWorkoutPlanDayExercise(dayExerciseId);
    },
    onSuccess: (_, variables) => {
      if (variables.planDayId) {
        queryClient.invalidateQueries({
          queryKey: ['individualTrainerWorkoutPlanDayExercises', variables.planDayId],
        });
        queryClient.invalidateQueries({
          queryKey: ['paginatedIndividualTrainerWorkoutPlanDayExercises', variables.planDayId],
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ['individualTrainerWorkoutPlanDayExercises'],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlanDayExercise', variables.dayExerciseId],
      });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

export function useDeleteIndividualTrainerWorkoutPlanDayExercisesByPlanDayId() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planDayId: string) => {
      return await deleteIndividualTrainerWorkoutPlanDayExercisesByPlanDayId(planDayId);
    },
    onSuccess: (_, planDayId) => {
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlanDayExercises', planDayId],
      });
      queryClient.invalidateQueries({
        queryKey: ['paginatedIndividualTrainerWorkoutPlanDayExercises', planDayId],
      });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

export function useReorderIndividualTrainerWorkoutPlanDayExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planDayId,
      reorderedExercises,
    }: {
      planDayId: string;
      reorderedExercises: { dayExerciseId: string; order: number }[];
    }) => {
      return await reorderIndividualTrainerWorkoutPlanDayExercises(reorderedExercises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlanDayExercises', variables.planDayId],
      });
      queryClient.invalidateQueries({
        queryKey: ['paginatedIndividualTrainerWorkoutPlanDayExercises', variables.planDayId],
      });
    },
  });
}

