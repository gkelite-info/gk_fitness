import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const syncSteps = async (isMounted: boolean) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      if (Platform.OS === 'ios') {
        const result = await Pedometer.getStepCountAsync(startOfDay, now);
        if (isMounted && result) setSteps(result.steps);
      } else if (Platform.OS === 'android') {
        try {
          // Use Health Connect to fetch steps (includes background history)
          const result = await readRecords('Steps', {
            timeRangeFilter: {
              operator: 'between',
              startTime: startOfDay.toISOString(),
              endTime: now.toISOString(),
            },
          });
          
          const totalSteps = result.records.reduce((sum: number, record: any) => sum + (record.count || 0), 0);
          if (isMounted) setSteps(totalSteps);
        } catch (hcErr) {
          // Fallback to Expo Pedometer if Health Connect is unlinked or running in Expo Go
          const result = await Pedometer.getStepCountAsync(startOfDay, now);
          if (isMounted && result) setSteps(result.steps);
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
          setDebugInfo('Initializing Health Connect...');
          
          try {
            const isInitialized = await initialize();
            if (!isInitialized) {
              throw new Error("Failed to initialize Health Connect");
            }

            setDebugInfo('Requesting Health Connect permissions...');
            await requestPermission([
              { accessType: 'read', recordType: 'Steps' },
            ]);
            
            if (isMounted) setIsAvailable(true);
            setDebugInfo('Health Connect Ready.');
            
            // Sync immediately on mount
            await syncSteps(isMounted);

          } catch (err: any) {
            // Health Connect is unavailable or unlinked in Expo Go; fallback to Expo Pedometer
            const available = await Pedometer.isAvailableAsync();
            if (isMounted) {
              setIsAvailable(available);
              setDebugInfo(`Expo Pedometer active (Health Connect fallback: ${available})`);
            }
            if (available) {
              await syncSteps(isMounted);
              subscription = Pedometer.watchStepCount(() => {
                syncSteps(isMounted);
              });
            }
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

    // Re-sync steps every time the app comes back to the foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncSteps(isMounted);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isMounted = false;
      if (subscription) subscription.remove();
      appStateSub.remove();
    };
  }, []);

  const calories = Math.round(steps * 0.04);

  // Auto-sync debouncer: syncs to Supabase 10 seconds after user stops walking or data updates
  useEffect(() => {
    if (!userId || steps === 0) return;

    const today = new Date().toISOString().split('T')[0];
    
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
