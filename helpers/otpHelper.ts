import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';


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


export interface CreateUserParams {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role?: string;
}

export async function createUser(userData: CreateUserParams) {
  const insertData: any = {
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    address: userData.address || null,
    role: userData.role || 'customer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (userData.userId) {
    insertData.userId = userData.userId;
  }

  const { data, error } = await supabase
    .from('users')
    .insert([insertData])
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
  } else if (role === 'owner') {
    router.replace('/(owner)/dashboard');
  } else if (role === 'doctor') {
    router.replace('/(doctor)/patients');
  } else {
    router.replace('/(customer)/home');
  }
}


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


export async function verifyOtp(recipient: string, inputOtpCode: string, purpose: OtpPurpose = 'login') {
  const activeOtp = await fetchActiveOtp(recipient, purpose);

  if (!activeOtp) {
    return { success: false, message: 'OTP expired or not found.' };
  }

  if (activeOtp.otpCode !== inputOtpCode) {
    await incrementOtpAttempts(activeOtp.optId, (activeOtp.attempts || 0) + 1);
    return { success: false, message: 'Invalid OTP code.' };
  }

  await markOtpAsUsed(activeOtp.optId);
  return { success: true, message: 'OTP verified successfully.', data: activeOtp };
}


export async function markOtpAsUsed(optId: string) {
  const { data, error } = await supabase
    .from('otps')
    .update({ isUsed: true, updatedAt: new Date().toISOString() })
    .eq('optId', optId)
    .select();

  if (error) throw error;
  return data ? data[0] : null;
}


export async function incrementOtpAttempts(optId: string, attempts: number) {
  const { data, error } = await supabase
    .from('otps')
    .update({ attempts, updatedAt: new Date().toISOString() })
    .eq('optId', optId)
    .select();

  if (error) throw error;
  return data ? data[0] : null;
}


export async function deleteExpiredOtps() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('otps')
    .delete()
    .lt('expiresAt', now);

  if (error) throw error;
  return data ?? [];
}
