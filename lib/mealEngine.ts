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
      fiber?: number;
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
  let dist: Record<string, string> = { BREAKFAST: 'Light', LUNCH: 'Heavy', SNACK: 'Light', DINNER: 'Medium' };
  try {
    let parsed = JSON.parse(profile.calorieDistribution || '{}');
    if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Handle double-stringified JSON
    if (parsed && typeof parsed === 'object' && parsed.BREAKFAST) {
       dist = parsed;
    }
  } catch (e) {
    // legacy string support
    if (profile.calorieDistribution === 'Heavy Breakfast') dist.BREAKFAST = 'Heavy';
    if (profile.calorieDistribution === 'Heavy Dinner') dist.DINNER = 'Heavy';
  }

  const weightMap: Record<string, number> = { 'Light': 1, 'Medium': 2, 'Heavy': 3 };
  
  let mealRatios: Record<string, number> = {};
  
  const parsedMealsPerDay = Number(profile.mealsPerDay) || 4;

  if (parsedMealsPerDay === 3) {
    const totalWeight = (weightMap[dist.BREAKFAST] || 1) + (weightMap[dist.LUNCH] || 1) + (weightMap[dist.DINNER] || 1);
    mealRatios = {
      'BREAKFAST': (weightMap[dist.BREAKFAST] || 1) / totalWeight,
      'LUNCH': (weightMap[dist.LUNCH] || 1) / totalWeight,
      'DINNER': (weightMap[dist.DINNER] || 1) / totalWeight
    };
  } else if (parsedMealsPerDay === 4) {
    const totalWeight = (weightMap[dist.BREAKFAST] || 1) + (weightMap[dist.LUNCH] || 1) + (weightMap[dist.SNACK] || 1) + (weightMap[dist.DINNER] || 1);
    mealRatios = {
      'BREAKFAST': (weightMap[dist.BREAKFAST] || 1) / totalWeight,
      'LUNCH': (weightMap[dist.LUNCH] || 1) / totalWeight,
      'SNACK': (weightMap[dist.SNACK] || 1) / totalWeight,
      'DINNER': (weightMap[dist.DINNER] || 1) / totalWeight
    };
  } else if (parsedMealsPerDay === 5) {
     const totalWeight = (weightMap[dist.BREAKFAST] || 1) + (weightMap[dist.LUNCH] || 1) + ((weightMap[dist.SNACK] || 1) * 2) + (weightMap[dist.DINNER] || 1);
     mealRatios = {
       'BREAKFAST': (weightMap[dist.BREAKFAST] || 1) / totalWeight,
       'SNACK1': (weightMap[dist.SNACK] || 1) / totalWeight,
       'LUNCH': (weightMap[dist.LUNCH] || 1) / totalWeight,
       'SNACK2': (weightMap[dist.SNACK] || 1) / totalWeight,
       'DINNER': (weightMap[dist.DINNER] || 1) / totalWeight
     };
  } else {
     // Default for 6 or more meals
     const totalWeight = (weightMap[dist.BREAKFAST] || 1) + ((weightMap[dist.LUNCH] || 1) * 2) + ((weightMap[dist.SNACK] || 1) * 2) + (weightMap[dist.DINNER] || 1);
     mealRatios = {
       'BREAKFAST': (weightMap[dist.BREAKFAST] || 1) / totalWeight,
       'SNACK1': (weightMap[dist.SNACK] || 1) / totalWeight,
       'LUNCH1': (weightMap[dist.LUNCH] || 1) / totalWeight,
       'LUNCH2': (weightMap[dist.LUNCH] || 1) / totalWeight,
       'SNACK2': (weightMap[dist.SNACK] || 1) / totalWeight,
       'DINNER': (weightMap[dist.DINNER] || 1) / totalWeight
     };
  }

  // 1b. Medical-Condition Adaptive Macro Ratios
  let proteinRatio = 0.30;
  let carbRatio = 0.45;
  let fatRatio = 0.25;

  const rawConditions = profile.medicalConditions || [];
  const userConditions = (Array.isArray(rawConditions) ? rawConditions : []).map((c: any) => String(c).toLowerCase());
  const hasCond = (kw: string) => userConditions.some((c: string) => c.includes(kw));

  if (hasCond('diabet') || hasCond('insulin') || hasCond('prediabet') || hasCond('pcos') || hasCond('pcod')) {
    // Low-GI, moderate complex carbs, enhanced protein & healthy fats
    proteinRatio = 0.35;
    carbRatio = 0.35;
    fatRatio = 0.30;
  } else if (hasCond('kidney') || hasCond('ckd')) {
    // Moderate protein to reduce renal burden
    proteinRatio = 0.20;
    carbRatio = 0.52;
    fatRatio = 0.28;
  } else if (hasCond('gout') || hasCond('uric acid')) {
    // Moderate protein, plant-focused, lower purine
    proteinRatio = 0.22;
    carbRatio = 0.53;
    fatRatio = 0.25;
  } else if (hasCond('fatty liver') || hasCond('nafld') || hasCond('hepatic')) {
    // Reduced simple sugars, high lean protein, healthy unsaturated fats
    proteinRatio = 0.33;
    carbRatio = 0.37;
    fatRatio = 0.30;
  } else if (hasCond('reflux') || hasCond('gerd')) {
    // Clean, lower fat to minimize acid regurgitation
    proteinRatio = 0.30;
    carbRatio = 0.48;
    fatRatio = 0.22;
  } else if (hasCond('cholesterol') || hasCond('heart') || hasCond('cardio') || hasCond('hypertension')) {
    // Heart-healthy, lower saturated fat
    proteinRatio = 0.32;
    carbRatio = 0.43;
    fatRatio = 0.25;
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
       // Add a small +/- 5% variance per day so meals aren't identical day-to-day
       const dailyVariance = 0.95 + (Math.random() * 0.1);
       const targetCalories = targets.targetCalories * ratio * dailyVariance;
       
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
             protein: Math.round((targetCalories * proteinRatio) / 4),
             carbs: Math.round((targetCalories * carbRatio) / 4),
             fat: Math.round((targetCalories * fatRatio) / 9),
             fiber: Math.round(((targetCalories * carbRatio) / 4) * 0.15),
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
         protein: selectedMeal.protein ? Math.round(selectedMeal.protein * scalar) : Math.round((targetCalories * proteinRatio) / 4),
         carbs: selectedMeal.carbs ? Math.round(selectedMeal.carbs * scalar) : Math.round((targetCalories * carbRatio) / 4),
         fat: selectedMeal.fat ? Math.round(selectedMeal.fat * scalar) : Math.round((targetCalories * fatRatio) / 9),
         fiber: selectedMeal.fiber ? Math.round(selectedMeal.fiber * scalar) : Math.round((selectedMeal.carbs || 30) * 0.15),
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

  const rawConditions = profile.medicalConditions || [];
  const userConditions = (Array.isArray(rawConditions) ? rawConditions : []).map((c: any) => String(c).toLowerCase());
  const hasCond = (kw: string) => userConditions.some((c: string) => c.includes(kw));

  // If user has Celiac Disease or gluten sensitivity, automatically safeguard against gluten & wheat allergens
  if (hasCond('celiac') || hasCond('gluten')) {
    if (!userAllergies.includes('gluten')) userAllergies.push('gluten');
    if (!userAllergies.includes('wheat')) userAllergies.push('wheat');
  }

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
      let rawDiets: any = meal.dietTypes || [];
      if (typeof rawDiets === 'string') {
        try { rawDiets = JSON.parse(rawDiets); } catch (e) { rawDiets = [rawDiets]; }
      }
      const mealDiets = Array.isArray(rawDiets) ? rawDiets.map((d: any) => String(d).toLowerCase().replace(/[^a-z]/g, '')) : [];
      if (mealDiets.length === 0) return true; // If no diet tags, assume it's allowed rather than excluding all un-tagged meals
      const isAllowed = mealDiets.some(d => allowedDiets.includes(d));
      if (!isAllowed) return false;
    }

    // 2. Allergy Check
    if (userAllergies.length > 0) {
      let rawAllergens: any = meal.allergens || [];
      if (typeof rawAllergens === 'string') {
        try { rawAllergens = JSON.parse(rawAllergens); } catch (e) { rawAllergens = [rawAllergens]; }
      }
      const allergens = Array.isArray(rawAllergens) ? rawAllergens.map((a: any) => String(a).toLowerCase().replace(/[^a-z]/g, '')) : [];
      for (const allergy of userAllergies) {
        if (allergens.includes(allergy)) return false;
      }
    }

    // 2b. Medical Contraindication Check (Strict Exclusion)
    if (userConditions.length > 0 && meal.contraindications && meal.contraindications.length > 0) {
      let rawContra: any = meal.contraindications;
      if (typeof rawContra === 'string') {
        try { rawContra = JSON.parse(rawContra); } catch (e) { rawContra = [rawContra]; }
      }
      const contraList = Array.isArray(rawContra) ? rawContra.map((c: any) => String(c).toLowerCase()) : [];
      for (const contra of contraList) {
        if (userConditions.some((uc: string) => uc.includes(contra) || contra.includes(uc))) {
          return false; // Exclude recipe strictly if contraindicated
        }
      }
    }
    
    return true;
  });

  // 3. Medical Condition Soft Prioritization
  if (userConditions.length > 0) {
    const medicalPreferred = eligibleMeals.filter(meal => {
      // 3a. Explicit suitableFor database tag match
      if (meal.suitableFor && meal.suitableFor.length > 0) {
        let rawSuitable: any = meal.suitableFor;
        if (typeof rawSuitable === 'string') {
          try { rawSuitable = JSON.parse(rawSuitable); } catch (e) { rawSuitable = [rawSuitable]; }
        }
        const suitableList = Array.isArray(rawSuitable) ? rawSuitable.map((s: any) => String(s).toLowerCase()) : [];
        if (suitableList.some((st: string) => userConditions.some((uc: string) => uc.includes(st) || st.includes(uc)))) {
          return true;
        }
      }

      // 3b. Keyword fallback in description and dietTypes
      const desc = (meal.description || '').toLowerCase();
      let rawDiets: any = meal.dietTypes || [];
      if (typeof rawDiets === 'string') {
        try { rawDiets = JSON.parse(rawDiets); } catch (e) { rawDiets = [rawDiets]; }
      }
      const dietsStr = Array.isArray(rawDiets) ? rawDiets.join(' ').toLowerCase() : '';

      if (hasCond('diabet') || hasCond('insulin')) {
        if (desc.includes('sugar-free') || desc.includes('low-gi') || dietsStr.includes('diabetic')) return true;
      }
      if (hasCond('hypertension') || hasCond('blood pressure')) {
        if (desc.includes('low sodium') || dietsStr.includes('low-sodium')) return true;
      }
      if (hasCond('heart') || hasCond('cardio') || hasCond('cholesterol')) {
        if (desc.includes('heart') || desc.includes('low fat') || dietsStr.includes('heart-healthy')) return true;
      }
      if (hasCond('fatty liver') || hasCond('nafld')) {
        if (desc.includes('lean') || desc.includes('low sugar') || dietsStr.includes('liver-friendly')) return true;
      }
      if (hasCond('gout') || hasCond('uric acid')) {
        if (desc.includes('low purine') || dietsStr.includes('low-purine') || desc.includes('plant-based')) return true;
      }
      if (hasCond('reflux') || hasCond('gerd')) {
        if (desc.includes('mild') || desc.includes('non-acidic') || desc.includes('low acid')) return true;
      }
      return false;
    });

    if (medicalPreferred.length >= 3) {
      const remaining = eligibleMeals.filter(m => !medicalPreferred.includes(m));
      eligibleMeals = [...medicalPreferred, ...remaining];
    }
  }

  // 4. Soft Cuisine Filter
  if (userCuisine !== 'nopreference') {
    const cuisineMeals = eligibleMeals.filter(meal => {
      let rawCuisines: any = meal.cuisines || [];
      if (typeof rawCuisines === 'string') {
        try { rawCuisines = JSON.parse(rawCuisines); } catch (e) { rawCuisines = [rawCuisines]; }
      }
      const cuisines = Array.isArray(rawCuisines) ? rawCuisines.map((c: any) => String(c).toLowerCase().replace(/[^a-z]/g, '')) : [];
      return cuisines.includes(userCuisine);
    });
    if (cuisineMeals.length >= 2) {
      eligibleMeals = cuisineMeals;
    }
  }

  return eligibleMeals;
}
