import { useQuery } from '@tanstack/react-query';
import { useTrainerMealPlan } from './useTrainerMealPlan';

export function useTodayTrainerMealPlan(userId?: string) {
  const { data: fullPlan, isLoading, error, refetch } = useTrainerMealPlan(userId);

  return useQuery({
    queryKey: ['todayTrainerMealPlan', userId, fullPlan?.trainerMealPlanId],
    queryFn: async () => {
      if (!fullPlan) return null;

      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayIndex = new Date().getDay();
      const todayString = daysOfWeek[todayIndex];

      const todayPlanDay = fullPlan.days.find(d => d.dayOfWeek.toLowerCase() === todayString);

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
      todayPlanDay.meals.forEach(m => {
        totalCalories += m.calories || 0;
      });

      return {
        hasPlan: true,
        meals: todayPlanDay.meals,
        totalCalories,
        completedMealsCount: 0,
        totalMealsCount: todayPlanDay.meals.length,
      };
    },
    enabled: !!fullPlan && !!userId,
  });
}
