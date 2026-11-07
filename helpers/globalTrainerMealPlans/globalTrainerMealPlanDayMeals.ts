import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GlobalTrainerMealPlanDayMealAttributes {
  globalTrainerMealPlanDayMealId?: string;
  globalTrainerMealPlanDayId: string;
  mealType: string;
  mealName: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat?: number | null;
  fiber?: number | null;
  order?: number | null;
  image?: string | null;
  globalMealId?: string | null;
  ingredientsJson?: any;
  recipeInstructions?: any;
  imageUrl?: string | null;
  prepTimeMinutes?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  globalMeal?: {
    globalMealId: string;
    mealName?: string | null;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    imageUrl?: string | null;
  } | null;
}

export interface SaveGlobalTrainerMealPlanDayMealParams {
  globalTrainerMealPlanDayMealId?: string;
  globalTrainerMealPlanDayId: string;
  mealType: string;
  mealName: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat?: number | null;
  fiber?: number | null;
  order?: number | null;
  image?: string | null;
  globalMealId?: string | null;
  ingredientsJson?: any;
  recipeInstructions?: any;
  imageUrl?: string | null;
  prepTimeMinutes?: number | null;
}

export async function fetchAllGlobalTrainerMealPlanDayMeals(): Promise<GlobalTrainerMealPlanDayMealAttributes[]> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_day_meals')
    .select('*, globalMeal:global_meals!global_trainer_meal_plan_day_meals_globalMealId_fkey(*)')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[globalTrainerMealPlanDayMealsHelper] fetchAllGlobalTrainerMealPlanDayMeals Error:', error);
    throw error;
  }

  return (data || []) as GlobalTrainerMealPlanDayMealAttributes[];
}

export async function fetchGlobalTrainerMealPlanDayMeals(
  globalTrainerMealPlanDayId: string
): Promise<GlobalTrainerMealPlanDayMealAttributes[]> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_day_meals')
    .select('*, globalMeal:global_meals!global_trainer_meal_plan_day_meals_globalMealId_fkey(*)')
    .eq('globalTrainerMealPlanDayId', globalTrainerMealPlanDayId)
    .order('order', { ascending: true });

  if (error) {
    console.error('[globalTrainerMealPlanDayMealsHelper] fetchGlobalTrainerMealPlanDayMeals Error:', error);
    throw error;
  }

  return (data || []) as GlobalTrainerMealPlanDayMealAttributes[];
}

export async function fetchGlobalTrainerMealPlanDayMealById(
  globalTrainerMealPlanDayMealId: string
): Promise<GlobalTrainerMealPlanDayMealAttributes | null> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_day_meals')
    .select('*, globalMeal:global_meals!global_trainer_meal_plan_day_meals_globalMealId_fkey(*)')
    .eq('globalTrainerMealPlanDayMealId', globalTrainerMealPlanDayMealId)
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerMealPlanDayMealsHelper] fetchGlobalTrainerMealPlanDayMealById Error:', error);
    throw error;
  }

  return data as GlobalTrainerMealPlanDayMealAttributes | null;
}

export async function fetchGlobalTrainerMealPlanDayMealsByMealType(
  globalTrainerMealPlanDayId: string,
  mealType: string
): Promise<GlobalTrainerMealPlanDayMealAttributes[]> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_day_meals')
    .select('*, globalMeal:global_meals!global_trainer_meal_plan_day_meals_globalMealId_fkey(*)')
    .eq('globalTrainerMealPlanDayId', globalTrainerMealPlanDayId)
    .ilike('mealType', mealType)
    .order('order', { ascending: true });

  if (error) {
    console.error('[globalTrainerMealPlanDayMealsHelper] fetchGlobalTrainerMealPlanDayMealsByMealType Error:', error);
    throw error;
  }

  return (data || []) as GlobalTrainerMealPlanDayMealAttributes[];
}

export async function saveGlobalTrainerMealPlanDayMeal(
  mealData: Partial<GlobalTrainerMealPlanDayMealAttributes>
): Promise<GlobalTrainerMealPlanDayMealAttributes | null> {
  const now = new Date().toISOString();

  if (mealData.globalTrainerMealPlanDayMealId) {
    const { data, error } = await supabase
      .from('global_trainer_meal_plan_day_meals')
      .update({
        mealType: mealData.mealType,
        mealName: mealData.mealName,
        description: mealData.description ?? null,
        calories: mealData.calories ?? 0,
        protein: mealData.protein ?? 0,
        carbs: mealData.carbs ?? 0,
        fat: mealData.fat ?? null,
        order: mealData.order ?? null,
        image: mealData.image ?? null,
        globalMealId: mealData.globalMealId ?? null,
        ingredientsJson: mealData.ingredientsJson ?? null,
        recipeInstructions: mealData.recipeInstructions ?? null,
        imageUrl: mealData.imageUrl ?? null,
        prepTimeMinutes: mealData.prepTimeMinutes ?? null,
        updatedAt: now,
      })
      .eq('globalTrainerMealPlanDayMealId', mealData.globalTrainerMealPlanDayMealId)
      .select();

    if (error) {
      console.error('[globalTrainerMealPlanDayMealsHelper] saveGlobalTrainerMealPlanDayMeal Update Error:', error);
      throw error;
    }

    return data ? (data[0] as GlobalTrainerMealPlanDayMealAttributes) : null;
  } else {
    if (!mealData.globalTrainerMealPlanDayId) {
      throw new Error('globalTrainerMealPlanDayId is required to save a global trainer meal plan day meal');
    }

    const generatedDayMealId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('global_trainer_meal_plan_day_meals')
      .insert([
        {
          globalTrainerMealPlanDayMealId: generatedDayMealId,
          globalTrainerMealPlanDayId: mealData.globalTrainerMealPlanDayId,
          mealType: mealData.mealType,
          mealName: mealData.mealName,
          description: mealData.description ?? null,
          calories: mealData.calories ?? 0,
          protein: mealData.protein ?? 0,
          carbs: mealData.carbs ?? 0,
          fat: mealData.fat ?? null,
          order: mealData.order ?? null,
          image: mealData.image ?? null,
          globalMealId: mealData.globalMealId ?? null,
          ingredientsJson: mealData.ingredientsJson ?? null,
          recipeInstructions: mealData.recipeInstructions ?? null,
          imageUrl: mealData.imageUrl ?? null,
          prepTimeMinutes: mealData.prepTimeMinutes ?? null,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[globalTrainerMealPlanDayMealsHelper] saveGlobalTrainerMealPlanDayMeal Insert Error:', error);
      throw error;
    }

    return data ? (data[0] as GlobalTrainerMealPlanDayMealAttributes) : null;
  }
}

export async function updateGlobalTrainerMealPlanDayMeal(
  globalTrainerMealPlanDayMealId: string,
  updates: Partial<GlobalTrainerMealPlanDayMealAttributes>
): Promise<GlobalTrainerMealPlanDayMealAttributes | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_day_meals')
    .update({ ...updates, updatedAt: now })
    .eq('globalTrainerMealPlanDayMealId', globalTrainerMealPlanDayMealId)
    .select();

  if (error) {
    console.error('[globalTrainerMealPlanDayMealsHelper] updateGlobalTrainerMealPlanDayMeal Error:', error);
    throw error;
  }

  return data ? (data[0] as GlobalTrainerMealPlanDayMealAttributes) : null;
}

export async function deleteGlobalTrainerMealPlanDayMeal(
  globalTrainerMealPlanDayMealId: string
): Promise<GlobalTrainerMealPlanDayMealAttributes | null> {
  const { data, error } = await supabase
    .from('global_trainer_meal_plan_day_meals')
    .delete()
    .eq('globalTrainerMealPlanDayMealId', globalTrainerMealPlanDayMealId)
    .select();

  if (error) {
    console.error('[globalTrainerMealPlanDayMealsHelper] deleteGlobalTrainerMealPlanDayMeal Error:', error);
    throw error;
  }

  return data ? (data[0] as GlobalTrainerMealPlanDayMealAttributes) : null;
}

export async function deleteGlobalTrainerMealPlanDayMealsByDayId(
  globalTrainerMealPlanDayId: string
): Promise<void> {
  const { error } = await supabase
    .from('global_trainer_meal_plan_day_meals')
    .delete()
    .eq('globalTrainerMealPlanDayId', globalTrainerMealPlanDayId);

  if (error) {
    console.error('[globalTrainerMealPlanDayMealsHelper] deleteGlobalTrainerMealPlanDayMealsByDayId Error:', error);
    throw error;
  }
}

