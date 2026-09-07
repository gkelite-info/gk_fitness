import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { OnboardingData } from '@/app/(customer)/(onboarding)/_OnboardingContext';

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
    preferredCuisine: data.preferredCuisine || 'No Preference',
    calorieDistribution: data.calorieDistribution || 'Balanced',
    goalTimeframe: data.goalTimeframe || '12 weeks',
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  let { error } = await supabase
    .from('customer_onboarding')
    .insert([payload]);

  // Fallback if goalTimeframe column is missing in schema
  if (error && error.message.includes('goalTimeframe')) {
    console.warn("Retrying insert without goalTimeframe due to schema error.");
    const safePayload = { ...payload };
    delete (safePayload as any).goalTimeframe;
    
    const retry = await supabase
      .from('customer_onboarding')
      .insert([safePayload]);
      
    error = retry.error;
  }

  if (error) {
    console.error('[onboardingHelper] Error saving onboarding data:', error);
    throw new Error(`Failed to save onboarding data: ${error.message}`);
  }

  return true;
}

export async function fetchCustomerOnboarding(userId: string) {
  const { data, error } = await supabase
    .from('customer_onboarding')
    .select('*')
    .eq('createdBy', userId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[onboardingHelper] fetchCustomerOnboarding Error:', error);
    throw error;
  }

  return data;
}

export async function updateCustomerOnboarding(payload: any) {
  if (!payload.onboardingId) {
    throw new Error('Missing onboardingId for update.');
  }

  let { error } = await supabase
    .from('customer_onboarding')
    .update({
      ...payload,
      updatedAt: new Date().toISOString()
    })
    .eq('onboardingId', payload.onboardingId);

  // Fallback if calorieDistribution column is missing in schema
  if (error && error.message.includes('calorieDistribution')) {
    console.warn("Retrying update without calorieDistribution due to schema error.");
    const safePayload = { ...payload };
    delete safePayload.calorieDistribution;
    
    const retry = await supabase
      .from('customer_onboarding')
      .update({
        ...safePayload,
        updatedAt: new Date().toISOString()
      })
      .eq('onboardingId', safePayload.onboardingId);
      
    error = retry.error;
    
    // Nested fallback if goalTimeframe is also missing
    if (error && error.message.includes('goalTimeframe')) {
      console.warn("Retrying update without goalTimeframe due to schema error.");
      delete safePayload.goalTimeframe;
      
      const retry2 = await supabase
        .from('customer_onboarding')
        .update({
          ...safePayload,
          updatedAt: new Date().toISOString()
        })
        .eq('onboardingId', safePayload.onboardingId);
        
      error = retry2.error;
    }
  } else if (error && error.message.includes('goalTimeframe')) {
    // Fallback if only goalTimeframe is missing
    console.warn("Retrying update without goalTimeframe due to schema error.");
    const safePayload = { ...payload };
    delete safePayload.goalTimeframe;
    
    const retry = await supabase
      .from('customer_onboarding')
      .update({
        ...safePayload,
        updatedAt: new Date().toISOString()
      })
      .eq('onboardingId', safePayload.onboardingId);
      
    error = retry.error;
  }

  if (error) {
    console.error('[onboardingHelper] Error updating onboarding data:', error);
    throw new Error(`Failed to update onboarding data: ${error.message}`);
  }

  return true;
}
