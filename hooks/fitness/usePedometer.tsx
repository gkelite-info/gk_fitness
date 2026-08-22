import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { supabaseFitnessService } from '@/lib/services/supabaseFitnessService';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    let subscription: Pedometer.Subscription | null = null;
    let isMounted = true;
    
    const subscribe = async () => {
      try {
        if (Platform.OS === 'android') {
          setDebugInfo('Requesting permissions...');
          const { status } = await Pedometer.requestPermissionsAsync();
          
          if (status !== 'granted') {
            if (isMounted) {
              setIsAvailable(false);
              setDebugInfo(`Permission denied. Status: ${status}`);
            }
            return;
          }
        }

        setDebugInfo(`Checking sensor availability...`);
        const available = await Pedometer.isAvailableAsync();
        
        if (isMounted) {
          setIsAvailable(available);
          setDebugInfo(`Sensor Available: ${available}`);
        }

        if (!available) return;

        if (Platform.OS === 'ios') {
          const end = new Date();
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          
          const result = await Pedometer.getStepCountAsync(start, end);
          const initialSteps = result ? result.steps : 0;
          if (isMounted) setSteps(initialSteps);

          subscription = Pedometer.watchStepCount(watchResult => {
            if (isMounted) setSteps(initialSteps + watchResult.steps);
          });
        } else if (Platform.OS === 'android') {
          let currentTotalSteps = 0;
          try {
            const end = new Date();
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            
            const result = await Pedometer.getStepCountAsync(start, end);
            currentTotalSteps = result ? result.steps : 0;
          } catch (err) {
            console.warn('Pedometer.getStepCountAsync failed on Android (expected on some devices/SDKs):', err);
            // Fallback to 0 so we can at least track steps while the app is open using watchStepCount
            currentTotalSteps = 0;
          }
          
          const todayDate = new Date().toISOString().split('T')[0];
          const stateKey = `@android_pedometer_state_${todayDate}`;
          
          let state = {
            lastTotalSteps: currentTotalSteps,
            accumulatedSteps: 0,
          };
          
          const cachedState = await AsyncStorage.getItem(stateKey);
          if (cachedState) {
            try {
              const parsed = JSON.parse(cachedState);
              if (currentTotalSteps < parsed.lastTotalSteps) {
                state.accumulatedSteps = parsed.accumulatedSteps;
                state.lastTotalSteps = currentTotalSteps;
              } else {
                const diff = currentTotalSteps - parsed.lastTotalSteps;
                state.accumulatedSteps = parsed.accumulatedSteps + diff;
                state.lastTotalSteps = currentTotalSteps;
              }
            } catch (e) {
              console.warn('Failed to parse pedometer state', e);
            }
          }
          
          await AsyncStorage.setItem(stateKey, JSON.stringify(state));
          
          let currentDailySteps = state.accumulatedSteps;
          if (isMounted) setSteps(currentDailySteps);

          subscription = Pedometer.watchStepCount(watchResult => {
            if (!isMounted) return;
            const newTotalDaily = currentDailySteps + watchResult.steps;
            setSteps(newTotalDaily);
            
            const updatedState = {
              lastTotalSteps: currentTotalSteps + watchResult.steps,
              accumulatedSteps: newTotalDaily
            };
            AsyncStorage.setItem(stateKey, JSON.stringify(updatedState)).catch(() => {});
          });
        }
      } catch (e) {
        if (isMounted) setDebugInfo(`Error: ${e}`);
        console.error('Pedometer error:', e);
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const calories = Math.round(steps * 0.04);

  // Auto-sync debouncer: syncs to Supabase 10 seconds after user stops walking
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
