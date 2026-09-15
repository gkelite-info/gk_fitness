import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface TrainerMealPlanDayMealAttributes {
  trainerMealPlanDayMealId?: string;
  trainerMealPlanDayId: string;
  mealType: string;
  mealName: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
}

export async function fetchAllTrainerMealPlanDayMeals(): Promise<TrainerMealPlanDayMealAttributes[]> {
  const { data, error } = await supabase
    .from('trainer_meal_plan_day_meals')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[trainerMealPlanDayMealsHelper] fetchAllTrainerMealPlanDayMeals Error:', error);
    throw error;
  }

  return data as TrainerMealPlanDayMealAttributes[];
}

export async function fetchTrainerMealPlanDayMeals(trainerMealPlanDayId: string): Promise<TrainerMealPlanDayMealAttributes[]> {
  const { data, error } = await supabase
    .from('trainer_meal_plan_day_meals')
    .select('*')
    .eq('trainerMealPlanDayId', trainerMealPlanDayId)
    .order('order', { ascending: true });

  if (error) {
    console.error('[trainerMealPlanDayMealsHelper] fetchTrainerMealPlanDayMeals Error:', error);
    throw error;
  }

  return data as TrainerMealPlanDayMealAttributes[];
}

export async function fetchTrainerMealPlanDayMealById(trainerMealPlanDayMealId: string): Promise<TrainerMealPlanDayMealAttributes | null> {
  const { data, error } = await supabase
    .from('trainer_meal_plan_day_meals')
    .select('*')
    .eq('trainerMealPlanDayMealId', trainerMealPlanDayMealId)
    .maybeSingle();

  if (error) {
    console.error('[trainerMealPlanDayMealsHelper] fetchTrainerMealPlanDayMealById Error:', error);
    throw error;
  }

  return data as TrainerMealPlanDayMealAttributes | null;
}

export async function saveTrainerMealPlanDayMeal(mealData: Partial<TrainerMealPlanDayMealAttributes>): Promise<TrainerMealPlanDayMealAttributes | null> {
  const now = new Date().toISOString();

  if (mealData.trainerMealPlanDayMealId) {
    const { data, error } = await supabase
      .from('trainer_meal_plan_day_meals')
      .update({
        mealType: mealData.mealType,
        mealName: mealData.mealName,
        description: mealData.description,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
        order: mealData.order,
        globalMealId: mealData.globalMealId,
        ingredientsJson: mealData.ingredientsJson,
        recipeInstructions: mealData.recipeInstructions,
        imageUrl: mealData.imageUrl,
        prepTimeMinutes: mealData.prepTimeMinutes,
        updatedAt: now,
      })
      .eq('trainerMealPlanDayMealId', mealData.trainerMealPlanDayMealId)
      .select();

    if (error) {
      console.error('[trainerMealPlanDayMealsHelper] saveTrainerMealPlanDayMeal Update Error:', error);
      throw error;
    }

    return data ? (data[0] as TrainerMealPlanDayMealAttributes) : null;
  } else {
    const generatedDayMealId = mealData.trainerMealPlanDayMealId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('trainer_meal_plan_day_meals')
      .insert([
        {
          trainerMealPlanDayMealId: generatedDayMealId,
          trainerMealPlanDayId: mealData.trainerMealPlanDayId,
          mealType: mealData.mealType,
          mealName: mealData.mealName,
          description: mealData.description,
          calories: mealData.calories,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fat: mealData.fat,
          order: mealData.order,
          globalMealId: mealData.globalMealId,
          ingredientsJson: mealData.ingredientsJson,
          recipeInstructions: mealData.recipeInstructions,
          imageUrl: mealData.imageUrl,
          prepTimeMinutes: mealData.prepTimeMinutes,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[trainerMealPlanDayMealsHelper] saveTrainerMealPlanDayMeal Insert Error:', error);
      throw error;
    }

    return data ? (data[0] as TrainerMealPlanDayMealAttributes) : null;
  }
}

export async function updateTrainerMealPlanDayMeal(trainerMealPlanDayMealId: string, updates: Partial<TrainerMealPlanDayMealAttributes>): Promise<TrainerMealPlanDayMealAttributes | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('trainer_meal_plan_day_meals')
    .update({ ...updates, updatedAt: now })
    .eq('trainerMealPlanDayMealId', trainerMealPlanDayMealId)
    .select();

  if (error) {
    console.error('[trainerMealPlanDayMealsHelper] updateTrainerMealPlanDayMeal Error:', error);
    throw error;
  }

  return data ? (data[0] as TrainerMealPlanDayMealAttributes) : null;
}

export async function deleteTrainerMealPlanDayMeal(trainerMealPlanDayMealId: string): Promise<TrainerMealPlanDayMealAttributes | null> {
  const { data, error } = await supabase
    .from('trainer_meal_plan_day_meals')
    .delete()
    .eq('trainerMealPlanDayMealId', trainerMealPlanDayMealId)
    .select();

  if (error) {
    console.error('[trainerMealPlanDayMealsHelper] deleteTrainerMealPlanDayMeal Error:', error);
    throw error;
  }

  return data ? (data[0] as TrainerMealPlanDayMealAttributes) : null;
}

export async function deleteTrainerMealPlanDayMealsByDayId(trainerMealPlanDayId: string): Promise<void> {
  const { error } = await supabase
    .from('trainer_meal_plan_day_meals')
    .delete()
    .eq('trainerMealPlanDayId', trainerMealPlanDayId);

  if (error) {
    console.error('[trainerMealPlanDayMealsHelper] deleteTrainerMealPlanDayMealsByDayId Error:', error);
    throw error;
  }
}

export async function updateTrainerMealPlanDayMealsOrder(updates: { mealId: string, order: number }[]): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from('trainer_meal_plan_day_meals')
      .update({ order: update.order })
      .eq('trainerMealPlanDayMealId', update.mealId);
      
    if (error) {
      console.error('[trainerMealPlanDayMealsHelper] updateTrainerMealPlanDayMealsOrder Error:', error);
    }
  }
}
