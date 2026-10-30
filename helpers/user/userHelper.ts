import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type UserRole = 'customer' | 'owner' | 'superadmin' | 'trainer' | 'globaltrainer' | 'individual' | string;
export type UserStatus = 'active' | 'inactive' | 'suspended' | string;
export type UserGender = 'male' | 'female' | 'others' | 'other' | string;

export interface UserAttributes {
  userId: string;
  name: string;
  email: string;
  phone: string;
  address?: string | null;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  profilePhoto?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: number | null;
  dob?: string | null;
  gender: UserGender;
  password?: string | null;
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
  dob?: string | null;
  gender?: UserGender | string | null;
  role?: UserRole;
  status?: UserStatus;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  profilePhoto?: string | null;
  password?: string | null;
}

export interface UserFilterOptions {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  gender?: UserGender;
  country?: string;
  state?: string;
  city?: string;
  pincode?: number;
  limit?: number;
  offset?: number;
  sortBy?: keyof UserAttributes | string;
  ascending?: boolean;
}

function normalizeGender(gender?: string | null): string {
  if (!gender) return 'male';
  const clean = gender.toLowerCase().trim();
  if (clean === 'other') return 'others';
  return clean;
}

export async function fetchUsers(
  filterOrRole?: UserRole | UserFilterOptions,
  retryCount = 0
): Promise<UserAttributes[]> {
  const options: UserFilterOptions =
    typeof filterOrRole === 'string'
      ? { role: filterOrRole }
      : filterOrRole || {};

  let query = supabase
    .from('users')
    .select('*');

  if (options.role) {
    query = query.eq('role', options.role);
  }

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.gender) {
    query = query.eq('gender', normalizeGender(options.gender));
  }

  if (options.country) {
    query = query.ilike('country', options.country);
  }

  if (options.state) {
    query = query.ilike('state', options.state);
  }

  if (options.city) {
    query = query.ilike('city', options.city);
  }

  if (options.pincode !== undefined && options.pincode !== null) {
    query = query.eq('pincode', options.pincode);
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const sortBy = options.sortBy || 'createdAt';
  const ascending = options.ascending ?? false;
  query = query.order(sortBy, { ascending });

  if (typeof options.limit === 'number') {
    const offset = options.offset || 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === 'PGRST303' && retryCount < 3) {
      console.warn(`[userHelper] fetchUsers PGRST303 error, retrying (${retryCount + 1}/3) in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchUsers(filterOrRole, retryCount + 1);
    }
    console.error('[userHelper] fetchUsers Error:', error);
    throw error;
  }

  return (data as UserAttributes[]) ?? [];
}

export async function fetchUserById(userId: string, retryCount = 0): Promise<UserAttributes | null> {
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

  return (data as UserAttributes) || null;
}

export async function fetchUserByEmail(email: string, retryCount = 0): Promise<UserAttributes | null> {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', cleanEmail)
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

  return (data as UserAttributes) || null;
}

export async function fetchUserByPhone(phone: string, retryCount = 0): Promise<UserAttributes | null> {
  const cleanPhone = phone.trim();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST303' && retryCount < 3) {
      console.warn(`[userHelper] fetchUserByPhone PGRST303 error, retrying (${retryCount + 1}/3) in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchUserByPhone(phone, retryCount + 1);
    }
    console.error('[userHelper] fetchUserByPhone Error:', error);
    throw error;
  }

  return (data as UserAttributes) || null;
}

export async function saveUser(userData: SaveUserParams): Promise<UserAttributes | null> {
  const now = new Date().toISOString();
  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanPhone = userData.phone.trim();
  const cleanGender = normalizeGender(userData.gender);

  if (userData.userId) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('userId')
      .eq('userId', userData.userId)
      .maybeSingle();

    if (existingUser) {
      const updatePayload: Record<string, any> = {
        name: userData.name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        address: userData.address !== undefined ? userData.address : null,
        country: userData.country !== undefined ? userData.country : null,
        state: userData.state !== undefined ? userData.state : null,
        city: userData.city !== undefined ? userData.city : null,
        pincode: userData.pincode !== undefined ? userData.pincode : null,
        updatedAt: now,
      };

      if (userData.dob !== undefined) updatePayload.dob = userData.dob;
      if (userData.gender !== undefined) updatePayload.gender = cleanGender;
      if (userData.role !== undefined) updatePayload.role = userData.role;
      if (userData.status !== undefined) updatePayload.status = userData.status;
      if (userData.isEmailVerified !== undefined) updatePayload.isEmailVerified = userData.isEmailVerified;
      if (userData.isPhoneVerified !== undefined) updatePayload.isPhoneVerified = userData.isPhoneVerified;
      if (userData.profilePhoto !== undefined) updatePayload.profilePhoto = userData.profilePhoto;
      if (userData.password !== undefined) updatePayload.password = userData.password;

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('userId', userData.userId)
        .select()
        .single();

      if (error) {
        console.error('[userHelper] saveUser Update Error:', error);
        throw error;
      }

      return (data as UserAttributes) || null;
    } else {
      const insertPayload = {
        userId: userData.userId,
        name: userData.name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        address: userData.address || null,
        country: userData.country || null,
        state: userData.state || null,
        city: userData.city || null,
        pincode: userData.pincode || null,
        dob: userData.dob || null,
        gender: cleanGender,
        role: userData.role || 'customer',
        status: userData.status || 'active',
        isEmailVerified: userData.isEmailVerified ?? false,
        isPhoneVerified: userData.isPhoneVerified ?? false,
        profilePhoto: userData.profilePhoto || null,
        password: userData.password || null,
        createdAt: now,
        updatedAt: now,
      };

      const { data, error } = await supabase
        .from('users')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        console.error('[userHelper] saveUser Insert Error:', error);
        throw error;
      }

      return (data as UserAttributes) || null;
    }
  } else {
    const generatedUserId = Crypto.randomUUID();
    const insertPayload = {
      userId: generatedUserId,
      name: userData.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      address: userData.address || null,
      country: userData.country || null,
      state: userData.state || null,
      city: userData.city || null,
      pincode: userData.pincode || null,
      dob: userData.dob || null,
      gender: cleanGender,
      role: userData.role || 'customer',
      status: userData.status || 'active',
      isEmailVerified: userData.isEmailVerified ?? false,
      isPhoneVerified: userData.isPhoneVerified ?? false,
      profilePhoto: userData.profilePhoto || null,
      password: userData.password || null,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from('users')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('[userHelper] saveUser Insert Error:', error);
      throw error;
    }

    return (data as UserAttributes) || null;
  }
}

export async function createUser(userData: SaveUserParams): Promise<UserAttributes | null> {
  return saveUser(userData);
}

export async function updateUser(
  userId: string,
  updates: Partial<SaveUserParams>
): Promise<UserAttributes | null> {
  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    updatedAt: now,
  };

  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.email !== undefined) updatePayload.email = updates.email.trim().toLowerCase();
  if (updates.phone !== undefined) updatePayload.phone = updates.phone.trim();
  if (updates.address !== undefined) updatePayload.address = updates.address;
  if (updates.country !== undefined) updatePayload.country = updates.country;
  if (updates.state !== undefined) updatePayload.state = updates.state;
  if (updates.city !== undefined) updatePayload.city = updates.city;
  if (updates.pincode !== undefined) updatePayload.pincode = updates.pincode;
  if (updates.dob !== undefined) updatePayload.dob = updates.dob;
  if (updates.gender !== undefined) updatePayload.gender = normalizeGender(updates.gender);
  if (updates.role !== undefined) updatePayload.role = updates.role;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.isEmailVerified !== undefined) updatePayload.isEmailVerified = updates.isEmailVerified;
  if (updates.isPhoneVerified !== undefined) updatePayload.isPhoneVerified = updates.isPhoneVerified;
  if (updates.profilePhoto !== undefined) updatePayload.profilePhoto = updates.profilePhoto;
  if (updates.password !== undefined) updatePayload.password = updates.password;

  const { data, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('userId', userId)
    .select()
    .single();

  if (error) {
    console.error('[userHelper] updateUser Error:', error);
    throw error;
  }

  return (data as UserAttributes) || null;
}

export async function toggleUserStatus(userId: string, currentStatus: UserStatus): Promise<UserAttributes | null> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateUser(userId, { status: newStatus });
}

export async function updateUserVerification(
  userId: string,
  verification: { isEmailVerified?: boolean; isPhoneVerified?: boolean }
): Promise<UserAttributes | null> {
  return updateUser(userId, verification);
}

export async function updateUserProfilePhoto(
  userId: string,
  profilePhoto: string | null
): Promise<UserAttributes | null> {
  return updateUser(userId, { profilePhoto });
}

export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('userId', userId);

  if (error) {
    console.error('[userHelper] deleteUser Error:', error);
    throw error;
  }

  return true;
}
