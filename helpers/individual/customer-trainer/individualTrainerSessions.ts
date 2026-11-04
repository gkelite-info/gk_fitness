import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type IndividualTrainerSessionStatus = 'pending' | 'completed' | 'cancelled';

export interface IndividualTrainerSessionAttributes {
  individualTrainerSessionId: string;
  individualCustomerTrainerId?: string | null;
  globalTrainerId: string;
  sessionDate: string | Date;
  status: IndividualTrainerSessionStatus;
  createdAt: string | Date;
  updatedAt: string | Date;

  individualCustomerTrainer?: {
    individualCustomerTrainerId: string;
    userId: string;
    globalTrainerId: string;
    assignedOn?: string | Date | null;
    weekDays?: string[] | string | null;
    timings?: string | null;
    renewalOn?: string | Date | null;
    expiryOn?: string | Date | null;
    status?: string | null;
    isActive?: boolean;
    user?: {
      userId: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      profilePhoto?: string | null;
      profilePic?: string | null;
    } | null;
  } | null;

  globalTrainer?: {
    globalTrainerId: string;
    userId?: string | null;
    fullName: string;
    email: string;
    mobile: string;
    specialization?: string | null;
    experience?: number | null;
    profilePhoto?: string | null;
    profilePic?: string | null;
  } | null;
}

export interface SaveIndividualTrainerSessionParams {
  individualTrainerSessionId?: string;
  individualCustomerTrainerId?: string | null;
  globalTrainerId: string;
  sessionDate: string | Date;
  status?: IndividualTrainerSessionStatus;
}

export interface FetchIndividualTrainerSessionsFilter {
  individualTrainerSessionId?: string;
  individualCustomerTrainerId?: string;
  globalTrainerId?: string;
  sessionDate?: string | Date;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: IndividualTrainerSessionStatus;
  searchQuery?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatIsoDate(d?: string | Date | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

/**
 * 1. Fetch individual trainer sessions with filters.
 */
export async function fetchIndividualTrainerSessions(
  filters?: FetchIndividualTrainerSessionsFilter
): Promise<IndividualTrainerSessionAttributes[]> {
  const queryTable = async (tableName: string) => {
    let query = supabase
      .from(tableName)
      .select('*')
      .order('sessionDate', { ascending: false });

    if (filters?.individualTrainerSessionId) {
      query = query.eq('individualTrainerSessionId', filters.individualTrainerSessionId);
    }

    if (filters?.individualCustomerTrainerId) {
      query = query.eq('individualCustomerTrainerId', filters.individualCustomerTrainerId);
    }

    if (filters?.globalTrainerId) {
      query = query.eq('globalTrainerId', filters.globalTrainerId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.sessionDate) {
      const target = new Date(filters.sessionDate);
      const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
      query = query
        .gte('sessionDate', startOfDay.toISOString())
        .lte('sessionDate', endOfDay.toISOString());
    }

    if (filters?.startDate) {
      query = query.gte('sessionDate', formatIsoDate(filters.startDate) as string);
    }

    if (filters?.endDate) {
      query = query.lte('sessionDate', formatIsoDate(filters.endDate) as string);
    }

    return await query;
  };

  let { data, error } = await queryTable('individual_trainer_sessions');
  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await queryTable('individual_customer_sessions');
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] fetchIndividualTrainerSessions Error:', error);
    throw error;
  }

  return (data as IndividualTrainerSessionAttributes[]) ?? [];
}

/**
 * 2. Fetch a single individual trainer session by ID.
 */
export async function fetchIndividualTrainerSessionById(
  individualTrainerSessionId: string
): Promise<IndividualTrainerSessionAttributes | null> {
  let { data, error } = await supabase
    .from('individual_trainer_sessions')
    .select('*')
    .eq('individualTrainerSessionId', individualTrainerSessionId)
    .maybeSingle();

  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await supabase
      .from('individual_customer_sessions')
      .select('*')
      .eq('individualTrainerSessionId', individualTrainerSessionId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] fetchIndividualTrainerSessionById Error:', error);
    throw error;
  }

  return (data as IndividualTrainerSessionAttributes) ?? null;
}

/**
 * 3. Fetch sessions for a specific date across individualCustomerTrainerIds.
 */
export async function fetchIndividualTrainerSessionsForDate(
  individualCustomerTrainerIds: string[],
  sessionDate: string | Date
): Promise<IndividualTrainerSessionAttributes[]> {
  if (!individualCustomerTrainerIds || individualCustomerTrainerIds.length === 0) return [];

  const target = new Date(sessionDate);
  const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);

  let { data, error } = await supabase
    .from('individual_trainer_sessions')
    .select('*')
    .in('individualCustomerTrainerId', individualCustomerTrainerIds)
    .gte('sessionDate', startOfDay.toISOString())
    .lte('sessionDate', endOfDay.toISOString());

  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await supabase
      .from('individual_customer_sessions')
      .select('*')
      .in('individualCustomerTrainerId', individualCustomerTrainerIds)
      .gte('sessionDate', startOfDay.toISOString())
      .lte('sessionDate', endOfDay.toISOString());
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] fetchIndividualTrainerSessionsForDate Error:', error);
    throw error;
  }

  return (data as IndividualTrainerSessionAttributes[]) ?? [];
}

/**
 * 4. Fetch sessions for a global trainer by date range or specific date.
 */
export async function fetchIndividualTrainerSessionsByGlobalTrainer(
  globalTrainerId: string,
  sessionDate?: string | Date
): Promise<IndividualTrainerSessionAttributes[]> {
  const queryTable = async (tableName: string) => {
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('globalTrainerId', globalTrainerId)
      .order('sessionDate', { ascending: false });

    if (sessionDate) {
      const target = new Date(sessionDate);
      const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
      query = query
        .gte('sessionDate', startOfDay.toISOString())
        .lte('sessionDate', endOfDay.toISOString());
    }

    return await query;
  };

  let { data, error } = await queryTable('individual_trainer_sessions');
  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await queryTable('individual_customer_sessions');
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] fetchIndividualTrainerSessionsByGlobalTrainer Error:', error);
    throw error;
  }

  return (data as IndividualTrainerSessionAttributes[]) ?? [];
}

/**
 * 5. Fetch sessions for an individual customer trainer assignment.
 */
export async function fetchIndividualTrainerSessionsByCustomerTrainerId(
  individualCustomerTrainerId: string
): Promise<IndividualTrainerSessionAttributes[]> {
  let { data, error } = await supabase
    .from('individual_trainer_sessions')
    .select('*')
    .eq('individualCustomerTrainerId', individualCustomerTrainerId)
    .order('sessionDate', { ascending: false });

  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await supabase
      .from('individual_customer_sessions')
      .select('*')
      .eq('individualCustomerTrainerId', individualCustomerTrainerId)
      .order('sessionDate', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] fetchIndividualTrainerSessionsByCustomerTrainerId Error:', error);
    throw error;
  }

  return (data as IndividualTrainerSessionAttributes[]) ?? [];
}

/**
 * 6. Paginated fetch for individual trainer sessions.
 */
export async function fetchIndividualTrainerSessionsPaginated(
  page = 1,
  limit = 10,
  filters?: FetchIndividualTrainerSessionsFilter
): Promise<PaginatedResult<IndividualTrainerSessionAttributes>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const queryTable = async (tableName: string) => {
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    if (filters?.globalTrainerId) {
      query = query.eq('globalTrainerId', filters.globalTrainerId);
    }

    if (filters?.individualCustomerTrainerId) {
      query = query.eq('individualCustomerTrainerId', filters.individualCustomerTrainerId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.sessionDate) {
      const target = new Date(filters.sessionDate);
      const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
      query = query
        .gte('sessionDate', startOfDay.toISOString())
        .lte('sessionDate', endOfDay.toISOString());
    }

    query = query.order('sessionDate', { ascending: false });

    return await query.range(from, to);
  };

  let { data, count, error } = await queryTable('individual_trainer_sessions');
  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await queryTable('individual_customer_sessions');
    data = fallback.data;
    count = fallback.count;
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] fetchIndividualTrainerSessionsPaginated Error:', error);
    throw error;
  }

  const total = count ?? 0;
  return {
    data: (data as IndividualTrainerSessionAttributes[]) ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 7. Save (create or update) an individual trainer session.
 * Checks for existing session on that date for the given customer trainer to avoid duplicates.
 */
export async function saveIndividualTrainerSession(
  params: SaveIndividualTrainerSessionParams
): Promise<IndividualTrainerSessionAttributes | null> {
  const now = new Date().toISOString();
  const sessionDateIso = params.sessionDate instanceof Date
    ? params.sessionDate.toISOString()
    : new Date(params.sessionDate).toISOString();

  const targetDate = new Date(params.sessionDate);
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  const attemptSave = async (tableName: string) => {
    // 1. If individualTrainerSessionId is passed, update by ID
    if (params.individualTrainerSessionId) {
      const updatePayload = {
        individualCustomerTrainerId: params.individualCustomerTrainerId ?? null,
        globalTrainerId: params.globalTrainerId,
        sessionDate: sessionDateIso,
        status: params.status || 'pending',
        updatedAt: now,
      };

      const { data, error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq('individualTrainerSessionId', params.individualTrainerSessionId)
        .select()
        .single();

      return { data, error };
    }

    // 2. Check if a session already exists for this customer trainer and date
    if (params.individualCustomerTrainerId) {
      const { data: existing } = await supabase
        .from(tableName)
        .select('individualTrainerSessionId')
        .eq('individualCustomerTrainerId', params.individualCustomerTrainerId)
        .gte('sessionDate', startOfDay.toISOString())
        .lte('sessionDate', endOfDay.toISOString())
        .maybeSingle();

      if (existing?.individualTrainerSessionId) {
        const updatePayload = {
          globalTrainerId: params.globalTrainerId,
          sessionDate: sessionDateIso,
          status: params.status || 'pending',
          updatedAt: now,
        };

        const { data, error } = await supabase
          .from(tableName)
          .update(updatePayload)
          .eq('individualTrainerSessionId', existing.individualTrainerSessionId)
          .select()
          .single();

        return { data, error };
      }
    }

    // 3. Otherwise, insert a new record
    const generatedId = Crypto.randomUUID();
    const insertPayload = {
      individualTrainerSessionId: generatedId,
      individualCustomerTrainerId: params.individualCustomerTrainerId ?? null,
      globalTrainerId: params.globalTrainerId,
      sessionDate: sessionDateIso,
      status: params.status || 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from(tableName)
      .insert(insertPayload)
      .select()
      .single();

    return { data, error };
  };

  let { data, error } = await attemptSave('individual_trainer_sessions');
  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await attemptSave('individual_customer_sessions');
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] saveIndividualTrainerSession Error:', error);
    throw error;
  }

  return (data as IndividualTrainerSessionAttributes) ?? null;
}

/**
 * 8. Update status of an individual trainer session.
 */
export async function updateIndividualTrainerSessionStatus(
  individualTrainerSessionId: string,
  status: IndividualTrainerSessionStatus
): Promise<IndividualTrainerSessionAttributes | null> {
  const now = new Date().toISOString();

  let { data, error } = await supabase
    .from('individual_trainer_sessions')
    .update({
      status,
      updatedAt: now,
    })
    .eq('individualTrainerSessionId', individualTrainerSessionId)
    .select()
    .single();

  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await supabase
      .from('individual_customer_sessions')
      .update({
        status,
        updatedAt: now,
      })
      .eq('individualTrainerSessionId', individualTrainerSessionId)
      .select()
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] updateIndividualTrainerSessionStatus Error:', error);
    throw error;
  }

  return (data as IndividualTrainerSessionAttributes) ?? null;
}

/**
 * 9. Delete an individual trainer session.
 */
export async function deleteIndividualTrainerSession(
  individualTrainerSessionId: string
): Promise<boolean> {
  let { error } = await supabase
    .from('individual_trainer_sessions')
    .delete()
    .eq('individualTrainerSessionId', individualTrainerSessionId);

  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    const fallback = await supabase
      .from('individual_customer_sessions')
      .delete()
      .eq('individualTrainerSessionId', individualTrainerSessionId);
    error = fallback.error;
  }

  if (error) {
    console.error('[individualTrainerSessionsHelper] deleteIndividualTrainerSession Error:', error);
    throw error;
  }

  return true;
}
