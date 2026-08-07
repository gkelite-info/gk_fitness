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
  role?: UserRole;
  status?: UserStatus;
}

export async function fetchUsers(role?: UserRole) {
  let query = supabase
    .from('users')
    .select('*')
    .order('createdAt', { ascending: false });

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[userHelper] fetchUsers Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error) {
    console.error('[userHelper] fetchUserById Error:', error);
    throw error;
  }

  return data;
}

export async function fetchUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
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
