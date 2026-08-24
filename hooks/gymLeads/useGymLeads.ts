import { useQuery } from '@tanstack/react-query';
import { fetchGymLeads } from '@/helpers/gymLeads/gymLeadsHelper';

export function useGymLeads(page: number = 1, limit: number = 10, searchQuery?: string, status: string = 'all') {
  return useQuery({
    queryKey: ['gymLeads', page, limit, searchQuery, status],
    queryFn: async () => {
      const result = await fetchGymLeads(page, limit, searchQuery, status);
      return result;
    },
  });
}
