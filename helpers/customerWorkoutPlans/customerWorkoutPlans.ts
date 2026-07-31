import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface CustomerWorkoutPlanAttributes {
  planId?: string;
  userId: string;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveCustomerWorkoutPlanParams {
  planId?: string;
  userId: string;
  isActive?: boolean;
}

export async function fetchCustomerWorkoutPlans(userId?: string) {
  let query = supabase
    .from('customer_workout_plans')
    .select('*')
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (userId) {
    query = query.eq('userId', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[customerWorkoutPlansHelper] fetchCustomerWorkoutPlans Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchCustomerWorkoutPlanById(planId: string) {
  const { data, error } = await supabase
    .from('customer_workout_plans')
    .select('*')
    .eq('planId', planId)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[customerWorkoutPlansHelper] fetchCustomerWorkoutPlanById Error:', error);
    throw error;
  }

  return data;
}

export async function saveCustomerWorkoutPlan(planData: SaveCustomerWorkoutPlanParams) {
  const now = new Date().toISOString();

  if (planData.planId) {
    const { data, error } = await supabase
      .from('customer_workout_plans')
      .update({
        userId: planData.userId,
        isActive: planData.isActive ?? true,
        updatedAt: now,
      })
      .eq('planId', planData.planId)
      .select();

    if (error) {
      console.error('[customerWorkoutPlansHelper] saveCustomerWorkoutPlan Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedPlanId = planData.planId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('customer_workout_plans')
      .insert([
        {
          planId: generatedPlanId,
          userId: planData.userId,
          isActive: planData.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[customerWorkoutPlansHelper] saveCustomerWorkoutPlan Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteCustomerWorkoutPlan(planId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('customer_workout_plans')
    .update({
      isActive: false,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('planId', planId)
    .select();

  if (error) {
    console.error('[customerWorkoutPlansHelper] deleteCustomerWorkoutPlan Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function deactivateCustomerWorkoutPlans(userId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('customer_workout_plans')
    .update({
      isActive: false,
      updatedAt: now,
    })
    .eq('userId', userId)
    .eq('isActive', true)
    .select();

  if (error) {
    console.error('[customerWorkoutPlansHelper] deactivateCustomerWorkoutPlans Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function toggleCustomerWorkoutPlanActiveStatus(planId: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('customer_workout_plans')
    .update({
      isActive: !currentStatus,
      updatedAt: now,
    })
    .eq('planId', planId)
    .select();

  if (error) {
    console.error('[customerWorkoutPlansHelper] toggleCustomerWorkoutPlanActiveStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
