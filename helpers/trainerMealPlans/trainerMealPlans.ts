import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface TrainerMealPlanAttributes {
  trainerMealPlanId?: string;
  userId: string;
  isActive?: boolean;
  dietType: string;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SaveTrainerMealPlanParams {
  trainerMealPlanId?: string;
  userId: string;
  isActive?: boolean;
  dietType: string;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  createdBy: string;
}

export async function fetchAllTrainerMealPlans(): Promise<TrainerMealPlanAttributes[]> {
  const { data, error } = await supabase
    .from('trainer_meal_plans')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[trainerMealPlansHelper] fetchAllTrainerMealPlans Error:', error);
    throw error;
  }

  return data as TrainerMealPlanAttributes[];
}

export async function fetchTrainerMealPlans(userId?: string): Promise<TrainerMealPlanAttributes[]> {
  let query = supabase
    .from('trainer_meal_plans')
    .select('*')
    .order('createdAt', { ascending: false });

  if (userId) {
    query = query.eq('userId', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[trainerMealPlansHelper] fetchTrainerMealPlans Error:', error);
    throw error;
  }

  return data as TrainerMealPlanAttributes[];
}

export async function fetchTrainerMealPlanById(trainerMealPlanId: string): Promise<TrainerMealPlanAttributes | null> {
  const { data, error } = await supabase
    .from('trainer_meal_plans')
    .select('*')
    .eq('trainerMealPlanId', trainerMealPlanId)
    .maybeSingle();

  if (error) {
    console.error('[trainerMealPlansHelper] fetchTrainerMealPlanById Error:', error);
    throw error;
  }

  return data as TrainerMealPlanAttributes | null;
}

export async function saveTrainerMealPlan(planData: SaveTrainerMealPlanParams): Promise<TrainerMealPlanAttributes | null> {
  const now = new Date().toISOString();
  
  if (planData.trainerMealPlanId) {
    const { data, error } = await supabase
      .from('trainer_meal_plans')
      .update({
        userId: planData.userId,
        isActive: planData.isActive ?? true,
        dietType: planData.dietType,
        targetCalories: planData.targetCalories,
        targetProtein: planData.targetProtein,
        targetCarbs: planData.targetCarbs,
        targetFat: planData.targetFat,
        createdBy: planData.createdBy,
        updatedAt: now,
      })
      .eq('trainerMealPlanId', planData.trainerMealPlanId)
      .select();

    if (error) {
      console.error('[trainerMealPlansHelper] saveTrainerMealPlan Update Error:', error);
      throw error;
    }

    return data ? (data[0] as TrainerMealPlanAttributes) : null;
  } else {
    const generatedPlanId = planData.trainerMealPlanId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('trainer_meal_plans')
      .insert([
        {
          trainerMealPlanId: generatedPlanId,
          userId: planData.userId,
          isActive: planData.isActive ?? true,
          dietType: planData.dietType,
          targetCalories: planData.targetCalories,
          targetProtein: planData.targetProtein,
          targetCarbs: planData.targetCarbs,
          targetFat: planData.targetFat,
          createdBy: planData.createdBy,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[trainerMealPlansHelper] saveTrainerMealPlan Insert Error:', error);
      throw error;
    }

    return data ? (data[0] as TrainerMealPlanAttributes) : null;
  }
}

export async function updateTrainerMealPlan(trainerMealPlanId: string, updates: Partial<TrainerMealPlanAttributes>): Promise<TrainerMealPlanAttributes | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('trainer_meal_plans')
    .update({ ...updates, updatedAt: now })
    .eq('trainerMealPlanId', trainerMealPlanId)
    .select();

  if (error) {
    console.error('[trainerMealPlansHelper] updateTrainerMealPlan Error:', error);
    throw error;
  }

  return data ? (data[0] as TrainerMealPlanAttributes) : null;
}

export async function deleteTrainerMealPlan(trainerMealPlanId: string): Promise<TrainerMealPlanAttributes | null> {
  const { data, error } = await supabase
    .from('trainer_meal_plans')
    .delete()
    .eq('trainerMealPlanId', trainerMealPlanId)
    .select();

  if (error) {
    console.error('[trainerMealPlansHelper] deleteTrainerMealPlan Error:', error);
    throw error;
  }

  return data ? (data[0] as TrainerMealPlanAttributes) : null;
}

export async function deactivateTrainerMealPlans(userId: string): Promise<void> {
  const { error } = await supabase
    .from('trainer_meal_plans')
    .update({ isActive: false })
    .eq('userId', userId);

  if (error) {
    console.error('[trainerMealPlansHelper] deactivateTrainerMealPlans Error:', error);
    throw error;
  }
}
