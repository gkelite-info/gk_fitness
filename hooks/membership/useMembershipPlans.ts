import { useQuery } from '@tanstack/react-query';
import { fetchGymMembershipPlans } from '@/helpers/membershipHelper';
import { MembershipPlan } from '@/constants/membershipMockData';

export function useMembershipPlans(gymId: string | null) {
  return useQuery<MembershipPlan[]>({
    queryKey: ['membershipPlans', gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const data = await fetchGymMembershipPlans(gymId);
      return data;
    },
    enabled: !!gymId,
  });
}
