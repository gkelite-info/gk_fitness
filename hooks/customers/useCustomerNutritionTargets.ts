import { useQuery } from '@tanstack/react-query';
import { calculateNutritionTargets } from '@/lib/nutritionCalculator';

export function useCustomerNutritionTargets(userId?: string) {
  return useQuery({
    queryKey: ['nutritionTargets', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await calculateNutritionTargets(userId);
    },
    enabled: !!userId,
  });
}
