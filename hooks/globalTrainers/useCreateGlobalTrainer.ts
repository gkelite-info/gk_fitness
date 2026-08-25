import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveGlobalTrainer, SaveGlobalTrainerParams } from '@/helpers/globalTrainer/globalTrainerHelper';
import { toast } from '@/lib/toast';

export function useCreateGlobalTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveGlobalTrainerParams) => saveGlobalTrainer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainers'] });
    },
    onError: (error) => {
      console.error('[useCreateGlobalTrainer] Error:', error);
      toast.error('Failed to register global trainer.');
    },
  });
}
