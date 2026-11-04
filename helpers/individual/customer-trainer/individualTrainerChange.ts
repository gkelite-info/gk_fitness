import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface IndividualTrainerChangeLogsAttributes {
  individualTrainerChangeLogId: string;
  userId: string;
  oldTrainerId?: string | null;
  oldTrainerSince?: string | Date | null;
  newTrainerId: string;
  reason?: string | null;
  notes?: string | null;
  changedBy: string;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;

  user?: {
    userId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    profilePhoto?: string | null;
    profilePic?: string | null;
  } | null;

  oldTrainer?: {
    globalTrainerId: string;
    fullName: string;
    email: string;
    mobile: string;
    profilePhoto?: string | null;
    profilePic?: string | null;
  } | null;

  newTrainer?: {
    globalTrainerId: string;
    fullName: string;
    email: string;
    mobile: string;
    profilePhoto?: string | null;
    profilePic?: string | null;
  } | null;

  changedByUser?: {
    userId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    profilePhoto?: string | null;
    profilePic?: string | null;
  } | null;
}

export interface SaveIndividualTrainerChangeLogParams {
  individualTrainerChangeLogId?: string;
  userId: string;
  oldTrainerId?: string | null;
  oldTrainerSince?: string | Date | null;
  newTrainerId: string;
  reason?: string | null;
  notes?: string | null;
  changedBy: string;
}

export interface FetchIndividualTrainerChangeLogsFilter {
  userId?: string;
  oldTrainerId?: string;
  newTrainerId?: string;
  trainerId?: string;
  changedBy?: string;
  reason?: string;
  searchQuery?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  includeDeleted?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const BASE_INDIVIDUAL_TRAINER_CHANGE_LOG_SELECT = `
  *,
  user:users!individual_trainer_change_logs_userId_fkey (
    userId,
    name,
    email,
    phone,
    profilePhoto,
    profilePic:profilePhoto
  ),
  oldTrainer:global_trainers!individual_trainer_change_logs_oldTrainerId_fkey (
    globalTrainerId,
    fullName,
    email,
    mobile,
    profilePhoto,
    profilePic:profilePhoto
  ),
  newTrainer:global_trainers!individual_trainer_change_logs_newTrainerId_fkey (
    globalTrainerId,
    fullName,
    email,
    mobile,
    profilePhoto,
    profilePic:profilePhoto
  ),
  changedByUser:users!individual_trainer_change_logs_changedBy_fkey (
    userId,
    name,
    email,
    phone,
    profilePhoto,
    profilePic:profilePhoto
  )
`;

function formatIsoDate(d?: string | Date | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function resolveStorageUrl(rawPic?: string | null, userId?: string | null): string | null {
  if (!rawPic || typeof rawPic !== 'string') return null;
  const clean = rawPic.trim();
  if (clean === '' || clean === 'null' || clean === 'undefined') return null;
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('file:') || clean.startsWith('data:')) {
    return clean;
  }
  const pathInBucket = clean.includes('/') ? clean : `${userId || 'avatars'}/${clean}`;
  const { data } = supabase.storage.from('profile_photos').getPublicUrl(pathInBucket);
  return data?.publicUrl || null;
}

function mapChangeLogRecord(item: any): IndividualTrainerChangeLogsAttributes {
  if (!item) return item;
  const mapped = { ...item };

  if (mapped.user) {
    const raw = mapped.user.profilePhoto || mapped.user.profilePic || null;
    const url = resolveStorageUrl(raw, mapped.user.userId);
    mapped.user = {
      ...mapped.user,
      profilePhoto: url,
      profilePic: url,
    };
  }

  if (mapped.oldTrainer) {
    const raw = mapped.oldTrainer.profilePhoto || mapped.oldTrainer.profilePic || null;
    const url = resolveStorageUrl(raw, mapped.oldTrainer.globalTrainerId);
    mapped.oldTrainer = {
      ...mapped.oldTrainer,
      profilePhoto: url,
      profilePic: url,
    };
  }

  if (mapped.newTrainer) {
    const raw = mapped.newTrainer.profilePhoto || mapped.newTrainer.profilePic || null;
    const url = resolveStorageUrl(raw, mapped.newTrainer.globalTrainerId);
    mapped.newTrainer = {
      ...mapped.newTrainer,
      profilePhoto: url,
      profilePic: url,
    };
  }

  if (mapped.changedByUser) {
    const raw = mapped.changedByUser.profilePhoto || mapped.changedByUser.profilePic || null;
    const url = resolveStorageUrl(raw, mapped.changedByUser.userId);
    mapped.changedByUser = {
      ...mapped.changedByUser,
      profilePhoto: url,
      profilePic: url,
    };
  }

  return mapped;
}

export async function fetchIndividualTrainerChangeLogs(
  filters?: FetchIndividualTrainerChangeLogsFilter
): Promise<IndividualTrainerChangeLogsAttributes[]> {
  let query = supabase
    .from('individual_trainer_change_logs')
    .select(BASE_INDIVIDUAL_TRAINER_CHANGE_LOG_SELECT)
    .order('createdAt', { ascending: false });

  if (!filters?.includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  if (filters?.userId) {
    query = query.eq('userId', filters.userId);
  }

  if (filters?.oldTrainerId) {
    query = query.eq('oldTrainerId', filters.oldTrainerId);
  }

  if (filters?.newTrainerId) {
    query = query.eq('newTrainerId', filters.newTrainerId);
  }

  if (filters?.trainerId) {
    query = query.or(`oldTrainerId.eq.${filters.trainerId},newTrainerId.eq.${filters.trainerId}`);
  }

  if (filters?.changedBy) {
    query = query.eq('changedBy', filters.changedBy);
  }

  if (filters?.reason) {
    query = query.ilike('reason', `%${filters.reason.trim()}%`);
  }

  if (filters?.startDate) {
    query = query.gte('createdAt', formatIsoDate(filters.startDate) as string);
  }

  if (filters?.endDate) {
    query = query.lte('createdAt', formatIsoDate(filters.endDate) as string);
  }

  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim();
    query = query.or(`reason.ilike.%${q}%,notes.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[individualTrainerChangeHelper] fetchIndividualTrainerChangeLogs Error:', error);
    throw error;
  }

  return ((data as any[])?.map(mapChangeLogRecord) as IndividualTrainerChangeLogsAttributes[]) ?? [];
}

export async function fetchIndividualTrainerChangeLogById(
  individualTrainerChangeLogId: string
): Promise<IndividualTrainerChangeLogsAttributes | null> {
  const { data, error } = await supabase
    .from('individual_trainer_change_logs')
    .select(BASE_INDIVIDUAL_TRAINER_CHANGE_LOG_SELECT)
    .eq('individualTrainerChangeLogId', individualTrainerChangeLogId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[individualTrainerChangeHelper] fetchIndividualTrainerChangeLogById Error:', error);
    throw error;
  }

  return data ? mapChangeLogRecord(data) : null;
}

export async function fetchTrainerChangeLogsByUser(
  userId: string
): Promise<IndividualTrainerChangeLogsAttributes[]> {
  const { data, error } = await supabase
    .from('individual_trainer_change_logs')
    .select(BASE_INDIVIDUAL_TRAINER_CHANGE_LOG_SELECT)
    .eq('userId', userId)
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[individualTrainerChangeHelper] fetchTrainerChangeLogsByUser Error:', error);
    throw error;
  }

  return ((data as any[])?.map(mapChangeLogRecord) as IndividualTrainerChangeLogsAttributes[]) ?? [];
}

export async function fetchTrainerChangeLogsPaginated(
  page = 1,
  limit = 10,
  filters?: {
    userId?: string;
    trainerId?: string;
    changedBy?: string;
    reason?: string;
    searchQuery?: string;
    sortOrder?: 'newest' | 'oldest';
  }
): Promise<PaginatedResult<IndividualTrainerChangeLogsAttributes>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('individual_trainer_change_logs')
    .select(BASE_INDIVIDUAL_TRAINER_CHANGE_LOG_SELECT, { count: 'exact' })
    .eq('is_deleted', false);

  if (filters?.userId) {
    query = query.eq('userId', filters.userId);
  }

  if (filters?.trainerId) {
    query = query.or(`oldTrainerId.eq.${filters.trainerId},newTrainerId.eq.${filters.trainerId}`);
  }

  if (filters?.changedBy) {
    query = query.eq('changedBy', filters.changedBy);
  }

  if (filters?.reason) {
    query = query.ilike('reason', `%${filters.reason.trim()}%`);
  }

  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim();
    query = query.or(`reason.ilike.%${q}%,notes.ilike.%${q}%`);
  }

  query = query.order('createdAt', { ascending: filters?.sortOrder === 'oldest' });

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error('[individualTrainerChangeHelper] fetchTrainerChangeLogsPaginated Error:', error);
    throw error;
  }

  const total = count ?? 0;
  return {
    data: ((data as any[])?.map(mapChangeLogRecord) as IndividualTrainerChangeLogsAttributes[]) ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function saveIndividualTrainerChangeLog(
  logData: SaveIndividualTrainerChangeLogParams
): Promise<IndividualTrainerChangeLogsAttributes | null> {
  const now = new Date().toISOString();

  if (logData.individualTrainerChangeLogId) {
    const updatePayload: any = {
      userId: logData.userId,
      oldTrainerId: logData.oldTrainerId ?? null,
      oldTrainerSince: formatIsoDate(logData.oldTrainerSince),
      newTrainerId: logData.newTrainerId,
      reason: logData.reason ?? null,
      notes: logData.notes ?? null,
      changedBy: logData.changedBy,
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from('individual_trainer_change_logs')
      .update(updatePayload)
      .eq('individualTrainerChangeLogId', logData.individualTrainerChangeLogId)
      .select(BASE_INDIVIDUAL_TRAINER_CHANGE_LOG_SELECT);

    if (error) {
      console.error('[individualTrainerChangeHelper] saveIndividualTrainerChangeLog update Error:', error);
      throw error;
    }

    return (data && data[0] ? mapChangeLogRecord(data[0]) : null) as IndividualTrainerChangeLogsAttributes | null;
  } else {
    const generatedId = Crypto.randomUUID();
    const insertPayload: any = {
      individualTrainerChangeLogId: generatedId,
      userId: logData.userId,
      oldTrainerId: logData.oldTrainerId ?? null,
      oldTrainerSince: formatIsoDate(logData.oldTrainerSince),
      newTrainerId: logData.newTrainerId,
      reason: logData.reason ?? null,
      notes: logData.notes ?? null,
      changedBy: logData.changedBy,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const { data, error } = await supabase
      .from('individual_trainer_change_logs')
      .insert([insertPayload])
      .select(BASE_INDIVIDUAL_TRAINER_CHANGE_LOG_SELECT);

    if (error) {
      console.error('[individualTrainerChangeHelper] saveIndividualTrainerChangeLog insert Error:', error);
      throw error;
    }

    return (data && data[0] ? mapChangeLogRecord(data[0]) : null) as IndividualTrainerChangeLogsAttributes | null;
  }
}

export async function deleteIndividualTrainerChangeLog(
  individualTrainerChangeLogId: string
): Promise<IndividualTrainerChangeLogsAttributes | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('individual_trainer_change_logs')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('individualTrainerChangeLogId', individualTrainerChangeLogId)
    .select(BASE_INDIVIDUAL_TRAINER_CHANGE_LOG_SELECT);

  if (error) {
    console.error('[individualTrainerChangeHelper] deleteIndividualTrainerChangeLog Error:', error);
    throw error;
  }

  return (data && data[0] ? mapChangeLogRecord(data[0]) : null) as IndividualTrainerChangeLogsAttributes | null;
}

