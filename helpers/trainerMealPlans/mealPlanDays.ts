import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface TrainerMealPlanDayAttributes {
  trainerMealPlanDayId?: string;
  trainerMealPlanId: string;
  dayOfWeek: string;
  totalCalories?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export async function fetchAllTrainerMealPlanDays(): Promise<TrainerMealPlanDayAttributes[]> {
  const { data, error } = await supabase
    .from('trainer_meal_plan_days')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[trainerMealPlanDaysHelper] fetchAllTrainerMealPlanDays Error:', error);
    throw error;
  }

  return data as TrainerMealPlanDayAttributes[];
}

export async function fetchTrainerMealPlanDays(trainerMealPlanId: string): Promise<TrainerMealPlanDayAttributes[]> {
  const { data, error } = await supabase
    .from('trainer_meal_plan_days')
    .select('*')
    .eq('trainerMealPlanId', trainerMealPlanId)
    .order('dayOfWeek', { ascending: true }); 

  if (error) {
    console.error('[trainerMealPlanDaysHelper] fetchTrainerMealPlanDays Error:', error);
    throw error;
  }

  return data as TrainerMealPlanDayAttributes[];
}

export async function fetchTrainerMealPlanDayById(trainerMealPlanDayId: string): Promise<TrainerMealPlanDayAttributes | null> {
  const { data, error } = await supabase
    .from('trainer_meal_plan_days')
    .select('*')
    .eq('trainerMealPlanDayId', trainerMealPlanDayId)
    .maybeSingle();

  if (error) {
    console.error('[trainerMealPlanDaysHelper] fetchTrainerMealPlanDayById Error:', error);
    throw error;
  }

  return data as TrainerMealPlanDayAttributes | null;
}

export async function saveTrainerMealPlanDay(dayData: Partial<TrainerMealPlanDayAttributes>): Promise<TrainerMealPlanDayAttributes | null> {
  const now = new Date().toISOString();

  if (dayData.trainerMealPlanDayId) {
    const { data, error } = await supabase
      .from('trainer_meal_plan_days')
      .update({
        dayOfWeek: dayData.dayOfWeek,
        totalCalories: dayData.totalCalories,
        updatedAt: now,
      })
      .eq('trainerMealPlanDayId', dayData.trainerMealPlanDayId)
      .select();

    if (error) {
      console.error('[trainerMealPlanDaysHelper] saveTrainerMealPlanDay Update Error:', error);
      throw error;
    }

    return data ? (data[0] as TrainerMealPlanDayAttributes) : null;
  } else {
    const generatedPlanDayId = dayData.trainerMealPlanDayId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('trainer_meal_plan_days')
      .insert([
        {
          trainerMealPlanDayId: generatedPlanDayId,
          trainerMealPlanId: dayData.trainerMealPlanId,
          dayOfWeek: dayData.dayOfWeek,
          totalCalories: dayData.totalCalories,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[trainerMealPlanDaysHelper] saveTrainerMealPlanDay Insert Error:', error);
      throw error;
    }

    return data ? (data[0] as TrainerMealPlanDayAttributes) : null;
  }
}

export async function updateTrainerMealPlanDay(trainerMealPlanDayId: string, updates: Partial<TrainerMealPlanDayAttributes>): Promise<TrainerMealPlanDayAttributes | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('trainer_meal_plan_days')
    .update({ ...updates, updatedAt: now })
    .eq('trainerMealPlanDayId', trainerMealPlanDayId)
    .select();

  if (error) {
    console.error('[trainerMealPlanDaysHelper] updateTrainerMealPlanDay Error:', error);
    throw error;
  }

  return data ? (data[0] as TrainerMealPlanDayAttributes) : null;
}

export async function deleteTrainerMealPlanDay(trainerMealPlanDayId: string): Promise<TrainerMealPlanDayAttributes | null> {
  const { data, error } = await supabase
    .from('trainer_meal_plan_days')
    .delete()
    .eq('trainerMealPlanDayId', trainerMealPlanDayId)
    .select();

  if (error) {
    console.error('[trainerMealPlanDaysHelper] deleteTrainerMealPlanDay Error:', error);
    throw error;
  }

  return data ? (data[0] as TrainerMealPlanDayAttributes) : null;
}

export async function deleteTrainerMealPlanDaysByPlanId(trainerMealPlanId: string): Promise<void> {
  const { error } = await supabase
    .from('trainer_meal_plan_days')
    .delete()
    .eq('trainerMealPlanId', trainerMealPlanId);

  if (error) {
    console.error('[trainerMealPlanDaysHelper] deleteTrainerMealPlanDaysByPlanId Error:', error);
    throw error;
  }
}
