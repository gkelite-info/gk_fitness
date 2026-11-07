import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GlobalTrainerMealPlanAttributes {
  globalTrainerMealPlanId?: string;
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
  user?: {
    userId: string;
    fullName?: string | null;
    email?: string | null;
    mobile?: string | null;
    profilePhoto?: string | null;
  } | null;
  globalTrainer?: {
    globalTrainerId: string;
    fullName?: string | null;
    email?: string | null;
    mobile?: string | null;
  } | null;
}

export interface SaveGlobalTrainerMealPlanParams {
  globalTrainerMealPlanId?: string;
  userId: string;
  isActive?: boolean;
  dietType: string;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  createdBy: string;
}

export async function fetchAllGlobalTrainerMealPlans(): Promise<GlobalTrainerMealPlanAttributes[]> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plans')
    .select('*, user:users!global_trainer_meal_plans_userId_fkey(*), globalTrainer:global_trainers!global_trainer_meal_plans_createdBy_fkey(*)')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[globalTrainerMealPlansHelper] fetchAllGlobalTrainerMealPlans Error:', error);
    throw error;
  }

  return (data || []) as GlobalTrainerMealPlanAttributes[];
}

export async function fetchGlobalTrainerMealPlans(
  userId?: string,
  createdBy?: string,
  isActive?: boolean
): Promise<GlobalTrainerMealPlanAttributes[]> {
  let query = supabase
    .from('global_trainer_meal_plans')
    .select('*, user:users!global_trainer_meal_plans_userId_fkey(*), globalTrainer:global_trainers!global_trainer_meal_plans_createdBy_fkey(*)')
    .order('createdAt', { ascending: false });

  if (userId) {
    query = query.eq('userId', userId);
  }

  if (createdBy) {
    query = query.eq('createdBy', createdBy);
  }

  if (isActive !== undefined) {
    query = query.eq('isActive', isActive);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[globalTrainerMealPlansHelper] fetchGlobalTrainerMealPlans Error:', error);
    throw error;
  }

  return (data || []) as GlobalTrainerMealPlanAttributes[];
}

export async function fetchGlobalTrainerMealPlanById(
  globalTrainerMealPlanId: string
): Promise<GlobalTrainerMealPlanAttributes | null> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plans')
    .select('*, user:users!global_trainer_meal_plans_userId_fkey(*), globalTrainer:global_trainers!global_trainer_meal_plans_createdBy_fkey(*)')
    .eq('globalTrainerMealPlanId', globalTrainerMealPlanId)
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerMealPlansHelper] fetchGlobalTrainerMealPlanById Error:', error);
    throw error;
  }

  return data as GlobalTrainerMealPlanAttributes | null;
}

export async function fetchActiveGlobalTrainerMealPlan(
  userId: string
): Promise<GlobalTrainerMealPlanAttributes | null> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plans')
    .select('*, user:users!global_trainer_meal_plans_userId_fkey(*), globalTrainer:global_trainers!global_trainer_meal_plans_createdBy_fkey(*)')
    .eq('userId', userId)
    .eq('isActive', true)
    .order('updatedAt', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerMealPlansHelper] fetchActiveGlobalTrainerMealPlan Error:', error);
    throw error;
  }

  return data as GlobalTrainerMealPlanAttributes | null;
}

export async function saveGlobalTrainerMealPlan(
  planData: SaveGlobalTrainerMealPlanParams
): Promise<GlobalTrainerMealPlanAttributes | null> {
  const now = new Date().toISOString();

  if (planData.globalTrainerMealPlanId) {
    const { data, error } = await supabase
      .from('global_trainer_meal_plans')
      .update({
        userId: planData.userId,
        isActive: planData.isActive ?? true,
        dietType: planData.dietType,
        targetCalories: planData.targetCalories ?? null,
        targetProtein: planData.targetProtein ?? null,
        targetCarbs: planData.targetCarbs ?? null,
        targetFat: planData.targetFat ?? null,
        createdBy: planData.createdBy,
        updatedAt: now,
      })
      .eq('globalTrainerMealPlanId', planData.globalTrainerMealPlanId)
      .select();

    if (error) {
      console.error('[globalTrainerMealPlansHelper] saveGlobalTrainerMealPlan Update Error:', error);
      throw error;
    }

    return data ? (data[0] as GlobalTrainerMealPlanAttributes) : null;
  } else {
    const generatedPlanId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('global_trainer_meal_plans')
      .insert([
        {
          globalTrainerMealPlanId: generatedPlanId,
          userId: planData.userId,
          isActive: planData.isActive ?? true,
          dietType: planData.dietType,
          targetCalories: planData.targetCalories ?? null,
          targetProtein: planData.targetProtein ?? null,
          targetCarbs: planData.targetCarbs ?? null,
          targetFat: planData.targetFat ?? null,
          createdBy: planData.createdBy,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[globalTrainerMealPlansHelper] saveGlobalTrainerMealPlan Insert Error:', error);
      throw error;
    }

    return data ? (data[0] as GlobalTrainerMealPlanAttributes) : null;
  }
}

export async function updateGlobalTrainerMealPlan(
  globalTrainerMealPlanId: string,
  updates: Partial<GlobalTrainerMealPlanAttributes>
): Promise<GlobalTrainerMealPlanAttributes | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('global_trainer_meal_plans')
    .update({ ...updates, updatedAt: now })
    .eq('globalTrainerMealPlanId', globalTrainerMealPlanId)
    .select();

  if (error) {
    console.error('[globalTrainerMealPlansHelper] updateGlobalTrainerMealPlan Error:', error);
    throw error;
  }

  return data ? (data[0] as GlobalTrainerMealPlanAttributes) : null;
}

export async function deleteGlobalTrainerMealPlan(
  globalTrainerMealPlanId: string
): Promise<GlobalTrainerMealPlanAttributes | null> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plans')
    .delete()
    .eq('globalTrainerMealPlanId', globalTrainerMealPlanId)
    .select();

  if (error) {
    console.error('[globalTrainerMealPlansHelper] deleteGlobalTrainerMealPlan Error:', error);
    throw error;
  }

  return data ? (data[0] as GlobalTrainerMealPlanAttributes) : null;
}

export async function deactivateGlobalTrainerMealPlans(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('global_trainer_meal_plans')
    .update({ isActive: false, updatedAt: now })
    .eq('userId', userId);

  if (error) {
    console.error('[globalTrainerMealPlansHelper] deactivateGlobalTrainerMealPlans Error:', error);
    throw error;
  }
}

export async function toggleGlobalTrainerMealPlanActiveStatus(
  globalTrainerMealPlanId: string,
  currentStatus: boolean
): Promise<GlobalTrainerMealPlanAttributes | null> {
  return await updateGlobalTrainerMealPlan(globalTrainerMealPlanId, { isActive: !currentStatus });
}

