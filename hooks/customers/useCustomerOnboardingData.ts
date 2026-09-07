import { useQuery } from '@tanstack/react-query';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';

export function useCustomerOnboardingData(userId?: string) {
  return useQuery({
    queryKey: ['customerOnboarding', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await fetchCustomerOnboarding(userId);
    },
    enabled: !!userId,
  });
}
