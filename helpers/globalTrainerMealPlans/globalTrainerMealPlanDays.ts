import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type GlobalTrainerMealPlanDayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface GlobalTrainerMealPlanDayAttributes {
  globalTrainerMealPlanDayId?: string;
  globalTrainerMealPlanId: string;
  dayOfWeek: GlobalTrainerMealPlanDayOfWeek | string;
  totalCalories?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SaveGlobalTrainerMealPlanDayParams {
  globalTrainerMealPlanDayId?: string;
  globalTrainerMealPlanId: string;
  dayOfWeek: GlobalTrainerMealPlanDayOfWeek | string;
  totalCalories?: number | null;
}

export async function fetchAllGlobalTrainerMealPlanDays(): Promise<GlobalTrainerMealPlanDayAttributes[]> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_days')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[globalTrainerMealPlanDaysHelper] fetchAllGlobalTrainerMealPlanDays Error:', error);
    throw error;
  }

  return (data || []) as GlobalTrainerMealPlanDayAttributes[];
}

export async function fetchGlobalTrainerMealPlanDays(
  globalTrainerMealPlanId: string
): Promise<GlobalTrainerMealPlanDayAttributes[]> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_days')
    .select('*')
    .eq('globalTrainerMealPlanId', globalTrainerMealPlanId)
    .order('dayOfWeek', { ascending: true });

  if (error) {
    console.error('[globalTrainerMealPlanDaysHelper] fetchGlobalTrainerMealPlanDays Error:', error);
    throw error;
  }

  return (data || []) as GlobalTrainerMealPlanDayAttributes[];
}

export async function fetchGlobalTrainerMealPlanDayById(
  globalTrainerMealPlanDayId: string
): Promise<GlobalTrainerMealPlanDayAttributes | null> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_days')
    .select('*')
    .eq('globalTrainerMealPlanDayId', globalTrainerMealPlanDayId)
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerMealPlanDaysHelper] fetchGlobalTrainerMealPlanDayById Error:', error);
    throw error;
  }

  return data as GlobalTrainerMealPlanDayAttributes | null;
}

export async function fetchGlobalTrainerMealPlanDayByDayOfWeek(
  globalTrainerMealPlanId: string,
  dayOfWeek: string
): Promise<GlobalTrainerMealPlanDayAttributes | null> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_days')
    .select('*')
    .eq('globalTrainerMealPlanId', globalTrainerMealPlanId)
    .ilike('dayOfWeek', dayOfWeek)
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerMealPlanDaysHelper] fetchGlobalTrainerMealPlanDayByDayOfWeek Error:', error);
    throw error;
  }

  return data as GlobalTrainerMealPlanDayAttributes | null;
}

export async function saveGlobalTrainerMealPlanDay(
  dayData: Partial<GlobalTrainerMealPlanDayAttributes>
): Promise<GlobalTrainerMealPlanDayAttributes | null> {
  const now = new Date().toISOString();

  if (dayData.globalTrainerMealPlanDayId) {
    const { data, error } = await supabase
      .from('global_trainer_meal_plan_days')
      .update({
        dayOfWeek: dayData.dayOfWeek,
        totalCalories: dayData.totalCalories ?? null,
        updatedAt: now,
      })
      .eq('globalTrainerMealPlanDayId', dayData.globalTrainerMealPlanDayId)
      .select();

    if (error) {
      console.error('[globalTrainerMealPlanDaysHelper] saveGlobalTrainerMealPlanDay Update Error:', error);
      throw error;
    }

    return data ? (data[0] as GlobalTrainerMealPlanDayAttributes) : null;
  } else {
    if (!dayData.globalTrainerMealPlanId) {
      throw new Error('globalTrainerMealPlanId is required to save a global trainer meal plan day');
    }

    const generatedDayId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('global_trainer_meal_plan_days')
      .insert([
        {
          globalTrainerMealPlanDayId: generatedDayId,
          globalTrainerMealPlanId: dayData.globalTrainerMealPlanId,
          dayOfWeek: dayData.dayOfWeek,
          totalCalories: dayData.totalCalories ?? null,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[globalTrainerMealPlanDaysHelper] saveGlobalTrainerMealPlanDay Insert Error:', error);
      throw error;
    }

    return data ? (data[0] as GlobalTrainerMealPlanDayAttributes) : null;
  }
}

export async function updateGlobalTrainerMealPlanDay(
  globalTrainerMealPlanDayId: string,
  updates: Partial<GlobalTrainerMealPlanDayAttributes>
): Promise<GlobalTrainerMealPlanDayAttributes | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_days')
    .update({ ...updates, updatedAt: now })
    .eq('globalTrainerMealPlanDayId', globalTrainerMealPlanDayId)
    .select();

  if (error) {
    console.error('[globalTrainerMealPlanDaysHelper] updateGlobalTrainerMealPlanDay Error:', error);
    throw error;
  }

  return data ? (data[0] as GlobalTrainerMealPlanDayAttributes) : null;
}

export async function deleteGlobalTrainerMealPlanDay(
  globalTrainerMealPlanDayId: string
): Promise<GlobalTrainerMealPlanDayAttributes | null> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_days')
    .delete()
    .eq('globalTrainerMealPlanDayId', globalTrainerMealPlanDayId)
    .select();

  if (error) {
    console.error('[globalTrainerMealPlanDaysHelper] deleteGlobalTrainerMealPlanDay Error:', error);
    throw error;
  }

  return data ? (data[0] as GlobalTrainerMealPlanDayAttributes) : null;
}

export async function deleteGlobalTrainerMealPlanDaysByPlanId(
  globalTrainerMealPlanId: string
): Promise<void> {
  const { error } = await supabase
    .from('global_trainer_meal_plan_days')
    .delete()
    .eq('globalTrainerMealPlanId', globalTrainerMealPlanId);

  if (error) {
    console.error('[globalTrainerMealPlanDaysHelper] deleteGlobalTrainerMealPlanDaysByPlanId Error:', error);
    throw error;
  }
}

