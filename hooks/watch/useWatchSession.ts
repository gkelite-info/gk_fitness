import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { watchBridge } from '@/lib/watch/watchBridge';
import { WatchConnectionStatus } from '@/lib/watch/watchTypes';
import { buildWatchWorkoutPayload } from '@/lib/watch/watchPayloadBuilder';

export function useWatchSession() {
  const { userId } = useUser();
  const [status, setStatus] = useState<WatchConnectionStatus>({
    isPaired: false,
    isReachable: false,
    platform: 'none',
  });
  const [isSending, setIsSending] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const current = await watchBridge.getConnectionStatus();
      setStatus((prev) => {
        if (
          prev.isPaired === current.isPaired &&
          prev.isReachable === current.isReachable &&
          prev.platform === current.platform &&
          prev.deviceName === current.deviceName &&
          prev.nodeId === current.nodeId
        ) {
          return prev;
        }
        return current;
      });
      return current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const pushWorkout = useCallback(
    async (params: {
      planDayId: string;
      workoutType?: string;
      durationMinutes?: number;
      isTrainerPlan?: boolean;
      isCustom?: boolean;
      exercises: any[];
    }): Promise<boolean> => {
      if (!userId) return false;
      setIsSending(true);
      try {
        const payload = await buildWatchWorkoutPayload({
          userId,
          planDayId: params.planDayId,
          workoutType: params.workoutType,
          durationMinutes: params.durationMinutes,
          isTrainerPlan: params.isTrainerPlan,
          isCustom: params.isCustom,
          exercises: params.exercises,
        });

        const success = await watchBridge.pushWorkoutToWatch(payload);
        return success;
      } catch (err) {
        console.error('[useWatchSession] pushWorkout failed:', err);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [userId]
  );

  return {
    connectionStatus: status,
    isWatchConnected: status.isReachable,
    isSending,
    checkConnection,
    pushWorkout,
    pingWatch: () => watchBridge.pingWatch(),
  };
}
