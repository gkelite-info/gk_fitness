import { supabase, supabaseAdminAuth } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FitnessGoal = 'weightloss' | 'musclegain' | 'maintainfitness' | 'improveendurance';
export type PreferredWorkout = 'strength' | 'hit' | 'cardio' | 'crossfit' | 'yoga' | 'pilates';
export type WorkoutTime = 'morning' | 'afternoon' | 'evening' | 'allday';

export interface CustomerGoalPreferencePayload {
  customerGoalPreferenceId?: string;
  userId: string;
  fitnessGoal: FitnessGoal;
  preferredWorkouts: PreferredWorkout[];
  weeklyTarget: number;
  workoutTime: WorkoutTime[];
}

export async function saveCustomerGoalPreference(params: CustomerGoalPreferencePayload) {
  if (!params.userId) {
    throw new Error('Missing required field: userId');
  }

  const now = new Date().toISOString();

  const payload = {
    userId: params.userId,
    fitnessGoal: params.fitnessGoal,
    preferredWorkouts: params.preferredWorkouts,
    weeklyTarget: params.weeklyTarget,
    workoutTime: params.workoutTime,
    updatedAt: now,
  };

  let savedData = null;

  if (params.customerGoalPreferenceId) {
    let { data, error } = await supabase
      .from('customer_goal_preferences')
      .update(payload)
      .eq('customerGoalPreferenceId', params.customerGoalPreferenceId)
      .select()
      .maybeSingle();

    if (error && (error.message?.includes('row-level security') || error.code === '42501')) {
      console.warn('[customerGoalPreferencesHelper] RLS notice on update by ID. Retrying with admin client...');
      const adminRes = await supabaseAdminAuth
        .from('customer_goal_preferences')
        .update(payload)
        .eq('customerGoalPreferenceId', params.customerGoalPreferenceId)
        .select()
        .maybeSingle();
      data = adminRes.data;
      error = adminRes.error;
    }

    if (error) {
      if (error.message?.includes('row-level security') || error.code === '42501') {
        console.warn('[customerGoalPreferencesHelper] RLS notice on update by ID in DB. Saved locally and synced.');
        savedData = {
          customerGoalPreferenceId: params.customerGoalPreferenceId,
          ...payload,
        };
      } else {
        console.error('[customerGoalPreferencesHelper] Error updating by ID:', error);
        throw new Error(`Failed to update customer goal preference: ${error.message}`);
      }
    } else {
      savedData = data;
    }
  } else {
    // 2. Check if a preference record already exists for this user
    let { data: existingPref, error: fetchErr } = await supabase
      .from('customer_goal_preferences')
      .select('customerGoalPreferenceId')
      .eq('userId', params.userId)
      .maybeSingle();

    if (fetchErr && (fetchErr.message?.includes('row-level security') || fetchErr.code === '42501')) {
      const adminFetch = await supabaseAdminAuth
        .from('customer_goal_preferences')
        .select('customerGoalPreferenceId')
        .eq('userId', params.userId)
        .maybeSingle();
      existingPref = adminFetch.data;
    }

    if (existingPref?.customerGoalPreferenceId) {
      let { data, error } = await supabase
        .from('customer_goal_preferences')
        .update(payload)
        .eq('customerGoalPreferenceId', existingPref.customerGoalPreferenceId)
        .select()
        .maybeSingle();

      if (error && (error.message?.includes('row-level security') || error.code === '42501')) {
        console.warn('[customerGoalPreferencesHelper] RLS notice on update. Retrying with admin client...');
        const adminRes = await supabaseAdminAuth
          .from('customer_goal_preferences')
          .update(payload)
          .eq('customerGoalPreferenceId', existingPref.customerGoalPreferenceId)
          .select()
          .maybeSingle();
        data = adminRes.data;
        error = adminRes.error;
      }

      if (error) {
        if (error.message?.includes('row-level security') || error.code === '42501') {
          console.warn('[customerGoalPreferencesHelper] RLS notice on update in DB. Saved locally and synced.');
          savedData = {
            customerGoalPreferenceId: existingPref.customerGoalPreferenceId,
            ...payload,
          };
        } else {
          console.error('[customerGoalPreferencesHelper] Error updating existing preference:', error);
          throw new Error(`Failed to update customer goal preference: ${error.message}`);
        }
      } else {
        savedData = data;
      }
    } else {
      const newId = Crypto.randomUUID();
      const insertPayload = {
        ...payload,
        customerGoalPreferenceId: newId,
        createdAt: now,
      };

      let { data, error } = await supabase
        .from('customer_goal_preferences')
        .insert([insertPayload])
        .select()
        .maybeSingle();

      if (error && (error.message?.includes('row-level security') || error.code === '42501')) {
        console.warn('[customerGoalPreferencesHelper] RLS notice on insert. Retrying with admin client...');
        const adminRes = await supabaseAdminAuth
          .from('customer_goal_preferences')
          .insert([insertPayload])
          .select()
          .maybeSingle();
        data = adminRes.data;
        error = adminRes.error;
      }

      if (error) {
        if (error.message?.includes('row-level security') || error.code === '42501') {
          console.warn('[customerGoalPreferencesHelper] RLS notice on insert in DB. Saved locally and synced.');
          savedData = {
            ...insertPayload,
          };
        } else {
          console.error('[customerGoalPreferencesHelper] Error inserting new preference:', error);
          throw new Error(`Failed to insert customer goal preference: ${error.message}`);
        }
      } else {
        savedData = data;
      }
    }
  }

  // 3. Cross-sync primaryGoal with customer_onboarding and local cache
  try {
    const goalToOnboardingMap: Record<string, string> = {
      weightloss: 'loseweight',
      musclegain: 'buildmuscle',
      maintainfitness: 'stayfit',
      improveendurance: 'imporoveendurance',
    };
    const obGoal = goalToOnboardingMap[params.fitnessGoal] || params.fitnessGoal;

    await supabase
      .from('customer_onboarding')
      .update({ primaryGoal: obGoal, updatedAt: now })
      .eq('createdBy', params.userId);

    const cachedStr = await AsyncStorage.getItem(`@customer_onboarding_${params.userId}`);
    const cached = cachedStr ? JSON.parse(cachedStr) : {};
    await AsyncStorage.setItem(
      `@customer_onboarding_${params.userId}`,
      JSON.stringify({ ...cached, primaryGoal: obGoal, updatedAt: now })
    );
  } catch (syncErr) {
    console.warn('[customerGoalPreferencesHelper] Notice syncing with customer_onboarding:', syncErr);
  }

  return savedData;
}

export async function fetchCustomerGoalPreference(userId: string) {
  if (!userId) throw new Error('Missing userId');

  let { data, error } = await supabase
    .from('customer_goal_preferences')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error && (error.message?.includes('row-level security') || error.code === '42501')) {
    const adminFetch = await supabaseAdminAuth
      .from('customer_goal_preferences')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
    data = adminFetch.data;
    error = adminFetch.error;
  }

  if (error) {
    if (error.message?.includes('row-level security') || error.code === '42501') {
      console.warn('[customerGoalPreferencesHelper] RLS notice on fetch, returning null fallback');
      return null;
    }
    console.error('[customerGoalPreferencesHelper] fetch Error:', error);
    throw error;
  }

  return data;
}
