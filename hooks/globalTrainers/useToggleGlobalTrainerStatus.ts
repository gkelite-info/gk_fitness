import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleGlobalTrainerActiveStatus } from '@/helpers/globalTrainer/globalTrainerHelper';

interface ToggleGlobalTrainerStatusParams {
  globalTrainerId: string;
  currentStatus: boolean;
}

export function useToggleGlobalTrainerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ globalTrainerId, currentStatus }: ToggleGlobalTrainerStatusParams) => {
      const data = await toggleGlobalTrainerActiveStatus(globalTrainerId, currentStatus);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainer', variables.globalTrainerId] });
    },
    onError: (error) => {
      console.error('[useToggleGlobalTrainerStatus] Error toggling global trainer status:', error);
    },
  });
}
