import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, form }: { userId: string, form: any }) => {
      const { error: customerError } = await supabase
        .from('gym_customers')
        .update({
          fullName: form.fullName,
          phone: form.phone,
          gender: form.gender.toLowerCase(),
          dateOfBirth: form.dateOfBirth,
        })
        .eq('customerId', userId);

      if (customerError) throw customerError;

      const { data: existingOnboarding } = await supabase
        .from('customer_onboarding')
        .select('onboardingId')
        .eq('createdBy', userId)
        .maybeSingle();

      if (existingOnboarding) {
        const { error: onboardingError } = await supabase
          .from('customer_onboarding')
          .update({
            height: form.height.replace(/[^0-9]/g, ''),
            weight: form.weight.replace(/[^0-9]/g, ''),
            primaryGoal: form.fitnessGoal,
          })
          .eq('createdBy', userId);

        if (onboardingError) throw onboardingError;
      } else {
        const { data: customerData } = await supabase
          .from('gym_customers')
          .select('gymId')
          .eq('customerId', userId)
          .single();

        if (customerData) {
          const { error: onboardingError } = await supabase
            .from('customer_onboarding')
            .insert({
              onboardingId: Crypto.randomUUID(),
              createdBy: userId,
              gymId: customerData.gymId,
              height: form.height.replace(/[^0-9]/g, ''),
              weight: form.weight.replace(/[^0-9]/g, ''),
              primaryGoal: form.fitnessGoal,
              targetWeight: '0',
              workoutLocation: '',
              workoutDays: [],
              preferWorkoutTime: '',
              dietType: '',
              mealsPerDay: 3,
              foodAllergies: [],
              dailyWaterGoal: '0',
            });
            
          if (onboardingError) throw onboardingError;
        }
      }
      
      return true;
    },
    onSuccess: (_, variables) => {
      // Invalidate the cache so the list screen or profile screen updates immediately!
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.userId] });
    },
  });
}
