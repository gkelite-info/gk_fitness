import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPersonalTrainerRequestsByUser, fetchPersonalTrainerRequestsByTrainer, fetchPersonalTrainerRequestsByGym, updatePersonalTrainerRequestStatus, fetchPersonalTrainerRequestById } from '@/helpers/personalTrainerRequests/personalTrainerRequestsHelper';

export function usePersonalTrainerRequestsByUser(userId?: string, enabled = true) {
  return useQuery({
    queryKey: ['personalTrainerRequests', 'user', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await fetchPersonalTrainerRequestsByUser(userId);
    },
    enabled: !!userId && enabled,
  });
}

export function usePersonalTrainerRequestsByTrainer(gymTrainerId?: string, enabled = true) {
  return useQuery({
    queryKey: ['personalTrainerRequests', 'trainer', gymTrainerId],
    queryFn: async () => {
      if (!gymTrainerId) return [];
      return await fetchPersonalTrainerRequestsByTrainer(gymTrainerId);
    },
    enabled: !!gymTrainerId && enabled,
  });
}

export function usePersonalTrainerRequestsByGym(gymId?: string, page = 1, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ['personalTrainerRequests', 'gym', gymId, page, limit],
    queryFn: async () => {
      if (!gymId) return { data: [], total: 0 };
      return await fetchPersonalTrainerRequestsByGym(gymId, page, limit);
    },
    enabled: !!gymId && enabled,
  });
}

export function usePersonalTrainerRequestById(personalTrainerRequestId?: string, enabled = true) {
  return useQuery({
    queryKey: ['personalTrainerRequest', personalTrainerRequestId],
    queryFn: async () => {
      if (!personalTrainerRequestId) return null;
      return await fetchPersonalTrainerRequestById(personalTrainerRequestId);
    },
    enabled: !!personalTrainerRequestId && enabled,
  });
}

export function useUpdatePersonalTrainerRequestStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ personalTrainerRequestId, status }: { personalTrainerRequestId: string; status: 'approved' | 'rejected' }) => {
      return await updatePersonalTrainerRequestStatus(personalTrainerRequestId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests'] });
    },
  });
}
