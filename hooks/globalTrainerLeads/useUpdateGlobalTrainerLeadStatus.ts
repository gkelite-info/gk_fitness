import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGlobalTrainerLeadStatus } from '@/helpers/globalTrainerLeads/globalTrainerLeadsHelper';
import { toast } from '@/lib/toast';

export function useUpdateGlobalTrainerLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ globalTrainerLeadId, status }: { globalTrainerLeadId: string; status: 'submitted' | 'underreview' | 'approved' | 'rejected' }) => 
      updateGlobalTrainerLeadStatus(globalTrainerLeadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerLeads'] });
    },
    onError: (error) => {
      console.error('[useUpdateGlobalTrainerLeadStatus] Error:', error);
      toast.error('Failed to update status.');
    },
  });
}
