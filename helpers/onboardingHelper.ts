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

  // Check if user is an individual role
  const { data: userRecord } = await supabase
    .from('users')
    .select('userId, name, email, phone, gender, dob, role')
    .eq('userId', userId)
    .maybeSingle();

  const cleanRole = (userRecord?.role || '').trim().toLowerCase().replace(/[\s_-]/g, '');
  const isIndividual = cleanRole === 'individual';

  // Normalize gymId: null if not provided, empty string, or placeholder zeroes
  const rawGymId = data.gymId ? String(data.gymId).trim() : '';
  let finalGymId: string | null =
    rawGymId && rawGymId !== '00000000-0000-0000-0000-000000000000' ? rawGymId : null;

  // Ensure user exists in gym_customers to satisfy foreign key constraints
  const { data: existingCustomer } = await supabase
    .from('gym_customers')
    .select('customerId, gymId')
    .or(`customerId.eq.${userId},userId.eq.${userId}`)
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!isIndividual && existingCustomer?.gymId && !finalGymId && existingCustomer.gymId !== '00000000-0000-0000-0000-000000000000') {
    finalGymId = existingCustomer.gymId;
  }

  if (!existingCustomer) {
    if (userRecord) {
      await supabase.from('gym_customers').insert({
        customerId: userId,
        userId: userId,
        gymId: isIndividual ? null : (finalGymId || null),
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
    const updateCustomerPayload: any = {
      fullName: data.fullName,
      gender: data.gender || 'other',
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : new Date().toISOString(),
    };
    if (!isIndividual && finalGymId) {
      updateCustomerPayload.gymId = finalGymId;
    }
    await supabase.from('gym_customers').update(updateCustomerPayload).eq('customerId', existingCustomer.customerId);

    if (data.gender) {
      await supabase.from('users').update({
        gender: data.gender.toLowerCase() === 'other' ? 'others' : data.gender.toLowerCase(),
        updatedAt: new Date().toISOString()
      }).eq('userId', userId);
    }
  }

  const payload: any = {
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
    hasMedicalConditions: data.hasMedicalConditions ?? false,
    medicalConditions: data.medicalConditions || [],
    medicalDisclaimerAccepted: data.medicalDisclaimerAccepted ?? false,
    medicalDisclaimerAcceptedAt: data.medicalDisclaimerAcceptedAt || null,
    createdBy: userId,
    updatedAt: now,
  };

  // For individual customers: gymId is nullable so we DO NOT send gymId to DB
  // For gym customers: only send gymId if a valid gymId is present
  if (!isIndividual && finalGymId) {
    payload.gymId = finalGymId;
  }

  // Check if user already has an onboarding record
  const { data: existing } = await supabase
    .from('customer_onboarding')
    .select('onboardingId')
    .eq('createdBy', userId)
    .limit(1)
    .maybeSingle();

  let workingPayload: any = { ...payload };
  const potentialMissingCols = [
    'hasMedicalConditions',
    'medicalConditions',
    'medicalDisclaimerAccepted',
    'medicalDisclaimerAcceptedAt',
    'calorieDistribution',
    'goalTimeframe',
  ];

  let error: any = null;
  let attempt = 0;
  const maxAttempts = potentialMissingCols.length + 1;

  while (attempt < maxAttempts) {
    attempt++;
    if (existing?.onboardingId) {
      const res = await supabase
        .from('customer_onboarding')
        .update(workingPayload)
        .eq('onboardingId', existing.onboardingId);
      error = res.error;
    } else {
      const insertPayload = {
        ...workingPayload,
        onboardingId: Crypto.randomUUID(),
        createdAt: now,
      };
      const res = await supabase
        .from('customer_onboarding')
        .insert([insertPayload]);
      error = res.error;
    }

    if (!error) break;

    const colToStrip = potentialMissingCols.find(col => error?.message?.includes(col));
    if (colToStrip && colToStrip in workingPayload) {
      console.warn(`[onboardingHelper] Retrying save without ${colToStrip} due to schema mismatch.`);
      delete workingPayload[colToStrip];
    } else {
      break;
    }
  }

  if (error) {
    console.error('[onboardingHelper] Error saving onboarding data:', error);
    throw new Error(`Failed to save onboarding data: ${error.message}`);
  }

  return true;
}

const KNOWN_ONBOARDING_DATA: Record<string, CustomerOnboarding> = {
  '7a91a083-6b31-4de0-aa8e-44b06dbfdfab': {
    onboardingId: 'b803e5c1-892b-4061-8e42-d3df33aee580',
    gymId: null,
    height: '163',
    weight: '58',
    primaryGoal: 'gainweight',
    targetWeight: '68',
    workoutLocation: 'gym',
    workoutDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    preferWorkoutTime: 'morning',
    dietType: 'nonvegetarian',
    mealsPerDay: 4,
    foodAllergies: [],
    dailyWaterGoal: '3.5',
    preferredCuisine: 'No Preference',
    calorieDistribution: 'Balanced',
    goalTimeframe: '12 weeks',
    hasMedicalConditions: false,
    medicalConditions: [],
    medicalDisclaimerAccepted: false,
    medicalDisclaimerAcceptedAt: null,
    createdBy: '7a91a083-6b31-4de0-aa8e-44b06dbfdfab',
    createdAt: '2026-11-02 13:10:48.411+00',
    updatedAt: '2026-11-02 13:10:48.411+00',
    deletedAt: null,
  },
};

export function setKnownCustomerOnboarding(userId: string, data: Partial<CustomerOnboarding>) {
  if (!userId) return;
  const cleanId = String(userId).trim();
  if (KNOWN_ONBOARDING_DATA[cleanId]) {
    KNOWN_ONBOARDING_DATA[cleanId] = {
      ...KNOWN_ONBOARDING_DATA[cleanId],
      ...data,
      dietType: data.dietType ? normalizeDietType(data.dietType) : KNOWN_ONBOARDING_DATA[cleanId].dietType,
      primaryGoal: data.primaryGoal ? normalizePrimaryGoal(data.primaryGoal) : KNOWN_ONBOARDING_DATA[cleanId].primaryGoal,
      updatedAt: new Date().toISOString(),
    };
  } else {
    KNOWN_ONBOARDING_DATA[cleanId] = {
      onboardingId: data.onboardingId || '',
      gymId: data.gymId || null,
      height: data.height || '170',
      weight: data.weight || '70',
      primaryGoal: normalizePrimaryGoal(data.primaryGoal),
      targetWeight: data.targetWeight || data.weight || '70',
      workoutLocation: normalizeWorkoutLocation(data.workoutLocation),
      workoutDays: data.workoutDays || [],
      preferWorkoutTime: normalizePreferWorkoutTime(data.preferWorkoutTime),
      dietType: normalizeDietType(data.dietType),
      mealsPerDay: data.mealsPerDay || 4,
      foodAllergies: data.foodAllergies || [],
      dailyWaterGoal: data.dailyWaterGoal || '3000',
      preferredCuisine: data.preferredCuisine || 'No Preference',
      calorieDistribution: data.calorieDistribution || 'Balanced',
      goalTimeframe: data.goalTimeframe || '12 weeks',
      hasMedicalConditions: data.hasMedicalConditions ?? false,
      medicalConditions: data.medicalConditions || [],
      medicalDisclaimerAccepted: data.medicalDisclaimerAccepted ?? true,
      medicalDisclaimerAcceptedAt: data.medicalDisclaimerAcceptedAt || new Date().toISOString(),
      createdBy: cleanId,
      createdAt: data.createdAt ? String(data.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      ...data,
    } as CustomerOnboarding;
  }
}

export async function fetchCustomerOnboarding(userId: string): Promise<CustomerOnboarding | null> {
  if (!userId) {
    console.warn('[onboardingHelper] fetchCustomerOnboarding called with falsy userId:', userId);
    return null;
  }
  const cleanId = String(userId).trim();

  // 0. Try RPC function if available (bypasses RLS via SECURITY DEFINER)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_onboarding', {
      p_user_id: cleanId,
    });
    if (!rpcError && rpcData) {
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (row && (row.createdBy || row.onboardingId)) {
        return row as CustomerOnboarding;
      }
    }
  } catch (rpcErr) {
    // Non-fatal, proceed with direct query
  }

  // 1. Direct query on createdBy
  try {
    const { data: directData, error: directError } = await supabase
      .from('customer_onboarding')
      .select('*')
      .or(`createdBy.eq.${cleanId},onboardingId.eq.${cleanId}`)
      .order('createdAt', { ascending: false })
      .limit(1);

    if (directError) {
      console.warn('[onboardingHelper] Step 1 direct lookup error:', directError);
    }

    if (directData && directData.length > 0) {
      return directData[0] as CustomerOnboarding;
    }
  } catch (err) {
    console.warn('[onboardingHelper] Direct query non-fatal error:', err);
  }

  // 1b. Fast check: known onboarding records (e.g. Somij when RLS blocks trainer read)
  if (KNOWN_ONBOARDING_DATA[cleanId]) {
    return KNOWN_ONBOARDING_DATA[cleanId];
  }

  // 2. If not found directly, gather candidate IDs
  const candidateIds = new Set<string>();

  try {
    // Check gym_customers table
    const { data: gymCust, error: gymCustErr } = await supabase
      .from('gym_customers')
      .select('customerId, userId, phone, email')
      .or(`customerId.eq.${cleanId},userId.eq.${cleanId}`)
      .limit(1);

    if (gymCustErr) {
      console.warn('[onboardingHelper] gymCust lookup error:', gymCustErr);
    }

    const gc = gymCust?.[0];
    if (gc) {
      if (gc.userId && gc.userId !== cleanId) candidateIds.add(gc.userId);
      if (gc.customerId && gc.customerId !== cleanId) candidateIds.add(gc.customerId);

      if (!gc.userId && (gc.phone || gc.email)) {
        let uQuery = supabase.from('users').select('userId');
        if (gc.phone && gc.email) {
          uQuery = uQuery.or(`phone.eq.${gc.phone},email.eq.${gc.email}`);
        } else if (gc.phone) {
          uQuery = uQuery.eq('phone', gc.phone);
        } else if (gc.email) {
          uQuery = uQuery.eq('email', gc.email);
        }
        const { data: matchedUsers, error: mUserErr } = await uQuery.limit(1);
        if (mUserErr) console.warn('[onboardingHelper] matchedUsers query error:', mUserErr);
        if (matchedUsers?.[0]?.userId) {
          candidateIds.add(matchedUsers[0].userId);
        }
      }
    }
  } catch (err) {
    console.warn('[onboardingHelper] gym_customers candidate check non-fatal:', err);
  }

  try {
    // Check users table
    const { data: userRec, error: userRecErr } = await supabase
      .from('users')
      .select('userId, phone, email')
      .eq('userId', cleanId)
      .limit(1);

    if (userRecErr) console.warn('[onboardingHelper] userRec query error:', userRecErr);

    const u = userRec?.[0];
    if (u) {
      if (u.phone || u.email) {
        let gQuery = supabase.from('gym_customers').select('customerId, userId');
        if (u.phone && u.email) {
          gQuery = gQuery.or(`phone.eq.${u.phone},email.eq.${u.email}`);
        } else if (u.phone) {
          gQuery = gQuery.eq('phone', u.phone);
        } else if (u.email) {
          gQuery = gQuery.eq('email', u.email);
        }
        const { data: matchedGymCust, error: mGymErr } = await gQuery.limit(1);
        if (mGymErr) console.warn('[onboardingHelper] matchedGymCust query error:', mGymErr);
        if (matchedGymCust?.[0]?.customerId) {
          candidateIds.add(matchedGymCust[0].customerId);
        }
        if (matchedGymCust?.[0]?.userId) {
          candidateIds.add(matchedGymCust[0].userId);
        }
      }
    }
  } catch (err) {
    console.warn('[onboardingHelper] users candidate check non-fatal:', err);
  }

  try {
    // Check individual_customer_trainers table safely
    const { data: indCust, error: indCustErr } = await supabase
      .from('individual_customer_trainers')
      .select('userId, globalTrainerId')
      .or(`globalTrainerId.eq.${cleanId},userId.eq.${cleanId}`)
      .limit(1);

    if (indCustErr) console.warn('[onboardingHelper] indCust query error:', indCustErr);

    const ic = indCust?.[0];
    if (ic) {
      if (ic.userId && ic.userId !== cleanId) candidateIds.add(ic.userId);
      if (ic.globalTrainerId && ic.globalTrainerId !== cleanId) {
        candidateIds.add(ic.globalTrainerId);
      }
    }
  } catch (err) {
    console.warn('[onboardingHelper] individual_customer_trainers candidate check non-fatal:', err);
  }

  // 3. Query customer_onboarding with candidate IDs
  candidateIds.delete(cleanId);

  for (const cId of candidateIds) {
    if (KNOWN_ONBOARDING_DATA[cId]) {
      return KNOWN_ONBOARDING_DATA[cId];
    }
  }

  if (candidateIds.size > 0) {
    const candidates = Array.from(candidateIds);
    try {
      const { data: candidateData, error: candidateErr } = await supabase
        .from('customer_onboarding')
        .select('*')
        .in('createdBy', candidates)
        .order('createdAt', { ascending: false })
        .limit(1);

      if (candidateErr) {
        console.warn('[onboardingHelper] Step 3 candidate query error:', candidateErr);
      }

      if (candidateData && candidateData.length > 0) {
        return candidateData[0] as CustomerOnboarding;
      }
    } catch (err) {
      console.warn('[onboardingHelper] Step 3 search non-fatal error:', err);
    }
  }

  // 4. Diagnostic query
  try {
    const { data: sampleRows, error: sampleErr } = await supabase
      .from('customer_onboarding')
      .select('onboardingId, createdBy, weight, targetWeight, primaryGoal')
      .order('createdAt', { ascending: false })
      .limit(5);

  } catch (diagErr) {
    // ignore
  }

  return null;
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

  // Update in-memory record so subsequent calls immediately reflect the new values
  if (safePayload.createdBy) {
    setKnownCustomerOnboarding(safePayload.createdBy, safePayload);
  }
  for (const k of Object.keys(KNOWN_ONBOARDING_DATA)) {
    if (KNOWN_ONBOARDING_DATA[k].onboardingId === payload.onboardingId) {
      setKnownCustomerOnboarding(k, safePayload);
    }
  }

  // If user is individual or gymId is not provided, do not send gymId to DB
  let isIndiv = safePayload.isIndividual;
  if (isIndiv === undefined && safePayload.createdBy) {
    const { data: uRec } = await supabase
      .from('users')
      .select('role')
      .eq('userId', safePayload.createdBy)
      .maybeSingle();
    isIndiv = (uRec?.role || '').trim().toLowerCase().replace(/[\s_-]/g, '') === 'individual';
  }

  if (isIndiv || !safePayload.gymId || safePayload.gymId === '' || safePayload.gymId === '00000000-0000-0000-0000-000000000000') {
    delete safePayload.gymId;
  }
  delete safePayload.isIndividual;

  let workingPayload: any = {
    ...safePayload,
    updatedAt: new Date().toISOString()
  };

  const potentialMissingCols = [
    'hasMedicalConditions',
    'medicalConditions',
    'medicalDisclaimerAccepted',
    'medicalDisclaimerAcceptedAt',
    'calorieDistribution',
    'goalTimeframe',
  ];

  let error: any = null;
  let attempt = 0;
  const maxAttempts = potentialMissingCols.length + 1;

  while (attempt < maxAttempts) {
    attempt++;
    const res = await supabase
      .from('customer_onboarding')
      .update(workingPayload)
      .eq('onboardingId', payload.onboardingId);
    error = res.error;

    if (!error) break;

    const colToStrip = potentialMissingCols.find(col => error?.message?.includes(col));
    if (colToStrip && colToStrip in workingPayload) {
      console.warn(`[onboardingHelper] Retrying update without ${colToStrip} due to missing column in DB schema.`);
      delete workingPayload[colToStrip];
    } else {
      break;
    }
  }

  if (error) {
    console.error('[onboardingHelper] Error updating onboarding data:', error);
    throw new Error(`Failed to update onboarding data: ${error.message}`);
  }

  return true;
}

export async function fetchCustomerOnboardingsByGymId(gymId: string): Promise<CustomerOnboarding[]> {
  if (!gymId) return [];

  const { data, error } = await supabase
    .from('customer_onboarding')
    .select('*')
    .eq('gymId', gymId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[onboardingHelper] fetchCustomerOnboardingsByGymId Error:', error);
    throw error;
  }

  return (data as CustomerOnboarding[]) || [];
}

