import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface TrainerWorkoutPlanDayExerciseAttributes {
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

export interface SaveTrainerWorkoutPlanDayExerciseParams {
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

export async function fetchTrainerWorkoutPlanDayExercises(planDayId?: string) {
  let query = supabase
    .from('trainer_workout_plan_day_exercises')
    .select('*')
    .is('deletedAt', null)
    .order('order', { ascending: true });

  if (planDayId) {
    query = query.eq('planDayId', planDayId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[trainerWorkoutPlanDayExercisesHelper] fetchTrainerWorkoutPlanDayExercises Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchTrainerWorkoutPlanDayExerciseById(dayExerciseId: string) {
  const { data, error } = await supabase
    .from('trainer_workout_plan_day_exercises')
    .select('*')
    .eq('dayExerciseId', dayExerciseId)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[trainerWorkoutPlanDayExercisesHelper] fetchTrainerWorkoutPlanDayExerciseById Error:', error);
    throw error;
  }

  return data;
}

export async function saveTrainerWorkoutPlanDayExercise(exerciseData: SaveTrainerWorkoutPlanDayExerciseParams) {
  const now = new Date().toISOString();

  if (exerciseData.dayExerciseId) {
    const { data, error } = await supabase
      .from('trainer_workout_plan_day_exercises')
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
      console.error('[trainerWorkoutPlanDayExercisesHelper] saveTrainerWorkoutPlanDayExercise Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedDayExerciseId = exerciseData.dayExerciseId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('trainer_workout_plan_day_exercises')
      .insert([
        {
          dayExerciseId: generatedDayExerciseId,
          planDayId: exerciseData.planDayId,
          workoutVideoId: exerciseData.workoutVideoId,
          exerciseName: exerciseData.exerciseName,
          category: exerciseData.category,
          reps: exerciseData.reps,
          order: exerciseData.order,
          image: exerciseData.image,
          videoUrl: exerciseData.videoUrl,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[trainerWorkoutPlanDayExercisesHelper] saveTrainerWorkoutPlanDayExercise Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteTrainerWorkoutPlanDayExercise(dayExerciseId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('trainer_workout_plan_day_exercises')
    .update({
      deletedAt: now,
      updatedAt: now,
    })
    .eq('dayExerciseId', dayExerciseId)
    .select();

  if (error) {
    console.error('[trainerWorkoutPlanDayExercisesHelper] deleteTrainerWorkoutPlanDayExercise Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
