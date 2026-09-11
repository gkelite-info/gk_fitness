import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getLocalDateString } from '@/lib/dateUtils';
import { useUser } from '@/context/UserContext';
import { supabaseFitnessService } from '@/lib/services/supabaseFitnessService';
import { Pedometer } from 'expo-sensors';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  
  // Refs for tracking incremental live steps on Android
  const lastSubscriptionStepsRef = useRef(0);
  const manualAccumulatedStepsRef = useRef(0);
  const todayStringRef = useRef(getLocalDateString(new Date()));

  // Load baseline from AsyncStorage (in case Health Connect fails)
  useEffect(() => {
    const loadBaseline = async () => {
      try {
        const saved = await AsyncStorage.getItem(`@steps_${todayStringRef.current}`);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed > 0) {
            manualAccumulatedStepsRef.current = parsed;
            setSteps(prev => Math.max(prev, parsed));
          }
        }
      } catch (e) {
        console.error('Failed to load steps baseline:', e);
      }
    };
    loadBaseline();
  }, []);

  const persistSteps = async (newSteps: number) => {
    try {
      await AsyncStorage.setItem(`@steps_${todayStringRef.current}`, newSteps.toString());
    } catch (e) {
      // ignore
    }
  };

  const syncSteps = async (isMounted: boolean) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      if (Platform.OS === 'ios') {
        const result = await Pedometer.getStepCountAsync(startOfDay, now);
        if (isMounted && result) {
          setSteps(result.steps);
          persistSteps(result.steps);
        }
      } else if (Platform.OS === 'android') {
        let hcSteps = 0;

        // Query Health Connect steps if available (True background/historical steps)
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
          // Health Connect unavailable, unlinked, or permission denied
        }

        if (isMounted) {
          setSteps(prevSteps => {
            // bestSteps is the max of our manual live-tracked accumulated steps and Health Connect's total
            const bestSteps = Math.max(prevSteps, manualAccumulatedStepsRef.current, hcSteps);
            if (bestSteps > prevSteps) persistSteps(bestSteps);
            return bestSteps;
          });
        }
      }
    } catch (e) {
      // Quietly handle fallback
    }
  };

  useEffect(() => {
    let subscription: Pedometer.Subscription | null = null;
    let isMounted = true;

    const checkDateReset = () => {
      const currentDay = getLocalDateString(new Date());
      if (currentDay !== todayStringRef.current) {
        todayStringRef.current = currentDay;
        manualAccumulatedStepsRef.current = 0;
        lastSubscriptionStepsRef.current = 0;
        if (isMounted) setSteps(0);
      }
    };

    const subscribe = async () => {
      try {
        if (Platform.OS === 'android') {
          // Request physical activity recognition permission on Android
          try {
            const perm = await Pedometer.requestPermissionsAsync();
            if (!perm.granted) {
              setDebugInfo('Activity Recognition permission pending');
            }
          } catch (pErr) {}

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
          } catch (err: any) {}

          const available = await Pedometer.isAvailableAsync();
          if (isMounted) {
            setIsAvailable(available || hcReady);
            setDebugInfo(`Android Pedometer: ${available ? 'HW Ready' : 'HW N/A'}, HC: ${hcReady ? 'Ready' : 'N/A'}`);
          }

          // Initial sync on mount
          await syncSteps(isMounted);

          // Watch for live step updates while app is open on Android
          if (available) {
            lastSubscriptionStepsRef.current = 0;
            subscription = Pedometer.watchStepCount((result) => {
              checkDateReset();
              // Calculate delta since last callback
              const delta = Math.max(0, result.steps - lastSubscriptionStepsRef.current);
              lastSubscriptionStepsRef.current = result.steps;
              
              if (delta > 0) {
                manualAccumulatedStepsRef.current += delta;
                if (isMounted) {
                  setSteps(prev => {
                    const newSteps = Math.max(prev, manualAccumulatedStepsRef.current);
                    persistSteps(newSteps);
                    return newSteps;
                  });
                }
              }
              // Still trigger a sync to pull from Health Connect if it has newer background data
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
            checkDateReset();
            syncSteps(isMounted);
          });
        }
      } catch (e) {
        if (isMounted) setDebugInfo(`Error: ${e}`);
        console.error('Pedometer error:', e);
      }
    };

    subscribe();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkDateReset();
        syncSteps(isMounted);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    const interval = setInterval(() => {
      if (isMounted) {
        checkDateReset();
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
