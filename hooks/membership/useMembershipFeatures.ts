import { useQuery } from '@tanstack/react-query';
import { fetchFeatures } from '@/helpers/membershipHelper';
import { MembershipFeatureItem } from '@/constants/membershipMockData';

export function useMembershipFeatures() {
  return useQuery<MembershipFeatureItem[]>({
    queryKey: ['membershipFeatures'],
    queryFn: async () => {
      const data = await fetchFeatures();
      return data;
    },
  });
}
