import { useQuery } from '@tanstack/react-query';
import { fetchGymCustomers } from '@/helpers/customers/customerHelper';

export function useGymCustomers(gymId?: string) {
  return useQuery({
    queryKey: ['customers', gymId],
    queryFn: async () => {
      const data = await fetchGymCustomers(gymId);
      return data;
    },
  });
}
