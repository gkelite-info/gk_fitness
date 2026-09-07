import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { calculateNutritionTargets } from '@/lib/nutritionCalculator';

export interface CustomerMealPlanAttributes {
  customerMealPlanId?: string;
  userId: string;
  isActive?: boolean;
  dietType: string;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SaveCustomerMealPlanParams {
  customerMealPlanId?: string;
  userId: string;
  isActive?: boolean;
  dietType: string;
}

export async function fetchCustomerMealPlans(userId?: string) {
  let query = supabase
    .from('customer_meal_plans')
    .select('*')
    .order('createdAt', { ascending: false });

  if (userId) {
    query = query.eq('userId', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[customerMealPlansHelper] fetchCustomerMealPlans Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchCustomerMealPlanById(customerMealPlanId: string) {
  const { data, error } = await supabase
    .from('customer_meal_plans')
    .select('*')
    .eq('customerMealPlanId', customerMealPlanId)
    .maybeSingle();

  if (error) {
    console.error('[customerMealPlansHelper] fetchCustomerMealPlanById Error:', error);
    throw error;
  }

  return data;
}

export async function saveCustomerMealPlan(planData: SaveCustomerMealPlanParams) {
  const now = new Date().toISOString();
  
  // Calculate intelligent nutrition targets
  const targets = await calculateNutritionTargets(planData.userId);

  if (planData.customerMealPlanId) {
    const { data, error } = await supabase
      .from('customer_meal_plans')
      .update({
        userId: planData.userId,
        isActive: planData.isActive ?? true,
        dietType: planData.dietType,
        targetCalories: targets.targetCalories,
        targetProtein: targets.targetProtein,
        targetCarbs: targets.targetCarbs,
        targetFat: targets.targetFat,
        updatedAt: now,
      })
      .eq('customerMealPlanId', planData.customerMealPlanId)
      .select();

    if (error) {
      console.error('[customerMealPlansHelper] saveCustomerMealPlan Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedPlanId = planData.customerMealPlanId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('customer_meal_plans')
      .insert([
        {
          customerMealPlanId: generatedPlanId,
          userId: planData.userId,
          isActive: planData.isActive ?? true,
          dietType: planData.dietType,
          targetCalories: targets.targetCalories,
          targetProtein: targets.targetProtein,
          targetCarbs: targets.targetCarbs,
          targetFat: targets.targetFat,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[customerMealPlansHelper] saveCustomerMealPlan Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteCustomerMealPlan(customerMealPlanId: string) {
  // Hard delete since there's no deletedAt column in the new schema
  const { data, error } = await supabase
    .from('customer_meal_plans')
    .delete()
    .eq('customerMealPlanId', customerMealPlanId)
    .select();

  if (error) {
    console.error('[customerMealPlansHelper] deleteCustomerMealPlan Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
