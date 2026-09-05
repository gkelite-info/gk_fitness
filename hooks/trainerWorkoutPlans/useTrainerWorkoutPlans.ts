import { useQuery } from '@tanstack/react-query';
import { fetchTrainerWorkoutPlans, fetchWorkoutPlansForTrainer } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlans';

export function useTrainerWorkoutPlans(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['trainerWorkoutPlans', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await fetchTrainerWorkoutPlans(userId);
    },
    enabled: !!userId,
  });
}

export function useTrainerWorkoutPlansByCreator(trainerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ['trainerWorkoutPlansByCreator', trainerUserId],
    queryFn: async () => {
      if (!trainerUserId) return [];
      return await fetchWorkoutPlansForTrainer(trainerUserId);
    },
    enabled: !!trainerUserId,
  });
}
