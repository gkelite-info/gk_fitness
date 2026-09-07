import { useQuery } from '@tanstack/react-query';
import { fetchCustomerMealPlans, CustomerMealPlanAttributes } from '@/helpers/customerMealPlans/customerMealPlans';
import { fetchMealPlanDays, MealPlanDayAttributes } from '@/helpers/customerMealPlans/mealPlanDays';
import { fetchMealPlanDayMeals, MealPlanDayMealAttributes } from '@/helpers/customerMealPlans/mealPlanDayMeals';

export interface FullMealPlanDay extends MealPlanDayAttributes {
  meals: MealPlanDayMealAttributes[];
}

export interface FullCustomerMealPlan extends CustomerMealPlanAttributes {
  days: FullMealPlanDay[];
}

export function useCustomerMealPlan(userId?: string) {
  return useQuery({
    queryKey: ['customerMealPlan', userId],
    queryFn: async (): Promise<FullCustomerMealPlan | null> => {
      if (!userId) return null;

      // 1. Fetch active meal plan
      const plans = await fetchCustomerMealPlans(userId);
      const activePlan = plans.find(p => p.isActive);

      if (!activePlan || !activePlan.customerMealPlanId) {
        return null;
      }

      // 2. Fetch all days for this plan
      const days = await fetchMealPlanDays(activePlan.customerMealPlanId);

      // 3. Fetch meals for each day
      const daysWithMeals = await Promise.all(
        days.map(async (day: MealPlanDayAttributes) => {
          if (!day.customerMealPlanDayId) return { ...day, meals: [] };
          const meals = await fetchMealPlanDayMeals(day.customerMealPlanDayId);
          return { ...day, meals };
        })
      );

      return {
        ...activePlan,
        days: daysWithMeals,
      };
    },
    enabled: !!userId,
  });
}
