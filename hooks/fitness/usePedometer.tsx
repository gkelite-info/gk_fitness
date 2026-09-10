import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLocalDateString } from '@/lib/dateUtils';
import { useUser } from '@/context/UserContext';
import { supabaseFitnessService } from '@/lib/services/supabaseFitnessService';
import { Pedometer } from 'expo-sensors';
import { Platform, AppState, AppStateStatus } from 'react-native';
import {
  initialize,
  requestPermission,
  readRecords,
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

  const syncSteps = async (isMounted: boolean) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      if (Platform.OS === 'ios') {
        const result = await Pedometer.getStepCountAsync(startOfDay, now);
        if (isMounted && result) setSteps(result.steps);
      } else if (Platform.OS === 'android') {
        let hardwareSteps = 0;
        let hcSteps = 0;

        // 1. Query hardware step counter from midnight (accumulates continuously even when app is killed)
        try {
          const hwResult = await Pedometer.getStepCountAsync(startOfDay, now);
          if (hwResult && typeof hwResult.steps === 'number') {
            hardwareSteps = hwResult.steps;
          }
        } catch (hwErr) {
          // Hardware step sensor fallback
        }

        // 2. Query Health Connect steps if available
        try {
          const result = await readRecords('Steps', {
            timeRangeFilter: {
              operator: 'between',
              startTime: startOfDay.toISOString(),
              endTime: now.toISOString(),
            },
          });
          hcSteps = result.records.reduce((sum: number, record: any) => sum + (record.count || 0), 0);
        } catch (hcErr) {
          // Health Connect unavailable or unlinked in Expo Go
        }

        const bestSteps = Math.max(hardwareSteps, hcSteps);
        if (isMounted && bestSteps > 0) {
          setSteps(bestSteps);
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
          // Request physical activity recognition permission on Android
          try {
            const perm = await Pedometer.requestPermissionsAsync();
            if (!perm.granted) {
              setDebugInfo('Activity Recognition permission pending');
            }
          } catch (pErr) {
            // Permission request fallback
          }

          setDebugInfo('Initializing Health Connect...');
          let hcReady = false;
          try {
            const isInitialized = await initialize();
            if (isInitialized) {
              await requestPermission([
                { accessType: 'read', recordType: 'Steps' },
              ]);
              hcReady = true;
            }
          } catch (err: any) {
            // Health connect unavailable or unlinked in Expo Go
          }

          const available = await Pedometer.isAvailableAsync();
          if (isMounted) {
            setIsAvailable(available || hcReady);
            setDebugInfo(`Android Pedometer: ${available ? 'HW Ready' : 'HW N/A'}, HC: ${hcReady ? 'Ready' : 'N/A'}`);
          }

          // Initial sync on mount
          await syncSteps(isMounted);

          // Watch for live step updates while app is open on Android
          if (available) {
            subscription = Pedometer.watchStepCount(() => {
              syncSteps(isMounted);
            });
          }
        } else if (Platform.OS === 'ios') {
          // Keep using Expo Pedometer for iOS (uses Apple Health natively)
          setDebugInfo(`Checking sensor availability...`);
          const available = await Pedometer.isAvailableAsync();

          if (isMounted) {
            setIsAvailable(available);
            setDebugInfo(`Sensor Available: ${available}`);
          }

          if (!available) return;

          await syncSteps(isMounted);

          // Watch for live step updates while app is open
          subscription = Pedometer.watchStepCount(() => {
            // Re-sync full Apple Health count to ensure accuracy
            syncSteps(isMounted);
          });
        }
      } catch (e) {
        if (isMounted) setDebugInfo(`Error: ${e}`);
        console.error('Pedometer error:', e);
      }
    };

    subscribe();

    // Re-sync steps every time the app comes back to the foreground (recovers steps taken while app was killed)
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

  // Auto-sync debouncer: syncs to Supabase 10 seconds after user stops walking or data updates
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
