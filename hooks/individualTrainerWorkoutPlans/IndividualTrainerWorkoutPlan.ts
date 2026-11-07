import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualTrainerWorkoutPlans,
  fetchIndividualTrainerWorkoutPlanById,
  fetchActiveIndividualTrainerWorkoutPlan,
  saveIndividualTrainerWorkoutPlan,
  deleteIndividualTrainerWorkoutPlan,
  deactivateIndividualTrainerWorkoutPlans,
  toggleIndividualTrainerWorkoutPlanActiveStatus,
  fetchIndividualTrainerWorkoutPlansPaginated,
  IndividualTrainerWorkoutPlanAttributes,
  SaveIndividualTrainerWorkoutPlanParams,
  FetchIndividualTrainerWorkoutPlansFilter,
  FetchIndividualTrainerWorkoutPlansPaginatedParams,
} from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlan';

export type {
  IndividualTrainerWorkoutPlanAttributes,
  SaveIndividualTrainerWorkoutPlanParams,
  FetchIndividualTrainerWorkoutPlansFilter,
  FetchIndividualTrainerWorkoutPlansPaginatedParams,
};

export function useIndividualTrainerWorkoutPlans(
  userId?: string | null,
  createdBy?: string | null,
  isActive?: boolean,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerWorkoutPlans', userId, createdBy, isActive],
    queryFn: async () => {
      return await fetchIndividualTrainerWorkoutPlans(
        userId ?? undefined,
        createdBy ?? undefined,
        isActive
      );
    },
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(userId || createdBy),
  });
}

export function useIndividualTrainerWorkoutPlanById(
  planId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerWorkoutPlan', planId],
    queryFn: async () => {
      if (!planId) return null;
      return await fetchIndividualTrainerWorkoutPlanById(planId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!planId,
  });
}

export function useActiveIndividualTrainerWorkoutPlan(
  userId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['activeIndividualTrainerWorkoutPlan', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await fetchActiveIndividualTrainerWorkoutPlan(userId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!userId,
  });
}

export function useIndividualTrainerWorkoutPlansPaginated(
  params: FetchIndividualTrainerWorkoutPlansPaginatedParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerWorkoutPlansPaginated', params],
    queryFn: async () => {
      return await fetchIndividualTrainerWorkoutPlansPaginated(params);
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

export function useSaveIndividualTrainerWorkoutPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planData: SaveIndividualTrainerWorkoutPlanParams) => {
      return await saveIndividualTrainerWorkoutPlan(planData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlans'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlansPaginated'] });
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan', variables.userId] });
      }
      if (variables.planId) {
        queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlan', variables.planId] });
      }
    },
  });
}

export function useDeleteIndividualTrainerWorkoutPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      return await deleteIndividualTrainerWorkoutPlan(planId);
    },
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlans'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlansPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlan', planId] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

export function useDeactivateIndividualTrainerWorkoutPlans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return await deactivateIndividualTrainerWorkoutPlans(userId);
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlans'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan', userId] });
    },
  });
}

export function useToggleIndividualTrainerWorkoutPlanActiveStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      currentStatus,
    }: {
      planId: string;
      currentStatus: boolean;
    }) => {
      return await toggleIndividualTrainerWorkoutPlanActiveStatus(planId, currentStatus);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlans'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlan', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

