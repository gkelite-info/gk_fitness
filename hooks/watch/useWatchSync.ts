import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';
import { watchBridge } from '@/lib/watch/watchBridge';
import { WatchSetLog, WatchWorkoutSummary, WatchHeartRateLog } from '@/lib/watch/watchTypes';
import { upsertSetLog } from '@/helpers/customerWorkoutPlans/workoutSetLogs';
import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export function useWatchSync() {
  const { userId } = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // 1. Listen for set logs coming from the smartwatch
    const setLogSubscription = watchBridge.onSetLogReceived(async (log: WatchSetLog) => {
      try {
        console.log('[useWatchSync] Received set log from watch:', log.dayExerciseId, `Set #${log.setNumber}`);
        await upsertSetLog({
          userId,
          dayExerciseId: log.dayExerciseId,
          planDayId: log.planDayId,
          sessionDate: log.sessionDate,
          setNumber: log.setNumber,
          setType: log.setType || 'working',
          weight: log.weight,
          reps: log.reps,
          isCompleted: log.isCompleted,
          completedAt: log.completedAt || new Date().toISOString(),
        });

        // Invalidate queries so phone UI updates immediately
        queryClient.invalidateQueries({ queryKey: ['today_set_logs', userId, log.planDayId] });
      } catch (err) {
        console.error('[useWatchSync] Failed to process incoming watch set log:', err);
      }
    });

    // 2. Listen for workout completion summary from watch
    const completeSubscription = watchBridge.onWorkoutComplete(async (summary: WatchWorkoutSummary) => {
      try {
        console.log('[useWatchSync] Received workout complete from watch:', summary.durationMinutes, 'mins');
        const now = summary.completedAt || new Date().toISOString();
        const safePlanDayId =
          summary.planDayId && summary.planDayId.length === 36
            ? summary.planDayId
            : '00000000-0000-0000-0000-000000000000';

        await supabase
          .from('customer_workout_logs')
          .upsert(
            {
              customerWorkoutLogId: Crypto.randomUUID(),
              userId,
              planDayId: safePlanDayId,
              durationMinutes: summary.durationMinutes || 45,
              completedAt: now,
              createdAt: now,
              updatedAt: now,
              source: summary.source || 'wearos',
            },
            { onConflict: 'userId, planDayId' }
          );

        queryClient.invalidateQueries({ queryKey: ['workout_streak', userId] });
        queryClient.invalidateQueries({ queryKey: ['customerDashboardData', userId] });
      } catch (err) {
        console.error('[useWatchSync] Failed to process incoming watch workout completion:', err);
      }
    });

    // 3. Listen for live heart rate logs from watch
    const hrSubscription = watchBridge.onHeartRateReceived(async (hrLog: WatchHeartRateLog) => {
      try {
        await supabase
          .from('workout_heart_rate_logs')
          .insert({
            logId: Crypto.randomUUID(),
            userId,
            planDayId: hrLog.planDayId || null,
            sessionDate: hrLog.sessionDate || new Date().toISOString().split('T')[0],
            heartRate: hrLog.heartRate,
            recordedAt: hrLog.recordedAt || new Date().toISOString(),
            source: hrLog.source || 'wearos',
          });
      } catch (err) {
        // Table may not yet be migrated in production, warn softly
        console.warn('[useWatchSync] Heart rate log insert omitted/failed:', err);
      }
    });

    return () => {
      setLogSubscription.remove();
      completeSubscription.remove();
      hrSubscription.remove();
    };
  }, [userId, queryClient]);
}
