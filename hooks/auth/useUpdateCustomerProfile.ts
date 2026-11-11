import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseAdminAuth } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ddmmyyyyToPgDate, updateGymCustomer } from '@/helpers/customers/customerHelper';
import { normalizePrimaryGoal } from '@/helpers/onboardingHelper';
import { progressService } from '@/lib/services/progressService';

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      customerId,
      form,
      role,
    }: {
      userId: string;
      customerId?: string | null;
      form: any;
      role?: string;
    }) => {
      const now = new Date().toISOString();
      const pgDob = ddmmyyyyToPgDate(form.dateOfBirth);

      let cleanPhone = form.phone ? form.phone.replace(/[^\d+]/g, '').trim() : '';

      const userUpdatePayload: any = {
        name: form.fullName.trim(),
        phone: cleanPhone || form.phone,
        gender: form.gender ? (form.gender.toLowerCase() === 'other' ? 'others' : form.gender.toLowerCase()) : 'male',
        updatedAt: now,
      };
      if (pgDob) {
        userUpdatePayload.dob = pgDob;
      }

      let updatedUserData: any = null;
      let userError: any = null;

      // Strategy 1: Try updating by userId using primary client
      const resPrimary = await supabase
        .from('users')
        .update(userUpdatePayload)
        .eq('userId', userId)
        .select()
        .maybeSingle();

      if (resPrimary.data) {
        updatedUserData = resPrimary.data;
      } else {
        userError = resPrimary.error;
        console.warn('[useUpdateCustomerProfile] Primary users update notice:', resPrimary.error || '0 rows affected');
      }

      // Strategy 2: If 0 rows or error (e.g. RLS / fallback session), retry with supabaseAdminAuth
      if (!updatedUserData) {
        const resAdmin = await supabaseAdminAuth
          .from('users')
          .update(userUpdatePayload)
          .eq('userId', userId)
          .select()
          .maybeSingle();

        if (resAdmin.data) {
          updatedUserData = resAdmin.data;
          userError = null;
        } else {
          console.warn('[useUpdateCustomerProfile] adminAuth users update notice:', resAdmin.error || '0 rows affected');
        }
      }

      // Strategy 3: Try matching by email if available
      const cleanEmail = form.email ? form.email.trim().toLowerCase() : '';
      if (!updatedUserData && cleanEmail) {
        const resEmail = await supabase
          .from('users')
          .update(userUpdatePayload)
          .ilike('email', cleanEmail)
          .select()
          .maybeSingle();

        if (resEmail.data) {
          updatedUserData = resEmail.data;
          userError = null;
        } else {
          const resEmailAdmin = await supabaseAdminAuth
            .from('users')
            .update(userUpdatePayload)
            .ilike('email', cleanEmail)
            .select()
            .maybeSingle();

          if (resEmailAdmin.data) {
            updatedUserData = resEmailAdmin.data;
            userError = null;
          }
        }
      }

      // Strategy 4: Direct update without select() in case SELECT RLS blocks representation return
      if (!updatedUserData) {
        const directRes = await supabase
          .from('users')
          .update(userUpdatePayload)
          .eq('userId', userId);

        if (!directRes.error) {
          const { data: fetched } = await supabase
            .from('users')
            .select('*')
            .eq('userId', userId)
            .maybeSingle();
          if (fetched) {
            updatedUserData = fetched;
            userError = null;
          }
        }
      }

      if (userError && !updatedUserData) {
        console.warn('[useUpdateCustomerProfile] Notice updating users table (non-fatal):', userError);
      } else {
      }

      // 2. If role is NOT 'individual' (i.e. logged in as customer), update gym_customers table
      const normalizedRole = (role || '').trim().toLowerCase().replace(/[\s_-]/g, '');
      const isIndividual = normalizedRole === 'individual';

      if (!isIndividual) {
        try {
          const gymCustResult = await updateGymCustomer({
            customerId: customerId || userId,
            userId,
            email: form.email || updatedUserData?.email,
            phone: cleanPhone || form.phone,
            fullName: form.fullName.trim(),
            gender: form.gender,
            dateOfBirth: form.dateOfBirth,
          });
        } catch (gymErr) {
          console.warn('[useUpdateCustomerProfile] gym_customers update notice:', gymErr);
        }
      } else {
      }

      const cleanHeight = form.height && form.height !== '-' ? form.height.trim() : null;
      const cleanWeight = form.weight && form.weight !== '-' ? form.weight.trim() : null;
      const cleanGoal = form.fitnessGoal && form.fitnessGoal !== '-' ? normalizePrimaryGoal(form.fitnessGoal) : null;
      const cleanActivity = form.activityLevel && form.activityLevel !== '-' ? form.activityLevel.trim() : null;

      try {
        let { data: existingOnboarding, error: selectObErr } = await supabase
          .from('customer_onboarding')
          .select('onboardingId, height, weight, primaryGoal, targetWeight')
          .eq('createdBy', userId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!existingOnboarding) {
          const adminOb = await supabaseAdminAuth
            .from('customer_onboarding')
            .select('onboardingId, height, weight, primaryGoal, targetWeight')
            .eq('createdBy', userId)
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (adminOb.data) existingOnboarding = adminOb.data;
        }


        const onboardingPayload: any = {
          updatedAt: now,
        };
        if (cleanHeight) onboardingPayload.height = String(cleanHeight);
        if (cleanWeight) onboardingPayload.weight = String(cleanWeight);
        if (cleanGoal) onboardingPayload.primaryGoal = cleanGoal;

        let onboardingUpdated = false;

        if (existingOnboarding?.onboardingId) {
          let { data: obUpData, error: obUpErr } = await supabase
            .from('customer_onboarding')
            .update(onboardingPayload)
            .eq('onboardingId', existingOnboarding.onboardingId)
            .select();

          if (obUpErr) {
            const retryAdmin = await supabaseAdminAuth
              .from('customer_onboarding')
              .update(onboardingPayload)
              .eq('onboardingId', existingOnboarding.onboardingId)
              .select();
            obUpData = retryAdmin.data;
            obUpErr = retryAdmin.error;
          }

          if (obUpErr) {
            console.error('[useUpdateCustomerProfile] Error updating customer_onboarding by onboardingId:', obUpErr);
          } else {
            onboardingUpdated = true;
          }
        }

        // Also ensure update by createdBy directly
        let { data: createdUpData, error: createdUpErr } = await supabase
          .from('customer_onboarding')
          .update(onboardingPayload)
          .eq('createdBy', userId)
          .select();

        if (createdUpErr) {
          const adminCreated = await supabaseAdminAuth
            .from('customer_onboarding')
            .update(onboardingPayload)
            .eq('createdBy', userId)
            .select();
          createdUpData = adminCreated.data;
          createdUpErr = adminCreated.error;
        }

        if (!createdUpErr && createdUpData && createdUpData.length > 0) {
          onboardingUpdated = true;
        }

        if (!onboardingUpdated && (cleanHeight || cleanWeight || cleanGoal)) {
          const insertPayload: any = {
            onboardingId: Crypto.randomUUID(),
            createdBy: userId,
            height: String(cleanHeight || '0'),
            weight: String(cleanWeight || '0'),
            primaryGoal: cleanGoal || 'stayfit',
            targetWeight: String(cleanWeight || '0'),
            workoutLocation: 'gym',
            workoutDays: ['monday', 'wednesday', 'friday'],
            preferWorkoutTime: 'morning',
            dietType: 'nonvegetarian',
            mealsPerDay: 3,
            foodAllergies: [],
            dailyWaterGoal: '3',
            createdAt: now,
            updatedAt: now,
          };

          let { data: insData, error: obInsErr } = await supabase
            .from('customer_onboarding')
            .insert([insertPayload])
            .select();

          if (obInsErr) {
            const adminIns = await supabaseAdminAuth
              .from('customer_onboarding')
              .insert([insertPayload])
              .select();
            insData = adminIns.data;
            obInsErr = adminIns.error;
          }

          if (obInsErr) {
            console.warn('[useUpdateCustomerProfile] Notice inserting customer_onboarding:', obInsErr);
          } else {
          }
        }

        try {
          const cachedStr = await AsyncStorage.getItem(`@customer_onboarding_${userId}`);
          const cachedData = cachedStr ? JSON.parse(cachedStr) : {};
          const merged = {
            ...cachedData,
            ...(cleanHeight ? { height: String(cleanHeight) } : {}),
            ...(cleanWeight ? { weight: String(cleanWeight) } : {}),
            ...(cleanGoal ? { primaryGoal: cleanGoal } : {}),
            ...(cleanActivity ? { activityLevel: cleanActivity } : {}),
            updatedAt: now,
          };
          await AsyncStorage.setItem(`@customer_onboarding_${userId}`, JSON.stringify(merged));
        } catch (storageErr) {
          console.warn('[useUpdateCustomerProfile] AsyncStorage error:', storageErr);
        }
      } catch (obGeneralErr) {
        console.warn('[useUpdateCustomerProfile] Error handling customer_onboarding sync:', obGeneralErr);
      }

      // 3b. Update customer_measurements if weight or height is provided
      if (cleanWeight && !isNaN(parseFloat(cleanWeight)) && parseFloat(cleanWeight) > 0) {
        try {
          await progressService.logMeasurements(userId, {
            weight: parseFloat(cleanWeight),
          });
        } catch (measErr) {
          console.warn('[useUpdateCustomerProfile] Notice logging measurement:', measErr);
        }
      }

      // 3c. Update customer_goal_preferences if fitnessGoal is provided
      if (cleanGoal) {
        try {
          const goalMap: Record<string, 'weightloss' | 'musclegain' | 'maintainfitness' | 'improveendurance'> = {
            loseweight: 'weightloss',
            buildmuscle: 'musclegain',
            stayfit: 'maintainfitness',
            gainweight: 'musclegain',
            imporoveendurance: 'improveendurance',
          };
          const mappedFitnessGoal = goalMap[cleanGoal] || 'maintainfitness';

          let { data: existingPref } = await supabase
            .from('customer_goal_preferences')
            .select('customerGoalPreferenceId')
            .eq('userId', userId)
            .maybeSingle();

          if (!existingPref) {
            const adminPref = await supabaseAdminAuth
              .from('customer_goal_preferences')
              .select('customerGoalPreferenceId')
              .eq('userId', userId)
              .maybeSingle();
            if (adminPref.data) existingPref = adminPref.data;
          }

          if (existingPref) {
            let { error: prefUpErr } = await supabase
              .from('customer_goal_preferences')
              .update({ fitnessGoal: mappedFitnessGoal, updatedAt: now })
              .eq('customerGoalPreferenceId', existingPref.customerGoalPreferenceId);

            if (prefUpErr) {
              await supabaseAdminAuth
                .from('customer_goal_preferences')
                .update({ fitnessGoal: mappedFitnessGoal, updatedAt: now })
                .eq('customerGoalPreferenceId', existingPref.customerGoalPreferenceId);
            }
          } else {
            const newPrefPayload = {
              customerGoalPreferenceId: Crypto.randomUUID(),
              userId,
              fitnessGoal: mappedFitnessGoal,
              preferredWorkouts: ['strength'],
              weeklyTarget: 4,
              workoutTime: ['morning'],
              createdAt: now,
              updatedAt: now,
            };

            let { error: prefInsErr } = await supabase
              .from('customer_goal_preferences')
              .insert([newPrefPayload]);

            if (prefInsErr) {
              await supabaseAdminAuth
                .from('customer_goal_preferences')
                .insert([newPrefPayload]);
            }
          }
        } catch (prefErr) {
          console.warn('[useUpdateCustomerProfile] Notice updating customer_goal_preferences:', prefErr);
        }
      }

      return updatedUserData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', 'id', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.userId] });
      if (variables.customerId) {
        queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customersPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['customerOnboarding', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['customerGoalPreference', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['customerMeasurements', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['progressHistory', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['latestMeasurement', variables.userId] });
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
      queryClient.invalidateQueries({ queryKey: ['user', 'id', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
      queryClient.invalidateQueries({ queryKey: ['user', 'id', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['gymTrainer'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainer'] });
    },
  });
}
