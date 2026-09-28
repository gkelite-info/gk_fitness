import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTrainerSessionsByCustomerTrainerId,
  fetchTrainerSessionsByDateRange,
  fetchTrainerSessionsForDate,
  saveTrainerSession,
  updateTrainerSessionStatus,
  deleteTrainerSession,
  SaveTrainerSessionParams,
  SessionStatus
} from '@/helpers/trainerSessions/trainerSessionsHelper';

export function useTrainerSessionsByCustomerTrainerId(customerTrainerId?: string) {
  return useQuery({
    queryKey: ['trainerSessions', 'customerTrainer', customerTrainerId],
    queryFn: async () => {
      if (!customerTrainerId) return [];
      const data = await fetchTrainerSessionsByCustomerTrainerId(customerTrainerId);
      return data;
    },
    enabled: !!customerTrainerId,
  });
}

export function useTrainerSessionsByDateRange(customerTrainerId?: string, startDate?: string | Date, endDate?: string | Date) {
  return useQuery({
    queryKey: ['trainerSessions', 'customerTrainer', customerTrainerId, 'range', startDate, endDate],
    queryFn: async () => {
      if (!customerTrainerId || !startDate || !endDate) return [];
      const data = await fetchTrainerSessionsByDateRange(customerTrainerId, startDate, endDate);
      return data;
    },
    enabled: !!customerTrainerId && !!startDate && !!endDate,
  });
}

export function useTrainerSessionsForDate(customerTrainerIds: string[], sessionDate: Date) {
  return useQuery({
    queryKey: ['trainerSessions', 'date', sessionDate.toISOString().split('T')[0], customerTrainerIds],
    queryFn: async () => {
      if (!customerTrainerIds || customerTrainerIds.length === 0) return [];
      const data = await fetchTrainerSessionsForDate(customerTrainerIds, sessionDate);
      return data;
    },
    enabled: customerTrainerIds.length > 0 && !!sessionDate,
  });
}

export function useSaveTrainerSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveTrainerSessionParams) => saveTrainerSession(params),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainerSessions', 'customerTrainer', variables.customerTrainerId] });
      queryClient.invalidateQueries({ queryKey: ['trainerSessions', 'date'] }); // Invalidate date queries too
    },
  });
}

export function useUpdateTrainerSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trainerSessionId, status }: { trainerSessionId: string; status: SessionStatus }) => 
      updateTrainerSessionStatus(trainerSessionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerSessions'] });
    },
  });
}

export function useDeleteTrainerSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trainerSessionId: string) => deleteTrainerSession(trainerSessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerSessions'] });
    },
  });
}
