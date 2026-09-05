import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TrainerWorkoutPlanDayAttributes {
  planDayId?: string;
  planId: string;
  workoutId?: string | null;
  dayOfWeek: DayOfWeek | string;
  workoutType: string;
  durationMinutes?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveTrainerWorkoutPlanDayParams {
  planDayId?: string;
  planId: string;
  workoutId?: string | null;
  dayOfWeek: DayOfWeek | string;
  workoutType: string;
  durationMinutes?: number | null;
}

export async function fetchTrainerWorkoutPlanDays(planId?: string) {
  let query = supabase
    .from('trainer_workout_plan_days')
    .select('*')
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (planId) {
    query = query.eq('planId', planId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[trainerWorkoutPlanDaysHelper] fetchTrainerWorkoutPlanDays Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchTrainerWorkoutPlanDayById(planDayId: string) {
  const { data, error } = await supabase
    .from('trainer_workout_plan_days')
    .select('*')
    .eq('planDayId', planDayId)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[trainerWorkoutPlanDaysHelper] fetchTrainerWorkoutPlanDayById Error:', error);
    throw error;
  }

  return data;
}

export async function saveTrainerWorkoutPlanDay(planDayData: SaveTrainerWorkoutPlanDayParams) {
  const now = new Date().toISOString();

  if (planDayData.planDayId) {
    const { data, error } = await supabase
      .from('trainer_workout_plan_days')
      .update({
        planId: planDayData.planId,
        workoutId: planDayData.workoutId,
        dayOfWeek: planDayData.dayOfWeek,
        workoutType: planDayData.workoutType,
        durationMinutes: planDayData.durationMinutes,
        updatedAt: now,
      })
      .eq('planDayId', planDayData.planDayId)
      .select();

    if (error) {
      console.error('[trainerWorkoutPlanDaysHelper] saveTrainerWorkoutPlanDay Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedPlanDayId = planDayData.planDayId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('trainer_workout_plan_days')
      .insert([
        {
          planDayId: generatedPlanDayId,
          planId: planDayData.planId,
          workoutId: planDayData.workoutId,
          dayOfWeek: planDayData.dayOfWeek,
          workoutType: planDayData.workoutType,
          durationMinutes: planDayData.durationMinutes,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[trainerWorkoutPlanDaysHelper] saveTrainerWorkoutPlanDay Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteTrainerWorkoutPlanDay(planDayId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('trainer_workout_plan_days')
    .update({
      deletedAt: now,
      updatedAt: now,
    })
    .eq('planDayId', planDayId)
    .select();

  if (error) {
    console.error('[trainerWorkoutPlanDaysHelper] deleteTrainerWorkoutPlanDay Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
