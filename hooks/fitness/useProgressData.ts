import { useQuery } from '@tanstack/react-query';
import { progressService } from '@/lib/services/progressService';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';

export function useProgressData(userId: string | null) {
  return useQuery({
    queryKey: ['progressData', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch all required data concurrently
      const [
        latestMeasurements,
        measurementHistory,
        progressPhotos,
        onboarding
      ] = await Promise.all([
        progressService.getLatestMeasurements(userId),
        progressService.getMeasurementHistory(userId),
        progressService.getProgressPhotos(userId),
        fetchCustomerOnboarding(userId)
      ]);

      const currentWeight = latestMeasurements?.weight || Number(onboarding?.weight) || 0;
      const targetWeight = Number(onboarding?.targetWeight) || 0;
      const startingWeight = Number(onboarding?.weight) || 0;

      // Determine goal type
      let goalType: 'loss' | 'gain' | 'maintain' = 'maintain';
      if (targetWeight < startingWeight && targetWeight > 0) goalType = 'loss';
      else if (targetWeight > startingWeight) goalType = 'gain';

      // Determine progress
      const weightChange = Math.abs(currentWeight - startingWeight);
      
      let isGoalReached = false;
      if (goalType === 'loss') isGoalReached = currentWeight <= targetWeight && targetWeight > 0;
      else if (goalType === 'gain') isGoalReached = currentWeight >= targetWeight;

      return {
        latestMeasurements,
        measurementHistory,
        progressPhotos,
        onboarding,
        summary: {
          currentWeight,
          targetWeight,
          startingWeight,
          weightChange,
          goalType,
          isGoalReached
        }
      };
    },
    enabled: !!userId,
  });
}
