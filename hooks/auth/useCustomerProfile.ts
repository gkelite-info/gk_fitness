import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findGymCustomer } from '@/helpers/customers/customerHelper';

export function useCustomerProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerProfile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const [matchedCust, onboardingRes, goalPrefRes, latestMeasRes] = await Promise.all([
        findGymCustomer({ userId }),
        supabase
          .from('customer_onboarding')
          .select('*')
          .eq('createdBy', userId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('customer_goal_preferences')
          .select('*')
          .eq('userId', userId)
          .maybeSingle(),
        supabase
          .from('customer_measurements')
          .select('weight, height, loggedAt')
          .eq('userId', userId)
          .order('loggedAt', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      let customerData: any = matchedCust;
      if (customerData && !customerData.userId && userId) {
        supabase
          .from('gym_customers')
          .update({ userId })
          .eq('customerId', customerData.customerId)
          .then(
            () => {
            },
            (err: any) => {
              console.warn('[useCustomerProfile] Failed to link userId to gym_customer:', err);
            }
          );
      }

      let onboardingData = onboardingRes.data;
      if (!onboardingData) {
        try {
          const cached = await AsyncStorage.getItem(`@customer_onboarding_${userId}`);
          if (cached) {
            onboardingData = JSON.parse(cached);
          }
        } catch (err) {
          console.warn('[useCustomerProfile] AsyncStorage parse error:', err);
        }
      }

      // Merge goal preferences and latest measurements if onboarding data is missing them
      if (onboardingData) {
        if (!onboardingData.primaryGoal && goalPrefRes.data?.fitnessGoal) {
          onboardingData.primaryGoal = goalPrefRes.data.fitnessGoal;
        }
        if ((!onboardingData.weight || onboardingData.weight === '-' || onboardingData.weight === '0') && latestMeasRes.data?.weight) {
          onboardingData.weight = String(latestMeasRes.data.weight);
        }
        if ((!onboardingData.height || onboardingData.height === '-' || onboardingData.height === '0') && latestMeasRes.data?.height) {
          onboardingData.height = String(latestMeasRes.data.height);
        }
      } else if (goalPrefRes.data || latestMeasRes.data) {
        onboardingData = {
          height: latestMeasRes.data?.height ? String(latestMeasRes.data.height) : '-',
          weight: latestMeasRes.data?.weight ? String(latestMeasRes.data.weight) : '-',
          primaryGoal: goalPrefRes.data?.fitnessGoal || '-',
          activityLevel: '-',
        };
      }

      return {
        customerData: customerData || null,
        onboardingData: onboardingData || null,
      };
    },
    enabled: !!userId,
  });
}
