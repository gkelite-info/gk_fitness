import { useQuery } from '@tanstack/react-query';
import { fetchGlobalTrainerLeads } from '@/helpers/globalTrainerLeads/globalTrainerLeadsHelper';

export function useGlobalTrainerLeads(page: number = 1, limit: number = 10, searchQuery?: string, status?: string) {
  return useQuery({
    queryKey: ['globalTrainerLeads', page, limit, searchQuery, status],
    queryFn: () => fetchGlobalTrainerLeads(page, limit, searchQuery, status),
  });
}
