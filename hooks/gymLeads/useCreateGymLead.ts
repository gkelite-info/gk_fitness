import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveGymLead, SaveGymLeadParams } from '@/helpers/gymLeads/gymLeadsHelper';

export function useCreateGymLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadData: SaveGymLeadParams) => {
      const data = await saveGymLead(leadData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymLeads'] });
    },
    onError: (error) => {
      console.error('[useCreateGymLead] onError:', error);
    }
  });
}
