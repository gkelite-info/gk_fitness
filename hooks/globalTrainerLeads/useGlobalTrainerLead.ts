import { useQuery } from '@tanstack/react-query';
import { fetchGlobalTrainerLeadById } from '@/helpers/globalTrainerLeads/globalTrainerLeadsHelper';

export function useGlobalTrainerLead(globalTrainerLeadId: string) {
  return useQuery({
    queryKey: ['globalTrainerLead', globalTrainerLeadId],
    queryFn: () => fetchGlobalTrainerLeadById(globalTrainerLeadId),
    enabled: !!globalTrainerLeadId,
  });
}
