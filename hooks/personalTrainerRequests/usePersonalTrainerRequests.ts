import { useQuery } from '@tanstack/react-query';
import { fetchPersonalTrainerRequestsByUser, fetchPersonalTrainerRequestsByTrainer } from '@/helpers/personalTrainerRequests/personalTrainerRequestsHelper';

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
