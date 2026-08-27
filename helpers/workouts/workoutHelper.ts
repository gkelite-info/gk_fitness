import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface WorkoutAttributes {
  workoutId?: string;
  workoutType: 'legs' | 'arms' | 'chest' | 'back' | 'biceps' | 'tricep' | 'shoulder' | 'forearms' | 'abs' | 'triceps';
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export async function fetchWorkouts() {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('is_deleted', false);

  if (error) {
    console.error('[workoutHelper] fetchWorkouts Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function getOrCreateWorkoutByType(workoutType: WorkoutAttributes['workoutType']) {
  const normalizedType = workoutType.toLowerCase() as WorkoutAttributes['workoutType'];

  const { data: existingWorkout, error: fetchError } = await supabase
    .from('workouts')
    .select('*')
    .eq('workoutType', normalizedType)
    .eq('is_deleted', false)
    .maybeSingle();

  if (fetchError) {
    console.error('[workoutHelper] getOrCreateWorkoutByType Fetch Error:', fetchError);
    throw fetchError;
  }

  if (existingWorkout) {
    return existingWorkout;
  }

  const now = new Date().toISOString();
  const generatedId = Crypto.randomUUID();

  const { data: newWorkout, error: insertError } = await supabase
    .from('workouts')
    .insert([
      {
        workoutId: generatedId,
        workoutType: normalizedType,
        is_deleted: false,
        createdAt: now,
        updatedAt: now,
      }
    ])
    .select()
    .single();

  if (insertError) {
    console.error('[workoutHelper] getOrCreateWorkoutByType Insert Error:', insertError);
    throw insertError;
  }

  return newWorkout;
}
