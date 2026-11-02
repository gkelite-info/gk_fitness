import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface WorkoutPlanDayAttributes {
  planDayId?: string;
  planId: string;
  workoutId?: string | null;
  dayOfWeek: string;
  workoutType: string;
  weekNumber: number;
  durationMinutes?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveWorkoutPlanDayParams {
  planDayId?: string;
  planId: string;
  workoutId?: string | null;
  dayOfWeek: string;
  workoutType: string;
  weekNumber?: number;
  durationMinutes?: number | null;
}

export async function fetchWorkoutPlanDays(planId?: string) {
  let query = supabase
    .from('workout_plan_days')
    .select('*')
    .is('deletedAt', null)
    .order('createdAt', { ascending: true });

  if (planId) {
    query = query.eq('planId', planId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[workoutPlanDaysHelper] fetchWorkoutPlanDays Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchWorkoutPlanDaysByWeek(planId: string, weekNumber: number) {
  const { data, error } = await supabase
    .from('workout_plan_days')
    .select('*')
    .eq('planId', planId)
    .eq('weekNumber', weekNumber)
    .is('deletedAt', null)
    .order('createdAt', { ascending: true });

  if (error) {
    console.error('[workoutPlanDaysHelper] fetchWorkoutPlanDaysByWeek Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchWorkoutPlanDayById(planDayId: string) {
  const { data, error } = await supabase
    .from('workout_plan_days')
    .select('*')
    .eq('planDayId', planDayId)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[workoutPlanDaysHelper] fetchWorkoutPlanDayById Error:', error);
    throw error;
  }

  return data;
}

const isValidUUID = (id?: string | null): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
};

export async function saveWorkoutPlanDay(dayData: SaveWorkoutPlanDayParams) {
  const now = new Date().toISOString();
  const safeWorkoutId = isValidUUID(dayData.workoutId) ? dayData.workoutId : null;

  if (dayData.planDayId) {
    const { data, error } = await supabase
      .from('workout_plan_days')
      .update({
        planId: dayData.planId,
        workoutId: safeWorkoutId,
        dayOfWeek: dayData.dayOfWeek,
        workoutType: dayData.workoutType,
        weekNumber: dayData.weekNumber || 1,
        durationMinutes: dayData.durationMinutes,
        updatedAt: now,
      })
      .eq('planDayId', dayData.planDayId)
      .select();

    if (error) {
      console.error('[workoutPlanDaysHelper] saveWorkoutPlanDay Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedPlanDayId = dayData.planDayId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('workout_plan_days')
      .insert([
        {
          planDayId: generatedPlanDayId,
          planId: dayData.planId,
          workoutId: safeWorkoutId,
          dayOfWeek: dayData.dayOfWeek,
          workoutType: dayData.workoutType,
          weekNumber: dayData.weekNumber || 1,
          durationMinutes: dayData.durationMinutes || null,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[workoutPlanDaysHelper] saveWorkoutPlanDay Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteWorkoutPlanDay(planDayId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('workout_plan_days')
    .update({
      deletedAt: now,
      updatedAt: now,
    })
    .eq('planDayId', planDayId)
    .select();

  if (error) {
    console.error('[workoutPlanDaysHelper] deleteWorkoutPlanDay Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
