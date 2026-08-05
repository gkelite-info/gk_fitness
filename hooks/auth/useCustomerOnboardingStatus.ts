import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const sessionSkippedUsers = new Set<string>();

export function useCustomerOnboardingStatus(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerOnboardingStatus', userId],
    queryFn: async () => {
      if (!userId) return { isOnboarded: false, isSkipped: false };

      if (sessionSkippedUsers.has(userId)) {
        return { isOnboarded: false, isSkipped: true };
      }

      const skipped = await AsyncStorage.getItem(`@onboarding_skipped_${userId}`);
      if (skipped === 'true') {
        return { isOnboarded: false, isSkipped: true };
      }

      const { data, error } = await supabase
        .from('customer_onboarding')
        .select('onboardingId')
        .eq('createdBy', userId)
        .maybeSingle();

      if (error) {
        console.error('[useCustomerOnboardingStatus] Error checking onboarding status:', error);
        return { isOnboarded: false, isSkipped: false };
      }

      return { isOnboarded: !!data, isSkipped: false };
    },
    enabled: !!userId,
  });
}
