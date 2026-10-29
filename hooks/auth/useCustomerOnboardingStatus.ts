import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const sessionSkippedUsers = new Set<string>();

export function useCustomerOnboardingStatus(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerOnboardingStatus', userId],
    queryFn: async () => {
      if (!userId) return { isOnboarded: false, isSkipped: false };

      // 1. Check in-memory skip
      if (sessionSkippedUsers.has(userId)) {
        return { isOnboarded: false, isSkipped: true };
      }

      // 2. Check device persistent storage (skipped)
      const skipped = await AsyncStorage.getItem(`@onboarding_skipped_${userId}`);
      const globalSkipped = await AsyncStorage.getItem('@onboarding_skipped_global');
      if (skipped === 'true' || globalSkipped === 'true') {
        sessionSkippedUsers.add(userId);
        return { isOnboarded: false, isSkipped: true };
      }

      // 3. Check device persistent storage (completed)
      const completed = await AsyncStorage.getItem(`@onboarding_completed_${userId}`);
      const globalCompleted = await AsyncStorage.getItem('@onboarding_completed_global');
      if (completed === 'true' || globalCompleted === 'true') {
        return { isOnboarded: true, isSkipped: false };
      }

      // 4. Check database for existing onboarding record
      const { data, error } = await supabase
        .from('customer_onboarding')
        .select('onboardingId')
        .eq('createdBy', userId)
        .maybeSingle();

      if (error) {
        console.error('[useCustomerOnboardingStatus] Error checking onboarding status:', error);
        return { isOnboarded: false, isSkipped: false };
      }

      if (data) {
        await AsyncStorage.setItem(`@onboarding_completed_${userId}`, 'true');
        return { isOnboarded: true, isSkipped: false };
      }

      return { isOnboarded: false, isSkipped: false };
    },
    enabled: !!userId,
  });
}
