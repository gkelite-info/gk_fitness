import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';

import { ddmmyyyyToPgDate } from '@/helpers/customers/customerHelper';

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, form }: { userId: string, form: any }) => {
      const pgDob = ddmmyyyyToPgDate(form.dateOfBirth);

      // Update gym_customers if customer record exists
      try {
        await supabase
          .from('gym_customers')
          .update({
            fullName: form.fullName,
            phone: form.phone,
            gender: form.gender ? form.gender.toLowerCase() : 'male',
            dateOfBirth: pgDob,
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
      if (pgDob) {
        userUpdatePayload.dob = pgDob;
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
      const fileOnlyName = `profile_${Date.now()}.${ext}`;
      const storagePath = `${userId}/${fileOnlyName}`;

      // 2. Upload to Supabase Storage at user's directory
      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(storagePath, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      // 3. Update the users table storing ONLY the file name (e.g. 'profile_1793257994478.jpeg') in profilePhoto
      const { error: updateError } = await supabase
        .from('users')
        .update({ profilePhoto: fileOnlyName, updatedAt: new Date().toISOString() })
        .eq('userId', userId);

      if (updateError) {
        console.error('[useUpdateProfilePhoto] Error updating users table:', updateError);
        throw updateError;
      }

      // Also keep gym_trainers or global_trainers synchronized if applicable
      try {
        await supabase
          .from('gym_trainers')
          .update({ profilePic: fileOnlyName })
          .eq('userId', userId);
      } catch (_) { }

      try {
        await supabase
          .from('global_trainers')
          .update({ profilePic: fileOnlyName, profilePhoto: fileOnlyName })
          .eq('userId', userId);
      } catch (_) { }

      return fileOnlyName;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['gymTrainer'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainer'] });
    },
  });
}

export function useDeleteProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, fileName }: { userId: string; fileName?: string | null }) => {
      // 1. Try to delete the file from Supabase Storage if fileName exists
      if (fileName && typeof fileName === 'string' && fileName !== 'null' && fileName !== 'undefined') {
        try {
          let storagePath = fileName;
          if (storagePath.includes('/profile_photos/')) {
            storagePath = storagePath.split('/profile_photos/')[1];
          } else if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
            storagePath = storagePath.split('/').pop() || '';
          }
          if (storagePath && !storagePath.includes('/') && userId) {
            storagePath = `${userId}/${storagePath}`;
          }

          if (storagePath) {
            await supabase.storage.from('profile_photos').remove([storagePath]);
          }
        } catch (storageErr) {
          console.warn('[useDeleteProfilePhoto] Storage remove non-fatal error:', storageErr);
        }
      }

      // Also clean up any files in the user's directory in the bucket if possible
      if (userId) {
        try {
          const { data: userFiles } = await supabase.storage.from('profile_photos').list(userId);
          if (userFiles && userFiles.length > 0) {
            const filePaths = userFiles.map((f) => `${userId}/${f.name}`);
            await supabase.storage.from('profile_photos').remove(filePaths);
          }
        } catch (listErr) {
          console.warn('[useDeleteProfilePhoto] List/remove user directory non-fatal:', listErr);
        }
      }

      // 2. Set profilePhoto to null in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ profilePhoto: null, updatedAt: new Date().toISOString() })
        .eq('userId', userId);

      if (updateError) {
        console.error('[useDeleteProfilePhoto] Error updating users table:', updateError);
        throw updateError;
      }

      // Keep trainer tables in sync if applicable
      try {
        await supabase
          .from('gym_trainers')
          .update({ profilePic: null })
          .eq('userId', userId);
      } catch (_) { }

      try {
        await supabase
          .from('global_trainers')
          .update({ profilePic: null, profilePhoto: null })
          .eq('userId', userId);
      } catch (_) { }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['gymTrainer'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainer'] });
    },
  });
}
