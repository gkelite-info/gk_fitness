import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useCustomerProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerProfile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const [customerRes, onboardingRes] = await Promise.all([
        supabase
          .from('gym_customers')
          .select('*')
          .eq('customerId', userId)
          .single(),
        supabase
          .from('customer_onboarding')
          .select('*')
          .eq('createdBy', userId)
          .maybeSingle()
      ]);

      if (customerRes.error) throw customerRes.error;
      // It's okay if onboarding throws an error because it's maybeSingle, but if it's a real error we throw
      if (onboardingRes.error && onboardingRes.error.code !== 'PGRST116') {
        // PGRST116 is multiple rows returned but single expected. maybeSingle handles 0 or 1 rows.
        throw onboardingRes.error;
      }

      return {
        customerData: customerRes.data,
        onboardingData: onboardingRes.data,
      };
    },
    enabled: !!userId,
  });
}
