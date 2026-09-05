import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface TrainerWorkoutPlanAttributes {
  planId?: string;
  userId: string;
  isActive?: boolean;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveTrainerWorkoutPlanParams {
  planId?: string;
  userId: string;
  isActive?: boolean;
  createdBy: string;
}

export async function fetchTrainerWorkoutPlans(userId?: string) {
  let query = supabase
    .from('trainer_workout_plans')
    .select('*')
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (userId) {
    query = query.eq('userId', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[trainerWorkoutPlansHelper] fetchTrainerWorkoutPlans Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchTrainerWorkoutPlanById(planId: string) {
  const { data, error } = await supabase
    .from('trainer_workout_plans')
    .select('*')
    .eq('planId', planId)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[trainerWorkoutPlansHelper] fetchTrainerWorkoutPlanById Error:', error);
    throw error;
  }

  return data;
}

export async function saveTrainerWorkoutPlan(planData: SaveTrainerWorkoutPlanParams) {
  const now = new Date().toISOString();

  if (planData.planId) {
    const { data, error } = await supabase
      .from('trainer_workout_plans')
      .update({
        userId: planData.userId,
        isActive: planData.isActive ?? true,
        createdBy: planData.createdBy,
        updatedAt: now,
      })
      .eq('planId', planData.planId)
      .select();

    if (error) {
      console.error('[trainerWorkoutPlansHelper] saveTrainerWorkoutPlan Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedPlanId = planData.planId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('trainer_workout_plans')
      .insert([
        {
          planId: generatedPlanId,
          userId: planData.userId,
          isActive: planData.isActive ?? true,
          createdBy: planData.createdBy,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[trainerWorkoutPlansHelper] saveTrainerWorkoutPlan Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteTrainerWorkoutPlan(planId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('trainer_workout_plans')
    .update({
      isActive: false,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('planId', planId)
    .select();

  if (error) {
    console.error('[trainerWorkoutPlansHelper] deleteTrainerWorkoutPlan Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function deactivateTrainerWorkoutPlans(userId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('trainer_workout_plans')
    .update({
      isActive: false,
      updatedAt: now,
    })
    .eq('userId', userId)
    .eq('isActive', true)
    .select();

  if (error) {
    console.error('[trainerWorkoutPlansHelper] deactivateTrainerWorkoutPlans Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function toggleTrainerWorkoutPlanActiveStatus(planId: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('trainer_workout_plans')
    .update({
      isActive: !currentStatus,
      updatedAt: now,
    })
    .eq('planId', planId)
    .select();

  if (error) {
    console.error('[trainerWorkoutPlansHelper] toggleTrainerWorkoutPlanActiveStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function fetchWorkoutPlansForTrainer(trainerUserId: string) {
  const { data: plans, error: plansError } = await supabase
    .from('trainer_workout_plans')
    .select(`
      *,
      days:trainer_workout_plan_days(dayOfWeek, workoutType, durationMinutes)
    `)
    .eq('createdBy', trainerUserId)
    .eq('isActive', true)
    .is('deletedAt', null)
    .order('updatedAt', { ascending: false });

  if (plansError) {
    console.error('[trainerWorkoutPlansHelper] fetchWorkoutPlansForTrainer Error:', plansError);
    throw plansError;
  }

  if (!plans || plans.length === 0) return [];

  const userIds = plans.map((p: any) => p.userId);

  const { data: customers, error: customersError } = await supabase
    .from('gym_customers')
    .select('*, users(profilePhoto)')
    .in('customerId', userIds);

  if (customersError) {
    console.error('[trainerWorkoutPlansHelper] fetchWorkoutPlansForTrainer (Customers) Error:', customersError);
    throw customersError;
  }

  return plans.map((plan: any) => {
    const customer = customers?.find((c: any) => c.customerId === plan.userId);
    return {
      ...plan,
      customer
    };
  });
}
