import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualCustomerTrainers,
  fetchIndividualCustomerTrainerById,
  fetchAssignedGlobalTrainersByUser,
  fetchIndividualCustomerTrainersPaginated,
  saveIndividualCustomerTrainer,
  deleteIndividualCustomerTrainer,
  IndividualCustomerTrainerAttributes,
  SaveIndividualCustomerTrainerParams,
  FetchIndividualCustomerTrainersFilter,
  IndividualTrainerRequestStatus,
} from '@/helpers/individual/customer-trainer/individualCustomerTrainer';

export type {
  IndividualCustomerTrainerAttributes,
  SaveIndividualCustomerTrainerParams,
  FetchIndividualCustomerTrainersFilter,
  IndividualTrainerRequestStatus,
};

/**
 * 1. Hook to fetch individual customer trainers with optional filters.
 */
export function useIndividualCustomerTrainers(
  filters?: FetchIndividualCustomerTrainersFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerTrainers', filters],
    queryFn: async () => {
      return await fetchIndividualCustomerTrainers(filters);
    },
    ...options,
  });
}

/**
 * 2. Hook to fetch a single assignment record by ID.
 */
export function useIndividualCustomerTrainerById(
  individualCustomerTrainerId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerTrainer', individualCustomerTrainerId],
    queryFn: async () => {
      if (!individualCustomerTrainerId) return null;
      return await fetchIndividualCustomerTrainerById(individualCustomerTrainerId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!individualCustomerTrainerId,
    ...options,
  });
}

/**
 * 3. Hook to fetch all global trainers assigned to a specific user/customer.
 */
export function useAssignedGlobalTrainersByUser(
  userId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['assignedGlobalTrainers', 'user', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await fetchAssignedGlobalTrainersByUser(userId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!userId,
    ...options,
  });
}

/**
 * 4. Hook for paginated individual customer trainers (for data tables).
 */
export function useIndividualCustomerTrainersPaginated(
  page = 1,
  limit = 10,
  filters?: {
    searchQuery?: string;
    statusFilter?: 'all' | 'active' | 'inactive';
    requestStatus?: IndividualTrainerRequestStatus;
    globalTrainerId?: string;
    userId?: string;
    sortOrder?: 'newest' | 'oldest';
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerTrainersPaginated', page, limit, filters],
    queryFn: async () => {
      return await fetchIndividualCustomerTrainersPaginated(page, limit, filters);
    },
    ...options,
  });
}

/**
 * 5. Mutation Hook: Save (Insert or Update) an assignment.
 */
export function useSaveIndividualCustomerTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveIndividualCustomerTrainerParams) => {
      return await saveIndividualCustomerTrainer(params);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainer'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainersPaginated'] });
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers', 'user', variables.userId] });
      }
    },
  });
}

/**
 * 6. Mutation Hook: Soft delete an assignment.
 */
export function useDeleteIndividualCustomerTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (individualCustomerTrainerId: string) => {
      return await deleteIndividualCustomerTrainer(individualCustomerTrainerId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainer'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainersPaginated'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers', 'user', data.userId] });
      }
    },
  });
}
