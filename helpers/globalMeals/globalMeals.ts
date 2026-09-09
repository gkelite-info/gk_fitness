import { supabase } from '@/lib/supabase';

export interface GlobalMeal {
  globalMealId: string;
  mealType: string;
  mealName: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  prepTimeMinutes: number;
  isScalable: boolean;
  minScale: number;
  maxScale: number;
  dietTypes: string[];
  allergens: string[];
  cuisines: string[];
  recipeInstructions: any;
  imageUrl: string;
}

export interface MealIngredient {
  globalMealIngredientId: string;
  globalMealId: string;
  ingredientId: string;
  baseQuantity: number;
  ingredient: {
    name: string;
    unit: string;
    caloriesPerUnit: number;
    proteinPerUnit: number;
    carbsPerUnit: number;
    fatPerUnit: number;
  };
}

export async function fetchGlobalMeals(): Promise<GlobalMeal[]> {
  const { data, error } = await supabase
    .from('global_meals')
    .select('*');

  if (error) {
    console.error("Error fetching global meals:", error);
    throw error;
  }
  return data as GlobalMeal[];
}

export async function fetchMealIngredients(globalMealId: string): Promise<MealIngredient[]> {
  const { data, error } = await supabase
    .from('global_meal_ingredients')
    .select(`
      *,
      ingredient:global_ingredients(*)
    `)
    .eq('globalMealId', globalMealId);

  if (error) {
    console.error("Error fetching meal ingredients:", error);
    throw error;
  }
  return data as MealIngredient[];
}
