import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, form }: { userId: string, form: any }) => {
      // Update gym_customers if customer record exists
      try {
        await supabase
          .from('gym_customers')
          .update({
            fullName: form.fullName,
            phone: form.phone,
            gender: form.gender ? form.gender.toLowerCase() : 'male',
            dateOfBirth: form.dateOfBirth,
          })
          .or(`customerId.eq.${userId},userId.eq.${userId}`);
      } catch (err) {
        console.warn('[useUpdateCustomerProfile] gym_customers update non-fatal:', err);
      }

      // Keep public.users in sync
      const userUpdatePayload: any = {
        name: form.fullName,
        phone: form.phone,
        gender: form.gender ? (form.gender.toLowerCase() === 'other' ? 'others' : form.gender.toLowerCase()) : 'male',
        updatedAt: new Date().toISOString(),
      };
      if (form.dateOfBirth) {
        userUpdatePayload.dob = form.dateOfBirth;
      }

      const { error: userError } = await supabase
        .from('users')
        .update(userUpdatePayload)
        .eq('userId', userId);

      if (userError) throw userError;

      const { data: existingOnboarding } = await supabase
        .from('customer_onboarding')
        .select('onboardingId')
        .eq('createdBy', userId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();

      const cleanHeight = form.height && form.height !== '-' ? form.height.toString().replace(/[^0-9.]/g, '') : null;
      const cleanWeight = form.weight && form.weight !== '-' ? form.weight.toString().replace(/[^0-9.]/g, '') : null;
      const cleanGoal = form.fitnessGoal && form.fitnessGoal !== '-' ? form.fitnessGoal : null;

      if (existingOnboarding) {
        const updatePayload: any = {
          updatedAt: new Date().toISOString(),
        };
        if (cleanHeight !== null) updatePayload.height = cleanHeight;
        if (cleanWeight !== null) updatePayload.weight = cleanWeight;
        if (cleanGoal !== null) updatePayload.primaryGoal = cleanGoal;

        if (Object.keys(updatePayload).length > 1) {
          const { error: onboardingError } = await supabase
            .from('customer_onboarding')
            .update(updatePayload)
            .eq('onboardingId', existingOnboarding.onboardingId);

          if (onboardingError) throw onboardingError;
        }
      } else if (cleanHeight || cleanWeight || cleanGoal) {
        const { data: customerData } = await supabase
          .from('gym_customers')
          .select('gymId')
          .or(`customerId.eq.${userId},userId.eq.${userId}`)
          .maybeSingle();

        const { error: onboardingError } = await supabase
          .from('customer_onboarding')
          .insert({
            onboardingId: Crypto.randomUUID(),
            createdBy: userId,
            gymId: customerData?.gymId || null,
            height: cleanHeight || '0',
            weight: cleanWeight || '0',
            primaryGoal: cleanGoal || 'stayfit',
            targetWeight: '0',
            workoutLocation: 'gym',
            workoutDays: [],
            preferWorkoutTime: 'morning',
            dietType: 'standard',
            mealsPerDay: 3,
            foodAllergies: [],
            dailyWaterGoal: '2500',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        if (onboardingError) throw onboardingError;
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
