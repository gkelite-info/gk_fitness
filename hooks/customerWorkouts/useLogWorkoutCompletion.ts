import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import * as Crypto from 'expo-crypto';

interface LogWorkoutArgs {
  planDayId?: string;
  durationMinutes?: number;
}

export function useLogWorkoutCompletion() {
  const { userId } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planDayId, durationMinutes }: LogWorkoutArgs) => {
      if (!userId) throw new Error('User not authenticated');

      const logId = Crypto.randomUUID();
      const now = new Date().toISOString();

      const safePlanDayId = planDayId && planDayId.length === 36 ? planDayId : '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .from('customer_workout_logs')
        .upsert({
          customerWorkoutLogId: logId,
          userId,
          planDayId: safePlanDayId,
          durationMinutes: durationMinutes || 50,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        }, { onConflict: 'userId, planDayId' })
        .select()
        .single();

      if (error) {
        console.error('[useLogWorkoutCompletion] Supabase Insert Error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the streak query so it updates instantly
      queryClient.invalidateQueries({ queryKey: ['workout_streak', userId] });
    },
    onError: (error) => {
      console.error('[useLogWorkoutCompletion] Mutation Error:', error);
    }
  });
}
