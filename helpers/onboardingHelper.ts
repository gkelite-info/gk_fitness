import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { OnboardingData } from '@/app/(customer)/(onboarding)/_OnboardingContext';

export type CustomerPrimaryGoal =
  | 'loseweight'
  | 'buildmuscle'
  | 'stayfit'
  | 'gainweight'
  | 'imporoveendurance';

export type CustomerWorkoutLocation = 'home' | 'gym' | 'both';

export type CustomerPreferWorkoutTime = 'morning' | 'afternoon' | 'evening' | 'flexible';

export type CustomerDietType = 'vegetarian' | 'eggetarian' | 'nonvegetarian' | 'vegan';

export interface CustomerOnboarding {
  onboardingId: string;
  gymId: string | null;
  height: string;
  weight: string;
  primaryGoal: CustomerPrimaryGoal;
  targetWeight: string;
  workoutLocation: CustomerWorkoutLocation;
  workoutDays: string[];
  preferWorkoutTime: CustomerPreferWorkoutTime;
  dietType: CustomerDietType;
  mealsPerDay: number;
  foodAllergies: string[];
  dailyWaterGoal: string;
  preferredCuisine: string | null;
  calorieDistribution: string | null;
  goalTimeframe: string | null;
  hasMedicalConditions: boolean;
  medicalConditions: string[];
  medicalDisclaimerAccepted: boolean;
  medicalDisclaimerAcceptedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: any;
}

export type CustomerOnboardingUpdatePayload = Partial<
  Omit<CustomerOnboarding, 'onboardingId' | 'createdAt'>
> & {
  onboardingId: string;
  [key: string]: any;
};

export function normalizeDietType(dietType?: string): CustomerDietType {
  if (!dietType) return 'nonvegetarian';
  const cleaned = dietType.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.includes('nonveg')) return 'nonvegetarian';
  if (cleaned.includes('egg')) return 'eggetarian';
  if (cleaned.includes('vegan')) return 'vegan';
  if (cleaned.includes('veg')) return 'vegetarian';
  return 'nonvegetarian';
}

export function normalizePrimaryGoal(goal?: string): CustomerPrimaryGoal {
  if (!goal) return 'stayfit';
  const g = goal.toLowerCase().replace(/[^a-z]/g, '');
  if (g.includes('lose') || g.includes('loss')) return 'loseweight';
  if (g.includes('muscle')) return 'buildmuscle';
  if (g.includes('gain')) return 'gainweight';
  if (g.includes('endurance')) return 'imporoveendurance';
  if (g.includes('stay') || g.includes('fit') || g.includes('maintain')) return 'stayfit';
  return 'stayfit';
}

export function normalizeWorkoutLocation(loc?: string): CustomerWorkoutLocation {
  if (!loc) return 'gym';
  const l = loc.toLowerCase().trim();
  if (l === 'home') return 'home';
  if (l === 'both') return 'both';
  return 'gym';
}

export function normalizePreferWorkoutTime(time?: string): CustomerPreferWorkoutTime {
  if (!time) return 'morning';
  const t = time.toLowerCase().trim();
  if (t.includes('afternoon')) return 'afternoon';
  if (t.includes('even')) return 'evening';
  if (t.includes('flex')) return 'flexible';
  return 'morning';
}

export async function saveCustomerOnboarding(
  userId: string,
  data: OnboardingData,
  customAllergy?: string
) {
  if (!userId) {
    throw new Error('Missing user ID for onboarding.');
  }

  const now = new Date().toISOString();

  const allergies = [...data.foodAllergies];
  if (customAllergy && customAllergy.trim().length > 0) {
    allergies.push(customAllergy.trim());
  }

  const mappedGoal = normalizePrimaryGoal(data.primaryGoal);

  let finalGymId = data.gymId;
  if (!finalGymId || finalGymId === '00000000-0000-0000-0000-000000000000') {
    const { data: fallbackGym } = await supabase.from('gyms').select('gymId').limit(1).single();
    finalGymId = fallbackGym?.gymId || '00000000-0000-0000-0000-000000000000';
  }

  // Ensure user exists in gym_customers to satisfy foreign key constraints
  const { data: existingCustomer } = await supabase
    .from('gym_customers')
    .select('customerId')
    .eq('customerId', userId)
    .maybeSingle();

  if (!existingCustomer) {
    const { data: userRecord } = await supabase.from('users').select('*').eq('userId', userId).single();
    if (userRecord) {
      await supabase.from('gym_customers').insert({
        customerId: userId,
        userId: userId,
        gymId: finalGymId,
        fullName: data.fullName || userRecord.name || 'New Customer',
        phone: userRecord.phone || '',
        email: userRecord.email || '',
        gender: data.gender || 'other',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : new Date().toISOString(),
        emergencyContactName: '',
        relationship: '',
        emergencyContactNumber: '',
        createdBy: userId,
        is_Active: true,
        is_deleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } else {
    // Update existing customer details (fullName, gender, dateOfBirth)
    await supabase.from('gym_customers').update({
      fullName: data.fullName,
      gender: data.gender || 'other',
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : new Date().toISOString(),
    }).eq('customerId', userId);

    if (data.gender) {
      await supabase.from('users').update({
        gender: data.gender.toLowerCase() === 'other' ? 'others' : data.gender.toLowerCase(),
        updatedAt: new Date().toISOString()
      }).eq('userId', userId);
    }
  }

  const payload = {
    gymId: finalGymId,
    height: data.height || '0',
    weight: data.weight || '0',
    primaryGoal: mappedGoal,
    targetWeight: data.targetWeight || '0',
    workoutLocation: data.workoutLocation,
    workoutDays: data.workoutDays,
    preferWorkoutTime: data.preferWorkoutTime,
    dietType: normalizeDietType(data.dietType),
    mealsPerDay: data.mealsPerDay || 3,
    foodAllergies: allergies,
    dailyWaterGoal: String(data.dailyWaterGoal),
    preferredCuisine: data.preferredCuisine || 'No Preference',
    calorieDistribution: data.calorieDistribution || 'Balanced',
    goalTimeframe: data.goalTimeframe || '12 weeks',
    createdBy: userId,
    updatedAt: now,
  };

  // Check if user already has an onboarding record
  const { data: existing } = await supabase
    .from('customer_onboarding')
    .select('onboardingId')
    .eq('createdBy', userId)
    .limit(1)
    .maybeSingle();

  let error;
  if (existing?.onboardingId) {
    const { error: updateError } = await supabase
      .from('customer_onboarding')
      .update(payload)
      .eq('onboardingId', existing.onboardingId);
    error = updateError;
  } else {
    const insertPayload = {
      ...payload,
      onboardingId: Crypto.randomUUID(),
      createdAt: now,
    };
    const { error: insertError } = await supabase
      .from('customer_onboarding')
      .insert([insertPayload]);
    error = insertError;
  }

  // Fallback if goalTimeframe column is missing in schema
  if (error && error.message.includes('goalTimeframe')) {
    console.warn("Retrying without goalTimeframe due to schema error.");
    const safePayload = { ...payload };
    delete (safePayload as any).goalTimeframe;
    
    if (existing?.onboardingId) {
      const { error: retryError } = await supabase
        .from('customer_onboarding')
        .update(safePayload)
        .eq('onboardingId', existing.onboardingId);
      error = retryError;
    } else {
      const safeInsertPayload = { ...safePayload, onboardingId: Crypto.randomUUID(), createdAt: now };
      const { error: retryError } = await supabase
        .from('customer_onboarding')
        .insert([safeInsertPayload]);
      error = retryError;
    }
  }

  if (error) {
    console.error('[onboardingHelper] Error saving onboarding data:', error);
    throw new Error(`Failed to save onboarding data: ${error.message}`);
  }

  return true;
}

export async function fetchCustomerOnboarding(userId: string): Promise<CustomerOnboarding | null> {
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

  return (data as CustomerOnboarding) || null;
}

export async function fetchCustomerOnboardingById(onboardingId: string): Promise<CustomerOnboarding | null> {
  const { data, error } = await supabase
    .from('customer_onboarding')
    .select('*')
    .eq('onboardingId', onboardingId)
    .maybeSingle();

  if (error) {
    console.error('[onboardingHelper] fetchCustomerOnboardingById Error:', error);
    throw error;
  }

  return (data as CustomerOnboarding) || null;
}

export async function updateCustomerOnboarding(payload: CustomerOnboardingUpdatePayload | any): Promise<boolean> {
  if (!payload.onboardingId) {
    throw new Error('Missing onboardingId for update.');
  }

  const safePayload = { ...payload };
  if (safePayload.dietType) {
    safePayload.dietType = normalizeDietType(safePayload.dietType);
  }
  if (safePayload.primaryGoal) {
    safePayload.primaryGoal = normalizePrimaryGoal(safePayload.primaryGoal);
  }
  if (safePayload.workoutLocation) {
    safePayload.workoutLocation = normalizeWorkoutLocation(safePayload.workoutLocation);
  }
  if (safePayload.preferWorkoutTime) {
    safePayload.preferWorkoutTime = normalizePreferWorkoutTime(safePayload.preferWorkoutTime);
  }

  let { error } = await supabase
    .from('customer_onboarding')
    .update({
      ...safePayload,
      updatedAt: new Date().toISOString()
    })
    .eq('onboardingId', safePayload.onboardingId);

  // Fallback if calorieDistribution column is missing in schema
  if (error && error.message.includes('calorieDistribution')) {
    console.warn("Retrying update without calorieDistribution due to schema error.");
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

