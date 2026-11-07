import { useQuery } from '@tanstack/react-query';
import {
  fetchGlobalTrainerMealPlans,
  fetchGlobalTrainerMealPlanById,
  fetchActiveGlobalTrainerMealPlan,
  GlobalTrainerMealPlanAttributes,
} from '@/helpers/globalTrainerMealPlans/globalTrainerMealPlans';
import {
  fetchGlobalTrainerMealPlanDays,
  GlobalTrainerMealPlanDayAttributes,
} from '@/helpers/globalTrainerMealPlans/globalTrainerMealPlanDays';
import {
  fetchGlobalTrainerMealPlanDayMeals,
  GlobalTrainerMealPlanDayMealAttributes,
} from '@/helpers/globalTrainerMealPlans/globalTrainerMealPlanDayMeals';

export interface FullGlobalTrainerMealPlanDay extends GlobalTrainerMealPlanDayAttributes {
  meals: GlobalTrainerMealPlanDayMealAttributes[];
}

export interface FullGlobalTrainerMealPlan extends GlobalTrainerMealPlanAttributes {
  days: FullGlobalTrainerMealPlanDay[];
}

export function useGlobalTrainerMealPlan(
  userId?: string | null,
  planId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['globalTrainerMealPlan', userId, planId],
    queryFn: async (): Promise<FullGlobalTrainerMealPlan | null> => {
      if (!userId && !planId) return null;

      let plan: GlobalTrainerMealPlanAttributes | null = null;

      if (planId) {
        plan = await fetchGlobalTrainerMealPlanById(planId);
      } else if (userId) {
        plan = await fetchActiveGlobalTrainerMealPlan(userId);
        if (!plan) {
          const allUserPlans = await fetchGlobalTrainerMealPlans(userId);
          plan = allUserPlans.find(p => p.isActive) || allUserPlans[0] || null;
        }
      }

      if (!plan || !plan.globalTrainerMealPlanId) {
        return null;
      }

      const days = await fetchGlobalTrainerMealPlanDays(plan.globalTrainerMealPlanId);

      const daysWithMeals = await Promise.all(
        days.map(async (day: GlobalTrainerMealPlanDayAttributes) => {
          if (!day.globalTrainerMealPlanDayId) return { ...day, meals: [] };
          const meals = await fetchGlobalTrainerMealPlanDayMeals(day.globalTrainerMealPlanDayId);
          return { ...day, meals };
        })
      );

      return {
        ...plan,
        days: daysWithMeals,
      };
    },
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(userId || planId),
  });
}

