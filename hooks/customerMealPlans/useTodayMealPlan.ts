import { useQuery } from '@tanstack/react-query';
import { useCustomerMealPlan } from './useCustomerMealPlan';

export function useTodayMealPlan(userId?: string) {
  const { data: fullPlan, isLoading, error, refetch } = useCustomerMealPlan(userId);

  return useQuery({
    queryKey: ['todayMealPlan', userId, fullPlan?.customerMealPlanId],
    queryFn: async () => {
      if (!fullPlan) return null;

      // Get today's day of week
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayIndex = new Date().getDay();
      const todayString = daysOfWeek[todayIndex];

      // Find today's plan day
      const todayPlanDay = fullPlan.days.find(d => d.dayOfWeek.toLowerCase() === todayString);

      if (!todayPlanDay) {
        return {
          hasPlan: false,
          meals: [],
          totalCalories: 0,
          completedMealsCount: 0, // Mock completed, as we don't have a tracking table yet
          totalMealsCount: 0,
        };
      }

      // Calculate totals
      let totalCalories = 0;
      todayPlanDay.meals.forEach(m => {
        totalCalories += m.calories || 0;
      });

      return {
        hasPlan: true,
        meals: todayPlanDay.meals,
        totalCalories,
        completedMealsCount: 0, // In a real app, track completion in another table
        totalMealsCount: todayPlanDay.meals.length,
      };
    },
    enabled: !!fullPlan && !!userId,
  });
}
