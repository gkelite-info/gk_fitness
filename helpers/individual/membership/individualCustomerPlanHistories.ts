import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type IndividualCustomerPlanHistoryActionType =
  | 'UPGRADED'
  | 'ASSIGNED'
  | 'RENEWED'
  | 'EXTENDED'
  | 'EXPIRED'
  | 'CANCELLED'
  | string;

export type IndividualCustomerPlanHistoryPaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | string;

export interface IndividualCustomerPlanHistoryAttributes {
  individualCustomerPlanHistoryId: string;
  individualCustomerPlanId?: string | null;
  subscriptionPlanId: string;
  previousSubscriptionPlanId?: string | null;
  userId?: string | null;
  actionType: IndividualCustomerPlanHistoryActionType;
  customAmount?: number | null;
  unusedCredit?: number | null;
  daysCarriedOver?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  paymentStatus?: IndividualCustomerPlanHistoryPaymentStatus | null;
  transactionId?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  isActive?: boolean | null;
  is_deleted?: boolean | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;

  subscription?: {
    subscriptionPlanId: string;
    planName: string;
    label?: string | null;
    price?: number | null;
    planFor?: string | null;
    subscription_features?: Array<{
      subscriptionFeatureId: string;
      featureName: string;
      is_deleted?: boolean;
    }>;
  } | null;

  previousSubscription?: {
    subscriptionPlanId: string;
    planName: string;
    label?: string | null;
    price?: number | null;
    planFor?: string | null;
  } | null;

  user?: {
    userId: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    profilePhoto?: string | null;
    status?: string | null;
    createdAt?: string | null;
  } | null;

  creator?: {
    userId: string;
    name?: string | null;
    email?: string | null;
    profilePhoto?: string | null;
  } | null;

  individual_customer_plan?: {
    individualCustomerPlanId: string;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    isActive?: boolean | null;
    customAmount?: number | null;
  } | null;
}

export interface SaveIndividualCustomerPlanHistoryParams {
  individualCustomerPlanHistoryId?: string;
  historyId?: string;
  individualCustomerPlanId?: string | null;
  subscriptionPlanId: string;
  previousSubscriptionPlanId?: string | null;
  userId?: string | null;
  actionType?: IndividualCustomerPlanHistoryActionType;
  customAmount?: number | null;
  unusedCredit?: number | null;
  daysCarriedOver?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  paymentStatus?: IndividualCustomerPlanHistoryPaymentStatus | null;
  transactionId?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  isActive?: boolean;
  is_deleted?: boolean;
}

export interface FetchIndividualCustomerPlanHistoriesPaginatedParams {
  userId?: string;
  individualCustomerPlanId?: string;
  subscriptionPlanId?: string;
  page?: number;
  limit?: number;
  searchQuery?: string;
  sortOrder?: 'newest' | 'oldest';
  actionType?: IndividualCustomerPlanHistoryActionType;
  paymentStatus?: IndividualCustomerPlanHistoryPaymentStatus;
}

function toISO(val?: string | Date | null): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  try {
    return new Date(val).toISOString();
  } catch {
    return String(val);
  }
}

const BASE_HISTORY_SELECT = `
  *,
  subscription:subscriptions!individual_customer_plan_histories_subscriptionPlanId_fkey (
    subscriptionPlanId,
    planName,
    label,
    price,
    planFor,
    subscription_features (
      subscriptionFeatureId,
      featureName,
      is_deleted
    )
  ),
  previousSubscription:subscriptions!individual_customer_plan_histor_previousSubscriptionPlanId_fkey (
    subscriptionPlanId,
    planName,
    label,
    price,
    planFor
  ),
  user:users!individual_customer_plan_histories_userId_fkey (
    userId,
    name,
    email,
    phone,
    profilePhoto,
    status,
    createdAt
  ),
  creator:users!individual_customer_plan_histories_createdBy_fkey (
    userId,
    name,
    email
  ),
  individual_customer_plan:individual_customer_plans!individual_customer_plan_historie_individualCustomerPlanId_fkey (
    individualCustomerPlanId,
    startDate,
    endDate,
    isActive,
    customAmount
  )
`;

const FALLBACK_HISTORY_SELECT = `
  *,
  subscription:subscriptions!subscriptionPlanId (*),
  previousSubscription:subscriptions!previousSubscriptionPlanId (*),
  user:users!userId (*),
  creator:users!createdBy (*)
`;

/**
 * Fetch list of individual customer plan history records.
 */
export async function fetchIndividualCustomerPlanHistories(
  userId?: string,
  individualCustomerPlanId?: string,
  subscriptionPlanId?: string
): Promise<IndividualCustomerPlanHistoryAttributes[]> {
  try {
    let query = supabase
      .from('individual_customer_plan_histories')
      .select(BASE_HISTORY_SELECT)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false });

    if (userId) {
      query = query.eq('userId', userId);
    }

    if (individualCustomerPlanId) {
      query = query.eq('individualCustomerPlanId', individualCustomerPlanId);
    }

    if (subscriptionPlanId) {
      query = query.eq('subscriptionPlanId', subscriptionPlanId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[individualCustomerPlanHistories] fetch Notice, trying fallback:', error.message);
      let fallbackQuery = supabase
        .from('individual_customer_plan_histories')
        .select(FALLBACK_HISTORY_SELECT)
        .eq('is_deleted', false)
        .order('createdAt', { ascending: false });

      if (userId) fallbackQuery = fallbackQuery.eq('userId', userId);
      if (individualCustomerPlanId) fallbackQuery = fallbackQuery.eq('individualCustomerPlanId', individualCustomerPlanId);
      if (subscriptionPlanId) fallbackQuery = fallbackQuery.eq('subscriptionPlanId', subscriptionPlanId);

      const { data: fallbackData, error: fbErr } = await fallbackQuery;
      if (fbErr) {
        console.warn('[individualCustomerPlanHistories] fallback select failed, returning flat data:', fbErr.message);
        const { data: flatData } = await supabase
          .from('individual_customer_plan_histories')
          .select('*')
          .eq('is_deleted', false)
          .order('createdAt', { ascending: false });
        return (flatData as IndividualCustomerPlanHistoryAttributes[]) || [];
      }
      return (fallbackData as IndividualCustomerPlanHistoryAttributes[]) || [];
    }

    return (data as IndividualCustomerPlanHistoryAttributes[]) || [];
  } catch (err) {
    console.error('[individualCustomerPlanHistories] fetch Exception:', err);
    return [];
  }
}

/**
 * Fetch a single individual customer plan history record by ID.
 */
export async function fetchIndividualCustomerPlanHistoryById(
  id: string
): Promise<IndividualCustomerPlanHistoryAttributes | null> {
  try {
    const { data, error } = await supabase
      .from('individual_customer_plan_histories')
      .select(BASE_HISTORY_SELECT)
      .eq('individualCustomerPlanHistoryId', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      console.warn('[individualCustomerPlanHistories] fetchById Notice, trying fallback:', error.message);
      const { data: fallbackData } = await supabase
        .from('individual_customer_plan_histories')
        .select('*')
        .eq('individualCustomerPlanHistoryId', id)
        .eq('is_deleted', false)
        .maybeSingle();
      return fallbackData as IndividualCustomerPlanHistoryAttributes | null;
    }

    return data as IndividualCustomerPlanHistoryAttributes | null;
  } catch (err) {
    console.error('[individualCustomerPlanHistories] fetchById Exception:', err);
    return null;
  }
}

/**
 * Fetch paginated individual customer plan history records with search and filters.
 */
export async function fetchIndividualCustomerPlanHistoriesPaginated({
  userId,
  individualCustomerPlanId,
  subscriptionPlanId,
  page = 1,
  limit = 10,
  searchQuery,
  sortOrder = 'newest',
  actionType,
  paymentStatus,
}: FetchIndividualCustomerPlanHistoriesPaginatedParams): Promise<{
  data: IndividualCustomerPlanHistoryAttributes[];
  total: number;
}> {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('individual_customer_plan_histories')
      .select(BASE_HISTORY_SELECT, { count: 'exact' })
      .eq('is_deleted', false)
      .order('createdAt', { ascending: sortOrder === 'oldest' });

    if (userId) {
      query = query.eq('userId', userId);
    }

    if (individualCustomerPlanId) {
      query = query.eq('individualCustomerPlanId', individualCustomerPlanId);
    }

    if (subscriptionPlanId) {
      query = query.eq('subscriptionPlanId', subscriptionPlanId);
    }

    if (actionType) {
      query = query.eq('actionType', actionType);
    }

    if (paymentStatus) {
      query = query.eq('paymentStatus', paymentStatus);
    }

    if (searchQuery) {
      query = query.or(`transactionId.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%,paymentMethod.ilike.%${searchQuery}%`);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.warn('[individualCustomerPlanHistories] fetchPaginated Notice, trying fallback:', error.message);
      let fallbackQuery = supabase
        .from('individual_customer_plan_histories')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false)
        .order('createdAt', { ascending: sortOrder === 'oldest' });

      if (userId) fallbackQuery = fallbackQuery.eq('userId', userId);
      if (individualCustomerPlanId) fallbackQuery = fallbackQuery.eq('individualCustomerPlanId', individualCustomerPlanId);
      if (subscriptionPlanId) fallbackQuery = fallbackQuery.eq('subscriptionPlanId', subscriptionPlanId);
      if (actionType) fallbackQuery = fallbackQuery.eq('actionType', actionType);
      if (paymentStatus) fallbackQuery = fallbackQuery.eq('paymentStatus', paymentStatus);

      const { data: fallbackData, count: fallbackCount } = await fallbackQuery.range(from, to);
      return {
        data: (fallbackData as IndividualCustomerPlanHistoryAttributes[]) || [],
        total: fallbackCount ?? 0,
      };
    }

    return {
      data: (data as IndividualCustomerPlanHistoryAttributes[]) || [],
      total: count ?? 0,
    };
  } catch (err) {
    console.error('[individualCustomerPlanHistories] fetchPaginated Exception:', err);
    return { data: [], total: 0 };
  }
}

/**
 * Create or save an individual customer plan history entry.
 */
export async function saveIndividualCustomerPlanHistory(
  historyData: SaveIndividualCustomerPlanHistoryParams
): Promise<IndividualCustomerPlanHistoryAttributes | null> {
  try {
    const historyId =
      historyData.individualCustomerPlanHistoryId ||
      historyData.historyId ||
      Crypto.randomUUID();

    const payload = {
      individualCustomerPlanHistoryId: historyId,
      individualCustomerPlanId: historyData.individualCustomerPlanId || null,
      subscriptionPlanId: historyData.subscriptionPlanId,
      previousSubscriptionPlanId: historyData.previousSubscriptionPlanId || null,
      userId: historyData.userId || null,
      actionType: historyData.actionType || 'UPGRADED',
      customAmount: historyData.customAmount ?? 0,
      unusedCredit: historyData.unusedCredit ?? 0,
      daysCarriedOver: historyData.daysCarriedOver ?? 0,
      startDate: toISO(historyData.startDate),
      endDate: toISO(historyData.endDate),
      paymentStatus: historyData.paymentStatus || 'pending',
      transactionId: historyData.transactionId || null,
      paymentMethod: historyData.paymentMethod || null,
      notes: historyData.notes || null,
      createdBy: historyData.createdBy || null,
      isActive: historyData.isActive !== undefined ? historyData.isActive : true,
      is_deleted: historyData.is_deleted !== undefined ? historyData.is_deleted : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('individual_customer_plan_histories')
      .insert([payload])
      .select();

    if (error) {
      console.warn('[individualCustomerPlanHistories] insert Error:', error.message);
      return null;
    }

    return data ? (data[0] as IndividualCustomerPlanHistoryAttributes) : null;
  } catch (err) {
    console.error('[individualCustomerPlanHistories] save Exception:', err);
    return null;
  }
}

/**
 * Alias for saveIndividualCustomerPlanHistory for seamless logging transitions.
 */
export const logIndividualCustomerPlanHistory = saveIndividualCustomerPlanHistory;

/**
 * Update an existing individual customer plan history record.
 */
export async function updateIndividualCustomerPlanHistory(
  id: string,
  updates: Partial<SaveIndividualCustomerPlanHistoryParams>
): Promise<IndividualCustomerPlanHistoryAttributes | null> {
  try {
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.startDate !== undefined) {
      payload.startDate = toISO(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      payload.endDate = toISO(updates.endDate);
    }
    delete payload.individualCustomerPlanHistoryId;
    delete payload.historyId;

    const { data, error } = await supabase
      .from('individual_customer_plan_histories')
      .update(payload)
      .eq('individualCustomerPlanHistoryId', id)
      .select();

    if (error) {
      console.warn('[individualCustomerPlanHistories] update Error:', error.message);
      return null;
    }

    return data ? (data[0] as IndividualCustomerPlanHistoryAttributes) : null;
  } catch (err) {
    console.error('[individualCustomerPlanHistories] update Exception:', err);
    return null;
  }
}

/**
 * Soft delete an individual customer plan history entry.
 */
export async function deleteIndividualCustomerPlanHistory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('individual_customer_plan_histories')
      .update({
        is_deleted: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('individualCustomerPlanHistoryId', id);

    if (error) {
      console.warn('[individualCustomerPlanHistories] delete Error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[individualCustomerPlanHistories] delete Exception:', err);
    return false;
  }
}

