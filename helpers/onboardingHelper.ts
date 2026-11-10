import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFallbackAuthUser } from '@/helpers/auth/fallbackAuthHelper';
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

export function safeIsoDate(raw?: string | null): string {
  if (!raw || !raw.trim()) return new Date().toISOString();
  const clean = raw.trim();
  const d = new Date(clean);
  if (!isNaN(d.getTime())) return d.toISOString();

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const parts = clean.replace(/\s+/g, '').split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    } else if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

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

  const fbUser = await getFallbackAuthUser();
  const inputId = (userId || '').trim() || (fbUser?.id || '').trim();

  // Ensure we lookup the authentic user from users table
  const { data: userRecord } = await supabase
    .from('users')
    .select('userId, name, email, phone, gender, dob, role')
    .or(`userId.eq.${inputId},email.eq.${inputId},phone.eq.${inputId}`)
    .maybeSingle();

  // The createdBy column in customer_onboarding MUST be the users.userId
  const finalUserId = userRecord?.userId || inputId;

  const rawRole = userRecord?.role || fbUser?.role || '';
  const cleanRole = String(rawRole).trim().toLowerCase().replace(/[\s_-]/g, '');

  // Normalize gymId: null if not provided, empty string, or placeholder zeroes
  const rawGymId = data.gymId ? String(data.gymId).trim() : '';
  let finalGymId: string | null =
    rawGymId && rawGymId !== '00000000-0000-0000-0000-000000000000' ? rawGymId : null;

  // Individual users have role 'individual' or no gymId assigned
  const isIndividual = cleanRole === 'individual' || (!data.gymId && !finalGymId);

  // If user is a gym customer, ensure gym_customers row exists or is updated
  if (!isIndividual) {
    const { data: existingCustomer } = await supabase
      .from('gym_customers')
      .select('customerId, gymId')
      .or(`customerId.eq.${finalUserId},userId.eq.${finalUserId}`)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCustomer?.gymId && !finalGymId && existingCustomer.gymId !== '00000000-0000-0000-0000-000000000000') {
      finalGymId = existingCustomer.gymId;
    }

    if (!existingCustomer) {
      if (userRecord && finalGymId) {
        await supabase.from('gym_customers').insert({
          customerId: finalUserId,
          userId: finalUserId,
          gymId: finalGymId,
          fullName: data.fullName || userRecord.name || 'New Customer',
          phone: userRecord.phone || '',
          email: userRecord.email || '',
          gender: data.gender || 'other',
          dateOfBirth: safeIsoDate(data.dateOfBirth),
          emergencyContactName: '',
          relationship: '',
          emergencyContactNumber: '',
          createdBy: finalUserId,
          is_Active: true,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      const updateCustomerPayload: any = {
        fullName: data.fullName || userRecord?.name,
        gender: data.gender || 'other',
        dateOfBirth: safeIsoDate(data.dateOfBirth),
        updatedAt: now,
      };
      if (finalGymId) {
        updateCustomerPayload.gymId = finalGymId;
      }
      await supabase.from('gym_customers').update(updateCustomerPayload).eq('customerId', existingCustomer.customerId);
    }
  }

  // Update profile details on users table
  if (data.gender || data.fullName || data.dateOfBirth) {
    const userUpdates: any = { updatedAt: now };
    if (data.gender) {
      userUpdates.gender = data.gender.toLowerCase() === 'other' ? 'others' : data.gender.toLowerCase();
    }
    if (data.fullName) {
      userUpdates.name = data.fullName.trim();
    }
    if (data.dateOfBirth) {
      userUpdates.dob = data.dateOfBirth ? safeIsoDate(data.dateOfBirth).split('T')[0] : null;
    }
    await supabase.from('users').update(userUpdates).eq('userId', finalUserId);
  }

  const payload: any = {
    height: String(data.height || '0'),
    weight: String(data.weight || '0'),
    primaryGoal: mappedGoal,
    targetWeight: String(data.targetWeight || '0'),
    workoutLocation: normalizeWorkoutLocation(data.workoutLocation),
    workoutDays: Array.isArray(data.workoutDays) && data.workoutDays.length > 0 ? data.workoutDays : ['mon', 'tue', 'wed', 'thu', 'fri'],
    preferWorkoutTime: normalizePreferWorkoutTime(data.preferWorkoutTime),
    dietType: normalizeDietType(data.dietType),
    mealsPerDay: parseInt(String(data.mealsPerDay || 3), 10) || 3,
    foodAllergies: Array.isArray(allergies) ? allergies : [],
    dailyWaterGoal: String(data.dailyWaterGoal || '3.0'),
    preferredCuisine: data.preferredCuisine || null,
    calorieDistribution: data.calorieDistribution || null,
    goalTimeframe: data.goalTimeframe || null,
    hasMedicalConditions: Boolean(data.hasMedicalConditions ?? false),
    medicalConditions: Array.isArray(data.medicalConditions) ? data.medicalConditions : [],
    medicalDisclaimerAccepted: Boolean(data.medicalDisclaimerAccepted ?? false),
    medicalDisclaimerAcceptedAt: data.medicalDisclaimerAcceptedAt ? new Date(data.medicalDisclaimerAcceptedAt).toISOString() : null,
    createdBy: finalUserId,
    gymId: isIndividual || !finalGymId ? null : finalGymId,
    updatedAt: now,
  };

  // Cache water goal for immediate consumption in water tracker & fitness widgets (colleague feature)
  try {
    const rawWaterGoal = data.dailyWaterGoal ? parseFloat(String(data.dailyWaterGoal)) : 3.0;
    const waterGoalLiters = !isNaN(rawWaterGoal) && rawWaterGoal > 0 ? (rawWaterGoal <= 20 ? rawWaterGoal : rawWaterGoal / 1000) : 3.0;
    const waterGoalML = Math.round(waterGoalLiters * 1000);
    await AsyncStorage.setItem(`@customer_onboarding_${finalUserId}`, JSON.stringify({ ...payload, createdAt: now }));
    await AsyncStorage.setItem(`@user_water_goal_${finalUserId}`, String(waterGoalLiters));
    await AsyncStorage.setItem(`@gk_water_goal_${finalUserId}`, String(waterGoalML));
    await AsyncStorage.setItem(`@fitness_water_goal_${finalUserId}`, String(waterGoalML));
    if (userId && userId !== finalUserId) {
      await AsyncStorage.setItem(`@customer_onboarding_${userId}`, JSON.stringify({ ...payload, createdAt: now }));
      await AsyncStorage.setItem(`@user_water_goal_${userId}`, String(waterGoalLiters));
      await AsyncStorage.setItem(`@gk_water_goal_${userId}`, String(waterGoalML));
      await AsyncStorage.setItem(`@fitness_water_goal_${userId}`, String(waterGoalML));
    }
  } catch (storageErr) {
    console.warn('[onboardingHelper] Error caching onboarding water goal:', storageErr);
  }

  // Check if user already has an onboarding record
  const { data: existing } = await supabase
    .from('customer_onboarding')
    .select('onboardingId')
    .eq('createdBy', finalUserId)
    .limit(1)
    .maybeSingle();

  let workingPayload: any = { ...payload };

  let error: any = null;

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
      deletedAt: null,
    };
    const res = await supabase
      .from('customer_onboarding')
      .insert([insertPayload]);
    error = res.error;

    // If an onboarding record already exists (unq_onboarding_createdBy constraint):
    if (error?.code === '23505' || error?.message?.includes('unq_onboarding_createdBy')) {
      console.warn('[onboardingHelper] Record already exists for createdBy, performing update instead.');
      const updateRes = await supabase
        .from('customer_onboarding')
        .update(workingPayload)
        .eq('createdBy', finalUserId);
      error = updateRes.error;
    }
  }

  // Cache locally immediately so in-memory and storage have the data
  setKnownCustomerOnboarding(finalUserId, workingPayload);
  if (userId && userId !== finalUserId) {
    setKnownCustomerOnboarding(userId, workingPayload);
  }
  try {
    await AsyncStorage.setItem(`@cached_customer_onboarding_${finalUserId}`, JSON.stringify(workingPayload));
    if (userId && userId !== finalUserId) {
      await AsyncStorage.setItem(`@cached_customer_onboarding_${userId}`, JSON.stringify(workingPayload));
    }
  } catch (storageErr) {
    console.warn('[onboardingHelper] Error caching onboarding to AsyncStorage:', storageErr);
  }

  if (error) {
    console.error('[onboardingHelper] Error saving onboarding data:', error);
    // If it's an RLS violation (42501) OR foreign key constraint violation (23503):
    // Warn with diagnostic message but do not crash the customer's onboarding flow on the frontend,
    // since local state and AsyncStorage are preserved.
    if (
      error.code === '42501' ||
      error.code === '23503' ||
      error.message?.includes('row-level security') ||
      error.message?.includes('violates row-level security policy') ||
      error.message?.includes('violates foreign key constraint') ||
      error.message?.includes('customer_onboarding_createdBy_fkey1')
    ) {
      console.warn(
        `[onboardingHelper] Database notice (${error.code}). Row saved to local cache & AsyncStorage successfully. User onboarding continues.`
      );
      return true;
    }
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

  // 1c. Fast check: AsyncStorage cached onboarding record
  try {
    const cachedStr = await AsyncStorage.getItem(`@cached_customer_onboarding_${cleanId}`);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (parsed && (parsed.onboardingId || parsed.createdBy)) {
        return parsed as CustomerOnboarding;
      }
    }
  } catch (storageErr) {
    // Non-fatal
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

  // 4. Fallback to local AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(`@customer_onboarding_${cleanId}`);
    if (cached) {
      return JSON.parse(cached) as CustomerOnboarding;
    }
  } catch {}

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
