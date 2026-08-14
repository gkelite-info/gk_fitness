import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { OnboardingData } from '@/context/OnboardingContext';

export async function saveCustomerOnboarding(
  userId: string,
  data: OnboardingData,
  customAllergy?: string
) {
  if (!userId || !data.gymId) {
    throw new Error('Missing user ID or Gym ID for onboarding.');
  }

  const now = new Date().toISOString();
  
  const allergies = [...data.foodAllergies];
  if (customAllergy && customAllergy.trim().length > 0) {
    allergies.push(customAllergy.trim());
  }

  const payload = {
    onboardingId: Crypto.randomUUID(),
    gymId: data.gymId,
    height: data.height || '0',
    weight: data.weight || '0',
    primaryGoal: data.primaryGoal,
    targetWeight: data.targetWeight || '0',
    workoutLocation: data.workoutLocation,
    workoutDays: data.workoutDays,
    preferWorkoutTime: data.preferWorkoutTime,
    dietType: data.dietType,
    mealsPerDay: data.mealsPerDay || 3,
    foodAllergies: allergies,
    dailyWaterGoal: String(data.dailyWaterGoal),
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('customer_onboarding')
    .insert([payload]);

  if (error) {
    console.error('[onboardingHelper] Error saving onboarding data:', error);
    throw new Error(`Failed to save onboarding data: ${error.message}`);
  }

  return true;
}
