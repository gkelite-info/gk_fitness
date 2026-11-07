import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface IndividualTrainerWorkoutPlanAttributes {
  planId?: string;
  userId: string;
  isActive?: boolean;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
  user?: any;
  trainer?: any;
  days?: any[];
}

export interface SaveIndividualTrainerWorkoutPlanParams {
  planId?: string;
  userId: string;
  isActive?: boolean;
  createdBy: string;
}

export interface FetchIndividualTrainerWorkoutPlansFilter {
  userId?: string;
  createdBy?: string;
  isActive?: boolean;
}

export interface FetchIndividualTrainerWorkoutPlansPaginatedParams {
  page?: number;
  limit?: number;
  userId?: string;
  createdBy?: string;
  isActive?: boolean;
  searchQuery?: string;
  sortOrder?: 'newest' | 'oldest';
}

export async function fetchIndividualTrainerWorkoutPlans(
  userId?: string,
  createdBy?: string,
  isActive?: boolean
) {
  try {
    let query = supabase
      .from('individual_trainer_workout_plans')
      .select(`
        *,
        user:users!individual_trainer_workout_plans_userId_fkey(userId, name, email, phone, profilePhoto),
        days:individual_trainer_workout_plan_days(planDayId, dayOfWeek, workoutType, durationMinutes, workoutId)
      `)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (userId) {
      query = query.eq('userId', userId);
    }
    if (createdBy) {
      query = query.eq('createdBy', createdBy);
    }
    if (isActive !== undefined) {
      query = query.eq('isActive', isActive);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback query without complex foreign key aliases if schema cache mismatch occurs
      let fallbackQuery = supabase
        .from('individual_trainer_workout_plans')
        .select('*')
        .is('deletedAt', null)
        .order('createdAt', { ascending: false });

      if (userId) fallbackQuery = fallbackQuery.eq('userId', userId);
      if (createdBy) fallbackQuery = fallbackQuery.eq('createdBy', createdBy);
      if (isActive !== undefined) fallbackQuery = fallbackQuery.eq('isActive', isActive);

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        console.error('[IndividualTrainerWorkoutPlan] fetch Error:', fallbackError);
        throw fallbackError;
      }
      return fallbackData ?? [];
    }

    return data ?? [];
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlan] fetch Exception:', err);
    throw err;
  }
}

export async function fetchIndividualTrainerWorkoutPlanById(planId: string) {
  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plans')
      .select(`
        *,
        user:users!individual_trainer_workout_plans_userId_fkey(userId, name, email, phone, profilePhoto),
        days:individual_trainer_workout_plan_days(
          planDayId,
          dayOfWeek,
          workoutType,
          durationMinutes,
          workoutId,
          exercises:individual_trainer_workout_plan_day_exercises(*)
        )
      `)
      .eq('planId', planId)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('individual_trainer_workout_plans')
        .select('*')
        .eq('planId', planId)
        .is('deletedAt', null)
        .maybeSingle();

      if (fallbackError) {
        console.error('[IndividualTrainerWorkoutPlan] fetchById Error:', fallbackError);
        throw fallbackError;
      }
      return fallbackData;
    }

    return data;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlan] fetchById Exception:', err);
    throw err;
  }
}

export async function fetchActiveIndividualTrainerWorkoutPlan(userId: string) {
  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plans')
      .select(`
        *,
        days:individual_trainer_workout_plan_days(
          planDayId,
          dayOfWeek,
          workoutType,
          durationMinutes,
          workoutId,
          exercises:individual_trainer_workout_plan_day_exercises(*)
        )
      `)
      .eq('userId', userId)
      .eq('isActive', true)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('individual_trainer_workout_plans')
        .select('*')
        .eq('userId', userId)
        .eq('isActive', true)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError) {
        console.error('[IndividualTrainerWorkoutPlan] fetchActive Error:', fallbackError);
        throw fallbackError;
      }
      return fallbackData;
    }

    return data;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlan] fetchActive Exception:', err);
    throw err;
  }
}

export async function saveIndividualTrainerWorkoutPlan(planData: SaveIndividualTrainerWorkoutPlanParams) {
  const now = new Date().toISOString();

  try {
    if (planData.isActive) {
      // Deactivate other active plans for this customer
      await supabase
        .from('individual_trainer_workout_plans')
        .update({
          isActive: false,
          updatedAt: now,
        })
        .eq('userId', planData.userId)
        .eq('isActive', true);
    }

    if (planData.planId) {
      const { data, error } = await supabase
        .from('individual_trainer_workout_plans')
        .update({
          userId: planData.userId,
          isActive: planData.isActive ?? true,
          createdBy: planData.createdBy,
          updatedAt: now,
        })
        .eq('planId', planData.planId)
        .select();

      if (error) {
        console.error('[IndividualTrainerWorkoutPlan] Update Error:', error);
        throw error;
      }

      return data ? data[0] : null;
    } else {
      const generatedPlanId = Crypto.randomUUID();
      const { data, error } = await supabase
        .from('individual_trainer_workout_plans')
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
        console.error('[IndividualTrainerWorkoutPlan] Insert Error:', error);
        throw error;
      }

      return data ? data[0] : null;
    }
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlan] save Exception:', err);
    throw err;
  }
}

export async function deleteIndividualTrainerWorkoutPlan(planId: string) {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plans')
      .update({
        isActive: false,
        deletedAt: now,
        updatedAt: now,
      })
      .eq('planId', planId)
      .select();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlan] Delete Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlan] delete Exception:', err);
    throw err;
  }
}

export async function deactivateIndividualTrainerWorkoutPlans(userId: string) {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plans')
      .update({
        isActive: false,
        updatedAt: now,
      })
      .eq('userId', userId)
      .eq('isActive', true)
      .select();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlan] Deactivate Error:', error);
      throw error;
    }

    return data ?? [];
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlan] deactivate Exception:', err);
    throw err;
  }
}

export async function toggleIndividualTrainerWorkoutPlanActiveStatus(
  planId: string,
  currentStatus: boolean
) {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('individual_trainer_workout_plans')
      .update({
        isActive: !currentStatus,
        updatedAt: now,
      })
      .eq('planId', planId)
      .select();

    if (error) {
      console.error('[IndividualTrainerWorkoutPlan] Toggle Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlan] toggle Exception:', err);
    throw err;
  }
}

export async function fetchIndividualTrainerWorkoutPlansPaginated({
  page = 1,
  limit = 10,
  userId,
  createdBy,
  isActive,
  sortOrder = 'newest',
}: FetchIndividualTrainerWorkoutPlansPaginatedParams) {
  try {
    const offset = (page - 1) * limit;

    let query = supabase
      .from('individual_trainer_workout_plans')
      .select('*, user:users!individual_trainer_workout_plans_userId_fkey(userId, name, email, phone, profilePhoto)', { count: 'exact' })
      .is('deletedAt', null)
      .order('createdAt', { ascending: sortOrder === 'oldest' })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('userId', userId);
    }
    if (createdBy) {
      query = query.eq('createdBy', createdBy);
    }
    if (isActive !== undefined) {
      query = query.eq('isActive', isActive);
    }

    const { data, count, error } = await query;

    if (error) {
      let fallbackQuery = supabase
        .from('individual_trainer_workout_plans')
        .select('*', { count: 'exact' })
        .is('deletedAt', null)
        .order('createdAt', { ascending: sortOrder === 'oldest' })
        .range(offset, offset + limit - 1);

      if (userId) fallbackQuery = fallbackQuery.eq('userId', userId);
      if (createdBy) fallbackQuery = fallbackQuery.eq('createdBy', createdBy);
      if (isActive !== undefined) fallbackQuery = fallbackQuery.eq('isActive', isActive);

      const { data: fallbackData, count: fallbackCount, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        console.error('[IndividualTrainerWorkoutPlan] paginated Error:', fallbackError);
        throw fallbackError;
      }

      return {
        data: fallbackData ?? [],
        total: fallbackCount ?? 0,
      };
    }

    return {
      data: data ?? [],
      total: count ?? 0,
    };
  } catch (err) {
    console.error('[IndividualTrainerWorkoutPlan] paginated Exception:', err);
    throw err;
  }
}

