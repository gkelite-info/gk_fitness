import { useQuery } from '@tanstack/react-query';
import {
  fetchGymCustomers,
  fetchGymCustomersPaginated,
  fetchGymCustomerById,
  fetchCustomerOnboardingByUserId
} from '@/helpers/customers/customerHelper';

export function useGymCustomers(gymId?: string, searchQuery?: string) {
  return useQuery({
    queryKey: ['customers', gymId, searchQuery],
    queryFn: async () => {
      const data = await fetchGymCustomers(gymId, searchQuery);
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

export function useGymCustomerById(customerId?: string) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      return await fetchGymCustomerById(customerId);
    },
    enabled: !!customerId,
  });
}

export function useCustomerOnboarding(userId?: string | null) {
  return useQuery({
    queryKey: ['customerOnboarding', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await fetchCustomerOnboardingByUserId(userId);
    },
    enabled: !!userId,
  });
}
