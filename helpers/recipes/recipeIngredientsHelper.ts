import { SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { RecipeIngredient } from '@/lib/types/recipes';

export async function fetchIngredientsForMeal(
  client: SupabaseClient,
  globalMealId: string
): Promise<RecipeIngredient[]> {
  try {
    const { data, error } = await client
      .from('global_meal_ingredients')
      .select(`
        globalMealIngredientsId,
        globalIngredientId,
        baseQuantity,
        ingredient:global_ingredients(
          globalIngredientId,
          name,
          unit,
          caloriesPerUnit,
          proteinPerUnit,
          carbsPerUnit,
          fatPerUnit
        )
      `)
      .eq('globalMealId', globalMealId);

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.globalMealIngredientsId,
      globalIngredientId: item.globalIngredientId,
      name: item.ingredient?.name || 'Unknown',
      quantity: Number(item.baseQuantity) || 0,
      unit: item.ingredient?.unit || 'g',
      caloriesPerUnit: item.ingredient?.caloriesPerUnit,
      proteinPerUnit: item.ingredient?.proteinPerUnit,
      carbsPerUnit: item.ingredient?.carbsPerUnit,
      fatPerUnit: item.ingredient?.fatPerUnit,
    }));
  } catch {
    return [];
  }
}

export async function syncIngredientsForMeal(
  client: SupabaseClient,
  globalMealId: string,
  ingredients: RecipeIngredient[]
): Promise<void> {
  if (!ingredients || !Array.isArray(ingredients)) return;

  try {
    await client
      .from('global_meal_ingredients')
      .delete()
      .eq('globalMealId', globalMealId);

    const now = new Date().toISOString();
    const processedIngredientIds = new Set<string>();

    for (const ing of ingredients) {
      if (!ing.name || !ing.name.trim()) continue;
      const cleanName = ing.name.trim();

      let ingredientId = ing.globalIngredientId;

      if (!ingredientId) {
        const { data: existing } = await client
          .from('global_ingredients')
          .select('globalIngredientId')
          .ilike('name', cleanName)
          .maybeSingle();

        if (existing?.globalIngredientId) {
          ingredientId = existing.globalIngredientId;
        } else {
          const newIngredientId = Crypto.randomUUID();
          const { data: created, error: createErr } = await client
            .from('global_ingredients')
            .insert({
              globalIngredientId: newIngredientId,
              name: cleanName,
              unit: ing.unit || 'g',
              caloriesPerUnit: Number(ing.caloriesPerUnit) || 0,
              proteinPerUnit: Number(ing.proteinPerUnit) || 0,
              carbsPerUnit: Number(ing.carbsPerUnit) || 0,
              fatPerUnit: Number(ing.fatPerUnit) || 0,
              createdAt: now,
              updatedAt: now,
            })
            .select('globalIngredientId')
            .maybeSingle();

          if (createErr) {
            console.error('[recipeIngredientsHelper] create ingredient error:', createErr);
          }
          ingredientId = created?.globalIngredientId || newIngredientId;
        }
      }

      if (ingredientId && !processedIngredientIds.has(ingredientId)) {
        processedIngredientIds.add(ingredientId);
        const { error: linkErr } = await client.from('global_meal_ingredients').insert({
          globalMealIngredientsId: Crypto.randomUUID(),
          globalMealId,
          globalIngredientId: ingredientId,
          baseQuantity: Number(ing.quantity) || 0,
          createdAt: now,
          updatedAt: now,
        });

        if (linkErr) {
          console.error('[recipeIngredientsHelper] link error:', linkErr);
        }
      }
    }
  } catch (err) {
    console.error('[recipeIngredientsHelper] sync error:', err);
  }
}

