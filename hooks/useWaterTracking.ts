import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabaseFitnessService as fitnessService } from '@/lib/services/supabaseFitnessService';

export function useWaterTracking(userId: string | null, date: string) {
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: ['waterLogs', userId, date],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return fitnessService.getWaterLogs(userId, date);
    },
    enabled: !!userId && !!date,
  });

  const logWaterMutation = useMutation({
    mutationFn: async (amountML: number) => {
      if (!userId) throw new Error('User ID is required');
      return fitnessService.logWater(userId, amountML, date);
    },
    onMutate: async (newAmountML) => {
      await queryClient.cancelQueries({ queryKey: ['waterLogs', userId, date] });
      await queryClient.cancelQueries({ queryKey: ['fitnessStats', userId, date] });

      const previousLogs = queryClient.getQueryData(['waterLogs', userId, date]);
      const previousStats = queryClient.getQueryData(['fitnessStats', userId, date]);

      queryClient.setQueryData(['waterLogs', userId, date], (old: any) => {
        const newLog = {
          id: `temp-${Date.now()}`,
          date,
          timestamp: Date.now(),
          amountML: newAmountML
        };
        return [...(old || []), newLog];
      });

      queryClient.setQueryData(['fitnessStats', userId, date], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          totalWaterML: (old.totalWaterML || 0) + newAmountML,
        };
      });

      return { previousLogs, previousStats };
    },
    onError: (err, newAmountML, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(['waterLogs', userId, date], context.previousLogs);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['fitnessStats', userId, date], context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs', userId, date] });
      queryClient.invalidateQueries({ queryKey: ['fitnessStats', userId, date] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (goalML: number) => {
      if (!userId) throw new Error('User ID is required');
      return fitnessService.setWaterGoal(userId, goalML);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fitnessStats', userId] });
    },
  });

  return {
    logs: logsQuery.data || [],
    isLoadingLogs: logsQuery.isLoading,
    logWater: logWaterMutation.mutateAsync,
    isLogging: logWaterMutation.isPending,
    updateGoal: updateGoalMutation.mutateAsync,
    isUpdatingGoal: updateGoalMutation.isPending,
  };
}
