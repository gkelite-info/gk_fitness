import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { enrichExercisesWithVideos } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

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

export async function autoSeedTrainerPlanDayExercises(planDayId: string, targetGender?: string) {
  try {
    const { data: dayData } = await supabase
      .from('trainer_workout_plan_days')
      .select('planDayId, workoutType, dayOfWeek, planId')
      .eq('planDayId', planDayId)
      .maybeSingle();

    if (!dayData || !dayData.workoutType) return [];
    const workoutTypeLower = dayData.workoutType.toLowerCase().trim();
    if (workoutTypeLower === 'rest' || workoutTypeLower.includes('rest day')) return [];

    const preferredRole = (targetGender || 'male').toLowerCase().includes('female') ? 'female' : 'male';

    const muscleMap: Record<string, { muscles: string[]; keywords: string[] }> = {
      chest: { muscles: ['CHEST', 'TRICEPS'], keywords: ['bench', 'chest', 'pushup', 'press', 'fly', 'pec deck', 'dip'] },
      push: { muscles: ['CHEST', 'SHOULDERS', 'TRICEPS'], keywords: ['bench', 'press', 'pushup', 'dip', 'lateral raise'] },
      back: { muscles: ['BACK', 'BICEPS'], keywords: ['lat', 'pull', 'row', 'deadlift', 'chin-up', 'chin up', 'pulldown'] },
      pull: { muscles: ['BACK', 'BICEPS'], keywords: ['row', 'pull', 'curl', 'lat', 'pulldown'] },
      legs: { muscles: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'LEGS'], keywords: ['squat', 'press', 'lunge', 'curl', 'extension', 'calf', 'rdl'] },
      'lower body': { muscles: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'LEGS'], keywords: ['squat', 'press', 'lunge', 'curl', 'extension', 'calf'] },
      shoulders: { muscles: ['SHOULDERS', 'TRAPS'], keywords: ['shoulder', 'press', 'lateral', 'raise', 'overhead', 'military'] },
      arms: { muscles: ['BICEPS', 'TRICEPS', 'FOREARMS'], keywords: ['curl', 'pushdown', 'extension', 'bicep', 'tricep', 'skull'] },
      biceps: { muscles: ['BICEPS'], keywords: ['bicep', 'curl', 'preacher', 'hammer'] },
      triceps: { muscles: ['TRICEPS'], keywords: ['tricep', 'pushdown', 'extension', 'dip', 'skull'] },
      abs: { muscles: ['ABDOMINALS', 'OBLIQUES', 'ABS'], keywords: ['crunch', 'plank', 'leg raise', 'situp', 'sit up', 'russian'] },
      core: { muscles: ['ABDOMINALS', 'OBLIQUES', 'ABS'], keywords: ['crunch', 'plank', 'leg raise', 'twist'] },
      'upper body': { muscles: ['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS'], keywords: ['bench', 'row', 'press', 'pulldown', 'curl'] },
      'full body': { muscles: ['CHEST', 'BACK', 'QUADRICEPS', 'SHOULDERS', 'ABDOMINALS'], keywords: ['bench', 'squat', 'row', 'press', 'crunch'] },
    };

    let targetInfo = muscleMap[workoutTypeLower];
    if (!targetInfo) {
      const matchedKey = Object.keys(muscleMap).find(k => workoutTypeLower.includes(k));
      targetInfo = matchedKey ? muscleMap[matchedKey] : muscleMap['full body'];
    }

    const { data: wvRows } = await supabase
      .from('workout_videos')
      .select('workoutVideoId, videoUrl, exerciseName, primaryMuscle, workouts:workoutId(role)')
      .not('videoUrl', 'is', null)
      .neq('videoUrl', '')
      .or('is_deleted.eq.false,is_deleted.is.null')
      .limit(100);

    if (!wvRows || wvRows.length === 0) return [];

    const candidates: any[] = [];
    const seenNames = new Set<string>();

    for (const row of wvRows) {
      const rowGender = (row.workouts?.role || 'all').toLowerCase();
      if (rowGender !== 'all' && rowGender !== preferredRole) continue;

      const norm = (row.exerciseName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenNames.has(norm)) continue;

      const lowerExName = (row.exerciseName || '').toLowerCase();
      if (lowerExName.match(/(treadmill|elliptical|spin bike|stationary bike|cycling|rowing machine|stairmaster|air bike|ski erg)/)) continue;

      const pMuscle = (row.primaryMuscle || '').toUpperCase();
      const matchesMuscle = targetInfo.muscles.some(m => pMuscle === m);
      const matchesKeyword = targetInfo.keywords.some(k => lowerExName.includes(k.toLowerCase()));

      if (matchesMuscle || matchesKeyword) {
        seenNames.add(norm);
        candidates.push(row);
        if (candidates.length >= 6) break;
      }
    }

    const rowsToInsert = candidates.map((c, idx) => ({
      dayExerciseId: Crypto.randomUUID(),
      planDayId,
      workoutVideoId: c.workoutVideoId || null,
      exerciseName: c.exerciseName || 'Exercise',
      category: c.primaryMuscle || dayData.workoutType,
      reps: '10-12',
      order: idx,
      image: c.videoUrl,
      videoUrl: c.videoUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (rowsToInsert.length > 0) {
      try {
        const { data: inserted } = await supabase
          .from('trainer_workout_plan_day_exercises')
          .insert(rowsToInsert)
          .select();
        if (inserted && inserted.length > 0) {
          return inserted;
        }
      } catch (err) {
        console.warn('[trainerWorkoutPlanDayExercises] Auto-seed insert failed, returning generated rows:', err);
      }
    }

    return rowsToInsert;
  } catch (e) {
    console.error('[trainerWorkoutPlanDayExercises] autoSeedTrainerPlanDayExercises Error:', e);
    return [];
  }
}

export async function fetchTrainerWorkoutPlanDayExercises(planDayId?: string, targetGender?: string) {
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

  let finalRows = data ?? [];
  if (finalRows.length === 0 && planDayId) {
    finalRows = await autoSeedTrainerPlanDayExercises(planDayId, targetGender);
  }

  return await enrichExercisesWithVideos(finalRows, targetGender);
}

export async function fetchPaginatedTrainerWorkoutPlanDayExercises(planDayId: string | null | undefined, page: number, limit: number) {
  if (!planDayId) return { data: [], total: 0 };
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('trainer_workout_plan_day_exercises')
    .select('*', { count: 'exact' })
    .eq('planDayId', planDayId)
    .is('deletedAt', null)
    .order('order', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[trainerWorkoutPlanDayExercisesHelper] fetchPaginatedTrainerWorkoutPlanDayExercises Error:', error);
    throw error;
  }

  return { data: data ?? [], total: count ?? 0 };
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
