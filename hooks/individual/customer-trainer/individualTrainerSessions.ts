import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualTrainerSessions,
  fetchIndividualTrainerSessionById,
  fetchIndividualTrainerSessionsForDate,
  fetchIndividualTrainerSessionsByGlobalTrainer,
  fetchIndividualTrainerSessionsByCustomerTrainerId,
  fetchIndividualTrainerSessionsPaginated,
  saveIndividualTrainerSession,
  updateIndividualTrainerSessionStatus,
  deleteIndividualTrainerSession,
  IndividualTrainerSessionAttributes,
  SaveIndividualTrainerSessionParams,
  FetchIndividualTrainerSessionsFilter,
  IndividualTrainerSessionStatus,
} from '@/helpers/individual/customer-trainer/individualTrainerSessions';

export type {
  IndividualTrainerSessionAttributes,
  SaveIndividualTrainerSessionParams,
  FetchIndividualTrainerSessionsFilter,
  IndividualTrainerSessionStatus,
};

export function useIndividualTrainerSessions(
  filters?: FetchIndividualTrainerSessionsFilter,
  options?: { enabled?: boolean; staleTime?: number; refetchOnWindowFocus?: boolean; refetchOnMount?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerSessions', filters],
    queryFn: async () => {
      return await fetchIndividualTrainerSessions(filters);
    },
    ...options,
  });
}

export function useIndividualTrainerSessionById(
  individualTrainerSessionId?: string | null,
  options?: { enabled?: boolean; staleTime?: number; refetchOnWindowFocus?: boolean; refetchOnMount?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerSession', individualTrainerSessionId],
    queryFn: async () => {
      if (!individualTrainerSessionId) return null;
      return await fetchIndividualTrainerSessionById(individualTrainerSessionId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!individualTrainerSessionId,
    ...options,
  });
}

export function useIndividualTrainerSessionsForDate(
  individualCustomerTrainerIds: string[],
  sessionDate: Date,
  options?: { enabled?: boolean; staleTime?: number; refetchOnWindowFocus?: boolean; refetchOnMount?: boolean }
) {
  const dateKey = sessionDate instanceof Date ? sessionDate.toISOString().split('T')[0] : String(sessionDate);

  return useQuery({
    queryKey: ['individualTrainerSessions', 'date', dateKey, individualCustomerTrainerIds],
    queryFn: async () => {
      if (!individualCustomerTrainerIds || individualCustomerTrainerIds.length === 0) return [];
      return await fetchIndividualTrainerSessionsForDate(individualCustomerTrainerIds, sessionDate);
    },
    enabled: options?.enabled !== undefined
      ? options.enabled
      : (individualCustomerTrainerIds.length > 0 && !!sessionDate),
    ...options,
  });
}

export function useIndividualTrainerSessionsByGlobalTrainer(
  globalTrainerId?: string | null,
  sessionDate?: Date,
  options?: { enabled?: boolean; staleTime?: number; refetchOnWindowFocus?: boolean; refetchOnMount?: boolean }
) {
  const dateKey = sessionDate ? (sessionDate instanceof Date ? sessionDate.toISOString().split('T')[0] : String(sessionDate)) : 'all';

  return useQuery({
    queryKey: ['individualTrainerSessions', 'globalTrainer', globalTrainerId, dateKey],
    queryFn: async () => {
      if (!globalTrainerId) return [];
      return await fetchIndividualTrainerSessionsByGlobalTrainer(globalTrainerId, sessionDate);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!globalTrainerId,
    ...options,
  });
}

export function useIndividualTrainerSessionsByCustomerTrainerId(
  individualCustomerTrainerId?: string | null,
  options?: { enabled?: boolean; staleTime?: number; refetchOnWindowFocus?: boolean; refetchOnMount?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerSessions', 'customerTrainer', individualCustomerTrainerId],
    queryFn: async () => {
      if (!individualCustomerTrainerId) return [];
      return await fetchIndividualTrainerSessionsByCustomerTrainerId(individualCustomerTrainerId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!individualCustomerTrainerId,
    ...options,
  });
}

export function useIndividualTrainerSessionsPaginated(
  page = 1,
  limit = 10,
  filters?: FetchIndividualTrainerSessionsFilter,
  options?: { enabled?: boolean; staleTime?: number; refetchOnWindowFocus?: boolean; refetchOnMount?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerSessionsPaginated', page, limit, filters],
    queryFn: async () => {
      return await fetchIndividualTrainerSessionsPaginated(page, limit, filters);
    },
    ...options,
  });
}

export function useSaveIndividualTrainerSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveIndividualTrainerSessionParams) => {
      return await saveIndividualTrainerSession(params);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerSessions'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerSessionsPaginated'] });
      if (variables.individualCustomerTrainerId) {
        queryClient.invalidateQueries({
          queryKey: ['individualTrainerSessions', 'customerTrainer', variables.individualCustomerTrainerId]
        });
      }
      if (variables.globalTrainerId) {
        queryClient.invalidateQueries({
          queryKey: ['individualTrainerSessions', 'globalTrainer', variables.globalTrainerId]
        });
      }
    },
  });
}

export function useUpdateIndividualTrainerSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      individualTrainerSessionId,
      status,
    }: {
      individualTrainerSessionId: string;
      status: IndividualTrainerSessionStatus;
    }) => {
      return await updateIndividualTrainerSessionStatus(individualTrainerSessionId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerSessions'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerSessionsPaginated'] });
    },
  });
}

export function useDeleteIndividualTrainerSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (individualTrainerSessionId: string) => {
      return await deleteIndividualTrainerSession(individualTrainerSessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerSessions'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerSessionsPaginated'] });
    },
  });
}

