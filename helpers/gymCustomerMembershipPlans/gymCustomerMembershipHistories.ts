import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type GymCustomerMembershipHistoryActionType =
  | 'UPGRADED'
  | 'ASSIGNED'
  | 'RENEWED'
  | 'EXTENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type GymCustomerMembershipHistoryPaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface GymCustomerMembershipHistoryAttributes {
  customerMembershipHistoryId?: string;
  GymCustomerMembershipPlanId?: string | null;
  customerId: string;
  gymId: string;
  planId: string;
  previousPlanId?: string | null;
  actionType: GymCustomerMembershipHistoryActionType;
  customAmount?: number | null;
  unusedCredit?: number | null;
  daysCarriedOver?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  paymentStatus?: GymCustomerMembershipHistoryPaymentStatus | null;
  transactionId?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  createdBy: string;
  is_Active?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;

  plan?: {
    planName: string;
    durationMonths: string | number;
    price: number;
  };
  previousPlan?: {
    planName: string;
    durationMonths: string | number;
    price: number;
  } | null;
  customer?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    users?: {
      profilePhoto?: string | null;
    };
  };
  creator?: {
    name?: string | null;
    email?: string | null;
  };
}

export interface SaveGymCustomerMembershipHistoryParams {
  customerMembershipHistoryId?: string;
  historyId?: string;
  GymCustomerMembershipPlanId?: string | null;
  customerId: string;
  gymId: string;
  planId: string;
  previousPlanId?: string | null;
  actionType?: GymCustomerMembershipHistoryActionType;
  customAmount?: number | null;
  unusedCredit?: number | null;
  daysCarriedOver?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  paymentStatus?: GymCustomerMembershipHistoryPaymentStatus | null;
  transactionId?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  createdBy: string;
  is_Active?: boolean;
}

export interface FetchGymCustomerMembershipHistoriesPaginatedParams {
  gymId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
  searchQuery?: string;
  sortOrder?: 'newest' | 'oldest';
  actionType?: GymCustomerMembershipHistoryActionType;
  paymentStatus?: GymCustomerMembershipHistoryPaymentStatus;
}

function toDateOnly(dateVal?: string | null): string | null {
  if (!dateVal) return null;
  if (dateVal.includes('T')) {
    return dateVal.split('T')[0];
  }
  return dateVal;
}

/**
 * Fetch list of gym customer membership history records with joined plan and customer data.
 */
export async function fetchGymCustomerMembershipHistories(
  gymId?: string,
  customerId?: string
): Promise<GymCustomerMembershipHistoryAttributes[]> {
  try {
    let query = supabase
      .from('gym_customer_membership_histories')
      .select(`
        *,
        plan:gym_membership_plans!planId(planName, durationMonths, price),
        previousPlan:gym_membership_plans!previousPlanId(planName, durationMonths, price),
        customer:gym_customers!customerId(fullName, email, phone, users!gym_customers_userId_fkey(profilePhoto)),
        creator:gym_owners!createdBy(name, email)
      `)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false });

    if (gymId) {
      query = query.eq('gymId', gymId);
    }

    if (customerId) {
      query = query.eq('customerId', customerId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[gymCustomerMembershipHistories] fetch Error:', error.message);
      return [];
    }

    return (data as GymCustomerMembershipHistoryAttributes[]) || [];
  } catch (err) {
    console.error('[gymCustomerMembershipHistories] fetch Exception:', err);
    return [];
  }
}

/**
 * Fetch a single membership history record by ID.
 */
export async function fetchGymCustomerMembershipHistoryById(
  id: string
): Promise<GymCustomerMembershipHistoryAttributes | null> {
  try {
    const { data, error } = await supabase
      .from('gym_customer_membership_histories')
      .select(`
        *,
        plan:gym_membership_plans!planId(planName, durationMonths, price),
        previousPlan:gym_membership_plans!previousPlanId(planName, durationMonths, price),
        customer:gym_customers!customerId(fullName, email, phone, users!gym_customers_userId_fkey(profilePhoto)),
        creator:gym_owners!createdBy(name, email)
      `)
      .eq('customerMembershipHistoryId', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      console.warn('[gymCustomerMembershipHistories] fetchById Error:', error.message);
      return null;
    }

    return data as GymCustomerMembershipHistoryAttributes | null;
  } catch (err) {
    console.error('[gymCustomerMembershipHistories] fetchById Exception:', err);
    return null;
  }
}

/**
 * Fetch paginated membership history records.
 */
export async function fetchGymCustomerMembershipHistoriesPaginated({
  gymId,
  customerId,
  page = 1,
  limit = 10,
  searchQuery,
  sortOrder = 'newest',
  actionType,
  paymentStatus,
}: FetchGymCustomerMembershipHistoriesPaginatedParams) {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('gym_customer_membership_histories')
      .select(
        `
        *,
        plan:gym_membership_plans!planId(planName, durationMonths, price),
        previousPlan:gym_membership_plans!previousPlanId(planName, durationMonths, price),
        customer:gym_customers!customerId(fullName, email, phone, users!gym_customers_userId_fkey(profilePhoto))
      `,
        { count: 'exact' }
      )
      .eq('is_deleted', false)
      .order('createdAt', { ascending: sortOrder === 'oldest' });

    if (gymId) {
      query = query.eq('gymId', gymId);
    }

    if (customerId) {
      query = query.eq('customerId', customerId);
    }

    if (actionType) {
      query = query.eq('actionType', actionType);
    }

    if (paymentStatus) {
      query = query.eq('paymentStatus', paymentStatus);
    }

    if (searchQuery) {
      query = query.ilike('customer.fullName', `%${searchQuery}%`);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error('[gymCustomerMembershipHistories] fetchPaginated Error:', error);
      throw error;
    }

    return {
      data: (data as GymCustomerMembershipHistoryAttributes[]) || [],
      total: count ?? 0,
    };
  } catch (err) {
    console.error('[gymCustomerMembershipHistories] fetchPaginated Exception:', err);
    return { data: [], total: 0 };
  }
}

/**
 * Create or save a gym customer membership history entry.
 */
export async function saveGymCustomerMembershipHistory(
  historyData: SaveGymCustomerMembershipHistoryParams
): Promise<GymCustomerMembershipHistoryAttributes | null> {
  try {
    const historyId =
      historyData.customerMembershipHistoryId ||
      historyData.historyId ||
      Crypto.randomUUID();

    const payload = {
      customerMembershipHistoryId: historyId,
      GymCustomerMembershipPlanId: historyData.GymCustomerMembershipPlanId || null,
      customerId: historyData.customerId,
      gymId: historyData.gymId,
      planId: historyData.planId,
      previousPlanId: historyData.previousPlanId || null,
      actionType: historyData.actionType || 'UPGRADED',
      customAmount: historyData.customAmount ?? 0,
      unusedCredit: historyData.unusedCredit ?? 0,
      daysCarriedOver: historyData.daysCarriedOver ?? 0,
      startDate: toDateOnly(historyData.startDate),
      endDate: toDateOnly(historyData.endDate),
      paymentStatus: historyData.paymentStatus || 'pending',
      transactionId: historyData.transactionId || null,
      paymentMethod: historyData.paymentMethod || null,
      notes: historyData.notes || null,
      createdBy: historyData.createdBy,
      is_Active: historyData.is_Active !== undefined ? historyData.is_Active : true,
      is_deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('gym_customer_membership_histories')
      .insert([payload])
      .select();

    if (error) {
      console.warn('[gymCustomerMembershipHistories] insert Notice:', error.message);
      return null;
    }

    return data ? (data[0] as GymCustomerMembershipHistoryAttributes) : null;
  } catch (err) {
    console.error('[gymCustomerMembershipHistories] save Exception:', err);
    return null;
  }
}

/**
 * Alias for saveGymCustomerMembershipHistory for seamless backwards compatibility.
 */
export const logGymCustomerMembershipHistory = saveGymCustomerMembershipHistory;

/**
 * Update an existing gym customer membership history record.
 */
export async function updateGymCustomerMembershipHistory(
  id: string,
  updates: Partial<SaveGymCustomerMembershipHistoryParams>
): Promise<GymCustomerMembershipHistoryAttributes | null> {
  try {
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.startDate !== undefined) {
      payload.startDate = toDateOnly(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      payload.endDate = toDateOnly(updates.endDate);
    }
    delete payload.customerMembershipHistoryId;
    delete payload.historyId;

    const { data, error } = await supabase
      .from('gym_customer_membership_histories')
      .update(payload)
      .eq('customerMembershipHistoryId', id)
      .select();

    if (error) {
      console.warn('[gymCustomerMembershipHistories] update Error:', error.message);
      return null;
    }

    return data ? (data[0] as GymCustomerMembershipHistoryAttributes) : null;
  } catch (err) {
    console.error('[gymCustomerMembershipHistories] update Exception:', err);
    return null;
  }
}

/**
 * Soft delete a membership history entry.
 */
export async function deleteGymCustomerMembershipHistory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('gym_customer_membership_histories')
      .update({
        is_deleted: true,
        deletedAt: new Date().toISOString(),
      })
      .eq('customerMembershipHistoryId', id);

    if (error) {
      console.warn('[gymCustomerMembershipHistories] delete Error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[gymCustomerMembershipHistories] delete Exception:', err);
    return false;
  }
}
