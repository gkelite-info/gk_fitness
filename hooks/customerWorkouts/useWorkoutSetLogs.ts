import { useQuery } from '@tanstack/react-query';
import { fetchTodaySetLogs, fetchLastSessionWeights } from '@/helpers/customerWorkoutPlans/workoutSetLogs';

export function useWorkoutSetLogs(
  userId: string | null | undefined,
  planDayId: string | null | undefined,
  sessionDate: string | null | undefined
) {
  return useQuery({
    queryKey: ['workoutSetLogs', userId, planDayId, sessionDate],
    queryFn: async () => {
      if (!userId || !planDayId || !sessionDate) return [];
      return await fetchTodaySetLogs(userId, planDayId, sessionDate);
    },
    enabled: !!userId && !!planDayId && !!sessionDate,
    staleTime: 0,
  });
}

export function useLastSessionWeights(
  userId: string | null | undefined,
  exerciseName: string | null | undefined,
  currentSessionDate: string | null | undefined
) {
  return useQuery({
    queryKey: ['lastSessionWeights', userId, exerciseName, currentSessionDate],
    queryFn: async () => {
      if (!userId || !exerciseName || !currentSessionDate) return [];
      return await fetchLastSessionWeights(userId, exerciseName, currentSessionDate);
    },
    enabled: !!userId && !!exerciseName && !!currentSessionDate,
  });
}
