import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymMembershipPlanAttributes {
  planId?: string;
  gymId: string;
  planName: string;
  durationMonths: string;
  price: number;
  createdBy: string;
  is_Active?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymMembershipPlanParams {
  planId?: string;
  gymId: string;
  planName: string;
  durationMonths: string;
  price: number;
  createdBy: string;
  is_Active?: boolean;
}

export async function fetchGymMembershipPlans(gymId?: string) {
  let query = supabase
    .from('gym_membership_plans')
    .select('*')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[gymMembershipHelper] fetchGymMembershipPlans Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchGymMembershipPlanById(planId: string) {
  const { data, error } = await supabase
    .from('gym_membership_plans')
    .select('*')
    .eq('planId', planId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[gymMembershipHelper] fetchGymMembershipPlanById Error:', error);
    throw error;
  }

  return data;
}

export async function saveGymMembershipPlan(planData: SaveGymMembershipPlanParams) {
  const now = new Date().toISOString();

  let isUpdate = false;
  if (planData.planId) {
    const { data } = await supabase
      .from('gym_membership_plans')
      .select('planId')
      .eq('planId', planData.planId)
      .eq('is_deleted', false)
      .maybeSingle();
      
    if (data) {
      isUpdate = true;
    }
  }

  if (isUpdate && planData.planId) {
    const { data, error } = await supabase
      .from('gym_membership_plans')
      .update({
        gymId: planData.gymId,
        planName: planData.planName,
        durationMonths: planData.durationMonths,
        price: planData.price,
        is_Active: planData.is_Active ?? true,
        updatedAt: now,
      })
      .eq('planId', planData.planId)
      .eq('createdBy', planData.createdBy)
      .select();

    if (error) {
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedPlanId = planData.planId || Crypto.randomUUID();
    const insertPayload = {
      planId: generatedPlanId,
      gymId: planData.gymId,
      planName: planData.planName,
      durationMonths: planData.durationMonths,
      price: planData.price,
      createdBy: planData.createdBy,
      is_Active: planData.is_Active ?? true,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const { data, error } = await supabase
      .from('gym_membership_plans')
      .insert([insertPayload])
      .select();

    if (error) {
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGymMembershipPlan(planId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_membership_plans')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('planId', planId)
    .select();

  if (error) {
    throw error;
  }

  return data ? data[0] : null;
}

export async function toggleGymMembershipPlanActiveStatus(planId: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_membership_plans')
    .update({
      is_Active: !currentStatus,
      updatedAt: now,
    })
    .eq('planId', planId)
    .select();

  if (error) {
    throw error;
  }

  return data ? data[0] : null;
}
