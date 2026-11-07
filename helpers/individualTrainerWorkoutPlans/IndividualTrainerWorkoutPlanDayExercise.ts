import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { enrichExercisesWithVideos } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export interface IndividualTrainerWorkoutPlanDayExerciseAttributes {
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

export interface SaveIndividualTrainerWorkoutPlanDayExerciseParams {
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

export async function fetchIndividualTrainerWorkoutPlanDayExercises(
  planDayId?: string,
  targetGender?: string
) {
  try {
    let query = supabase
      .from('individual_trainer_workout_plan_day_exercises')
      .select('*')
      .is('deletedAt', null)
      .order('order', { ascending: true });

    if (planDayId) {
      query = query.eq('planDayId', planDayId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[IndividualTrainerWorkoutPlanDayExercise] fetch Error:', error);
      throw error;
    }

    const rows = data ?? [];
    return await enrichExercisesWithVideos(rows, targetGender);
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDayExercise] fetch Exception:', err);
    throw err;
  }
}

export async function fetchPaginatedIndividualTrainerWorkoutPlanDayExercises(
  planDayId: string | null | undefined,
  page: number = 1,
  limit: number = 10
) {
  if (!planDayId) return { data: [], total: 0 };
  const offset = (page - 1) * limit;

  try {
    const { data, error, count } = await supabase
      .from('individual_trainer_workout_plan_day_exercises')
      .select('*', { count: 'exact' })
      .eq('planDayId', planDayId)
      .is('deletedAt', null)
      .order('order', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[IndividualTrainerWorkoutPlanDayExercise] paginated Error:', error);
      throw error;
    }

    return { data: data ?? [], total: count ?? 0 };
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDayExercise] paginated Exception:', err);
    throw err;
  }
}

export async function fetchIndividualTrainerWorkoutPlanDayExerciseById(
  dayExerciseId: string
) {
  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plan_day_exercises')
      .select('*')
      .eq('dayExerciseId', dayExerciseId)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlanDayExercise] fetchById Error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDayExercise] fetchById Exception:', err);
    throw err;
  }
}

export async function saveIndividualTrainerWorkoutPlanDayExercise(
  exerciseData: SaveIndividualTrainerWorkoutPlanDayExerciseParams
) {
  const now = new Date().toISOString();

  try {
    const sanitizedVideoId = (exerciseData.workoutVideoId && typeof exerciseData.workoutVideoId === 'string' && exerciseData.workoutVideoId.trim() !== '') ? exerciseData.workoutVideoId : null;
    if (exerciseData.dayExerciseId) {
      const { data, error } = await supabase
        .from('individual_trainer_workout_plan_day_exercises')
        .update({
          planDayId: exerciseData.planDayId,
          workoutVideoId: sanitizedVideoId,
          exerciseName: exerciseData.exerciseName,
          category: exerciseData.category,
          reps: exerciseData.reps,
          order: exerciseData.order,
          image: exerciseData.image ?? null,
          videoUrl: exerciseData.videoUrl ?? null,
          updatedAt: now,
        })
        .eq('dayExerciseId', exerciseData.dayExerciseId)
        .select();

      if (error) {
        console.error('[IndividualTrainerWorkoutPlanDayExercise] Update Error:', error);
        throw error;
      }

      return data ? data[0] : null;
    } else {
      const generatedId = Crypto.randomUUID();
      const { data, error } = await supabase
        .from('individual_trainer_workout_plan_day_exercises')
        .insert([
          {
            dayExerciseId: generatedId,
            planDayId: exerciseData.planDayId,
            workoutVideoId: sanitizedVideoId,
            exerciseName: exerciseData.exerciseName,
            category: exerciseData.category,
            reps: exerciseData.reps,
            order: exerciseData.order,
            image: exerciseData.image ?? null,
            videoUrl: exerciseData.videoUrl ?? null,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .select();

      if (error) {
        console.error('[IndividualTrainerWorkoutPlanDayExercise] Insert Error:', error);
        throw error;
      }

      return data ? data[0] : null;
    }
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDayExercise] save Exception:', err);
    throw err;
  }
}

export async function saveMultipleIndividualTrainerWorkoutPlanDayExercises(
  planDayId: string,
  exercises: SaveIndividualTrainerWorkoutPlanDayExerciseParams[]
) {
  const now = new Date().toISOString();

  try {
    const rows = exercises.map((ex, idx) => ({
      dayExerciseId: ex.dayExerciseId || Crypto.randomUUID(),
      planDayId,
      workoutVideoId: (ex.workoutVideoId && typeof ex.workoutVideoId === 'string' && ex.workoutVideoId.trim() !== '') ? ex.workoutVideoId : null,
      exerciseName: ex.exerciseName,
      category: ex.category,
      reps: ex.reps,
      order: ex.order !== undefined ? ex.order : idx,
      image: ex.image ?? null,
      videoUrl: ex.videoUrl ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    if (rows.length === 0) return [];

    const { data, error } = await supabase
      .from('individual_trainer_workout_plan_day_exercises')
      .upsert(rows)
      .select();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlanDayExercise] saveMultiple Error:', error);
      throw error;
    }

    return data ?? [];
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDayExercise] saveMultiple Exception:', err);
    throw err;
  }
}

export async function deleteIndividualTrainerWorkoutPlanDayExercise(
  dayExerciseId: string
) {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plan_day_exercises')
      .update({
        deletedAt: now,
        updatedAt: now,
      })
      .eq('dayExerciseId', dayExerciseId)
      .select();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlanDayExercise] Delete Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDayExercise] delete Exception:', err);
    throw err;
  }
}

export async function deleteIndividualTrainerWorkoutPlanDayExercisesByPlanDayId(
  planDayId: string
) {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plan_day_exercises')
      .update({
        deletedAt: now,
        updatedAt: now,
      })
      .eq('planDayId', planDayId)
      .select();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlanDayExercise] deleteByPlanDayId Error:', error);
      throw error;
    }

    return data ?? [];
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDayExercise] deleteByPlanDayId Exception:', err);
    throw err;
  }
}

export async function reorderIndividualTrainerWorkoutPlanDayExercises(
  reorderedExercises: { dayExerciseId: string; order: number }[]
) {
  const now = new Date().toISOString();

  try {
    const updates = reorderedExercises.map(({ dayExerciseId, order }) =>
      supabase
        .from('individual_trainer_workout_plan_day_exercises')
        .update({ order, updatedAt: now })
        .eq('dayExerciseId', dayExerciseId)
    );

    await Promise.all(updates);
    return true;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDayExercise] reorder Exception:', err);
    throw err;
  }
}

