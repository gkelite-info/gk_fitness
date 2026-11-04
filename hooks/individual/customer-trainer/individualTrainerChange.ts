import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualTrainerChangeLogs,
  fetchIndividualTrainerChangeLogById,
  fetchTrainerChangeLogsByUser,
  fetchTrainerChangeLogsPaginated,
  saveIndividualTrainerChangeLog,
  deleteIndividualTrainerChangeLog,
  IndividualTrainerChangeLogsAttributes,
  SaveIndividualTrainerChangeLogParams,
  FetchIndividualTrainerChangeLogsFilter,
} from '@/helpers/individual/customer-trainer/individualTrainerChange';

export type {
  IndividualTrainerChangeLogsAttributes,
  SaveIndividualTrainerChangeLogParams,
  FetchIndividualTrainerChangeLogsFilter,
};

export function useIndividualTrainerChangeLogs(
  filters?: FetchIndividualTrainerChangeLogsFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerChangeLogs', filters],
    queryFn: async () => {
      return await fetchIndividualTrainerChangeLogs(filters);
    },
    ...options,
  });
}

export function useIndividualTrainerChangeLogById(
  individualTrainerChangeLogId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerChangeLog', individualTrainerChangeLogId],
    queryFn: async () => {
      if (!individualTrainerChangeLogId) return null;
      return await fetchIndividualTrainerChangeLogById(individualTrainerChangeLogId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!individualTrainerChangeLogId,
    ...options,
  });
}

export function useTrainerChangeLogsByUser(
  userId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['trainerChangeLogsByUser', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await fetchTrainerChangeLogsByUser(userId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!userId,
    ...options,
  });
}

export function useTrainerChangeLogsPaginated(
  page = 1,
  limit = 10,
  filters?: {
    userId?: string;
    trainerId?: string;
    changedBy?: string;
    reason?: string;
    searchQuery?: string;
    sortOrder?: 'newest' | 'oldest';
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['trainerChangeLogsPaginated', page, limit, filters],
    queryFn: async () => {
      return await fetchTrainerChangeLogsPaginated(page, limit, filters);
    },
    ...options,
  });
}

export function useSaveIndividualTrainerChangeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveIndividualTrainerChangeLogParams) => {
      return await saveIndividualTrainerChangeLog(params);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerChangeLogs'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerChangeLog'] });
      queryClient.invalidateQueries({ queryKey: ['trainerChangeLogsPaginated'] });
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['trainerChangeLogsByUser', variables.userId] });
      }
    },
  });
}

export function useDeleteIndividualTrainerChangeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (individualTrainerChangeLogId: string) => {
      return await deleteIndividualTrainerChangeLog(individualTrainerChangeLogId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerChangeLogs'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerChangeLog'] });
      queryClient.invalidateQueries({ queryKey: ['trainerChangeLogsPaginated'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['trainerChangeLogsByUser', data.userId] });
      }
    },
  });
}

