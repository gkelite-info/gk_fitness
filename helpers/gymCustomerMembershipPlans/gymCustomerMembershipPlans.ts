import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymCustomerMembershipPlanAttributes {
  GymCustomerMembershipPlanId?: string;
  customerId: string;
  gymId: string;
  planId: string;
  pendingPlanId?: string | null;
  pendingAmount?: number | null;
  customAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
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
  gym_membership_plans?: {
    planName: string;
    durationMonths: string | number;
    price: number;
  };
  pendingPlan?: {
    planName: string;
    durationMonths: string | number;
    price: number;
  } | null;
  gym_customers?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    gymId?: string;
    is_Active?: boolean;
    users?: {
      profilePhoto?: string | null;
    };
  };
}

export interface SaveGymCustomerMembershipPlanParams {
  GymCustomerMembershipPlanId?: string;
  customerId: string;
  gymId: string;
  planId: string;
  pendingPlanId?: string | null;
  pendingAmount?: number | null;
  customAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  createdBy: string;
  is_Active?: boolean;
}

export async function fetchGymCustomerMembershipPlans(gymId?: string, customerId?: string) {
  try {
    let query = supabase
      .from('gym_customer_membership_plans')
      .select('*, plan:gym_membership_plans!gym_customer_membership_plans_planId_fkey(planName, durationMonths, price), pendingPlan:gym_membership_plans!gym_customer_membership_plans_pendingPlanId_fkey(planName, durationMonths, price), gym_customers(fullName, email, phone, gymId, is_Active, users!gym_customers_userId_fkey(profilePhoto, status, createdAt))')
      .eq('is_deleted', false)
      .order('createdAt', { ascending: false });

    if (customerId) {
      query = query.eq('customerId', customerId);
    } else if (gymId) {
      query = query.eq('gymId', gymId);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[gymCustomerMembershipPlansHelper] fetchGymCustomerMembershipPlans Error, trying fallback query:', error.message);
      let fallbackQuery = supabase
        .from('gym_customer_membership_plans')
        .select('*, plan:gym_membership_plans!gym_customer_membership_plans_planId_fkey(*), pendingPlan:gym_membership_plans!gym_customer_membership_plans_pendingPlanId_fkey(*)')
        .eq('is_deleted', false)
        .order('createdAt', { ascending: false });

      if (customerId) {
        fallbackQuery = fallbackQuery.eq('customerId', customerId);
      } else if (gymId) {
        fallbackQuery = fallbackQuery.eq('gymId', gymId);
      }

      const { data: fallbackData } = await fallbackQuery;
      return fallbackData ?? [];
    }

    return (data ?? []).map((item: any) => ({
      ...item,
      plan: item.plan || item.gym_membership_plans,
      gym_membership_plans: item.gym_membership_plans || item.plan,
    }));
  } catch (err) {
    console.error('[gymCustomerMembershipPlansHelper] fetchGymCustomerMembershipPlans Exception:', err);
    return [];
  }
}

export async function fetchGymCustomerMembershipPlanById(id: string) {
  const { data, error } = await supabase
    .from('gym_customer_membership_plans')
    .select('*')
    .eq('GymCustomerMembershipPlanId', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[gymCustomerMembershipPlansHelper] fetchGymCustomerMembershipPlanById Error:', error);
    throw error;
  }

  return data;
}

export async function saveGymCustomerMembershipPlan(planData: SaveGymCustomerMembershipPlanParams) {
  const now = new Date().toISOString();

  let targetPlanId = planData.GymCustomerMembershipPlanId;
  let isUpdate = false;
  let existingPlan = null;

  if (targetPlanId) {
    const { data } = await supabase
      .from('gym_customer_membership_plans')
      .select('*')
      .eq('GymCustomerMembershipPlanId', targetPlanId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (data) {
      isUpdate = true;
      existingPlan = data;
    }
  }

  if (!isUpdate && planData.customerId) {
    let query = supabase
      .from('gym_customer_membership_plans')
      .select('*')
      .eq('customerId', planData.customerId)
      .eq('is_deleted', false);
    if (planData.gymId) {
      query = query.eq('gymId', planData.gymId);
    }
    const { data } = await query.order('createdAt', { ascending: false }).limit(1).maybeSingle();

    if (data) {
      targetPlanId = data.GymCustomerMembershipPlanId;
      isUpdate = true;
      existingPlan = data;
    }
  }

  if (isUpdate && targetPlanId) {
    const updatePayload: Record<string, any> = {
      planId: planData.planId,
      updatedAt: now,
    };

    if (planData.customerId) updatePayload.customerId = planData.customerId;
    if (planData.gymId) updatePayload.gymId = planData.gymId;
    if (planData.pendingPlanId !== undefined) {
      updatePayload.pendingPlanId = planData.pendingPlanId;
    }
    if (planData.pendingAmount !== undefined) {
      updatePayload.pendingAmount = planData.pendingAmount;
    }
    if (planData.customAmount !== undefined) {
      updatePayload.customAmount = planData.customAmount;
    }
    if (planData.startDate !== undefined) {
      updatePayload.startDate = planData.startDate;
    }
    if (planData.endDate !== undefined) {
      updatePayload.endDate = planData.endDate;
    }
    if (planData.is_Active !== undefined) {
      updatePayload.is_Active = planData.is_Active;
    }

    const { data, error } = await supabase
      .from('gym_customer_membership_plans')
      .update(updatePayload)
      .eq('GymCustomerMembershipPlanId', targetPlanId)
      .select();

    if (error) {
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = targetPlanId || Crypto.randomUUID();
    const insertPayload = {
      GymCustomerMembershipPlanId: generatedId,
      customerId: planData.customerId,
      gymId: planData.gymId,
      planId: planData.planId,
      pendingPlanId: planData.pendingPlanId !== undefined ? planData.pendingPlanId : null,
      pendingAmount: planData.pendingAmount !== undefined ? planData.pendingAmount : null,
      customAmount: planData.customAmount !== undefined ? planData.customAmount : 0,
      startDate: planData.startDate !== undefined ? planData.startDate : null,
      endDate: planData.endDate !== undefined ? planData.endDate : null,
      createdBy: planData.createdBy,
      is_Active: planData.is_Active !== undefined ? planData.is_Active : false,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const { data, error } = await supabase
      .from('gym_customer_membership_plans')
      .insert([insertPayload])
      .select();

    if (error) {
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function setGymCustomerPendingPlan(params: {
  GymCustomerMembershipPlanId: string;
  pendingPlanId: string | null;
  pendingAmount?: number | null;
}) {
  const now = new Date().toISOString();
  const updateObj: Record<string, any> = {
    pendingPlanId: params.pendingPlanId,
    updatedAt: now,
  };
  if (params.pendingAmount !== undefined) {
    updateObj.pendingAmount = params.pendingAmount;
  }
  const { data, error } = await supabase
    .from('gym_customer_membership_plans')
    .update(updateObj)
    .eq('GymCustomerMembershipPlanId', params.GymCustomerMembershipPlanId)
    .select();

  if (error) {
    console.error('[gymCustomerMembershipPlansHelper] setGymCustomerPendingPlan Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function revokeGymCustomerPendingPlan(params: {
  GymCustomerMembershipPlanId: string;
  customerId?: string;
  gymId?: string;
}) {
  const now = new Date().toISOString();

  // 1. Clear pendingPlanId and pendingAmount from gym_customer_membership_plans
  const { data, error } = await supabase
    .from('gym_customer_membership_plans')
    .update({
      pendingPlanId: null,
      pendingAmount: null,
      updatedAt: now,
    })
    .eq('GymCustomerMembershipPlanId', params.GymCustomerMembershipPlanId)
    .select();

  if (error) {
    console.error('[gymCustomerMembershipPlansHelper] revokeGymCustomerPendingPlan Error:', error);
    throw error;
  }

  // 2. Mark any pending membership history records as CANCELLED & soft-deleted
  try {
    let histQuery = supabase
      .from('gym_customer_membership_histories')
      .update({
        actionType: 'CANCELLED',
        is_Active: false,
        is_deleted: true,
        updatedAt: now,
      })
      .eq('GymCustomerMembershipPlanId', params.GymCustomerMembershipPlanId)
      .eq('paymentStatus', 'pending');

    await histQuery;
  } catch (histErr) {
    console.warn('[gymCustomerMembershipPlansHelper] revokeGymCustomerPendingPlan history update notice:', histErr);
  }

  return data ? data[0] : null;
}

export async function deleteGymCustomerMembershipPlan(id: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_customer_membership_plans')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('GymCustomerMembershipPlanId', id)
    .select();

  if (error) {
    throw error;
  }

  return data ? data[0] : null;
}

export async function toggleGymCustomerMembershipPlanActiveStatus(id: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_customer_membership_plans')
    .update({
      is_Active: !currentStatus,
      updatedAt: now,
    })
    .eq('GymCustomerMembershipPlanId', id)
    .select();

  if (error) {
    throw error;
  }

  return data ? data[0] : null;
}

export async function fetchGymCustomerMembershipPlansPaginated(
  gymId: string,
  page: number,
  limit: number,
  searchQuery?: string,
  sortOrder: 'newest' | 'oldest' = 'newest',
  planId?: string
) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('gym_customer_membership_plans')
    .select('*, gym_customers!inner(fullName, email, phone, is_Active, users!inner(profilePhoto, status, createdAt)), plan:gym_membership_plans!gym_customer_membership_plans_planId_fkey(planName, durationMonths, price), pendingPlan:gym_membership_plans!gym_customer_membership_plans_pendingPlanId_fkey(planName, durationMonths, price)', { count: 'exact' })
    .eq('gymId', gymId)
    .eq('is_deleted', false)
    .eq('gym_customers.is_Active', true)
    .eq('gym_customers.users.status', 'active')
    .order('createdAt', { ascending: sortOrder === 'oldest' });

  if (searchQuery) {
    query = query.ilike('gym_customers.fullName', `%${searchQuery}%`);
  }

  if (planId) {
    query = query.eq('planId', planId);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error('[gymCustomerMembershipPlansHelper] fetchGymCustomerMembershipPlansPaginated Error:', error);
    throw error;
  }

  const mappedData = (data ?? []).map((item: any) => ({
    ...item,
    plan: item.plan || item.gym_membership_plans,
    gym_membership_plans: item.gym_membership_plans || item.plan,
  }));

  return {
    data: mappedData,
    total: count ?? 0,
  };
}

// Re-export membership history helpers and types
export {
  GymCustomerMembershipHistoryAttributes,
  SaveGymCustomerMembershipHistoryParams,
  GymCustomerMembershipHistoryActionType,
  GymCustomerMembershipHistoryPaymentStatus,
  logGymCustomerMembershipHistory,
  saveGymCustomerMembershipHistory,
  fetchGymCustomerMembershipHistories,
  fetchGymCustomerMembershipHistoryById,
  fetchGymCustomerMembershipHistoriesPaginated,
  updateGymCustomerMembershipHistory,
  deleteGymCustomerMembershipHistory,
} from './gymCustomerMembershipHistories';
