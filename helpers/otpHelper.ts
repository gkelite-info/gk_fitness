import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

/* =========================
   OTP TYPES & INTERFACES
========================= */
export type OtpType = 'email' | 'sms';
export type OtpPurpose = 'login' | 'register' | 'reset_password';

export interface OtpRecord {
  optId?: string;
  userId?: string | null;
  recipient: string;
  otpCode: string;
  type: OtpType;
  purpose?: OtpPurpose;
  expiresAt: string | Date;
  isUsed?: boolean;
  attempts?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOtpParams {
  recipient: string;
  otpCode: string;
  type: OtpType;
  purpose?: OtpPurpose;
  expiresAt: Date | string;
  userId?: string | null;
  isUsed?: boolean;
  attempts?: number;
}

/* =========================
   USER DATABASE HELPERS
========================= */

export interface CreateUserParams {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role?: string;
}

export async function createUser(userData: CreateUserParams) {
  // Generate a random UUID v4 if not provided
  const generatedId = userData.userId || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });


  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        userId: generatedId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: userData.address || null,
        role: userData.role || 'customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    console.error('[otpHelper] createUser Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function getUserRole(userId: string, email?: string): Promise<string | null> {
  let { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('userId', userId)
    .maybeSingle();

  if (!data && email) {
    const res = await supabase
      .from('users')
      .select('role')
      .eq('email', email)
      .maybeSingle();
    data = res.data;
  }

  if (error && !data) {
    console.error('[otpHelper] Error fetching user role:', error);
    return 'superadmin';
  }
  return data?.role || 'superadmin';
}

export function navigateBasedOnRole(role: string | null) {
  if (role === 'superadmin') {
    router.replace('/(superadmin)/dashboard');
  } else if (role === 'admin') {
    router.replace('/(admin)/dashboard');
  } else if (role === 'doctor') {
    router.replace('/(doctor)/patients');
  } else {
    router.replace('/(customer)/home');
  }
}

/* =========================
   OTP DATABASE HELPERS
========================= */

/**
 * Inserts a new OTP record into the 'otps' table in Supabase.
 */
export async function createOtp(otpData: CreateOtpParams) {
  const { data, error } = await supabase
    .from('otps')
    .insert([
      {
        recipient: otpData.recipient,
        otpCode: otpData.otpCode,
        type: otpData.type,
        purpose: otpData.purpose || 'login',
        expiresAt: typeof otpData.expiresAt === 'string' ? otpData.expiresAt : otpData.expiresAt.toISOString(),
        userId: otpData.userId || null,
        isUsed: otpData.isUsed ?? false,
        attempts: otpData.attempts ?? 0,
      },
    ])
    .select();

  if (error) throw error;
  return data ? data[0] : null;
}

/**
 * Fetches all OTP records for a recipient (or all records if no recipient is provided).
 */
export async function fetchOtps(recipient?: string) {
  let query = supabase
    .from('otps')
    .select('*')
    .order('createdAt', { ascending: false });

  if (recipient) {
    query = query.eq('recipient', recipient);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches the latest active (non-expired, non-used) OTP for a given recipient and purpose.
 */
export async function fetchActiveOtp(recipient: string, purpose: OtpPurpose = 'login') {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('otps')
    .select('*')
    .eq('recipient', recipient)
    .eq('purpose', purpose)
    .eq('isUsed', false)
    .gt('expiresAt', now)
    .order('createdAt', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Verifies if an OTP code is correct and active for a recipient and purpose.
 */
export async function verifyOtp(recipient: string, inputOtpCode: string, purpose: OtpPurpose = 'login') {
  const activeOtp = await fetchActiveOtp(recipient, purpose);

  if (!activeOtp) {
    return { success: false, message: 'OTP expired or not found.' };
  }

  if (activeOtp.otpCode !== inputOtpCode) {
    // Increment attempts count
    await incrementOtpAttempts(activeOtp.optId, (activeOtp.attempts || 0) + 1);
    return { success: false, message: 'Invalid OTP code.' };
  }

  // Mark OTP as used upon successful verification
  await markOtpAsUsed(activeOtp.optId);
  return { success: true, message: 'OTP verified successfully.', data: activeOtp };
}

/**
 * Marks an OTP record as used (isUsed = true).
 */
export async function markOtpAsUsed(optId: string) {
  const { data, error } = await supabase
    .from('otps')
    .update({ isUsed: true, updatedAt: new Date().toISOString() })
    .eq('optId', optId)
    .select();

  if (error) throw error;
  return data ? data[0] : null;
}

/**
 * Increments the attempts counter for a specific OTP.
 */
export async function incrementOtpAttempts(optId: string, attempts: number) {
  const { data, error } = await supabase
    .from('otps')
    .update({ attempts, updatedAt: new Date().toISOString() })
    .eq('optId', optId)
    .select();

  if (error) throw error;
  return data ? data[0] : null;
}

/**
 * Deletes all expired OTP records from the table.
 */
export async function deleteExpiredOtps() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('otps')
    .delete()
    .lt('expiresAt', now);

  if (error) throw error;
  return data ?? [];
}
