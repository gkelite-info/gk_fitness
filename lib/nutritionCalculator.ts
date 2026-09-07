import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';
import { supabase } from '@/lib/supabase';

export async function calculateNutritionTargets(userId: string) {
  // 1. Fetch user onboarding data
  const profile = await fetchCustomerOnboarding(userId);

  // Parse or provide default values to prevent calculation errors
  // Note: Onboarding doesn't explicitly collect gender or DOB yet in the basic payload,
  // so we default to male/30 for BMR, or pull from users table if available.
  const gender: string = 'male'; 
  const age = 30;

  const height = parseFloat(profile?.height) || 170; // cm
  const weight = parseFloat(profile?.weight) || 70; // kg
  // Parse camelCase goals from onboarding (e.g. 'loseWeight')
  const primaryGoal = profile?.primaryGoal?.toLowerCase() || 'stayfit';

  // 1. Calculate BMR (Mifflin-St Jeor)
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // 2. Determine Workout Days for TDEE Multiplier
  let activeWorkoutDays = 0;
  try {
    const plans = await fetchCustomerWorkoutPlans(userId);
    const activePlan = plans.find(p => p.isActive);
    if (activePlan && activePlan.planId) {
      const days = await fetchWorkoutPlanDays(activePlan.planId);
      activeWorkoutDays = days.filter(d => d.workoutType && d.workoutType.toLowerCase() !== 'rest').length;
    }
  } catch (error) {
    console.error("Error fetching workout days for nutrition calculation:", error);
  }

  let tdeeMultiplier = 1.2; // Sedentary
  if (activeWorkoutDays >= 6) {
    tdeeMultiplier = 1.725; // Very active
  } else if (activeWorkoutDays >= 4) {
    tdeeMultiplier = 1.55; // Moderately active
  } else if (activeWorkoutDays >= 1) {
    tdeeMultiplier = 1.375; // Lightly active
  }

  const tdee = bmr * tdeeMultiplier;

  // 3. Adjust for Primary Goal
  let targetCalories = Math.round(tdee);
  
  switch (primaryGoal) {
    case 'loseweight':
      targetCalories -= 500; // Deficit
      break;
    case 'buildmuscle':
    case 'gainweight':
      targetCalories += 300; // Surplus
      break;
    case 'stayfit':
    case 'imporoveendurance':
    default:
      // Maintenance
      break;
  }

  // Floor to a reasonable minimum (e.g. 1200 for women, 1500 for men)
  const minCalories = gender === 'female' ? 1200 : 1500;
  if (targetCalories < minCalories) {
    targetCalories = minCalories;
  }

  // 4. Macro Distribution (30% P, 25% F, 45% C)
  // Protein: 4 kcal/g, Fat: 9 kcal/g, Carbs: 4 kcal/g
  const targetProtein = Math.round((targetCalories * 0.30) / 4);
  const targetFat = Math.round((targetCalories * 0.25) / 9);
  const targetCarbs = Math.round((targetCalories * 0.45) / 4);

  return {
    targetCalories,
    targetProtein,
    targetFat,
    targetCarbs,
  };
}
