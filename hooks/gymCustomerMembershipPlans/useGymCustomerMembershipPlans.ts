import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGymCustomerMembershipPlans,
  saveGymCustomerMembershipPlan,
  SaveGymCustomerMembershipPlanParams
} from '@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipPlans';

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

export function useSaveGymCustomerMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveGymCustomerMembershipPlanParams) => {
      return await saveGymCustomerMembershipPlan(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipPlans'] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
    },
  });
}

