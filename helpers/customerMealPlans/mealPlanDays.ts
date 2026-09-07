import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface MealPlanDayAttributes {
  customerMealPlanDayId?: string;
  customerMealPlanId: string;
  dayOfWeek: string;
  totalCalories?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export async function fetchMealPlanDays(customerMealPlanId: string) {
  const { data, error } = await supabase
    .from('customer_meal_plan_days')
    .select('*')
    .eq('customerMealPlanId', customerMealPlanId)
    .order('dayOfWeek', { ascending: true }); // Depending on enum ordering, might need client-side sort

  if (error) {
    console.error('[mealPlanDaysHelper] fetchMealPlanDays Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function saveMealPlanDay(dayData: Partial<MealPlanDayAttributes>) {
  const now = new Date().toISOString();

  if (dayData.customerMealPlanDayId) {
    const { data, error } = await supabase
      .from('customer_meal_plan_days')
      .update({
        dayOfWeek: dayData.dayOfWeek,
        totalCalories: dayData.totalCalories,
        updatedAt: now,
      })
      .eq('customerMealPlanDayId', dayData.customerMealPlanDayId)
      .select();

    if (error) {
      console.error('[mealPlanDaysHelper] saveMealPlanDay Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedPlanDayId = dayData.customerMealPlanDayId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('customer_meal_plan_days')
      .insert([
        {
          customerMealPlanDayId: generatedPlanDayId,
          customerMealPlanId: dayData.customerMealPlanId,
          dayOfWeek: dayData.dayOfWeek,
          totalCalories: dayData.totalCalories,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[mealPlanDaysHelper] saveMealPlanDay Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}
