import { useQuery } from '@tanstack/react-query';
import { supabaseFitnessService as fitnessService } from '@/lib/services/supabaseFitnessService';

export function useFitnessStats(userId: string | null, date: string) {
  return useQuery({
    queryKey: ['fitnessStats', userId, date],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const stats = await fitnessService.getDailyStats(userId, date);
      const waterGoal = await fitnessService.getWaterGoal(userId);
      const totalWater = await fitnessService.getDailyTotalWater(userId, date);
      
      return {
        ...stats,
        waterGoalML: waterGoal,
        totalWaterML: totalWater,
      };
    },
    enabled: !!userId && !!date,
  });
}
