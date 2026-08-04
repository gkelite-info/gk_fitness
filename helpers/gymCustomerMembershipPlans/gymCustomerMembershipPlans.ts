import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymCustomerMembershipPlanAttributes {
  GymCustomerMembershipPlanId?: string;
  customerId: string;
  gymId: string;
  planId: string;
  customAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  createdBy: string;
  is_Active?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymCustomerMembershipPlanParams {
  GymCustomerMembershipPlanId?: string;
  customerId: string;
  gymId: string;
  planId: string;
  customAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  createdBy: string;
  is_Active?: boolean;
}

export async function fetchGymCustomerMembershipPlans(gymId?: string, customerId?: string) {
  let query = supabase
    .from('gym_customer_membership_plans')
    .select('*')
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
    console.error('[gymCustomerMembershipPlansHelper] fetchGymCustomerMembershipPlans Error:', error);
    throw error;
  }

  return data ?? [];
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

  let isUpdate = false;
  if (planData.GymCustomerMembershipPlanId) {
    const { data } = await supabase
      .from('gym_customer_membership_plans')
      .select('GymCustomerMembershipPlanId')
      .eq('GymCustomerMembershipPlanId', planData.GymCustomerMembershipPlanId)
      .eq('is_deleted', false)
      .maybeSingle();
      
    if (data) {
      isUpdate = true;
    }
  }

  if (isUpdate && planData.GymCustomerMembershipPlanId) {
    const { data, error } = await supabase
      .from('gym_customer_membership_plans')
      .update({
        customerId: planData.customerId,
        gymId: planData.gymId,
        planId: planData.planId,
        customAmount: planData.customAmount || 0,
        startDate: planData.startDate || null,
        endDate: planData.endDate || null,
        is_Active: planData.is_Active ?? true,
        updatedAt: now,
      })
      .eq('GymCustomerMembershipPlanId', planData.GymCustomerMembershipPlanId)
      .eq('createdBy', planData.createdBy)
      .select();

    if (error) {
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = planData.GymCustomerMembershipPlanId || Crypto.randomUUID();
    const insertPayload = {
      GymCustomerMembershipPlanId: generatedId,
      customerId: planData.customerId,
      gymId: planData.gymId,
      planId: planData.planId,
      customAmount: planData.customAmount || 0,
      startDate: planData.startDate || null,
      endDate: planData.endDate || null,
      createdBy: planData.createdBy,
      is_Active: planData.is_Active ?? true,
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
