import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertMembershipPlans, deleteMembershipPlan } from '@/helpers/membershipHelper';
import { DraftPlan } from '@/constants/membershipMockData';

export function useUpsertMembershipPlans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gymId, userId, plans }: { gymId: string; userId: string; plans: DraftPlan[] }) => {
      await upsertMembershipPlans(gymId, userId, plans);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membershipPlans'] });
    },
  });
}

export function useDeleteMembershipPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      await deleteMembershipPlan(planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membershipPlans'] });
    },
  });
}
