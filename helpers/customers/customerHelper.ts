import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type CustomerGender = 'male' | 'female' | 'other';

export interface SaveGymCustomerParams {
  customerId?: string;
  gymId?: string;
  fullName: string;
  dateOfBirth: string; // Raw or formatted date string
  gender: CustomerGender | string;
  phone: string;
  email: string;
  emergencyContactName: string;
  relationship: string;
  emergencyContactNumber: string;
  createdBy: string;
  is_Active?: boolean;
}

/**
 * Utility to convert raw dates to PostgreSQL YYYY-MM-DD format.
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

import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';

/**
 * Saves a gym customer executing an atomic write across `users` and `gym_customers`.
 * If any step fails, it orchestrates a rollback.
 */
export async function saveGymCustomer(params: SaveGymCustomerParams) {
  if (!params.fullName || !params.phone || !params.email) {
    throw new Error('Missing required fields: fullName, phone, email');
  }

  const now = new Date().toISOString();
  
  // Try to resolve active gym if not passed
  let resolvedGymId = params.gymId;
  if (!resolvedGymId) {
    const fetchedGymId = await getOwnerGymId(params.createdBy);
    if (fetchedGymId) {
      resolvedGymId = fetchedGymId;
    }
  }
  
  if (!resolvedGymId) {
    throw new Error('Failed to identify active Gym for this owner. Cannot register customer.');
  }

  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = params.phone.trim();

  // Generate temporary password (format CS-XXXXX-X)
  const uuid = Crypto.randomUUID();
  const temporaryPassword = `CS-${uuid.substring(0, 5).toUpperCase()}-${uuid.substring(9, 10).toUpperCase()}`;

  let targetUserId = params.customerId;
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
            role: 'customer',
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
        .update({ role: 'customer', updatedAt: now })
        .eq('userId', targetUserId);
      if (userUpErr) throw new Error(`Table 1 (users) update failed: ${userUpErr.message}`);
    } else {
      isNewUser = true;
      const { error: userInsErr } = await supabase
        .from('users')
        .insert([{
          userId: targetUserId,
          name: params.fullName.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          role: 'customer',
          status: 'active',
          isEmailVerified: false,
          isPhoneVerified: false,
          createdAt: now,
          updatedAt: now,
        }]);
      if (userInsErr) throw new Error(`Table 1 (users) insertion failed: ${userInsErr.message}`);
    }

    // STEP 2: Insert into public.gym_customers (Table 2)
    const customerPayload = {
      customerId: targetUserId,
      gymId: resolvedGymId,
      fullName: params.fullName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      dateOfBirth: formatToPgDate(params.dateOfBirth),
      gender: params.gender.toLowerCase(),
      emergencyContactName: params.emergencyContactName.trim(),
      relationship: params.relationship.trim(),
      emergencyContactNumber: params.emergencyContactNumber.trim(),
      createdBy: params.createdBy,
      is_Active: params.is_Active ?? true,
      is_deleted: false,
      updatedAt: now,
    };

    const { data: existingCustomer } = await supabase
      .from('gym_customers')
      .select('customerId')
      .eq('customerId', targetUserId)
      .maybeSingle();

    let savedCustomer = null;
    if (existingCustomer) {
      const { data, error: updateErr } = await supabase
        .from('gym_customers')
        .update(customerPayload)
        .eq('customerId', targetUserId)
        .select();
      if (updateErr) throw new Error(`Table 2 (gym_customers) update failed: ${updateErr.message}`);
      savedCustomer = data ? data[0] : null;
    } else {
      const { data, error: insertErr } = await supabase
        .from('gym_customers')
        .insert([{ ...customerPayload, createdAt: now }])
        .select();
      if (insertErr) throw new Error(`Table 2 (gym_customers) insertion failed: ${insertErr.message}`);
      savedCustomer = data ? data[0] : null;
    }

    // STEP 3: STRICT 2-TABLE VERIFICATION & ATOMIC CHECK
    // Verify Table 1 (users)
    const { data: verUser, error: verUserErr } = await supabase
      .from('users')
      .select('userId')
      .eq('userId', targetUserId)
      .maybeSingle();
      
    // Verify Table 2 (gym_customers)
    const { data: verCustomer, error: verCustomerErr } = await supabase
      .from('gym_customers')
      .select('customerId')
      .eq('customerId', targetUserId)
      .maybeSingle();

    const isTable1Ok = !!verUser && !verUserErr;
    const isTable2Ok = !!verCustomer && !verCustomerErr;

    if (!isTable1Ok || !isTable2Ok) {
      throw new Error(
        `2-table atomic verification failed (users: ${isTable1Ok}, gym_customers: ${isTable2Ok}). Initiating rollback.`
      );
    }

    return {
      customer: savedCustomer,
      customerId: targetUserId,
      gymId: resolvedGymId,
      temporaryPassword,
    };

  } catch (error: any) {
    console.error('[customerHelper] Atomic Transaction Error or Verification Failure. Rolling back across 2 tables...', error);
    
    // ATOMIC ROLLBACK: Remove any records written during this attempt if any step failed
    if (targetUserId) {
      try {
        await supabase.from('gym_customers').delete().eq('customerId', targetUserId);
        if (isNewUser) {
          await supabase.from('users').delete().eq('userId', targetUserId);
        }
      } catch (rollbackErr) {
        console.error('[customerHelper] Error during cleanup rollback:', rollbackErr);
      }
    }

    throw new Error(error?.message || 'Failed to complete atomic registration across the 2 tables.');
  }
}
