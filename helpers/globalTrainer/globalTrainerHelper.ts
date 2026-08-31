import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GlobalTrainerAttributes {
  globalTrainerId?: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'others';
  mobile: string;
  alternateMobile?: string | null;
  email: string;
  specialization: 'strength' | 'fatloss' | 'crossfit';
  experience: number;
  joiningDate: string;
  qualification: string;
  bio?: string | null;
  languagesSpoken: string[];
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: number;
  isActive?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGlobalTrainerParams {
  globalTrainerId?: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'others';
  mobile: string;
  alternateMobile?: string | null;
  email: string;
  specialization: 'strength' | 'fatloss' | 'crossfit';
  experience: number;
  joiningDate: string;
  qualification: string;
  bio?: string | null;
  languagesSpoken: string[];
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: number;
  isActive?: boolean;
}

export async function fetchGlobalTrainers(searchQuery?: string) {
  let query = supabase
    .from('global_trainers')
    .select('*, users(profilePhoto)')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim();
    query = query.or(`fullName.ilike.%${q}%,specialization.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[globalTrainerHelper] fetchGlobalTrainers Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchGlobalTrainersPaginated(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string,
  statusFilter?: string,
  sortOrder: 'newest' | 'oldest' = 'newest'
) {
  let query = supabase
    .from('global_trainers')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false);

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('isActive', statusFilter === 'active');
  }

  if (searchQuery) {
    query = query.or(`fullName.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,mobile.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%,specialization.ilike.%${searchQuery}%`);
  }

  query = query.order('createdAt', { ascending: sortOrder === 'oldest' });

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('[globalTrainerHelper] fetchGlobalTrainersPaginated Error:', error);
    throw error;
  }

  return { data: data ?? [], total: count ?? 0 };
}

export async function fetchGlobalTrainerById(globalTrainerId: string) {
  const { data, error } = await supabase
    .from('global_trainers')
    .select('*')
    .eq('globalTrainerId', globalTrainerId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerHelper] fetchGlobalTrainerById Error:', error);
    throw error;
  }

  return data;
}

export async function saveGlobalTrainer(trainerData: SaveGlobalTrainerParams) {
  const now = new Date().toISOString();

  if (trainerData.globalTrainerId) {
    const { data, error } = await supabase
      .from('global_trainers')
      .update({
        fullName: trainerData.fullName,
        dateOfBirth: trainerData.dateOfBirth,
        gender: trainerData.gender,
        mobile: trainerData.mobile,
        alternateMobile: trainerData.alternateMobile,
        email: trainerData.email,
        specialization: trainerData.specialization,
        experience: trainerData.experience,
        joiningDate: trainerData.joiningDate,
        qualification: trainerData.qualification,
        bio: trainerData.bio,
        languagesSpoken: trainerData.languagesSpoken,
        address: trainerData.address,
        country: trainerData.country,
        state: trainerData.state,
        city: trainerData.city,
        pincode: trainerData.pincode,
        isActive: trainerData.isActive ?? true,
        updatedAt: now,
      })
      .eq('globalTrainerId', trainerData.globalTrainerId)
      .select();

    if (error) {
      console.error('[globalTrainerHelper] saveGlobalTrainer Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = trainerData.globalTrainerId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('global_trainers')
      .insert([
        {
          globalTrainerId: generatedId,
          fullName: trainerData.fullName,
          dateOfBirth: trainerData.dateOfBirth,
          gender: trainerData.gender,
          mobile: trainerData.mobile,
          alternateMobile: trainerData.alternateMobile || null,
          email: trainerData.email,
          specialization: trainerData.specialization,
          experience: trainerData.experience,
          joiningDate: trainerData.joiningDate,
          qualification: trainerData.qualification,
          bio: trainerData.bio || null,
          languagesSpoken: trainerData.languagesSpoken,
          address: trainerData.address,
          country: trainerData.country,
          state: trainerData.state,
          city: trainerData.city,
          pincode: trainerData.pincode,
          isActive: trainerData.isActive ?? true,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[globalTrainerHelper] saveGlobalTrainer Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGlobalTrainer(globalTrainerId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('global_trainers')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('globalTrainerId', globalTrainerId)
    .select();

  if (error) {
    console.error('[globalTrainerHelper] deleteGlobalTrainer Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function toggleGlobalTrainerActiveStatus(globalTrainerId: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('global_trainers')
    .update({
      isActive: !currentStatus,
      updatedAt: now,
    })
    .eq('globalTrainerId', globalTrainerId)
    .select();

  if (error) {
    console.error('[globalTrainerHelper] toggleGlobalTrainerActiveStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
