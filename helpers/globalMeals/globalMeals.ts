import { supabase } from '@/lib/supabase';

export interface GlobalMeal {
  globalMealId: string;
  mealType: string;
  mealName: string;
  description: string;
  calories: number;
  baseCalories?: number;
  protein: number;
  baseProtein?: number;
  carbs: number;
  baseCarbs?: number;
  fat: number;
  baseFat?: number;
  fiber?: number;
  prepTimeMinutes: number;
  cookTimeMinutes?: number;
  servings?: number;
  servingUnit?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | string;
  sodiumMg?: number;
  sugarG?: number;
  isScalable: boolean;
  minScale: number;
  maxScale: number;
  dietTypes: string[];
  allergens: string[];
  cuisines: string[];
  recipeInstructions: any;
  imageUrl: string;
  suitableFor?: string[];
  contraindications?: string[];
  gymId?: string | null;
  isActive?: boolean;
  isGlobal?: boolean;
}

export interface MealIngredient {
  globalMealIngredientId?: string;
  globalMealId: string;
  ingredientId?: string;
  globalIngredientId?: string;
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

// Fallback high-definition food photography for each meal category
const DEFAULT_MEAL_IMAGES: Record<string, string> = {
  BREAKFAST: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  LUNCH: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  SNACK: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
  DINNER: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
};

/**
 * Resolves a recipe image URL. Supports direct URLs, Supabase Storage paths ('recipes/'),
 * and provides type-aware fallbacks.
 */
export function getRecipeImageUrl(imageUrlOrPath?: string | null, mealType?: string): string {
  const fallback = DEFAULT_MEAL_IMAGES[mealType?.toUpperCase() || ''] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
  if (!imageUrlOrPath || imageUrlOrPath.trim() === '') {
    return fallback;
  }
  const clean = imageUrlOrPath.trim();
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('file://') ||
    clean.startsWith('content://')
  ) {
    return clean;
  }
  try {
    const { data } = supabase.storage.from('recipes').getPublicUrl(clean);
    return data?.publicUrl || fallback;
  } catch (e) {
    return fallback;
  }
}

export async function fetchGlobalMeals(): Promise<GlobalMeal[]> {
  const { data, error } = await supabase
    .from('global_meals')
    .select('*');

  if (error) {
    console.error("Error fetching global meals:", error);
    throw error;
  }

  // Normalize dual column naming (calories / baseCalories)
  return (data || []).map((m: any) => ({
    ...m,
    calories: Number(m.calories ?? m.baseCalories ?? 0),
    baseCalories: Number(m.baseCalories ?? m.calories ?? 0),
    protein: Number(m.protein ?? m.baseProtein ?? 0),
    baseProtein: Number(m.baseProtein ?? m.protein ?? 0),
    carbs: Number(m.carbs ?? m.baseCarbs ?? 0),
    baseCarbs: Number(m.baseCarbs ?? m.carbs ?? 0),
    fat: Number(m.fat ?? m.baseFat ?? 0),
    baseFat: Number(m.baseFat ?? m.fat ?? 0),
    fiber: Number(m.fiber ?? 0),
    imageUrl: getRecipeImageUrl(m.imageUrl, m.mealType),
  })) as GlobalMeal[];
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
