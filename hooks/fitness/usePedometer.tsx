import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getLocalDateString } from '@/lib/dateUtils';
import { useUser } from '@/context/UserContext';
import { supabaseFitnessService } from '@/lib/services/supabaseFitnessService';
import { Pedometer } from 'expo-sensors';
import { Platform, AppState, AppStateStatus } from 'react-native';
import {
  initialize,
  requestPermission,
  aggregateRecord,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

interface PedometerContextValue {
  isAvailable: boolean;
  steps: number;
  calories: number;
  debugInfo: string;
}

const PedometerContext = createContext<PedometerContextValue>({
  isAvailable: false,
  steps: 0,
  calories: 0,
  debugInfo: '',
});

export function PedometerProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [steps, setSteps] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  const { userId } = useUser();
  const hcReadyRef = useRef(false);

  // ──────────────────────────────────────────────────────────
  // Android: Read steps from Health Connect using aggregate()
  // This is the INDUSTRY STANDARD approach. Health Connect is
  // a system-level store — the OS hardware sensor hub writes
  // step data here 24/7, even when our app is killed.
  // ──────────────────────────────────────────────────────────
  const getHealthConnectSteps = async (): Promise<number> => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      // aggregateRecord is the correct function name in react-native-health-connect
      // The return type for Steps is { COUNT_TOTAL: number, dataOrigins: string[] }
      const result = await aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString(),
        },
      });

      return result.COUNT_TOTAL ?? 0;
    } catch (e) {
      console.warn('[Pedometer] Health Connect aggregateRecord failed:', e);
      return 0;
    }
  };

  // ──────────────────────────────────────────────────────────
  // Fallback: expo-sensors hardware step counter
  // Works while app is in foreground. Less reliable for
  // background/killed state but still useful as a fallback.
  // ──────────────────────────────────────────────────────────
  const getHardwareSteps = async (): Promise<number> => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();
      const result = await Pedometer.getStepCountAsync(startOfDay, now);
      return result?.steps || 0;
    } catch {
      return 0;
    }
  };

  // ──────────────────────────────────────────────────────────
  // Main sync function — runs on mount, on app foreground,
  // and periodically. Takes the BEST value from all sources.
  // ──────────────────────────────────────────────────────────
  const syncSteps = async (isMounted: boolean) => {
    try {
      if (Platform.OS === 'ios') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(startOfDay, new Date());
        if (isMounted && result) setSteps(result.steps);
      } else if (Platform.OS === 'android') {
        let hcSteps = 0;
        let hwSteps = 0;

        // Primary: Health Connect aggregate (works after app kill)
        if (hcReadyRef.current) {
          hcSteps = await getHealthConnectSteps();
        }

        // Fallback: Hardware sensor (works while app is alive)
        hwSteps = await getHardwareSteps();

        const bestSteps = Math.max(hcSteps, hwSteps);
        if (isMounted && bestSteps > 0) {
          setSteps(bestSteps);
          setDebugInfo(`HC: ${hcSteps}, HW: ${hwSteps}, Using: ${bestSteps}`);
        }
      }
    } catch (e) {
      // Quietly handle fallback
    }
  };

  useEffect(() => {
    let subscription: Pedometer.Subscription | null = null;
    let isMounted = true;

    const subscribe = async () => {
      try {
        if (Platform.OS === 'android') {
          // ── Step 1: Check if Health Connect SDK is available ──
          let hcAvailable = false;
          try {
            const status = await getSdkStatus();
            hcAvailable = status === SdkAvailabilityStatus.SDK_AVAILABLE;
            if (isMounted) {
              setDebugInfo(`HC SDK Status: ${status === SdkAvailabilityStatus.SDK_AVAILABLE ? 'Available' : 'Unavailable'}`);
            }
          } catch {
            // getSdkStatus may throw in Expo Go
          }

          // ── Step 2: Initialize Health Connect if available ──
          if (hcAvailable) {
            try {
              const isInitialized = await initialize();
              if (isInitialized) {
                await requestPermission([
                  { accessType: 'read', recordType: 'Steps' },
                ]);
                hcReadyRef.current = true;
                if (isMounted) {
                  setDebugInfo(prev => prev + ' | HC Initialized ✓');
                }
              }
            } catch (err: any) {
              if (isMounted) {
                setDebugInfo(prev => prev + ` | HC Init Error: ${err?.message || 'unknown'}`);
              }
            }
          }

          // ── Step 3: Request Activity Recognition permission ──
          try {
            await Pedometer.requestPermissionsAsync();
          } catch {
            // Permission request fallback
          }

          const hwAvailable = await Pedometer.isAvailableAsync();
          if (isMounted) {
            setIsAvailable(hwAvailable || hcReadyRef.current);
          }

          // ── Step 4: Initial sync ──
          await syncSteps(isMounted);

          // ── Step 5: Watch for live step events while app is open ──
          if (hwAvailable) {
            subscription = Pedometer.watchStepCount(() => {
              syncSteps(isMounted);
            });
          }
        } else if (Platform.OS === 'ios') {
          // iOS: Keep using Expo Pedometer (uses Apple Health natively)
          setDebugInfo('Checking sensor availability...');
          const available = await Pedometer.isAvailableAsync();

          if (isMounted) {
            setIsAvailable(available);
            setDebugInfo(`Sensor Available: ${available}`);
          }

          if (!available) return;

          await syncSteps(isMounted);

          // Watch for live step updates while app is open
          subscription = Pedometer.watchStepCount(() => {
            syncSteps(isMounted);
          });
        }
      } catch (e) {
        if (isMounted) setDebugInfo(`Error: ${e}`);
        console.error('Pedometer error:', e);
      }
    };

    subscribe();

    // Re-sync steps every time the app comes back to foreground
    // This is the KEY recovery mechanism — when the user reopens the
    // app after it was killed, this queries Health Connect for all
    // steps taken while the app was dead.
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncSteps(isMounted);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Periodic sync every 5 seconds while app is in foreground
    const interval = setInterval(() => {
      if (isMounted) {
        syncSteps(isMounted);
      }
    }, 5000);

    return () => {
      isMounted = false;
      if (subscription) subscription.remove();
      appStateSub.remove();
      clearInterval(interval);
    };
  }, []);

  const calories = Math.round(steps * 0.04);

  // Auto-sync debouncer: syncs to Supabase 10 seconds after data updates
  useEffect(() => {
    if (!userId || steps === 0) return;

    const today = getLocalDateString(new Date());

    const syncTimeout = setTimeout(() => {
      supabaseFitnessService.updateSteps(userId, today, steps, calories)
        .catch(err => console.error('Pedometer auto-sync failed:', err));
    }, 10000);

    return () => clearTimeout(syncTimeout);
  }, [steps, userId, calories]);

  return (
    <PedometerContext.Provider value={{ isAvailable, steps, calories, debugInfo }}>
      {children}
    </PedometerContext.Provider>
  );
}

export function usePedometer() {
  return useContext(PedometerContext);
}

