import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveGlobalTrainerLead, SaveGlobalTrainerLeadParams } from '@/helpers/globalTrainerLeads/globalTrainerLeadsHelper';
import { toast } from '@/lib/toast';

export function useCreateGlobalTrainerLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveGlobalTrainerLeadParams) => saveGlobalTrainerLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerLeads'] });
    },
    onError: (error) => {
      console.error('[useCreateGlobalTrainerLead] Error:', error);
      toast.error('Failed to submit global trainer application.');
    },
  });
}
