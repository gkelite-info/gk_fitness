import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';
import { calculateNutritionTargets } from './nutritionCalculator';
import { fetchGlobalMeals, fetchMealIngredients, GlobalMeal } from '@/helpers/globalMeals/globalMeals';
import * as Crypto from 'expo-crypto';

export interface GeneratedMealPlan {
  days: {
    dayOfWeek: string;
    meals: {
      mealType: string;
      mealName: string;
      description: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      order: number;
      globalMealId?: string;
      ingredientsJson?: any;
      recipeInstructions?: any;
      imageUrl?: string;
      prepTimeMinutes?: number;
    }[];
  }[];
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export async function generateAlgorithmicPlan(userId: string): Promise<GeneratedMealPlan> {
  // 1. Fetch Profile and Targets
  const profile = await fetchCustomerOnboarding(userId);
  if (!profile) throw new Error("Onboarding profile not found.");

  const targets = await calculateNutritionTargets(userId);
  
  // Custom Calorie Distribution
  let dist: Record<string, string> = { BREAKFAST: 'Medium', LUNCH: 'Medium', SNACK: 'Medium', DINNER: 'Medium' };
  try {
    const parsed = JSON.parse(profile.calorieDistribution || '{}');
    if (parsed.BREAKFAST) dist = parsed;
  } catch (e) {
    // legacy string support
    if (profile.calorieDistribution === 'Heavy Breakfast') dist.BREAKFAST = 'Heavy';
    if (profile.calorieDistribution === 'Heavy Dinner') dist.DINNER = 'Heavy';
  }

  const weightMap: Record<string, number> = { 'Light': 1, 'Medium': 2, 'Heavy': 3 };
  
  let mealRatios: Record<string, number> = {};
  
  if (profile.mealsPerDay === 3) {
    const totalWeight = weightMap[dist.BREAKFAST] + weightMap[dist.LUNCH] + weightMap[dist.DINNER];
    mealRatios = {
      'BREAKFAST': weightMap[dist.BREAKFAST] / totalWeight,
      'LUNCH': weightMap[dist.LUNCH] / totalWeight,
      'DINNER': weightMap[dist.DINNER] / totalWeight
    };
  } else if (profile.mealsPerDay === 4) {
    const totalWeight = weightMap[dist.BREAKFAST] + weightMap[dist.LUNCH] + weightMap[dist.SNACK] + weightMap[dist.DINNER];
    mealRatios = {
      'BREAKFAST': weightMap[dist.BREAKFAST] / totalWeight,
      'LUNCH': weightMap[dist.LUNCH] / totalWeight,
      'SNACK': weightMap[dist.SNACK] / totalWeight,
      'DINNER': weightMap[dist.DINNER] / totalWeight
    };
  } else if (profile.mealsPerDay === 5) {
     const totalWeight = weightMap[dist.BREAKFAST] + weightMap[dist.LUNCH] + (weightMap[dist.SNACK] * 2) + weightMap[dist.DINNER];
     mealRatios = {
       'BREAKFAST': weightMap[dist.BREAKFAST] / totalWeight,
       'SNACK1': weightMap[dist.SNACK] / totalWeight,
       'LUNCH': weightMap[dist.LUNCH] / totalWeight,
       'SNACK2': weightMap[dist.SNACK] / totalWeight,
       'DINNER': weightMap[dist.DINNER] / totalWeight
     };
  } else {
     // Default 4 meals
     const totalWeight = weightMap[dist.BREAKFAST] + weightMap[dist.LUNCH] + weightMap[dist.SNACK] + weightMap[dist.DINNER];
     mealRatios = {
       'BREAKFAST': weightMap[dist.BREAKFAST] / totalWeight,
       'LUNCH': weightMap[dist.LUNCH] / totalWeight,
       'SNACK': weightMap[dist.SNACK] / totalWeight,
       'DINNER': weightMap[dist.DINNER] / totalWeight
     };
  }

  // 2. Fetch and filter Global Meals
  const allMeals = await fetchGlobalMeals();
  const userDiet = (profile.dietType || 'non-vegetarian').toLowerCase().replace(/[^a-z]/g, '');
  const eligibleMeals = getEligibleMealsForUser(allMeals, profile);

  // Group by Meal Type
  const pool: Record<string, GlobalMeal[]> = {};
  for (const meal of eligibleMeals) {
    const type = meal.mealType.toUpperCase();
    if (!pool[type]) pool[type] = [];
    pool[type].push(meal);
  }

  // Shuffle pools
  const mealTypesNeeded = Object.keys(mealRatios);
  for (const type of mealTypesNeeded) {
    let t = type;
    if (type.startsWith('SNACK')) t = 'SNACK';
    if (pool[t] && pool[t].length > 0) {
      pool[t].sort(() => 0.5 - Math.random());
    }
  }

  // 3. Generate 7 Days
  const plan: GeneratedMealPlan = { days: [] };
  const cursors: Record<string, number> = {};
  for (const type of mealTypesNeeded) {
    let t = type;
    if (t.startsWith('SNACK')) t = 'SNACK';
    cursors[t] = 0;
  }

  for (const day of DAYS_OF_WEEK) {
    const dayMeals = [];
    let order = 1;
    for (const [mealTypeKey, ratio] of Object.entries(mealRatios)) {
       const targetCalories = targets.targetCalories * ratio;
       
       let t = mealTypeKey;
       if (t.startsWith('SNACK')) t = 'SNACK';

       const typePool = pool[t];
       
       // Handle case where pool might still be empty
       if (!typePool || typePool.length === 0) {
          dayMeals.push({
             mealType: t,
             mealName: 'Placeholder Meal',
             description: `DEBUG: Total=${allMeals.length}, Eligible=${eligibleMeals.length}, Diet=${userDiet}. Pool for ${t} empty. 1st meal diets: ${allMeals[0]?.dietTypes ? JSON.stringify(allMeals[0].dietTypes) : 'null'}`,
             calories: Math.round(targetCalories),
             protein: Math.round((targetCalories * 0.30) / 4),
             carbs: Math.round((targetCalories * 0.45) / 4),
             fat: Math.round((targetCalories * 0.25) / 9),
             order: order++,
          });
          continue;
       }

       const mealIndex = cursors[t] % typePool.length;
       const selectedMeal = typePool[mealIndex];
       cursors[t]++;

       // Scale
       const baseCals = selectedMeal.calories || targetCalories; // fallback to target if missing
       let scalar = targetCalories / baseCals;
       if (selectedMeal.isScalable) {
         scalar = Math.max(selectedMeal.minScale || 0.5, Math.min(scalar, selectedMeal.maxScale || 2.5));
       } else {
         scalar = 1;
       }

       // Fetch ingredients to snapshot
       let scaledIngredients: any[] = [];
       try {
         const rawIngredients = await fetchMealIngredients(selectedMeal.globalMealId);
         scaledIngredients = rawIngredients.map(mi => ({
           name: mi.ingredient?.name || 'Unknown',
           unit: mi.ingredient?.unit || 'unit',
           quantity: Math.round(mi.baseQuantity * scalar * 10) / 10,
         }));
       } catch (e) {
         console.log("Could not fetch ingredients for snapshot");
       }

       dayMeals.push({
         mealType: t,
         mealName: selectedMeal.mealName,
         description: selectedMeal.description,
         calories: selectedMeal.calories ? Math.round(selectedMeal.calories * scalar) : Math.round(targetCalories),
         protein: selectedMeal.protein ? Math.round(selectedMeal.protein * scalar) : Math.round((targetCalories * 0.30) / 4),
         carbs: selectedMeal.carbs ? Math.round(selectedMeal.carbs * scalar) : Math.round((targetCalories * 0.45) / 4),
         fat: selectedMeal.fat ? Math.round(selectedMeal.fat * scalar) : Math.round((targetCalories * 0.25) / 9),
         order: order++,
         globalMealId: selectedMeal.globalMealId,
         ingredientsJson: scaledIngredients,
         recipeInstructions: selectedMeal.recipeInstructions,
         imageUrl: selectedMeal.imageUrl,
         prepTimeMinutes: selectedMeal.prepTimeMinutes,
       });
    }

    plan.days.push({
      dayOfWeek: day,
      meals: dayMeals
    });
  }

  return plan;
}

export function getEligibleMealsForUser(allMeals: GlobalMeal[], profile: any): GlobalMeal[] {
  const userDiet = (profile.dietType || 'non-vegetarian').toLowerCase().replace(/[^a-z]/g, '');
  const userAllergies = (profile.foodAllergies || []).map((a: string) => a.toLowerCase().replace(/[^a-z]/g, ''));
  const userCuisine = (profile.preferredCuisine || 'no preference').toLowerCase().replace(/[^a-z]/g, '');

  const dietAllowedList: Record<string, string[]> = {
    'vegan': ['vegan'],
    'vegetarian': ['vegetarian', 'vegan', 'veg'],
    'eggetarian': ['eggetarian', 'vegetarian', 'vegan', 'veg', 'egg'],
    'nonvegetarian': [] // no filter
  };

  const allowedDiets = dietAllowedList[userDiet] || [];

  let eligibleMeals = allMeals.filter(meal => {
    // 1. Diet Check
    if (userDiet !== 'nonvegetarian' && userDiet !== 'balanced') {
      const mealDiets = (meal.dietTypes || []).map(d => d.toLowerCase().replace(/[^a-z]/g, ''));
      if (mealDiets.length === 0) return false;
      const isAllowed = mealDiets.some(d => allowedDiets.includes(d));
      if (!isAllowed) return false;
    }

    // 2. Allergy Check
    if (userAllergies.length > 0) {
      const allergens = (meal.allergens || []).map(a => a.toLowerCase().replace(/[^a-z]/g, ''));
      for (const allergy of userAllergies) {
        if (allergens.includes(allergy)) return false;
      }
    }
    
    return true;
  });

  // 3. Soft Cuisine Filter
  if (userCuisine !== 'nopreference') {
    const cuisineMeals = eligibleMeals.filter(meal => 
      (meal.cuisines || []).map(c => c.toLowerCase().replace(/[^a-z]/g, '')).includes(userCuisine)
    );
    if (cuisineMeals.length >= 2) {
      eligibleMeals = cuisineMeals;
    }
  }

  return eligibleMeals;
}
