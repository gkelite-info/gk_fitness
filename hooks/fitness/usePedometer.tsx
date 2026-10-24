import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getLocalDateString } from '@/lib/dateUtils';
import { useUser } from '@/context/UserContext';
import { supabaseFitnessService } from '@/lib/services/supabaseFitnessService';
import { Pedometer } from 'expo-sensors';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
let HealthConnect: any = null;
if (Platform.OS === 'android') {
  try {
    HealthConnect = require('react-native-health-connect');
  } catch {
    // Health Connect unavailable or in Expo Go
  }
}

interface PedometerContextValue {
  isAvailable: boolean;
  steps: number;
  calories: number;
  debugInfo: string;
  syncSteps: () => Promise<void>;
}

const PedometerContext = createContext<PedometerContextValue>({
  isAvailable: false,
  steps: 0,
  calories: 0,
  debugInfo: '',
  syncSteps: async () => {},
});

const getStepsCacheKey = (userId: string, date: string) => `@gk_steps_${userId}_${date}`;

export function PedometerProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [steps, setSteps] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  const { userId } = useUser();
  const hcReadyRef = useRef(false);
  const lastWatchStepsRef = useRef(0);

  // ──────────────────────────────────────────────────────────
  // Initialize steps:
  // 1. Immediately read from AsyncStorage local cache for instant UI rendering
  // 2. Query Supabase daily summary for today and take Math.max
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    let isCurrent = true;
    if (!userId) return;

    const loadInitialStats = async () => {
      try {
        const today = getLocalDateString(new Date());

        // Fast local cache restoration
        try {
          const cached = await AsyncStorage.getItem(getStepsCacheKey(userId, today));
          if (cached) {
            const parsed = parseInt(cached, 10);
            if (!isNaN(parsed) && parsed > 0 && isCurrent) {
              setSteps(prev => Math.max(prev, parsed));
            }
          }
        } catch {}

        // Supabase DB fetch
        const summary = await supabaseFitnessService.getDailyStats(userId, today);
        if (isCurrent && summary && typeof summary.steps === 'number' && summary.steps > 0) {
          setSteps(prev => {
            const best = Math.max(prev, summary.steps);
            AsyncStorage.setItem(getStepsCacheKey(userId, today), best.toString()).catch(() => {});
            return best;
          });
        }
      } catch (e) {
        // Silently continue if initial DB fetch fails
      }
    };

    loadInitialStats();
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  // ──────────────────────────────────────────────────────────
  // Android: Read steps from Health Connect using aggregate()
  // Health Connect is a system-level store written 24/7.
  // ──────────────────────────────────────────────────────────
  const getHealthConnectSteps = async (): Promise<number> => {
    if (Platform.OS !== 'android' || !HealthConnect?.aggregateRecord) return 0;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      const result = await HealthConnect.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString(),
        },
      });

      return result?.COUNT_TOTAL ?? 0;
    } catch (e) {
      return 0;
    }
  };

  // ──────────────────────────────────────────────────────────
  // Main sync function — runs on mount, foreground, & refresh.
  // ──────────────────────────────────────────────────────────
  const syncSteps = useCallback(async (isMounted: boolean = true) => {
    try {
      const today = getLocalDateString(new Date());

      if (Platform.OS === 'ios') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const now = new Date();
        let coremotionSteps = 0;

        try {
          const result = await Pedometer.getStepCountAsync(startOfDay, now);
          if (result && typeof result.steps === 'number') {
            coremotionSteps = result.steps;
          }
        } catch (cmErr: any) {
          console.warn('[Pedometer] iOS getStepCountAsync error:', cmErr);
        }

        let cachedSteps = 0;
        if (userId) {
          try {
            const cached = await AsyncStorage.getItem(getStepsCacheKey(userId, today));
            if (cached) cachedSteps = parseInt(cached, 10) || 0;
          } catch {}
        }

        const bestSteps = Math.max(coremotionSteps, cachedSteps);
        if (isMounted && bestSteps > 0) {
          setSteps(prev => {
            const best = Math.max(prev, bestSteps);
            if (userId) {
              AsyncStorage.setItem(getStepsCacheKey(userId, today), best.toString()).catch(() => {});
            }
            return best;
          });
          setDebugInfo(`iOS CoreMotion: ${coremotionSteps}, Using: ${bestSteps}`);
        }
      } else if (Platform.OS === 'android') {
        let hcSteps = 0;

        // Primary: Health Connect aggregate (works after app kill)
        if (hcReadyRef.current) {
          hcSteps = await getHealthConnectSteps();
        }

        let cachedSteps = 0;
        if (userId) {
          try {
            const cached = await AsyncStorage.getItem(getStepsCacheKey(userId, today));
            if (cached) cachedSteps = parseInt(cached, 10) || 0;
          } catch {}
        }

        const bestSteps = Math.max(hcSteps, cachedSteps);
        if (isMounted && bestSteps > 0) {
          setSteps(prev => {
            const best = Math.max(prev, bestSteps);
            if (userId) {
              AsyncStorage.setItem(getStepsCacheKey(userId, today), best.toString()).catch(() => {});
            }
            return best;
          });
          setDebugInfo(`HC: ${hcSteps}, Cached: ${cachedSteps}, Using: ${bestSteps}`);
        }
      }
    } catch (e: any) {
      if (isMounted) {
        setDebugInfo(prev => `${prev} | Sync error: ${e?.message || 'unknown'}`);
      }
    }
  }, [userId]);

  useEffect(() => {
    let subscription: Pedometer.Subscription | null = null;
    let isMounted = true;

    const subscribe = async () => {
      try {
        if (Platform.OS === 'android' && HealthConnect) {
          // ── Step 1: Check if Health Connect SDK is available ──
          let hcAvailable = false;
          try {
            if (HealthConnect.getSdkStatus) {
              const status = await HealthConnect.getSdkStatus();
              hcAvailable = status === HealthConnect.SdkAvailabilityStatus?.SDK_AVAILABLE || status === 3;
              if (isMounted) {
                setDebugInfo(`HC SDK Status: ${hcAvailable ? 'Available' : 'Unavailable'}`);
              }
            }
          } catch {
            // getSdkStatus may throw in Expo Go
          }

          // ── Step 2: Initialize Health Connect if available ──
          if (hcAvailable && HealthConnect.initialize) {
            try {
              const isInitialized = await HealthConnect.initialize();
              if (isInitialized && HealthConnect.requestPermission) {
                await HealthConnect.requestPermission([
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

          // ── Step 5: Live hardware step watcher on Android ──
          // watchStepCount provides result.steps (steps since subscription).
          // We compute the incremental delta and add it to our accumulated daily total.
          if (hwAvailable) {
            lastWatchStepsRef.current = 0;
            subscription = Pedometer.watchStepCount((result) => {
              if (result && typeof result.steps === 'number') {
                const currentWatchSteps = result.steps;
                const delta = Math.max(0, currentWatchSteps - lastWatchStepsRef.current);
                lastWatchStepsRef.current = currentWatchSteps;

                if (delta > 0 && isMounted) {
                  setSteps(prev => {
                    const next = prev + delta;
                    if (userId) {
                      const today = getLocalDateString(new Date());
                      AsyncStorage.setItem(getStepsCacheKey(userId, today), next.toString()).catch(() => {});
                    }
                    return next;
                  });
                }
              }
            });
          }
        } else if (Platform.OS === 'ios') {
          // iOS: Native Apple CoreMotion / Health tracking
          // CMPedometer runs 24/7 at the OS coprocessor level, tracking steps
          // even when GK Fitness is closed or killed.
          setDebugInfo('Initializing iOS CoreMotion...');

          try {
            await Pedometer.requestPermissionsAsync();
          } catch (permErr: any) {
            console.warn('[Pedometer] iOS requestPermissionsAsync error:', permErr);
          }

          const available = await Pedometer.isAvailableAsync();
          if (isMounted) {
            setIsAvailable(available);
            setDebugInfo(prev => prev + ` | Sensor Available: ${available}`);
          }

          if (!available) return;

          // Initial sync from CoreMotion (picks up background steps taken while killed/closed)
          await syncSteps(isMounted);

          // Watch for live step updates while app is open
          subscription = Pedometer.watchStepCount((result) => {
            if (result && typeof result.steps === 'number' && result.steps > 0) {
              const currentWatchSteps = result.steps;
              const delta = Math.max(0, currentWatchSteps - lastWatchStepsRef.current);
              lastWatchStepsRef.current = currentWatchSteps;

              if (delta > 0 && isMounted) {
                setSteps(prev => {
                  const next = prev + delta;
                  if (userId) {
                    const today = getLocalDateString(new Date());
                    AsyncStorage.setItem(getStepsCacheKey(userId, today), next.toString()).catch(() => {});
                  }
                  return next;
                });
              }
            }
            syncSteps(isMounted);
          });
        }
      } catch (e) {
        if (isMounted) setDebugInfo(`Error: ${e}`);
        console.error('Pedometer error:', e);
      }
    };

    subscribe();

    // Re-sync steps when app returns to foreground (recovers steps taken while killed/closed)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        lastWatchStepsRef.current = 0;
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
  }, [syncSteps, userId]);

  const calories = Math.round(steps * 0.04);

  // Auto-sync debouncer: syncs to Supabase 10 seconds after data updates
  useEffect(() => {
    if (!userId || steps === 0) return;

    const today = getLocalDateString(new Date());

    const syncTimeout = setTimeout(async () => {
      try {
        await supabaseFitnessService.updateSteps(userId, today, steps, calories);
        
        // Progress Milestone: 10k steps
        if (steps >= 10000) {
          const milestoneKey = `milestone_10k_steps_${userId}_${today}`;
          const hasSent = await AsyncStorage.getItem(milestoneKey);
          if (!hasSent) {
            const { sendMilestonePushNotification } = require('@/lib/services/notificationService');
            await sendMilestonePushNotification(
              userId,
              '10k_steps',
              '🏆 10K Steps Achieved!',
              'Incredible work today! You\'ve reached your 10,000 steps goal.'
            );
            await AsyncStorage.setItem(milestoneKey, 'true');
          }
        }
      } catch (err) {
        console.error('Pedometer auto-sync failed:', err);
      }
    }, 10000);

    return () => clearTimeout(syncTimeout);
  }, [steps, userId, calories]);

  return (
    <PedometerContext.Provider value={{ isAvailable, steps, calories, debugInfo, syncSteps: () => syncSteps(true) }}>
      {children}
    </PedometerContext.Provider>
  );
}

export function usePedometer() {
  return useContext(PedometerContext);
}

