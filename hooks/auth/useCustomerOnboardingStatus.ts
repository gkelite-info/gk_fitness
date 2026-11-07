import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const sessionSkippedUsers = new Set<string>();

export function useCustomerOnboardingStatus(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerOnboardingStatus', userId],
    queryFn: async () => {
      if (!userId) return { isOnboarded: false, isSkipped: false };

      // 1. Check in-memory skip for this active session
      if (sessionSkippedUsers.has(userId)) {
        return { isOnboarded: false, isSkipped: true };
      }

      // 2. Query database directly for existing onboarding record (database is ultimate source of truth!)
      const { data, error } = await supabase
        .from('customer_onboarding')
        .select('onboardingId, height, weight, primaryGoal')
        .eq('createdBy', userId)
        .maybeSingle();

      if (error) {
        console.error('[useCustomerOnboardingStatus] Error checking onboarding status:', error);
      }

      // If valid onboarding data exists in DB, user is fully onboarded
      const hasValidOnboardingData = !!(
        data &&
        data.onboardingId &&
        data.height &&
        data.height !== '0' &&
        data.weight &&
        data.weight !== '0' &&
        data.primaryGoal
      );

      if (hasValidOnboardingData) {
        await AsyncStorage.setItem(`@onboarding_completed_${userId}`, 'true');
        return { isOnboarded: true, isSkipped: false };
      }

      // If no valid data in DB, clear any stale cached completion flag
      await AsyncStorage.removeItem(`@onboarding_completed_${userId}`);
      await AsyncStorage.removeItem('@onboarding_completed_global');
      await AsyncStorage.removeItem('@onboarding_skipped_global');

      // 3. Check if user explicitly chose "Do not ask me again" (skipped persistent per user)
      const userSkipped = await AsyncStorage.getItem(`@onboarding_skipped_${userId}`);
      if (userSkipped === 'true') {
        sessionSkippedUsers.add(userId);
        return { isOnboarded: false, isSkipped: true };
      }

      return { isOnboarded: false, isSkipped: false };
    },
    enabled: !!userId,
  });
}
