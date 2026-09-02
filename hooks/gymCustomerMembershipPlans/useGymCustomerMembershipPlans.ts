import { useQuery } from '@tanstack/react-query';
import { fetchGymCustomerMembershipPlans } from '@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipPlans';

export function useGymCustomerMembershipPlans(gymId?: string, customerId?: string) {
  return useQuery({
    queryKey: ['gymCustomerMembershipPlans', gymId, customerId],
    queryFn: async () => {
      const data = await fetchGymCustomerMembershipPlans(gymId, customerId);
      return data;
    },
    enabled: !!gymId || !!customerId,
  });
}
