import { useQuery } from '@tanstack/react-query';
import { fetchTrainers, fetchTrainerById, fetchTrainerByUserId } from '@/helpers/trainers/trainerHelper';

export function useGymTrainers(gymId?: string, enabled: boolean = true, searchQuery?: string) {
  return useQuery({
    queryKey: ['trainers', gymId, searchQuery],
    queryFn: async () => {
      const data = await fetchTrainers(gymId, searchQuery);
      return data;
    },
    enabled,
  });
}

export function useGymTrainerById(gymTrainerId?: string) {
  return useQuery({
    queryKey: ['trainer', gymTrainerId],
    queryFn: async () => {
      if (!gymTrainerId) return null;
      return await fetchTrainerById(gymTrainerId);
    },
    enabled: !!gymTrainerId,
  });
}

export function useGymTrainerByUserId(userId?: string) {
  return useQuery({
    queryKey: ['trainer', 'user', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await fetchTrainerByUserId(userId);
    },
    enabled: !!userId,
  });
}
