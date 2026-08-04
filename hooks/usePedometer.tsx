import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { supabaseFitnessService } from '@/lib/services/supabaseFitnessService';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

interface PedometerContextValue {
  isAvailable: boolean;
  steps: number;
  calories: number;
}

const PedometerContext = createContext<PedometerContextValue>({
  isAvailable: false,
  steps: 0,
  calories: 0,
});

export function PedometerProvider({ children, isAndroidStatic = true }: { children: React.ReactNode, isAndroidStatic?: boolean }) {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [steps, setSteps] = useState(0);
  const { userId } = useUser();

  useEffect(() => {
    if (Platform.OS === 'android' && isAndroidStatic) {
      setIsAvailable(true);
      setSteps(7845); // Mock steps for Android
      return;
    }

    let subscription: Pedometer.Subscription | null = null;
    
    const subscribe = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        setIsAvailable(available);

        if (available) {
          const end = new Date();
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          
          const result = await Pedometer.getStepCountAsync(start, end);
          const initialSteps = result ? result.steps : 0;
          setSteps(initialSteps);

          subscription = Pedometer.watchStepCount(watchResult => {
            setSteps(initialSteps + watchResult.steps);
          });
        }
      } catch (e) {
        console.error('Pedometer error:', e);
      }
    };

    subscribe();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isAndroidStatic]);

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
    <PedometerContext.Provider value={{ isAvailable, steps, calories }}>
      {children}
    </PedometerContext.Provider>
  );
}

export function usePedometer() {
  return useContext(PedometerContext);
}

