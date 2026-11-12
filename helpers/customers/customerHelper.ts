import { supabase, supabaseAdminAuth } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { hashPassword } from '@/helpers/auth/passwordHelper';

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
  userId?: string | null;
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

export function formatToDDMMYYYY(rawDate?: string | Date | null): string {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  if (!str || str === '-') return '';

  // If already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // If YYYY-MM-DD or ISO string like 2001-08-25T00:00:00
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // If DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}-${month}-${year}`;
  }

  // Fallback to JS Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

export function ddmmyyyyToPgDate(dateStr?: string | null): string | null {
  if (!dateStr || !dateStr.trim() || dateStr === '-') return null;
  const clean = dateStr.trim();

  // If DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // If YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return clean;
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
  const hashedPassword = await hashPassword(temporaryPassword);

  let targetUserId = params.customerId;
  let isNewUser = false;

  const { data: sessionData } = await supabase.auth.getSession();
  const originalSession = sessionData?.session;

  try {
    if (!targetUserId) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: temporaryPassword,
        options: {
          data: {
            name: params.fullName.trim(),
            full_name: params.fullName.trim(),
            phone: cleanPhone,
            role: 'customer',
          },
        },
      });

      if (authError && !authError.message?.toLowerCase().includes('already registered')) {
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          });
        }
        throw authError;
      }

      if (originalSession) {
        await supabase.auth.setSession({
          access_token: originalSession.access_token,
          refresh_token: originalSession.refresh_token,
        });
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
        .update({
          name: params.fullName.trim(),
          role: 'customer',
          password: hashedPassword,
          phone: cleanPhone,
          email: cleanEmail,
          updatedAt: now,
          ...(params.gender ? { gender: params.gender.toLowerCase() === 'other' ? 'others' : params.gender.toLowerCase() } : {}),
        })
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
          gender: params.gender ? (params.gender.toLowerCase() === 'other' ? 'others' : params.gender.toLowerCase()) : 'male',
          role: 'customer',
          status: 'active',
          password: hashedPassword,
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
      userId: params.userId || targetUserId,
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

export async function fetchGymCustomers(gymId?: string, search?: string) {
  let query = supabase
    .from('gym_customers')
    .select('*')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`fullName.ilike.%${s}%,phone.ilike.%${s}%`);
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

export async function fetchGymCustomerById(customerId: string) {
  const { data, error } = await supabase
    .from('gym_customers')
    .select('*, user:users!gym_customers_userId_fkey(address, profilePhoto, city, state, pincode, status)')
    .eq('customerId', customerId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[customerHelper] fetchGymCustomerById Error:', error);
    const { data: fallbackCust, error: fallbackErr } = await supabase
      .from('gym_customers')
      .select('*')
      .eq('customerId', customerId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fallbackErr) throw fallbackErr;
    if (fallbackCust?.userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('address, profilePhoto, city, state, pincode, status')
        .eq('userId', fallbackCust.userId)
        .maybeSingle();
      return { ...fallbackCust, user: userData || null };
    }
    return fallbackCust;
  }

  if (data && !data.user && data.userId) {
    const { data: userData } = await supabase
      .from('users')
      .select('address, profilePhoto, city, state, pincode, status')
      .eq('userId', data.userId)
      .maybeSingle();
    return { ...data, user: userData || null };
  }

  return data;
}

export async function fetchCustomerOnboardingByUserId(userId: string) {
  const { data, error } = await supabase
    .from('customer_onboarding')
    .select('*')
    .eq('createdBy', userId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[customerHelper] fetchCustomerOnboardingByUserId Error:', error);
    return null;
  }
  return data;
}

export async function findGymCustomer(params: {
  customerId?: string | null;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  silentNotFound?: boolean;
}) {
  const cleanPhone = params.phone ? params.phone.replace(/[^\d+]/g, '').trim() : '';
  const digitsOnly = cleanPhone.replace(/[^\d]/g, '');
  const last10 = digitsOnly.slice(-10);
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : '';

  if (params.customerId) {
    const { data: byCustomerId, error: err1 } = await supabase
      .from('gym_customers')
      .select('*')
      .eq('customerId', params.customerId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (err1) {
      console.warn('[customerHelper] findGymCustomer err on customerId lookup:', err1);
    } else if (byCustomerId) {
      return byCustomerId;
    }
  }

  // Strategy 2: Check by userId
  if (params.userId) {
    const { data: byUserId, error: err2 } = await supabase
      .from('gym_customers')
      .select('*')
      .eq('userId', params.userId)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (err2) {
      console.warn('[customerHelper] findGymCustomer err on userId lookup:', err2);
    } else if (byUserId) {
      return byUserId;
    }

    // Also check if customerId == userId
    const { data: byCustAsUser, error: err3 } = await supabase
      .from('gym_customers')
      .select('*')
      .eq('customerId', params.userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (err3) {
      console.warn('[customerHelper] findGymCustomer err on customerId==userId lookup:', err3);
    } else if (byCustAsUser) {
      return byCustAsUser;
    }
  }

  // Strategy 3: Check by clean email
  if (cleanEmail) {
    const { data: byEmail, error: err4 } = await supabase
      .from('gym_customers')
      .select('*')
      .ilike('email', cleanEmail)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (err4) {
      console.warn('[customerHelper] findGymCustomer err on email lookup:', err4);
    } else if (byEmail) {
      return byEmail;
    }
  }

  // Strategy 4: Check by phone
  if (cleanPhone) {
    const { data: byPhoneExact, error: err5 } = await supabase
      .from('gym_customers')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (err5) {
      console.warn('[customerHelper] findGymCustomer err on exact phone lookup:', err5);
    } else if (byPhoneExact) {
      return byPhoneExact;
    }

    if (last10 && last10.length === 10) {
      const { data: byPhoneLast10, error: err6 } = await supabase
        .from('gym_customers')
        .select('*')
        .ilike('phone', `%${last10}%`)
        .eq('is_deleted', false)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err6) {
        console.warn('[customerHelper] findGymCustomer err on phone last 10 lookup:', err6);
      } else if (byPhoneLast10) {
        return byPhoneLast10;
      }
    }
  }

  // Strategy 5: Query users table for fallback email/phone if params.userId is available
  if (params.userId) {
    const { data: userRec } = await supabase
      .from('users')
      .select('email, phone')
      .eq('userId', params.userId)
      .maybeSingle();

    if (userRec) {
      const userEmail = userRec.email ? userRec.email.trim().toLowerCase() : '';
      const userPhoneDigits = userRec.phone ? userRec.phone.replace(/[^\d]/g, '').slice(-10) : '';

      if (userEmail && userEmail !== cleanEmail) {
        const { data: byUserEmail } = await supabase
          .from('gym_customers')
          .select('*')
          .ilike('email', userEmail)
          .eq('is_deleted', false)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (byUserEmail) {
          return byUserEmail;
        }
      }

      if (userPhoneDigits && userPhoneDigits.length === 10 && userPhoneDigits !== last10) {
        const { data: byUserPhone } = await supabase
          .from('gym_customers')
          .select('*')
          .ilike('phone', `%${userPhoneDigits}%`)
          .eq('is_deleted', false)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (byUserPhone) {
          return byUserPhone;
        }
      }
    }
  }

  if (!params.silentNotFound) {
    console.warn('[customerHelper] findGymCustomer: No matching gym_customers record found.');
  }
  return null;
}

export async function updateGymCustomer(
  params: {
    userId?: string | null;
    customerId?: string | null;
    email?: string | null;
    phone?: string | null;
    fullName: string;
    gender?: string | null;
    dateOfBirth?: string | null;
  }
) {
  const now = new Date().toISOString();
  const cleanPhone = params.phone ? params.phone.replace(/[^\d+]/g, '').trim() : '';
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : '';
  const pgDob = ddmmyyyyToPgDate(params.dateOfBirth);

  let matchedCustomer = await findGymCustomer({
    customerId: params.customerId,
    userId: params.userId,
    email: cleanEmail,
    phone: cleanPhone,
  });

  const targetCustomerId = matchedCustomer?.customerId || params.customerId || params.userId;

  // If no customer record exists at all in gym_customers, insert a new record for this customer
  if (!matchedCustomer && targetCustomerId) {
    const insertPayload = {
      customerId: targetCustomerId,
      userId: params.userId || targetCustomerId,
      fullName: params.fullName.trim(),
      phone: cleanPhone || params.phone || '',
      email: cleanEmail || '',
      gender: params.gender ? (params.gender.toLowerCase() === 'others' ? 'other' : params.gender.toLowerCase()) : 'male',
      dateOfBirth: pgDob || (params.dateOfBirth ? String(params.dateOfBirth).trim() : new Date().toISOString().split('T')[0]),
      emergencyContactName: '',
      relationship: '',
      emergencyContactNumber: '',
      createdBy: params.userId || targetCustomerId,
      is_Active: true,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const { data: newRow, error: insErr } = await supabase
      .from('gym_customers')
      .insert([insertPayload])
      .select();

    if (!insErr && newRow && newRow.length > 0) {
      return newRow[0];
    }
    console.warn('[customerHelper] Notice inserting new gym_customer:', insErr);
  }

  // Build the target update payload
  const basePayload: any = {
    fullName: params.fullName.trim(),
    updatedAt: now,
  };

  if (pgDob || params.dateOfBirth) {
    basePayload.dateOfBirth = pgDob || String(params.dateOfBirth).trim();
  }

  if (params.gender) {
    const g = params.gender.toLowerCase().trim();
    basePayload.gender = g === 'others' ? 'other' : g;
  }

  if (params.userId && matchedCustomer && !matchedCustomer.userId) {
    basePayload.userId = params.userId;
  }

  // Inner helper to execute update queries across different strategies
  const executeUpdate = async (payload: any, label: string) => {

    // Strategy A: By customerId
    if (targetCustomerId) {
      const { data: resA, error: errA } = await supabase
        .from('gym_customers')
        .update(payload)
        .eq('customerId', targetCustomerId)
        .select();

      if (!errA && resA && resA.length > 0) {
        return resA[0];
      }
      if (errA && (errA.code === '23505' || errA.message?.toLowerCase().includes('phone') || errA.message?.toLowerCase().includes('unique'))) {
        throw errA;
      }
    }

    // Strategy B: By userId
    if (params.userId) {
      const { data: resB, error: errB } = await supabase
        .from('gym_customers')
        .update(payload)
        .eq('userId', params.userId)
        .select();

      if (!errB && resB && resB.length > 0) {
        return resB[0];
      }
      if (errB && (errB.code === '23505' || errB.message?.toLowerCase().includes('phone') || errB.message?.toLowerCase().includes('unique'))) {
        throw errB;
      }
    }

    // Strategy C: Update without .select() (handles RLS where SELECT representation is restricted)
    if (targetCustomerId) {
      const directUpdate = await supabase
        .from('gym_customers')
        .update(payload)
        .eq('customerId', targetCustomerId);

      if (directUpdate.error && (directUpdate.error.code === '23505' || directUpdate.error.message?.toLowerCase().includes('phone'))) {
        throw directUpdate.error;
      }
    }

    // Strategy D: supabaseAdminAuth client
    if (targetCustomerId) {
      const { data: resD, error: errD } = await supabaseAdminAuth
        .from('gym_customers')
        .update(payload)
        .eq('customerId', targetCustomerId)
        .select();

      if (!errD && resD && resD.length > 0) {
        return resD[0];
      }
    }

    if (params.userId) {
      const { data: resDUser, error: errDUser } = await supabaseAdminAuth
        .from('gym_customers')
        .update(payload)
        .eq('userId', params.userId)
        .select();

      if (!errDUser && resDUser && resDUser.length > 0) {
        return resDUser[0];
      }
    }

    // Direct update without select() via both clients
    if (targetCustomerId) {
      await supabaseAdminAuth.from('gym_customers').update(payload).eq('customerId', targetCustomerId);
    }
    if (params.userId) {
      await supabaseAdminAuth.from('gym_customers').update(payload).eq('userId', params.userId);
    }

    // Verify row from database
    let verifyRow: any = null;
    if (targetCustomerId) {
      const v1 = await supabase
        .from('gym_customers')
        .select('*')
        .eq('customerId', targetCustomerId)
        .maybeSingle();
      verifyRow = v1.data;
    }

    if (!verifyRow && params.userId) {
      const v2 = await supabase
        .from('gym_customers')
        .select('*')
        .eq('userId', params.userId)
        .maybeSingle();
      verifyRow = v2.data;
    }

    if (!verifyRow && (targetCustomerId || params.userId)) {
      const orFilter = [
        targetCustomerId ? `customerId.eq.${targetCustomerId}` : null,
        params.userId ? `userId.eq.${params.userId}` : null,
      ].filter(Boolean).join(',');

      const vAdmin = await supabaseAdminAuth
        .from('gym_customers')
        .select('*')
        .or(orFilter)
        .maybeSingle();
      verifyRow = vAdmin.data;
    }

    if (verifyRow && verifyRow.fullName === payload.fullName) {
      return verifyRow;
    }

    return null;
  };

  // Attempt 1: Try updating with phone included
  let updatedRow = null;
  const fullPayload = {
    ...basePayload,
    ...(cleanPhone ? { phone: cleanPhone } : {}),
  };

  try {
    updatedRow = await executeUpdate(fullPayload, 'Attempt 1 (with phone)');
  } catch (phoneErr: any) {
    console.warn('[customerHelper] Notice during Attempt 1 (phone unique constraint or error):', phoneErr?.message || phoneErr);
  }

  // Attempt 2: If Attempt 1 did not return updatedRow, retry with original phone format
  if (!updatedRow && params.phone && params.phone !== cleanPhone) {
    try {
      const originalPhonePayload = {
        ...basePayload,
        phone: params.phone,
      };
      updatedRow = await executeUpdate(originalPhonePayload, 'Attempt 2 (original phone)');
    } catch (origPhoneErr: any) {
      console.warn('[customerHelper] Notice during Attempt 2 (original phone error):', origPhoneErr?.message || origPhoneErr);
    }
  }

  // Attempt 3: If phone is causing conflicts or unchanged, update fullName, dateOfBirth, gender WITHOUT phone
  if (!updatedRow) {
    try {
      updatedRow = await executeUpdate(basePayload, 'Attempt 3 (base payload without phone)');
    } catch (baseErr: any) {
      console.error('[customerHelper] Error during Attempt 3:', baseErr?.message || baseErr);
    }
  }

  if (updatedRow) {
    return updatedRow;
  }

  console.warn('[customerHelper] updateGymCustomer finished all strategies without verification confirmation.');
  return {
    ...(matchedCustomer || {}),
    ...basePayload,
    customerId: targetCustomerId,
  };
}
