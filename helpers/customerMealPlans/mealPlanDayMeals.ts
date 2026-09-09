import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface MealPlanDayMealAttributes {
  customerMealPlanDayMealId?: string;
  customerMealPlanDayId: string;
  mealType: string;
  mealName: string;
  description?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  order: number;
  image?: string | null;
  globalMealId?: string | null;
  ingredientsJson?: any;
  recipeInstructions?: any;
  imageUrl?: string | null;
  prepTimeMinutes?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export async function fetchMealPlanDayMeals(customerMealPlanDayId: string) {
  const { data, error } = await supabase
    .from('customer_meal_plan_day_meals')
    .select('*')
    .eq('customerMealPlanDayId', customerMealPlanDayId)
    .order('order', { ascending: true });

  if (error) {
    console.error('[mealPlanDayMealsHelper] fetchMealPlanDayMeals Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function saveMealPlanDayMeal(mealData: Partial<MealPlanDayMealAttributes>) {
  const now = new Date().toISOString();

  if (mealData.customerMealPlanDayMealId) {
    const { data, error } = await supabase
      .from('customer_meal_plan_day_meals')
      .update({
        mealType: mealData.mealType,
        mealName: mealData.mealName,
        description: mealData.description,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
        order: mealData.order,
        image: mealData.image,
        globalMealId: mealData.globalMealId,
        ingredientsJson: mealData.ingredientsJson,
        recipeInstructions: mealData.recipeInstructions,
        imageUrl: mealData.imageUrl,
        prepTimeMinutes: mealData.prepTimeMinutes,
        updatedAt: now,
      })
      .eq('customerMealPlanDayMealId', mealData.customerMealPlanDayMealId)
      .select();

    if (error) {
      console.error('[mealPlanDayMealsHelper] saveMealPlanDayMeal Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedDayMealId = mealData.customerMealPlanDayMealId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('customer_meal_plan_day_meals')
      .insert([
        {
          customerMealPlanDayMealId: generatedDayMealId,
          customerMealPlanDayId: mealData.customerMealPlanDayId,
          mealType: mealData.mealType,
          mealName: mealData.mealName,
          description: mealData.description,
          calories: mealData.calories,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fat: mealData.fat,
          order: mealData.order,
          image: mealData.image,
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
      console.error('[mealPlanDayMealsHelper] saveMealPlanDayMeal Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteMealPlanDayMeal(customerMealPlanDayMealId: string) {
  // Hard delete since there's no deletedAt column in the new schema
  const { data, error } = await supabase
    .from('customer_meal_plan_day_meals')
    .delete()
    .eq('customerMealPlanDayMealId', customerMealPlanDayMealId)
    .select();

  if (error) {
    console.error('[mealPlanDayMealsHelper] deleteMealPlanDayMeal Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
