import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';
import { watchBridge } from '@/lib/watch/watchBridge';
import {
  WatchSetLog,
  WatchWorkoutSummary,
  WatchHeartRateLog,
  WatchWaterLog,
  WatchAuthSession,
} from '@/lib/watch/watchTypes';
import { upsertSetLog } from '@/helpers/customerWorkoutPlans/workoutSetLogs';
import { supabase } from '@/lib/supabase';
import { supabaseFitnessService } from '@/lib/services/supabaseFitnessService';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import { buildWatchWorkoutPayload } from '@/lib/watch/watchPayloadBuilder';
import { getLocalDateString } from '@/lib/dateUtils';
import * as Crypto from 'expo-crypto';

function normalizeSessionDate(rawDate?: string): string {
  if (!rawDate) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (rawDate.length === 10) {
    return `${rawDate}T00:00:00.000Z`;
  }
  return rawDate;
}

/**
 * Pushes today's active workout plan & exercises from Supabase to the smartwatch.
 */
export async function pushTodayWorkoutToWatch(userId: string): Promise<boolean> {
  try {
    const plans = await fetchCustomerWorkoutPlans(userId);
    const activePlan = plans?.find((p: any) => p.isActive);
    if (!activePlan) {
      console.log('[pushTodayWorkoutToWatch] No active plan found for user:', userId);
      return false;
    }

    const planCreatedAt = new Date(activePlan.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - planCreatedAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeekNumber = Math.min(Math.ceil(diffDays / 7), 4) || 1;

    const allDays = await fetchWorkoutPlanDays(activePlan.planId);
    let days = allDays.filter((d: any) => (d.weekNumber || 1) === currentWeekNumber);
    if (days.length === 0) {
      days = allDays.filter((d: any) => (d.weekNumber || 1) === 1);
    }

    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentDayIndex = new Date().getDay();
    const todayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
    const todayString = dayOrder[todayIndex];

    const todayDay = days.find((d: any) => d.dayOfWeek?.toLowerCase() === todayString);
    if (!todayDay || todayDay.workoutType === 'Rest') {
      console.log('[pushTodayWorkoutToWatch] Today is Rest or no day found:', todayString);
      return false;
    }

    const exercises = await fetchWorkoutPlanDayExercises(todayDay.planDayId);
    if (!exercises || exercises.length === 0) {
      console.log('[pushTodayWorkoutToWatch] No exercises for day:', todayDay.planDayId);
      return false;
    }

    const payload = await buildWatchWorkoutPayload({
      userId,
      planDayId: todayDay.planDayId,
      workoutType: todayDay.workoutType || 'Workout',
      durationMinutes: todayDay.durationMinutes || 45,
      isTrainerPlan: false,
      isCustom: false,
      exercises,
    });

    const success = await watchBridge.pushWorkoutToWatch(payload);
    console.log('[pushTodayWorkoutToWatch] Pushed today workout to watch:', todayDay.workoutType, success);
    return success;
  } catch (err) {
    console.warn('[pushTodayWorkoutToWatch] Failed:', err);
    return false;
  }
}

/**
 * Pushes today's daily water intake & goal from Supabase to the smartwatch.
 */
export async function pushDailyWaterToWatch(
  userId: string,
  explicitIntake?: number,
  explicitGoal?: number
): Promise<boolean> {
  try {
    const today = getLocalDateString(new Date());
    const [fetchedIntake, fetchedGoal] = await Promise.all([
      explicitIntake !== undefined
        ? Promise.resolve(explicitIntake)
        : supabaseFitnessService.getDailyTotalWater(userId, today),
      explicitGoal !== undefined
        ? Promise.resolve(explicitGoal)
        : supabaseFitnessService.getWaterGoal(userId),
    ]);

    const intake = explicitIntake !== undefined ? explicitIntake : fetchedIntake;
    const goal = explicitGoal !== undefined ? explicitGoal : fetchedGoal;

    const success = await watchBridge.syncWaterToWatch(intake, goal);
    console.log('[pushDailyWaterToWatch] Water synced to watch:', intake, '/', goal, 'ml (success:', success, ')');
    return success;
  } catch (err) {
    console.warn('[pushDailyWaterToWatch] Failed:', err);
    return false;
  }
}

/**
 * Pushes the current user's authentication & profile session to the smartwatch.
 */
export async function pushAuthSessionToWatch(session: WatchAuthSession): Promise<boolean> {
  try {
    const success = await watchBridge.pushAuthSessionToWatch(session);
    console.log('[pushAuthSessionToWatch] Auth session synced to watch:', session.userId, success);
    return success;
  } catch (err) {
    console.warn('[pushAuthSessionToWatch] Failed:', err);
    return false;
  }
}

export function useWatchSync() {
  const { userId, name, email } = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!userId) {
      // If user logs out, notify the watch to clear user session
      pushAuthSessionToWatch({
        userId: null,
        timestamp: Date.now(),
      }).catch(() => { });
      return;
    }

    // Helper: Register / update connected smartwatch in watch_devices
    const syncWatchDevice = async () => {
      try {
        const current = await watchBridge.getConnectionStatus();
        if (current.isPaired && current.nodeId) {
          await supabase
            .from('watch_devices')
            .upsert(
              {
                deviceId: Crypto.randomUUID(),
                userId,
                platform: current.platform || 'wearos',
                deviceName: current.deviceName || 'Smartwatch',
                nodeId: current.nodeId,
                lastSeenAt: new Date().toISOString(),
                isActive: true,
                createdAt: new Date().toISOString(),
              },
              { onConflict: 'userId, nodeId' }
            );

          // Once device is confirmed connected, push: Auth session -> Today's Workout -> Daily Water
          const goal = await supabaseFitnessService.getWaterGoal(userId);
          await pushAuthSessionToWatch({
            userId,
            name: name || null,
            email: email || null,
            waterGoalMl: goal,
            stepGoal: 10000,
            timestamp: Date.now(),
          });
          pushTodayWorkoutToWatch(userId);
          pushDailyWaterToWatch(userId);
        }
      } catch (err) {
        console.warn('[useWatchSync] syncWatchDevice error:', err);
      }
    };

    // Run device registration and initial sync on mount
    syncWatchDevice();

    // 1. Listen for set logs coming from the smartwatch
    const setLogSubscription = watchBridge.onSetLogReceived(async (log: WatchSetLog) => {
      try {
        console.log('[useWatchSync] Received set log from watch:', log.dayExerciseId, `Set #${log.setNumber}`);
        const sessionDate = normalizeSessionDate(log.sessionDate);

        await upsertSetLog({
          userId,
          dayExerciseId: log.dayExerciseId,
          planDayId: log.planDayId,
          sessionDate,
          setNumber: log.setNumber,
          setType: log.setType || 'working',
          weight: log.weight,
          reps: log.reps,
          isCompleted: log.isCompleted,
          completedAt: log.completedAt || new Date().toISOString(),
          source: log.source || 'wearos',
        });

        // Invalidate queries so phone UI updates immediately
        queryClient.invalidateQueries({ queryKey: ['today_set_logs', userId, log.planDayId] });
        syncWatchDevice();
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
            : null;

        if (safePlanDayId) {
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
        }
        syncWatchDevice();
      } catch (err) {
        console.error('[useWatchSync] Failed to process incoming watch workout completion:', err);
      }
    });

    // 3. Listen for live heart rate logs from watch
    const hrSubscription = watchBridge.onHeartRateReceived(async (hrLog: WatchHeartRateLog) => {
      try {
        const safePlanDayId =
          hrLog.planDayId && hrLog.planDayId.length === 36 ? hrLog.planDayId : null;
        const hrSessionDate = hrLog.sessionDate
          ? hrLog.sessionDate.split('T')[0]
          : new Date().toISOString().split('T')[0];

        await supabase
          .from('workout_heart_rate_logs')
          .insert({
            logId: Crypto.randomUUID(),
            userId,
            planDayId: safePlanDayId,
            sessionDate: hrSessionDate,
            heartRate: hrLog.heartRate,
            recordedAt: hrLog.recordedAt || new Date().toISOString(),
            source: hrLog.source || 'wearos',
          });
      } catch (err) {
        console.warn('[useWatchSync] Heart rate log insert omitted/failed:', err);
      }
    });

    // In-memory set for deduplicating water logs within session
    const recentWaterLogKeys = new Set<string>();

    // 4. Listen for water logging events from watch
    const waterSubscription = watchBridge.onWaterLogReceived(async (waterLog: WatchWaterLog) => {
      try {
        const dedupeKey =
          (waterLog as any).clientLogId ||
          `${waterLog.sessionDate}-${waterLog.timestamp}-${waterLog.addedMl}`;

        if (recentWaterLogKeys.has(dedupeKey)) {
          console.log('[useWatchSync] Duplicate water log ignored:', dedupeKey);
          return;
        }
        recentWaterLogKeys.add(dedupeKey);
        if (recentWaterLogKeys.size > 100) {
          const firstKey = recentWaterLogKeys.values().next().value;
          if (firstKey) recentWaterLogKeys.delete(firstKey);
        }

        const targetUserId = waterLog.userId || userId;
        console.log('[useWatchSync] Received water log from watch:', waterLog.addedMl, 'ml, userId:', targetUserId);
        const dateStr = waterLog.sessionDate || getLocalDateString(new Date());

        await supabaseFitnessService.logWater(targetUserId, waterLog.addedMl, dateStr);

        // Invalidate queries so phone hydration screens and dashboard update in real-time
        queryClient.invalidateQueries({ queryKey: ['waterLogs', targetUserId] });
        queryClient.invalidateQueries({ queryKey: ['fitnessStats', targetUserId] });
        queryClient.invalidateQueries({ queryKey: ['fitnessTimeline'] });
        queryClient.invalidateQueries({ queryKey: ['water_streak', targetUserId] });
        queryClient.invalidateQueries({ queryKey: ['today_activity_metrics', targetUserId] });
        queryClient.invalidateQueries({ queryKey: ['customerDashboardData', targetUserId] });
        queryClient.invalidateQueries({ queryKey: ['daily_fitness_stats', targetUserId] });

        // Push new daily total back to watch to ensure alignment
        await pushDailyWaterToWatch(targetUserId);
      } catch (err) {
        console.error('[useWatchSync] Failed to process incoming watch water log:', err);
      }
    });

    // 5. Listen for smartwatch requesting active workout on-demand
    const requestWorkoutSubscription = watchBridge.onRequestActiveWorkout(async () => {
      console.log('[useWatchSync] Watch requested active workout & metrics sync');
      const goal = await supabaseFitnessService.getWaterGoal(userId);
      await pushAuthSessionToWatch({
        userId,
        name: name || null,
        email: email || null,
        waterGoalMl: goal,
        stepGoal: 10000,
        timestamp: Date.now(),
      });
      await pushTodayWorkoutToWatch(userId);
      await pushDailyWaterToWatch(userId);
    });

    return () => {
      setLogSubscription.remove();
      completeSubscription.remove();
      hrSubscription.remove();
      waterSubscription.remove();
      requestWorkoutSubscription.remove();
    };
  }, [userId, queryClient]);
}
