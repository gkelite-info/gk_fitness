import { useQuery } from '@tanstack/react-query';
import { progressService, CustomerMeasurement } from '@/lib/services/progressService';
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

      // Calculate "This Month" weight change
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      const validMeasurements = [...(measurementHistory || [])]
        .filter((m): m is CustomerMeasurement & { weight: number } => typeof m.weight === 'number' && m.weight > 0)
        .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

      const thisMonthMeasurements = validMeasurements.filter(
        (m) => new Date(m.loggedAt) >= startOfCurrentMonth
      );

      const preThisMonthMeasurements = validMeasurements.filter(
        (m) => new Date(m.loggedAt) < startOfCurrentMonth
      );
      const lastPreMeasurement = preThisMonthMeasurements[preThisMonthMeasurements.length - 1];

      let startWeightThisMonth: number = currentWeight;
      if (lastPreMeasurement?.weight != null) {
        startWeightThisMonth = lastPreMeasurement.weight;
      } else if (
        onboarding?.weight &&
        (!onboarding.createdAt || new Date(onboarding.createdAt) <= startOfCurrentMonth)
      ) {
        startWeightThisMonth = Number(onboarding.weight);
      } else if (thisMonthMeasurements.length > 0 && thisMonthMeasurements[0].weight != null) {
        startWeightThisMonth = thisMonthMeasurements[0].weight;
      } else if (startingWeight > 0) {
        startWeightThisMonth = startingWeight;
      }

      const currentWeightThisMonth: number =
        thisMonthMeasurements.length > 0 && thisMonthMeasurements[thisMonthMeasurements.length - 1].weight != null
          ? thisMonthMeasurements[thisMonthMeasurements.length - 1].weight
          : currentWeight;

      const monthlyDiff = currentWeightThisMonth - startWeightThisMonth;
      const thisMonthWeightChange = Math.abs(monthlyDiff);

      let thisMonthGoalLabel = goalType === 'gain' ? 'Total Gained' : 'Total Lost';
      if (monthlyDiff > 0) {
        thisMonthGoalLabel = 'Total Gained';
      } else if (monthlyDiff < 0) {
        thisMonthGoalLabel = 'Total Lost';
      }

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
          isGoalReached,
          thisMonth: {
            weightChange: thisMonthWeightChange,
            goalLabel: thisMonthGoalLabel,
            diff: monthlyDiff,
            startWeight: startWeightThisMonth,
            currentWeight: currentWeightThisMonth,
            hasLogs: thisMonthMeasurements.length > 0,
          },
        }
      };
    },
    enabled: !!userId,
  });
}
