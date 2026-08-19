import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type CustomerGender = 'male' | 'female' | 'other';

export interface SaveGymCustomerParams {
  customerId?: string;
  gymId?: string;
  fullName: string;
  dateOfBirth: string;
  gender: CustomerGender | string;
  phone: string;
  email: string;
  emergencyContactName: string;
  relationship: string;
  emergencyContactNumber: string;
  createdBy: string;
  is_Active?: boolean;
}

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

export async function saveGymCustomer(params: SaveGymCustomerParams) {
  if (!params.fullName || !params.phone || !params.email) {
    throw new Error('Missing required fields: fullName, phone, email');
  }

  const now = new Date().toISOString();

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

  if (!params.customerId) {
    const { data: existingCheck } = await supabase
      .from('users')
      .select('userId, email, phone')
      .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
      .maybeSingle();

    if (existingCheck) {
      if (existingCheck.email === cleanEmail) {
        throw new Error('User already exists with this email address.');
      } else {
        throw new Error('User already exists with this phone number.');
      }
    }
  }

  const uuid = Crypto.randomUUID();
  const temporaryPassword = `CS-${uuid.substring(0, 5).toUpperCase()}-${uuid.substring(9, 10).toUpperCase()}`;

  let targetUserId = params.customerId;
  let isNewUser = false;

  try {
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

    const { data: verUser, error: verUserErr } = await supabase
      .from('users')
      .select('userId')
      .eq('userId', targetUserId)
      .maybeSingle();

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

export async function fetchGymCustomers(gymId?: string) {
  let query = supabase
    .from('gym_customers')
    .select('*')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[customerHelper] fetchGymCustomers Error:', error);
    throw error;
  }
  return data ?? [];
}

export async function fetchGymCustomersPaginated(
  gymId?: string,
  page = 1,
  limit = 10,
  searchQuery?: string
) {
  let query = supabase
    .from('gym_customers')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  if (searchQuery) {
    query = query.or(`fullName.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error('[customerHelper] fetchGymCustomersPaginated Error:', error);
    throw error;
  }
  return { data: data ?? [], total: count || 0 };
}
