import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useCustomerProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerProfile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const [customerRes, onboardingRes] = await Promise.all([
        supabase
          .from('gym_customers')
          .select('*')
          .or(`customerId.eq.${userId},userId.eq.${userId}`)
          .maybeSingle(),
        supabase
          .from('customer_onboarding')
          .select('*')
          .eq('createdBy', userId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (customerRes.error && customerRes.error.code !== 'PGRST116') {
        console.warn('[useCustomerProfile] customerRes notice:', customerRes.error);
      }
      
      let onboardingData = onboardingRes.data;
      if (!onboardingData) {
        try {
          const cached = await AsyncStorage.getItem(`@customer_onboarding_${userId}`);
          if (cached) {
            onboardingData = JSON.parse(cached);
          }
        } catch {}
      }

      return {
        customerData: customerRes.data || null,
        onboardingData: onboardingData || null,
      };
    },
    enabled: !!userId,
  });
}
