import { useQuery } from '@tanstack/react-query';
import { fetchGymLeads } from '@/helpers/gymLeads/gymLeadsHelper';

export function useGymLeads() {
  return useQuery({
    queryKey: ['gymLeads'],
    queryFn: async () => {
      const data = await fetchGymLeads();
      return data;
    },
  });
}
