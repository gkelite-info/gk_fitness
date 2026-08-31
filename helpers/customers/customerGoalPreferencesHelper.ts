import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

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

  if (params.customerGoalPreferenceId) {
    const { data, error } = await supabase
      .from('customer_goal_preferences')
      .update(payload)
      .eq('customerGoalPreferenceId', params.customerGoalPreferenceId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update customer goal preference: ${error.message}`);
    return data;
  } else {
    const { data: existingPref } = await supabase
      .from('customer_goal_preferences')
      .select('customerGoalPreferenceId')
      .eq('userId', params.userId)
      .maybeSingle();

    if (existingPref) {
      const { data, error } = await supabase
        .from('customer_goal_preferences')
        .update(payload)
        .eq('customerGoalPreferenceId', existingPref.customerGoalPreferenceId)
        .select()
        .single();

      if (error) throw new Error(`Failed to update customer goal preference: ${error.message}`);
      return data;
    } else {
      const { data, error } = await supabase
        .from('customer_goal_preferences')
        .insert([{ ...payload, customerGoalPreferenceId: Crypto.randomUUID(), createdAt: now }])
        .select()
        .single();

      if (error) throw new Error(`Failed to insert customer goal preference: ${error.message}`);
      return data;
    }
  }
}

export async function fetchCustomerGoalPreference(userId: string) {
  if (!userId) throw new Error('Missing userId');

  const { data, error } = await supabase
    .from('customer_goal_preferences')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error) {
    console.error('[customerGoalPreferencesHelper] fetch Error:', error);
    throw error;
  }

  return data;
}
