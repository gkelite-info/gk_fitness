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

      const oldestMeasurement = measurementHistory[measurementHistory.length - 1];
      const startingWeight = Number(onboarding?.weight) || Number(oldestMeasurement?.weight) || 0;
      const targetWeight = Number(onboarding?.targetWeight) || 0;
      const currentWeight = latestMeasurements?.weight || startingWeight || 0;

      // Determine goal type
      let goalType: 'loss' | 'gain' | 'maintain' = 'maintain';
      if (targetWeight > 0 && startingWeight > 0) {
        if (targetWeight < startingWeight) goalType = 'loss';
        else if (targetWeight > startingWeight) goalType = 'gain';
      }

      // Determine progress
      let weightChange = 0;
      if (startingWeight > 0) {
        if (goalType === 'loss') {
          weightChange = startingWeight - currentWeight; // Positive means weight lost
        } else if (goalType === 'gain') {
          weightChange = currentWeight - startingWeight; // Positive means weight gained
        } else {
          weightChange = currentWeight - startingWeight;
        }
      }
      
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
