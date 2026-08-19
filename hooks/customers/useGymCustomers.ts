import { useQuery } from '@tanstack/react-query';
import { fetchGymCustomers, fetchGymCustomersPaginated } from '@/helpers/customers/customerHelper';

export function useGymCustomers(gymId?: string) {
  return useQuery({
    queryKey: ['customers', gymId],
    queryFn: async () => {
      const data = await fetchGymCustomers(gymId);
      return data;
    },
  });
}

export function useGymCustomersPaginated(gymId?: string, page = 1, limit = 10, searchQuery?: string) {
  return useQuery({
    queryKey: ['customersPaginated', gymId, page, limit, searchQuery],
    queryFn: async () => {
      if (!gymId) return { data: [], total: 0 };
      const res = await fetchGymCustomersPaginated(gymId, page, limit, searchQuery);
      return res;
    },
    enabled: !!gymId,
  });
}
