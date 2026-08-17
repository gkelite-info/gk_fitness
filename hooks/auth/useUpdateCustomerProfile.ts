import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';

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
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
    },
  });
}

export function useUpdateProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, imageUri }: { userId: string, imageUri: string }) => {
      // 1. Read the image as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      const arrayBuffer = base64ToArrayBuffer(base64);
      const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/profile_${Date.now()}.${ext}`;

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(fileName);

      const profilePhoto = publicUrlData.publicUrl;

      // 4. Update the users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ profilePhoto })
        .eq('userId', userId);

      if (updateError) throw updateError;

      return profilePhoto;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.userId] });
    },
  });
}
