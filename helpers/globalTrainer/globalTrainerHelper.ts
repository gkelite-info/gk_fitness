import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GlobalTrainerAttributes {
  globalTrainerId?: string;
  userId?: string | null;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'others';
  mobile: string;
  alternateMobile?: string | null;
  email: string;
  specialization: 'strength' | 'fatloss' | 'crossfit' | string;
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
  price?: number | null;
  referCode?: string | null;
  profilePic?: string | null;
  profilePhoto?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGlobalTrainerParams {
  globalTrainerId?: string;
  userId?: string | null;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'others';
  mobile: string;
  alternateMobile?: string | null;
  email: string;
  specialization: 'strength' | 'fatloss' | 'crossfit' | string;
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
  price?: number | null;
  referCode?: string | null;
}

export const GLOBAL_TRAINER_SELECT = `
  *,
  users:users!global_trainers_userId_fkey (
    userId,
    name,
    email,
    phone,
    profilePhoto,
    status,
    createdAt
  )
`;

export async function fetchGlobalTrainers(searchQuery?: string) {
  let data: any[] | null = null;
  let error: any = null;

  try {
    let query = supabase
      .from('global_trainers')
      .select(GLOBAL_TRAINER_SELECT)
      .order('createdAt', { ascending: false });

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`fullName.ilike.%${q}%,specialization.ilike.%${q}%`);
    }

    const res = await query;
    if (res.error) {
      console.warn('[globalTrainerHelper] fetchGlobalTrainers join query error:', res.error);
      error = res.error;
    } else {
      data = res.data;
    }
  } catch (err: any) {
    console.warn('[globalTrainerHelper] fetchGlobalTrainers join exception:', err);
    error = err;
  }

  // If join failed or returned error, fallback to simple select *
  if (error || !data) {
    try {
      let fallbackQuery = supabase
        .from('global_trainers')
        .select('*')
        .order('createdAt', { ascending: false });

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim();
        fallbackQuery = fallbackQuery.or(`fullName.ilike.%${q}%,specialization.ilike.%${q}%`);
      }

      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error) {
        console.error('[globalTrainerHelper] fetchGlobalTrainers fallback error:', fallbackRes.error);
        data = [];
      } else {
        data = fallbackRes.data || [];
      }
    } catch (fallbackErr: any) {
      console.error('[globalTrainerHelper] fetchGlobalTrainers fallback exception:', fallbackErr);
      data = [];
    }
  }

  const nonDeleted = (data || []).filter((t: any) => t.is_deleted !== true);

  return nonDeleted.map((trainer: any) => {
    const userObj = Array.isArray(trainer.users) ? trainer.users[0] : trainer.users;
    const userPic = userObj?.profilePic || userObj?.profilePhoto || null;
    return {
      ...trainer,
      profilePic: trainer.profilePic || trainer.profilePhoto || userPic || null,
      profilePhoto: trainer.profilePhoto || trainer.profilePic || userPic || null,
    };
  });
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
    .select(GLOBAL_TRAINER_SELECT, { count: 'exact' })
    .eq('is_deleted', false);

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('isActive', statusFilter === 'active');
  }

  if (searchQuery) {
    query = query.or(`fullName.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,mobile.ilike.%${searchQuery}%,referCode.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`);
  }

  query = query.order('createdAt', { ascending: sortOrder === 'oldest' });

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to);

  let { data, count, error } = await query;

  if (error) {
    console.warn('[globalTrainerHelper] fetchGlobalTrainersPaginated join failed, attempting fallback:', error.message || error);
    let fallbackQuery = supabase
      .from('global_trainers')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false);

    if (statusFilter && statusFilter !== 'all') {
      fallbackQuery = fallbackQuery.eq('isActive', statusFilter === 'active');
    }

    if (searchQuery) {
      fallbackQuery = fallbackQuery.or(`fullName.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,mobile.ilike.%${searchQuery}%,referCode.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`);
    }

    fallbackQuery = fallbackQuery.order('createdAt', { ascending: sortOrder === 'oldest' }).range(from, to);

    const fallbackRes = await fallbackQuery;
    if (fallbackRes.error) {
      console.error('[globalTrainerHelper] fetchGlobalTrainersPaginated fallback Error:', fallbackRes.error);
      throw fallbackRes.error;
    }
    data = fallbackRes.data;
    count = fallbackRes.count;
  }

  const mappedData = (data as any[])?.map((trainer: any) => {
    const userObj = Array.isArray(trainer.users) ? trainer.users[0] : trainer.users;
    const userPic = userObj?.profilePic || userObj?.profilePhoto || null;
    return {
      ...trainer,
      profilePic: trainer.profilePic || trainer.profilePhoto || userPic || null,
      profilePhoto: trainer.profilePhoto || trainer.profilePic || userPic || null,
    };
  }) ?? [];

  return { data: mappedData, total: count ?? 0 };
}

export async function fetchGlobalTrainerById(globalTrainerId: string) {
  let { data, error } = await supabase
    .from('global_trainers')
    .select(GLOBAL_TRAINER_SELECT)
    .eq('globalTrainerId', globalTrainerId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.warn('[globalTrainerHelper] fetchGlobalTrainerById join failed, attempting fallback:', error.message || error);
    const fallbackRes = await supabase
      .from('global_trainers')
      .select('*')
      .eq('globalTrainerId', globalTrainerId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fallbackRes.error) {
      console.error('[globalTrainerHelper] fetchGlobalTrainerById fallback Error:', fallbackRes.error);
      throw fallbackRes.error;
    }
    data = fallbackRes.data;
  }

  if (!data) return null;

  const userObj = Array.isArray((data as any).users) ? (data as any).users[0] : (data as any).users;
  const userPic = userObj?.profilePic || userObj?.profilePhoto || null;
  return {
    ...data,
    profilePic: (data as any).profilePic || (data as any).profilePhoto || userPic || null,
    profilePhoto: (data as any).profilePhoto || (data as any).profilePic || userPic || null,
  };
}

export async function fetchGlobalTrainerByUserId(userId: string) {
  let { data, error } = await supabase
    .from('global_trainers')
    .select(GLOBAL_TRAINER_SELECT)
    .eq('userId', userId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.warn('[globalTrainerHelper] fetchGlobalTrainerByUserId join failed, attempting fallback:', error.message || error);
    const fallbackRes = await supabase
      .from('global_trainers')
      .select('*')
      .eq('userId', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fallbackRes.error) {
      console.error('[globalTrainerHelper] fetchGlobalTrainerByUserId fallback Error:', fallbackRes.error);
      throw fallbackRes.error;
    }
    data = fallbackRes.data;
  }

  if (!data) return null;

  const userObj = Array.isArray((data as any).users) ? (data as any).users[0] : (data as any).users;
  const userPic = userObj?.profilePic || userObj?.profilePhoto || null;
  return {
    ...data,
    profilePic: (data as any).profilePic || (data as any).profilePhoto || userPic || null,
    profilePhoto: (data as any).profilePhoto || (data as any).profilePic || userPic || null,
  };
}

export function generateTrainerReferCode(prefix = 'GT'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = prefix + '-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function fetchGlobalTrainerByReferCode(referCode: string) {
  let { data, error } = await supabase
    .from('global_trainers')
    .select(GLOBAL_TRAINER_SELECT)
    .eq('referCode', referCode.trim())
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.warn('[globalTrainerHelper] fetchGlobalTrainerByReferCode join failed, attempting fallback:', error.message || error);
    const fallbackRes = await supabase
      .from('global_trainers')
      .select('*')
      .eq('referCode', referCode.trim())
      .eq('is_deleted', false)
      .maybeSingle();

    if (fallbackRes.error) {
      console.error('[globalTrainerHelper] fetchGlobalTrainerByReferCode fallback Error:', fallbackRes.error);
      throw fallbackRes.error;
    }
    data = fallbackRes.data;
  }

  if (!data) return null;

  const userObj = Array.isArray((data as any).users) ? (data as any).users[0] : (data as any).users;
  const userPic = userObj?.profilePic || userObj?.profilePhoto || null;
  return {
    ...data,
    profilePic: (data as any).profilePic || (data as any).profilePhoto || userPic || null,
    profilePhoto: (data as any).profilePhoto || (data as any).profilePic || userPic || null,
  };
}

export async function saveGlobalTrainer(trainerData: SaveGlobalTrainerParams) {
  const now = new Date().toISOString();

  if (trainerData.globalTrainerId) {
    const updatePayload: any = {
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
    };

    if (trainerData.userId !== undefined) {
      updatePayload.userId = trainerData.userId;
    }

    if (trainerData.price !== undefined) {
      updatePayload.price = trainerData.price;
    }

    if (trainerData.referCode !== undefined) {
      updatePayload.referCode = trainerData.referCode ? trainerData.referCode.trim() : null;
    }

    const { data, error } = await supabase
      .from('global_trainers')
      .update(updatePayload)
      .eq('globalTrainerId', trainerData.globalTrainerId)
      .select();

    if (error) {
      console.error('[globalTrainerHelper] saveGlobalTrainer Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = trainerData.globalTrainerId || Crypto.randomUUID();
    const insertPayload: any = {
      globalTrainerId: generatedId,
      userId: trainerData.userId || null,
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
      price: trainerData.price !== undefined && trainerData.price !== null ? trainerData.price : 0,
      referCode: trainerData.referCode ? trainerData.referCode.trim() : null,
      isActive: trainerData.isActive ?? true,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from('global_trainers')
      .insert([insertPayload])
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
