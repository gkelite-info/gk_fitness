import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type IndividualTrainerRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IndividualCustomerTrainerAttributes {
  individualCustomerTrainerId?: string;
  userId: string;
  globalTrainerId: string;
  assignedOn?: string | Date | null;
  weekDays: string[];
  timings: string;
  renewalOn?: string | Date | null;
  expiryOn?: string | Date | null;
  status?: IndividualTrainerRequestStatus | null;
  isActive?: boolean;
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

  globalTrainer?: {
    globalTrainerId: string;
    userId?: string | null;
    fullName: string;
    dateOfBirth?: string | null;
    gender?: 'male' | 'female' | 'others';
    mobile: string;
    alternateMobile?: string | null;
    email: string;
    specialization: 'strength' | 'fatloss' | 'crossfit' | string;
    experience: number;
    joiningDate?: string | null;
    qualification?: string | null;
    bio?: string | null;
    languagesSpoken?: string[];
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    pincode?: number | null;
    isActive?: boolean;
    price?: number | null;
    profilePic?: string | null;
    profilePhoto?: string | null;
    user?: {
      userId?: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      profilePhoto?: string | null;
      profilePic?: string | null;
      status?: string | null;
    } | null;
    users?: {
      userId?: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      profilePhoto?: string | null;
      profilePic?: string | null;
      status?: string | null;
    } | null;
  } | null;
}

export interface SaveIndividualCustomerTrainerParams {
  individualCustomerTrainerId?: string;
  userId: string;
  globalTrainerId: string;
  assignedOn?: string | Date | null;
  weekDays: string[];
  timings: string;
  renewalOn?: string | Date | null;
  expiryOn?: string | Date | null;
  status?: IndividualTrainerRequestStatus | null;
  isActive?: boolean;
}

export interface FetchIndividualCustomerTrainersFilter {
  userId?: string;
  globalTrainerId?: string;
  status?: IndividualTrainerRequestStatus;
  isActive?: boolean;
  weekDay?: string;
  timings?: string;
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

export const BASE_INDIVIDUAL_CUSTOMER_TRAINER_SELECT = `
  *,
  user:users!individual_customer_trainers_userId_fkey (
    userId,
    name,
    email,
    phone,
    profilePhoto,
    profilePic:profilePhoto,
    status,
    createdAt
  ),
  globalTrainer:global_trainers!individual_customer_trainers_globalTrainerId_fkey (
    *,
    user:users!global_trainers_userId_fkey (
      userId,
      name,
      email,
      phone,
      profilePhoto,
      profilePic:profilePhoto,
      status
    ),
    users:users!global_trainers_userId_fkey (
      userId,
      name,
      email,
      phone,
      profilePhoto,
      profilePic:profilePhoto,
      status
    )
  )
`;

function formatIsoDate(d?: string | Date | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

/**
 * 1. Fetch individual customer trainers with optional filters.
 */
export async function fetchIndividualCustomerTrainers(
  filters?: FetchIndividualCustomerTrainersFilter
): Promise<IndividualCustomerTrainerAttributes[]> {
  let query = supabase
    .from('individual_customer_trainers')
    .select(BASE_INDIVIDUAL_CUSTOMER_TRAINER_SELECT)
    .order('createdAt', { ascending: false });

  if (!filters?.includeDeleted) {
    query = query.eq('is_deleted', false).is('deletedAt', null);
  }

  if (filters?.userId) {
    query = query.eq('userId', filters.userId);
  }

  if (filters?.globalTrainerId) {
    query = query.eq('globalTrainerId', filters.globalTrainerId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('isActive', filters.isActive);
  }

  if (filters?.weekDay) {
    query = query.contains('weekDays', [filters.weekDay]);
  }

  if (filters?.timings) {
    query = query.ilike('timings', `%${filters.timings.trim()}%`);
  }

  if (filters?.startDate) {
    query = query.gte('assignedOn', formatIsoDate(filters.startDate) as string);
  }

  if (filters?.endDate) {
    query = query.lte('assignedOn', formatIsoDate(filters.endDate) as string);
  }

  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim();
    query = query.ilike('user.name', `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[individualCustomerTrainerHelper] fetchIndividualCustomerTrainers Error:', error);
    throw error;
  }

  return ((data as any[])?.map(mapIndividualCustomerTrainerRecord) as IndividualCustomerTrainerAttributes[]) ?? [];
}

function mapIndividualCustomerTrainerRecord(item: any): IndividualCustomerTrainerAttributes {
  if (!item) return item;
  const gt = item.globalTrainer;
  if (gt) {
    const pic =
      gt.users?.profilePic ||
      gt.users?.profilePhoto ||
      gt.user?.profilePic ||
      gt.user?.profilePhoto ||
      gt.profilePic ||
      gt.profilePhoto ||
      null;
    return {
      ...item,
      globalTrainer: {
        ...gt,
        profilePic: pic,
        profilePhoto: pic,
      },
    };
  }
  return item;
}

/**
 * 2. Fetch single individual customer trainer assignment by its primary key ID.
 */
export async function fetchIndividualCustomerTrainerById(
  individualCustomerTrainerId: string
): Promise<IndividualCustomerTrainerAttributes | null> {
  const { data, error } = await supabase
    .from('individual_customer_trainers')
    .select(BASE_INDIVIDUAL_CUSTOMER_TRAINER_SELECT)
    .eq('individualCustomerTrainerId', individualCustomerTrainerId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[individualCustomerTrainerHelper] fetchIndividualCustomerTrainerById Error:', error);
    throw error;
  }

  return (data ? mapIndividualCustomerTrainerRecord(data) : null) as IndividualCustomerTrainerAttributes | null;
}

/**
 * 3. Fetch all assigned global trainers for a given individual user/customer.
 */
export async function fetchAssignedGlobalTrainersByUser(
  userId: string
): Promise<IndividualCustomerTrainerAttributes[]> {
  const { data, error } = await supabase
    .from('individual_customer_trainers')
    .select(BASE_INDIVIDUAL_CUSTOMER_TRAINER_SELECT)
    .eq('userId', userId)
    .eq('is_deleted', false)
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[individualCustomerTrainerHelper] fetchAssignedGlobalTrainersByUser Error:', error);
    throw error;
  }

  return ((data as any[])?.map(mapIndividualCustomerTrainerRecord) as IndividualCustomerTrainerAttributes[]) ?? [];
}

/**
 * 4. General paginated fetch for management views and data tables.
 */
export async function fetchIndividualCustomerTrainersPaginated(
  page = 1,
  limit = 10,
  filters?: {
    searchQuery?: string;
    statusFilter?: 'all' | 'active' | 'inactive';
    requestStatus?: IndividualTrainerRequestStatus;
    globalTrainerId?: string;
    userId?: string;
    sortOrder?: 'newest' | 'oldest';
  }
): Promise<PaginatedResult<IndividualCustomerTrainerAttributes>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('individual_customer_trainers')
    .select(BASE_INDIVIDUAL_CUSTOMER_TRAINER_SELECT, { count: 'exact' })
    .eq('is_deleted', false)
    .is('deletedAt', null);

  if (filters?.statusFilter && filters.statusFilter !== 'all') {
    query = query.eq('isActive', filters.statusFilter === 'active');
  }

  if (filters?.requestStatus) {
    query = query.eq('status', filters.requestStatus);
  }

  if (filters?.globalTrainerId) {
    query = query.eq('globalTrainerId', filters.globalTrainerId);
  }

  if (filters?.userId) {
    query = query.eq('userId', filters.userId);
  }

  if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.trim();
    query = query.ilike('user.name', `%${q}%`);
  }

  query = query.order('assignedOn', { ascending: filters?.sortOrder === 'oldest' });

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error('[individualCustomerTrainerHelper] fetchIndividualCustomerTrainersPaginated Error:', error);
    throw error;
  }

  const total = count ?? 0;
  return {
    data: (data as IndividualCustomerTrainerAttributes[]) ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 5. Save (insert or update) an individual customer trainer assignment.
 */
export async function saveIndividualCustomerTrainer(
  assignmentData: SaveIndividualCustomerTrainerParams
): Promise<IndividualCustomerTrainerAttributes | null> {
  const now = new Date().toISOString();

  let targetId = assignmentData.individualCustomerTrainerId;
  let isUpdate = false;

  if (targetId) {
    const { data: existing } = await supabase
      .from('individual_customer_trainers')
      .select('individualCustomerTrainerId')
      .eq('individualCustomerTrainerId', targetId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existing) {
      isUpdate = true;
    }
  }

  // If no ID provided, check existing record for (userId, globalTrainerId)
  if (!isUpdate && assignmentData.userId && assignmentData.globalTrainerId) {
    const { data: existingByUserTrainer } = await supabase
      .from('individual_customer_trainers')
      .select('individualCustomerTrainerId')
      .eq('userId', assignmentData.userId)
      .eq('globalTrainerId', assignmentData.globalTrainerId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingByUserTrainer) {
      targetId = existingByUserTrainer.individualCustomerTrainerId;
      isUpdate = true;
    }
  }

  if (isUpdate && targetId) {
    const updatePayload: any = {
      userId: assignmentData.userId,
      globalTrainerId: assignmentData.globalTrainerId,
      weekDays: assignmentData.weekDays ?? [],
      timings: assignmentData.timings,
      isActive: assignmentData.isActive ?? true,
      updatedAt: now,
    };

    if (assignmentData.status !== undefined) {
      updatePayload.status = assignmentData.status;
    }
    if (assignmentData.assignedOn !== undefined) {
      updatePayload.assignedOn = formatIsoDate(assignmentData.assignedOn);
    }
    if (assignmentData.renewalOn !== undefined) {
      updatePayload.renewalOn = formatIsoDate(assignmentData.renewalOn);
    }
    if (assignmentData.expiryOn !== undefined) {
      updatePayload.expiryOn = formatIsoDate(assignmentData.expiryOn);
    }

    const { data, error } = await supabase
      .from('individual_customer_trainers')
      .update(updatePayload)
      .eq('individualCustomerTrainerId', targetId)
      .select(BASE_INDIVIDUAL_CUSTOMER_TRAINER_SELECT);

    if (error) {
      console.error('[individualCustomerTrainerHelper] saveIndividualCustomerTrainer update Error:', error);
      throw error;
    }

    return (data ? mapIndividualCustomerTrainerRecord(data[0]) : null) as IndividualCustomerTrainerAttributes | null;
  } else {
    const generatedId = targetId || Crypto.randomUUID();
    const insertPayload: any = {
      individualCustomerTrainerId: generatedId,
      userId: assignmentData.userId,
      globalTrainerId: assignmentData.globalTrainerId,
      assignedOn: formatIsoDate(assignmentData.assignedOn),
      weekDays: assignmentData.weekDays ?? [],
      timings: assignmentData.timings,
      renewalOn: formatIsoDate(assignmentData.renewalOn),
      expiryOn: formatIsoDate(assignmentData.expiryOn),
      status: assignmentData.status ?? 'pending',
      isActive: assignmentData.isActive ?? true,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const { data, error } = await supabase
      .from('individual_customer_trainers')
      .insert([insertPayload])
      .select(BASE_INDIVIDUAL_CUSTOMER_TRAINER_SELECT);

    if (error) {
      console.error('[individualCustomerTrainerHelper] saveIndividualCustomerTrainer insert Error:', error);
      throw error;
    }

    return (data ? mapIndividualCustomerTrainerRecord(data[0]) : null) as IndividualCustomerTrainerAttributes | null;
  }
}

/**
 * 6. Soft delete an assignment.
 */
export async function deleteIndividualCustomerTrainer(
  individualCustomerTrainerId: string
): Promise<IndividualCustomerTrainerAttributes | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('individual_customer_trainers')
    .update({
      isActive: false,
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('individualCustomerTrainerId', individualCustomerTrainerId)
    .select(BASE_INDIVIDUAL_CUSTOMER_TRAINER_SELECT);

  if (error) {
    console.error('[individualCustomerTrainerHelper] deleteIndividualCustomerTrainer Error:', error);
    throw error;
  }

  return (data ? mapIndividualCustomerTrainerRecord(data[0]) : null) as IndividualCustomerTrainerAttributes | null;
}
