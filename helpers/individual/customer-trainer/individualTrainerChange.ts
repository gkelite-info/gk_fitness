import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface IndividualTrainerChangeLogsAttributes {
  individualTrainerChangeLogId?: string;
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
    name?: string | null;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    profilePhoto?: string | null;
    status?: string | null;
    createdAt?: string | null;
  } | null;

  oldTrainer?: {
    globalTrainerId: string;
    userId?: string | null;
    fullName: string;
    email: string;
    mobile: string;
    specialization?: string | null;
    user?: {
      userId?: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      profilePhoto?: string | null;
    } | null;
  } | null;

  newTrainer?: {
    globalTrainerId: string;
    userId?: string | null;
    fullName: string;
    email: string;
    mobile: string;
    specialization?: string | null;
    user?: {
      userId?: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      profilePhoto?: string | null;
    } | null;
  } | null;

  changedByUser?: {
    userId: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    profilePhoto?: string | null;
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
    status,
    createdAt
  ),
  oldTrainer:global_trainers!individual_trainer_change_logs_oldTrainerId_fkey (
    *,
    user:users!global_trainers_userId_fkey (
      userId,
      name,
      email,
      phone,
      profilePhoto
    )
  ),
  newTrainer:global_trainers!individual_trainer_change_logs_newTrainerId_fkey (
    *,
    user:users!global_trainers_userId_fkey (
      userId,
      name,
      email,
      phone,
      profilePhoto
    )
  ),
  changedByUser:users!individual_trainer_change_logs_changedBy_fkey (
    userId,
    name,
    email,
    phone,
    profilePhoto
  )
`;

function formatIsoDate(d?: string | Date | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

/**
 * 1. Fetch all trainer change logs matching optional filters.
 */
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

  return (data as IndividualTrainerChangeLogsAttributes[]) ?? [];
}

/**
 * 2. Fetch single trainer change log by ID.
 */
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

  return (data as IndividualTrainerChangeLogsAttributes) ?? null;
}

/**
 * 3. Fetch all trainer change logs for a specific user/customer.
 */
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

  return (data as IndividualTrainerChangeLogsAttributes[]) ?? [];
}

/**
 * 4. Paginated fetch of trainer change logs with search and sorting.
 */
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
    data: (data as IndividualTrainerChangeLogsAttributes[]) ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 5. Save (Insert or Update) a trainer change log.
 */
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

    return (data ? data[0] : null) as IndividualTrainerChangeLogsAttributes | null;
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

    return (data ? data[0] : null) as IndividualTrainerChangeLogsAttributes | null;
  }
}

/**
 * 6. Soft delete a trainer change log.
 */
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

  return (data ? data[0] : null) as IndividualTrainerChangeLogsAttributes | null;
}
