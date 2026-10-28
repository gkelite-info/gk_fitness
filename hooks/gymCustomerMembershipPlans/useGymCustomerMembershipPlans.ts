import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGymCustomerMembershipPlans,
  saveGymCustomerMembershipPlan,
  setGymCustomerPendingPlan,
  revokeGymCustomerPendingPlan,
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
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipHistories'] });
    },
  });
}

export function useSetGymCustomerPendingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { GymCustomerMembershipPlanId: string; pendingPlanId: string | null }) => {
      return await setGymCustomerPendingPlan(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipPlans'] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipHistories'] });
    },
  });
}

export function useRevokeGymCustomerPendingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { GymCustomerMembershipPlanId: string; customerId?: string; gymId?: string }) => {
      return await revokeGymCustomerPendingPlan(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipPlans'] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipHistories'] });
    },
  });
}

export {
  useGymCustomerMembershipHistories,
  useGymCustomerMembershipHistoryById,
  useGymCustomerMembershipHistoriesPaginated,
  useSaveGymCustomerMembershipHistory,
  useLogGymCustomerMembershipHistory,
  useUpdateGymCustomerMembershipHistory,
  useDeleteGymCustomerMembershipHistory,
} from './gymCustomerMembershipHistories';


