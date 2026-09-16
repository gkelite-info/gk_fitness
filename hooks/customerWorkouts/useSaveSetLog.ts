import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertSetLog, SetLogParams } from '@/helpers/customerWorkoutPlans/workoutSetLogs';
import { useUser } from '@/context/UserContext';

export function useSaveSetLog() {
  const queryClient = useQueryClient();
  const { userId } = useUser();

  return useMutation({
    mutationFn: async (params: Omit<SetLogParams, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return await upsertSetLog({ ...params, userId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workoutSetLogs', userId, variables.planDayId],
      });
    },
    onError: (error) => {
      console.error('[useSaveSetLog] mutation error:', error);
    },
  });
}
