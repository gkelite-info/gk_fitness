import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export const DAYS_ORDER: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export interface IndividualTrainerWorkoutPlanDayAttributes {
  planDayId?: string;
  planId: string;
  workoutId?: string | null;
  dayOfWeek: DayOfWeek | string;
  workoutType: string;
  durationMinutes?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
  workout?: any;
  exercises?: any[];
}

export interface SaveIndividualTrainerWorkoutPlanDayParams {
  planDayId?: string;
  planId: string;
  workoutId?: string | null;
  dayOfWeek: DayOfWeek | string;
  workoutType: string;
  durationMinutes?: number | null;
}

export async function fetchIndividualTrainerWorkoutPlanDays(planId?: string) {
  try {
    let query = supabase
      .from('individual_trainer_workout_plan_days')
      .select(`
        *,
        workout:workouts!individual_trainer_workout_plan_days_workoutId_fkey(workoutId, name, category, role),
        exercises:individual_trainer_workout_plan_day_exercises(*)
      `)
      .is('deletedAt', null);

    if (planId) {
      query = query.eq('planId', planId);
    }

    const { data, error } = await query;

    if (error) {
      let fallbackQuery = supabase
        .from('individual_trainer_workout_plan_days')
        .select('*')
        .is('deletedAt', null);

      if (planId) {
        fallbackQuery = fallbackQuery.eq('planId', planId);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        console.error('[IndividualTrainerWorkoutPlanDay] fetch Error:', fallbackError);
        throw fallbackError;
      }
      return sortDays(fallbackData ?? []);
    }

    return sortDays(data ?? []);
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDay] fetch Exception:', err);
    throw err;
  }
}

function sortDays(days: any[]) {
  return [...days].sort((a, b) => {
    const idxA = DAYS_ORDER.indexOf(a.dayOfWeek as DayOfWeek);
    const idxB = DAYS_ORDER.indexOf(b.dayOfWeek as DayOfWeek);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export async function fetchIndividualTrainerWorkoutPlanDayById(planDayId: string) {
  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plan_days')
      .select(`
        *,
        workout:workouts!individual_trainer_workout_plan_days_workoutId_fkey(workoutId, name, category, role),
        exercises:individual_trainer_workout_plan_day_exercises(*)
      `)
      .eq('planDayId', planDayId)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('individual_trainer_workout_plan_days')
        .select('*')
        .eq('planDayId', planDayId)
        .is('deletedAt', null)
        .maybeSingle();

      if (fallbackError) {
        console.error('[IndividualTrainerWorkoutPlanDay] fetchById Error:', fallbackError);
        throw fallbackError;
      }
      return fallbackData;
    }

    return data;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDay] fetchById Exception:', err);
    throw err;
  }
}

export async function fetchIndividualTrainerWorkoutPlanDayByDayOfWeek(
  planId: string,
  dayOfWeek: DayOfWeek | string
) {
  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plan_days')
      .select('*')
      .eq('planId', planId)
      .eq('dayOfWeek', dayOfWeek)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlanDay] fetchByDayOfWeek Error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDay] fetchByDayOfWeek Exception:', err);
    throw err;
  }
}

export async function saveIndividualTrainerWorkoutPlanDay(
  planDayData: SaveIndividualTrainerWorkoutPlanDayParams
) {
  const now = new Date().toISOString();

  try {
    if (planDayData.planDayId) {
      const sanitizedWorkoutId = (planDayData.workoutId && typeof planDayData.workoutId === 'string' && planDayData.workoutId.trim() !== '') ? planDayData.workoutId : null;
      const { data, error } = await supabase
        .from('individual_trainer_workout_plan_days')
        .update({
          planId: planDayData.planId,
          workoutId: sanitizedWorkoutId,
          dayOfWeek: planDayData.dayOfWeek,
          workoutType: planDayData.workoutType,
          durationMinutes: planDayData.durationMinutes ?? null,
          updatedAt: now,
        })
        .eq('planDayId', planDayData.planDayId)
        .select();

      if (error) {
        console.error('[IndividualTrainerWorkoutPlanDay] Update Error:', error);
        throw error;
      }

      return data ? data[0] : null;
    } else {
      const generatedPlanDayId = Crypto.randomUUID();
      const sanitizedWorkoutId = (planDayData.workoutId && typeof planDayData.workoutId === 'string' && planDayData.workoutId.trim() !== '') ? planDayData.workoutId : null;
      const { data, error } = await supabase
        .from('individual_trainer_workout_plan_days')
        .insert([
          {
            planDayId: generatedPlanDayId,
            planId: planDayData.planId,
            workoutId: sanitizedWorkoutId,
            dayOfWeek: planDayData.dayOfWeek,
            workoutType: planDayData.workoutType,
            durationMinutes: planDayData.durationMinutes ?? null,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .select();

      if (error) {
        console.error('[IndividualTrainerWorkoutPlanDay] Insert Error:', error);
        throw error;
      }

      return data ? data[0] : null;
    }
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDay] save Exception:', err);
    throw err;
  }
}

export async function saveMultipleIndividualTrainerWorkoutPlanDays(
  days: SaveIndividualTrainerWorkoutPlanDayParams[]
) {
  const now = new Date().toISOString();

  try {
    const results: any[] = [];
    for (const day of days) {
      const saved = await saveIndividualTrainerWorkoutPlanDay(day);
      if (saved) results.push(saved);
    }
    return results;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDay] saveMultiple Exception:', err);
    throw err;
  }
}

export async function deleteIndividualTrainerWorkoutPlanDay(planDayId: string) {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plan_days')
      .update({
        deletedAt: now,
        updatedAt: now,
      })
      .eq('planDayId', planDayId)
      .select();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlanDay] Delete Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlanDay] delete Exception:', err);
    throw err;
  }
}

export async function makeIndividualTrainerRestDay(
  planDayId: string,
  planId: string,
  dayOfWeek: DayOfWeek | string
) {
  return await saveIndividualTrainerWorkoutPlanDay({
    planDayId,
    planId,
    dayOfWeek,
    workoutType: 'Rest',
    durationMinutes: 0,
    workoutId: null,
  });
}

