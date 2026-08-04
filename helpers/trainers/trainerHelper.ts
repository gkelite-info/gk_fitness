import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { createUser } from '@/helpers/otpHelper';

export type TrainerGender = 'male' | 'female' | 'other';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface GymTrainerAttributes {
  gymTrainerId: string;
  gymId: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: TrainerGender | string;
  phone: string;
  alternatePhone?: string | null;
  email: string;
  specialization: string;
  experienceYears: number;
  dateOfJoining: string; // YYYY-MM-DD
  qualification: string;
  bio?: string | null;
  languagesSpeaks: string[];
  createdBy: string;
  is_Active?: boolean;
  is_deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface TrainerScheduleAttributes {
  trainerScheduleId?: string;
  gymId: string;
  gymTrainerId: string;
  dayOfWeek: DayOfWeek | string;
  morningStart?: string | null;
  morningEnd?: string | null;
  eveningStart?: string | null;
  eveningEnd?: string | null;
  isAvailable?: boolean;
  createdBy: string;
  is_Active?: boolean;
  is_deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface SaveGymTrainerParams {
  gymTrainerId?: string;
  gymId?: string;
  fullName: string;
  dateOfBirth: string; // Raw or formatted date string
  gender: TrainerGender | string;
  phone: string;
  alternatePhone?: string | null;
  email: string;
  specialization: string;
  experienceYears: number | string;
  dateOfJoining?: string; // Raw or formatted date string
  qualification: string;
  bio?: string | null;
  languagesSpeaks?: string[] | string;
  createdBy: string;
  shiftPreference?: 'morning' | 'evening' | 'both' | string;
  workingDays?: string[]; // e.g. ['mon', 'wed', 'fri'] or ['monday', 'wednesday']
  is_Active?: boolean;
}

/**
 * Utility to convert short or raw day strings into full enum weekday names required by Postgres.
 */
export function mapDayToEnum(dayStr: string): string {
  const clean = dayStr.toLowerCase().trim();
  const dayMap: Record<string, string> = {
    mon: 'monday',
    tue: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    fri: 'friday',
    sat: 'saturday',
    sun: 'sunday',
    monday: 'monday',
    tuesday: 'tuesday',
    wednesday: 'wednesday',
    thursday: 'thursday',
    friday: 'friday',
    saturday: 'saturday',
    sunday: 'sunday'
  };
  return dayMap[clean] || clean;
}

/**
 * Utility to convert raw dates like "MM/DD/YYYY" or "DD/MM/YYYY" to PostgreSQL YYYY-MM-DD format.
 */
export function formatToPgDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) {
    return new Date().toISOString().split('T')[0];
  }
  const clean = dateStr.trim().replace(/\s/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  const parts = clean.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const year = parts[2];
      const month = p1 > 12 ? String(p2).padStart(2, '0') : String(p1).padStart(2, '0');
      const day = p1 > 12 ? String(p1).padStart(2, '0') : String(p2).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else if (parts[0].length === 4) {
      return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Dynamically resolves the gymId for an owner/admin by checking gym_owners or gyms table.
 */
export async function getOwnerGymId(ownerUserId: string): Promise<string | null> {
  try {
    const { data: ownerRecord } = await supabase
      .from('gym_owners')
      .select('gymId')
      .or(`userId.eq.${ownerUserId},createdBy.eq.${ownerUserId}`)
      .eq('is_deleted', false)
      .maybeSingle();

    if (ownerRecord?.gymId) {
      return ownerRecord.gymId;
    }

    const { data: gymRecord } = await supabase
      .from('gyms')
      .select('gymId')
      .eq('createdBy', ownerUserId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (gymRecord?.gymId) {
      return gymRecord.gymId;
    }

    const { data: firstGym } = await supabase
      .from('gyms')
      .select('gymId')
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();

    return firstGym?.gymId || null;
  } catch (err) {
    console.error('[trainerHelper] Error resolving owner gymId:', err);
    return null;
  }
}

/**
 * Fetch all active gym trainers, optionally filtered by gymId.
 */
export async function fetchTrainers(gymId?: string) {
  let query = supabase
    .from('gym_trainers')
    .select('*')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[trainerHelper] fetchTrainers Error:', error);
    throw error;
  }
  return data ?? [];
}

/**
 * Fetch a single trainer by ID along with their schedules.
 */
export async function fetchTrainerById(gymTrainerId: string) {
  const { data: trainer, error: trainerErr } = await supabase
    .from('gym_trainers')
    .select('*')
    .eq('gymTrainerId', gymTrainerId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (trainerErr) {
    console.error('[trainerHelper] fetchTrainerById Error:', trainerErr);
    throw trainerErr;
  }

  const { data: schedules } = await supabase
    .from('gym_trainer_schedules')
    .select('*')
    .eq('gymTrainerId', gymTrainerId)
    .eq('is_deleted', false);

  return { trainer, schedules: schedules || [] };
}

/**
 * Orchestrates atomic creation across 3 tables (users, gym_trainers, gym_trainer_schedules)
 * with Supabase Auth registration, credential generation, and full transaction rollback on verification failure.
 */
export async function saveGymTrainer(params: SaveGymTrainerParams) {
  const now = new Date().toISOString();
  
  let resolvedGymId: string | null | undefined = params.gymId;
  if (!resolvedGymId) {
    resolvedGymId = await getOwnerGymId(params.createdBy);
    if (!resolvedGymId) {
      throw new Error('Could not resolve an active Gym ID for this trainer. Please ensure your gym is registered.');
    }
  }

  const dobPg = formatToPgDate(params.dateOfBirth);
  const dojPg = formatToPgDate(params.dateOfJoining || now);
  const experienceInt = typeof params.experienceYears === 'string' ? parseInt(params.experienceYears, 10) || 0 : params.experienceYears;
  
  let languagesArr: string[] = ['English'];
  if (Array.isArray(params.languagesSpeaks)) {
    languagesArr = params.languagesSpeaks.map(l => l.trim()).filter(Boolean);
  } else if (typeof params.languagesSpeaks === 'string' && params.languagesSpeaks.trim()) {
    languagesArr = params.languagesSpeaks.split(',').map(l => l.trim()).filter(Boolean);
  }

  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = params.phone.trim();

  // Generate random temporary password (format TR-XXXXX-X)
  const uuid = Crypto.randomUUID();
  const temporaryPassword = `TR-${uuid.substring(0, 5).toUpperCase()}-${uuid.substring(9, 10).toUpperCase()}`;

  let targetUserId = params.gymTrainerId;
  let isNewUser = false;

  try {
    // STEP 1: Supabase Auth Signup & Users Table Insertion
    if (!targetUserId) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: temporaryPassword,
        options: {
          data: {
            name: params.fullName.trim(),
            phone: cleanPhone,
            role: 'trainer',
          },
        },
      });

      if (authError && !authError.message?.toLowerCase().includes('already registered')) {
        throw authError;
      }

      targetUserId = authData?.user?.id;

      if (!targetUserId) {
        // Fallback check if user exists in db or create manual UUID
        const { data: existingUser } = await supabase
          .from('users')
          .select('userId, role')
          .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
          .maybeSingle();

        if (existingUser) {
          targetUserId = existingUser.userId;
        } else {
          targetUserId = Crypto.randomUUID();
        }
      }
    }

    // Insert or update public.users table (Table 1)
    const { data: existingUserRecord } = await supabase
      .from('users')
      .select('userId')
      .eq('userId', targetUserId)
      .maybeSingle();

    if (existingUserRecord) {
      const { error: userUpErr } = await supabase
        .from('users')
        .update({ role: 'trainer', updatedAt: now })
        .eq('userId', targetUserId);
      if (userUpErr) throw new Error(`Table 1 (users) update failed: ${userUpErr.message}`);
    } else {
      isNewUser = true;
      const createdUser = await createUser({
        userId: targetUserId,
        name: params.fullName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        role: 'trainer',
      });
      if (!createdUser || !createdUser.userId) {
        throw new Error('Table 1 (users) insertion failed.');
      }
    }

    // STEP 2: Insert / Update public.gym_trainers (Table 2)
    const trainerPayload = {
      gymTrainerId: targetUserId,
      gymId: resolvedGymId,
      fullName: params.fullName.trim(),
      dateOfBirth: dobPg,
      gender: params.gender ? String(params.gender).toLowerCase() : 'other',
      phone: cleanPhone,
      alternatePhone: params.alternatePhone ? params.alternatePhone.trim() : null,
      email: cleanEmail,
      specialization: params.specialization || 'General Fitness',
      experienceYears: experienceInt,
      dateOfJoining: dojPg,
      qualification: params.qualification ? params.qualification.trim() : 'Certified Trainer',
      bio: params.bio ? params.bio.trim() : null,
      languagesSpeaks: languagesArr,
      createdBy: params.createdBy,
      is_Active: params.is_Active ?? true,
      is_deleted: false,
      updatedAt: now,
    };

    const { data: existingTrainer } = await supabase
      .from('gym_trainers')
      .select('gymTrainerId')
      .eq('gymTrainerId', targetUserId)
      .maybeSingle();

    let savedTrainer: GymTrainerAttributes | null = null;
    if (existingTrainer) {
      const { data, error: updateErr } = await supabase
        .from('gym_trainers')
        .update(trainerPayload)
        .eq('gymTrainerId', targetUserId)
        .select();
      if (updateErr) throw new Error(`Table 2 (gym_trainers) update failed: ${updateErr.message}`);
      savedTrainer = data ? data[0] : null;
    } else {
      const { data, error: insertErr } = await supabase
        .from('gym_trainers')
        .insert([{ ...trainerPayload, createdAt: now }])
        .select();
      if (insertErr) throw new Error(`Table 2 (gym_trainers) insertion failed: ${insertErr.message}`);
      savedTrainer = data ? data[0] : null;
    }

    // STEP 3: Insert into public.gym_trainer_schedules (Table 3)
    const daysToAssign = (params.workingDays && params.workingDays.length > 0) ? params.workingDays : ['monday', 'wednesday', 'friday'];
    
    // Clear old schedule rows if updating
    await supabase.from('gym_trainer_schedules').delete().eq('gymTrainerId', targetUserId);

    const isMorning = params.shiftPreference === 'morning' || params.shiftPreference === 'both';
    const isEvening = params.shiftPreference === 'evening' || params.shiftPreference === 'both';

    const scheduleRows = daysToAssign.map((day) => ({
      trainerScheduleId: Crypto.randomUUID(),
      gymId: resolvedGymId,
      gymTrainerId: targetUserId,
      dayOfWeek: mapDayToEnum(day),
      morningStart: isMorning ? '06:00' : null,
      morningEnd: isMorning ? '14:00' : null,
      eveningStart: isEvening ? '14:00' : null,
      eveningEnd: isEvening ? '22:00' : null,
      isAvailable: true,
      createdBy: params.createdBy,
      is_Active: true,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
    }));

    const { error: schedErr } = await supabase
      .from('gym_trainer_schedules')
      .insert(scheduleRows);

    if (schedErr) {
      throw new Error(`Table 3 (gym_trainer_schedules) insertion failed: ${schedErr.message}`);
    }

    // STEP 4: STRICT 3-TABLE VERIFICATION & ATOMIC CHECK
    // Verify Table 1 (users)
    const { data: verUser, error: verUserErr } = await supabase
      .from('users')
      .select('userId')
      .eq('userId', targetUserId)
      .maybeSingle();
      
    // Verify Table 2 (gym_trainers)
    const { data: verTrainer, error: verTrainerErr } = await supabase
      .from('gym_trainers')
      .select('gymTrainerId')
      .eq('gymTrainerId', targetUserId)
      .maybeSingle();

    // Verify Table 3 (gym_trainer_schedules)
    const { data: verSched, error: verSchedErr } = await supabase
      .from('gym_trainer_schedules')
      .select('trainerScheduleId')
      .eq('gymTrainerId', targetUserId)
      .limit(1);

    const isTable1Ok = !!verUser && !verUserErr;
    const isTable2Ok = !!verTrainer && !verTrainerErr;
    const isTable3Ok = verSched && verSched.length > 0 && !verSchedErr;

    if (!isTable1Ok || !isTable2Ok || !isTable3Ok) {
      throw new Error(
        `3-table atomic verification failed (users: ${isTable1Ok}, gym_trainers: ${isTable2Ok}, gym_trainer_schedules: ${isTable3Ok}). Initiating rollback.`
      );
    }

    return {
      trainer: savedTrainer,
      trainerId: targetUserId,
      gymId: resolvedGymId,
      temporaryPassword,
    };

  } catch (error: any) {
    console.error('[trainerHelper] Atomic Transaction Error or Verification Failure. Rolling back across 3 tables...', error);
    
    // ATOMIC ROLLBACK: Remove any records written during this attempt if any step failed
    if (targetUserId) {
      try {
        await supabase.from('gym_trainer_schedules').delete().eq('gymTrainerId', targetUserId);
        await supabase.from('gym_trainers').delete().eq('gymTrainerId', targetUserId);
        if (isNewUser) {
          await supabase.from('users').delete().eq('userId', targetUserId);
        }
      } catch (rollbackErr) {
        console.error('[trainerHelper] Error during cleanup rollback:', rollbackErr);
      }
    }

    throw new Error(error?.message || 'Failed to complete atomic registration across the 3 tables.');
  }
}

export async function deleteGymTrainer(gymTrainerId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_trainers')
    .update({ is_deleted: true, deletedAt: now, updatedAt: now })
    .eq('gymTrainerId', gymTrainerId)
    .select();

  if (error) {
    console.error('[trainerHelper] deleteGymTrainer Error:', error);
    throw error;
  }

  await supabase
    .from('gym_trainer_schedules')
    .update({ is_deleted: true, deletedAt: now, updatedAt: now })
    .eq('gymTrainerId', gymTrainerId);

  return data ? data[0] : null;
}

export async function toggleTrainerActiveStatus(gymTrainerId: string, currentStatus: boolean) {
  const now = new Date().toISOString();
  const nextStatus = !currentStatus;

  const { data, error } = await supabase
    .from('gym_trainers')
    .update({ is_Active: nextStatus, updatedAt: now })
    .eq('gymTrainerId', gymTrainerId)
    .select();

  if (error) {
    console.error('[trainerHelper] toggleTrainerActiveStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
