import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseFitnessService as fitnessService } from '@/lib/services/supabaseFitnessService';

export const MIN_STEP_GOAL = 300;
export const MAX_STEP_GOAL = 30000;
export const DEFAULT_STEP_GOAL = 10000;
export const STEP_GOAL_PRESETS = [
  { steps: 3000, label: 'Starter', desc: 'Gentle Walk' },
  { steps: 6000, label: 'Light', desc: 'Active Start' },
  { steps: 8000, label: 'Moderate', desc: 'Healthy Heart' },
  { steps: 10000, label: 'Optimal', desc: 'Recommended' },
  { steps: 15000, label: 'Athlete', desc: 'Peak Fitness' },
];

export function useStepGoal(userId: string | null) {
  const queryClient = useQueryClient();

  const goalQuery = useQuery({
    queryKey: ['stepGoal', userId],
    queryFn: async () => {
      if (!userId) return DEFAULT_STEP_GOAL;
      return fitnessService.getStepGoal(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (newGoal: number) => {
      if (!userId) throw new Error('User ID is required');
      return fitnessService.setStepGoal(userId, newGoal);
    },
    onMutate: async (newGoal: number) => {
      await queryClient.cancelQueries({ queryKey: ['stepGoal', userId] });
      await queryClient.cancelQueries({ queryKey: ['fitnessStats', userId] });

      const previousGoal = queryClient.getQueryData<number>(['stepGoal', userId]);

      // Optimistically update step goal
      queryClient.setQueryData(['stepGoal', userId], newGoal);

      return { previousGoal };
    },
    onError: (_err, _newGoal, context) => {
      if (context?.previousGoal !== undefined) {
        queryClient.setQueryData(['stepGoal', userId], context.previousGoal);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stepGoal', userId] });
      queryClient.invalidateQueries({ queryKey: ['fitnessStats', userId] });
      queryClient.invalidateQueries({ queryKey: ['fitnessTimeline'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyStats', userId] });
    },
  });

  return {
    stepGoal: goalQuery.data ?? DEFAULT_STEP_GOAL,
    isLoading: goalQuery.isLoading,
    updateStepGoal: updateGoalMutation.mutateAsync,
    isUpdating: updateGoalMutation.isPending,
  };
}
