import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type UserRole = 'customer' | 'owner' | 'superadmin' | 'trainer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserAttributes {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  address?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: number | null;
  role?: UserRole;
  status?: UserStatus;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SaveUserParams {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  address?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: number | null;
  role?: UserRole;
  status?: UserStatus;
}

export async function fetchUsers(role?: UserRole, retryCount = 0): Promise<any[]> {
  let query = supabase
    .from('users')
    .select('*')
    .order('createdAt', { ascending: false });

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query;

  if (error) {
    // Handle 'JWT issued at future' error by retrying
    if (error.code === 'PGRST303' && retryCount < 3) {
      console.warn(`[userHelper] fetchUsers PGRST303 error, retrying (${retryCount + 1}/3) in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchUsers(role, retryCount + 1);
    }
    console.error('[userHelper] fetchUsers Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchUserById(userId: string, retryCount = 0): Promise<any> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST303' && retryCount < 3) {
      console.warn(`[userHelper] fetchUserById PGRST303 error, retrying (${retryCount + 1}/3) in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchUserById(userId, retryCount + 1);
    }
    console.error('[userHelper] fetchUserById Error:', error);
    throw error;
  }

  return data;
}

export async function fetchUserByEmail(email: string, retryCount = 0): Promise<any> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST303' && retryCount < 3) {
      console.warn(`[userHelper] fetchUserByEmail PGRST303 error, retrying (${retryCount + 1}/3) in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchUserByEmail(email, retryCount + 1);
    }
    console.error('[userHelper] fetchUserByEmail Error:', error);
    throw error;
  }

  return data;
}

export async function saveUser(userData: SaveUserParams) {
  const now = new Date().toISOString();

  if (userData.userId) {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        country: userData.country,
        state: userData.state,
        city: userData.city,
        pincode: userData.pincode,
        role: userData.role,
        status: userData.status,
        updatedAt: now,
      })
      .eq('userId', userData.userId)
      .select();

    if (error) {
      console.error('[userHelper] saveUser Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedUserId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          userId: generatedUserId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          address: userData.address || null,
          country: userData.country || null,
          state: userData.state || null,
          city: userData.city || null,
          pincode: userData.pincode || null,
          role: userData.role || 'customer',
          status: userData.status || 'active',
          isEmailVerified: false,
          isPhoneVerified: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[userHelper] saveUser Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function toggleUserStatus(userId: string, currentStatus: UserStatus) {
  const now = new Date().toISOString();
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

  const { data, error } = await supabase
    .from('users')
    .update({
      status: newStatus,
      updatedAt: now,
    })
    .eq('userId', userId)
    .select();

  if (error) {
    console.error('[userHelper] toggleUserStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
