import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';

export const sessionSkippedUsers = new Set<string>();

export function useCustomerOnboardingStatus(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerOnboardingStatus', userId],
    queryFn: async () => {
      if (!userId) return { isOnboarded: false, isSkipped: false };

      // 1. Check if the logged-in user has an onboarding record in customer_onboarding
      // where the createdBy foreign key matches the logged-in user's userId
      try {
        const { data: rows, error } = await supabase
          .from('customer_onboarding')
          .select('onboardingId, createdBy')
          .eq('createdBy', userId)
          .order('createdAt', { ascending: false })
          .limit(1);

        if (error) {
          console.error('[useCustomerOnboardingStatus] Error checking onboarding status:', error);
        }

        let record = rows && rows.length > 0 ? rows[0] : null;

        // Fallback check via fetchCustomerOnboarding (supports RPC and alternate mappings)
        if (!record) {
          const fallback = await fetchCustomerOnboarding(userId);
          if (fallback && (fallback.onboardingId || fallback.createdBy)) {
            record = fallback as any;
          }
        }

        // If an onboarding record matching createdBy == userId is found,
        // the user has already filled it -> DO NOT trigger the onboarding process!
        if (record && (record.onboardingId || record.createdBy)) {
          await AsyncStorage.setItem(`@onboarding_completed_${userId}`, 'true');
          return { isOnboarded: true, isSkipped: false };
        }
      } catch (dbErr) {
        console.error('[useCustomerOnboardingStatus] DB query exception:', dbErr);
      }

      // If no valid record in DB, clean up completion flag
      await AsyncStorage.removeItem(`@onboarding_completed_${userId}`);
      await AsyncStorage.removeItem('@onboarding_completed_global');
      await AsyncStorage.removeItem('@onboarding_skipped_global');

      // 2. Check if user pressed skip and stored it in mobile localstorage
      const userSkipped = await AsyncStorage.getItem(`@onboarding_skipped_${userId}`);
      if (userSkipped === 'true' || sessionSkippedUsers.has(userId)) {
        sessionSkippedUsers.add(userId);
        return { isOnboarded: false, isSkipped: true };
      }

      // 3. User has NOT filled onboarding and has NOT skipped -> trigger onboarding process!
      return { isOnboarded: false, isSkipped: false };
    },
    enabled: !!userId,
  });
}
