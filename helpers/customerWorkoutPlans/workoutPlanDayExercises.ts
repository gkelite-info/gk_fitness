import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface WorkoutPlanDayExerciseAttributes {
  dayExerciseId?: string;
  planDayId: string;
  workoutVideoId?: string | null;
  exerciseName: string;
  category: string;
  reps: string;
  order: number;
  image?: string | null;
  videoUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveWorkoutPlanDayExerciseParams {
  dayExerciseId?: string;
  planDayId: string;
  workoutVideoId?: string | null;
  exerciseName: string;
  category: string;
  reps: string;
  order: number;
  image?: string | null;
  videoUrl?: string | null;
}

export async function fetchWorkoutPlanDayExercises(planDayId?: string) {
  let query = supabase
    .from('workout_plan_day_exercises')
    .select('*')
    .is('deletedAt', null)
    .order('order', { ascending: true });

  if (planDayId) {
    query = query.eq('planDayId', planDayId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[workoutPlanDayExercisesHelper] fetchWorkoutPlanDayExercises Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchPaginatedWorkoutPlanDayExercises(planDayId: string, page: number, limit: number) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from('workout_plan_day_exercises')
    .select('*', { count: 'exact' })
    .eq('planDayId', planDayId)
    .is('deletedAt', null)
    .order('order', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('[workoutPlanDayExercisesHelper] fetchPaginatedWorkoutPlanDayExercises Error:', error);
    throw error;
  }

  return {
    data: data ?? [],
    total: count ?? 0,
  };
}

export async function fetchWorkoutPlanDayExerciseById(dayExerciseId: string) {
  const { data, error } = await supabase
    .from('workout_plan_day_exercises')
    .select('*')
    .eq('dayExerciseId', dayExerciseId)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[workoutPlanDayExercisesHelper] fetchWorkoutPlanDayExerciseById Error:', error);
    throw error;
  }

  return data;
}

export async function saveWorkoutPlanDayExercise(exerciseData: SaveWorkoutPlanDayExerciseParams) {
  const now = new Date().toISOString();

  if (exerciseData.dayExerciseId) {
    const { data, error } = await supabase
      .from('workout_plan_day_exercises')
      .update({
        planDayId: exerciseData.planDayId,
        workoutVideoId: exerciseData.workoutVideoId,
        exerciseName: exerciseData.exerciseName,
        category: exerciseData.category,
        reps: exerciseData.reps,
        order: exerciseData.order,
        image: exerciseData.image,
        videoUrl: exerciseData.videoUrl,
        updatedAt: now,
      })
      .eq('dayExerciseId', exerciseData.dayExerciseId)
      .select();

    if (error) {
      console.error('[workoutPlanDayExercisesHelper] saveWorkoutPlanDayExercise Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedDayExerciseId = exerciseData.dayExerciseId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('workout_plan_day_exercises')
      .insert([
        {
          dayExerciseId: generatedDayExerciseId,
          planDayId: exerciseData.planDayId,
          workoutVideoId: exerciseData.workoutVideoId || null,
          exerciseName: exerciseData.exerciseName,
          category: exerciseData.category,
          reps: exerciseData.reps,
          order: exerciseData.order,
          image: exerciseData.image || null,
          videoUrl: exerciseData.videoUrl || null,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[workoutPlanDayExercisesHelper] saveWorkoutPlanDayExercise Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteWorkoutPlanDayExercise(dayExerciseId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('workout_plan_day_exercises')
    .update({
      deletedAt: now,
      updatedAt: now,
    })
    .eq('dayExerciseId', dayExerciseId)
    .select();

  if (error) {
    console.error('[workoutPlanDayExercisesHelper] deleteWorkoutPlanDayExercise Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
