import { useQuery } from '@tanstack/react-query';
import { useGlobalTrainerMealPlan } from './useGlobalTrainerMealPlan';

export function useTodayGlobalTrainerMealPlan(userId?: string | null) {
  const { data: fullPlan, isLoading, error, refetch } = useGlobalTrainerMealPlan(userId);

  return useQuery({
    queryKey: ['todayGlobalTrainerMealPlan', userId, fullPlan?.globalTrainerMealPlanId],
    queryFn: async () => {
      if (!fullPlan) return null;

      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayIndex = new Date().getDay();
      const todayString = daysOfWeek[todayIndex];

      const todayPlanDay = fullPlan.days.find(
        d => (d.dayOfWeek || '').toLowerCase() === todayString
      );

      if (!todayPlanDay) {
        return {
          hasPlan: false,
          meals: [],
          totalCalories: 0,
          completedMealsCount: 0,
          totalMealsCount: 0,
        };
      }

      let totalCalories = 0;
      (todayPlanDay.meals || []).forEach(m => {
        totalCalories += Number(m.calories) || 0;
      });

      return {
        hasPlan: true,
        dayOfWeek: todayPlanDay.dayOfWeek,
        meals: todayPlanDay.meals || [],
        totalCalories,
        completedMealsCount: 0,
        totalMealsCount: todayPlanDay.meals?.length || 0,
      };
    },
    enabled: !!fullPlan && !!userId,
  });
}

