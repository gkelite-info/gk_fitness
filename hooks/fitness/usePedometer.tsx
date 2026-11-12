import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getLocalDateString } from '@/lib/dateUtils';
import { useUser } from '@/context/UserContext';
import { supabaseFitnessService } from '@/lib/services/supabaseFitnessService';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { watchBridge } from '@/lib/watch/watchBridge';
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
  syncSteps: async () => { },
});

const getStepsCacheKey = (userId: string, date: string) => `@gk_steps_${userId}_${date}`;
const getRawCounterKey = (userId: string) => `@gk_android_raw_counter_${userId}`;
const getRawCounterDateKey = (userId: string) => `@gk_android_raw_counter_date_${userId}`;

export function PedometerProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [steps, setSteps] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  const { userId } = useUser();
  const hcReadyRef = useRef(false);

  // iOS step tracking ref (preserves native CoreMotion handler)
  const lastWatchStepsRef = useRef(0);

  // Android step tracking refs:
  const lastAndroidReadingRef = useRef(-1);
  const lastAndroidRawStepsRef = useRef(-1);
  const savedRawOnLaunchRef = useRef(-1);
  const accelLiveDeltaRef = useRef(0);
  const accelSubRef = useRef<any>(null);
  const lastStepTimeRef = useRef(0);
  const accelValleyDetectedRef = useRef(false);

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

          // Preload saved raw counter so the first hardware event has instant baseline for killed-app recovery
          if (Platform.OS === 'android') {
            const [[, savedRawStr], [, savedDate]] = await AsyncStorage.multiGet([
              getRawCounterKey(userId),
              getRawCounterDateKey(userId),
            ]);
            if (savedRawStr && savedDate === today) {
              const parsedRaw = parseFloat(savedRawStr);
              if (!isNaN(parsedRaw) && parsedRaw > 0) {
                savedRawOnLaunchRef.current = parsedRaw;
              }
            }
          }
        } catch { }

        // Supabase DB fetch
        const summary = await supabaseFitnessService.getDailyStats(userId, today);
        if (isCurrent && summary && typeof summary.steps === 'number' && summary.steps > 0) {
          setSteps(prev => {
            const best = Math.max(prev, summary.steps);
            AsyncStorage.setItem(getStepsCacheKey(userId, today), best.toString()).catch(() => { });
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
    if (Platform.OS !== 'android' || !HealthConnect) return 0;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      if (HealthConnect.aggregateRecord) {
        try {
          const result = await HealthConnect.aggregateRecord({
            recordType: 'Steps',
            timeRangeFilter: {
              operator: 'between',
              startTime: startOfDay.toISOString(),
              endTime: now.toISOString(),
            },
          });
          if (result && typeof result.COUNT_TOTAL === 'number' && result.COUNT_TOTAL > 0) {
            return result.COUNT_TOTAL;
          }
        } catch { }
      }

      if (HealthConnect.readRecords) {
        try {
          const result = await HealthConnect.readRecords('Steps', {
            timeRangeFilter: {
              operator: 'between',
              startTime: startOfDay.toISOString(),
              endTime: now.toISOString(),
            },
          });
          if (result && Array.isArray(result.records) && result.records.length > 0) {
            const sum = result.records.reduce((acc: number, r: any) => acc + (r?.count || 0), 0);
            if (sum > 0) return sum;
          }
        } catch { }
      }

      return 0;
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
          } catch { }
        }

        const bestSteps = Math.max(coremotionSteps, cachedSteps);
        if (isMounted && bestSteps > 0) {
          setSteps(prev => {
            const best = Math.max(prev, bestSteps);
            if (userId) {
              AsyncStorage.setItem(getStepsCacheKey(userId, today), best.toString()).catch(() => { });
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
          } catch { }
        }

        const bestSteps = Math.max(hcSteps, cachedSteps);
        if (isMounted && bestSteps > 0) {
          setSteps(prev => {
            const best = Math.max(prev, bestSteps);
            if (userId) {
              AsyncStorage.setItem(getStepsCacheKey(userId, today), best.toString()).catch(() => { });
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

    // ── Helper: Live foreground accelerometer watcher on Android ──
    const startAccelerometer = () => {
      if (Platform.OS !== 'android') return;
      try {
        if (accelSubRef.current) return;
        Accelerometer.setUpdateInterval(50); // 20Hz sampling for instantaneous live response
        accelSubRef.current = Accelerometer.addListener((measurement) => {
          const now = Date.now();
          const { x, y, z } = measurement;
          const magnitude = Math.sqrt(x * x + y * y + z * z);

          // Human walking step pattern: valley (<0.94g) followed by impact peak (>1.18g)
          if (magnitude < 0.94) {
            accelValleyDetectedRef.current = true;
          } else if (magnitude > 1.18 && accelValleyDetectedRef.current) {
            const timeSinceLast = now - lastStepTimeRef.current;
            // Human cadence limiter: minimum 260ms between consecutive steps
            if (timeSinceLast >= 260) {
              lastStepTimeRef.current = now;
              accelValleyDetectedRef.current = false;

              if (isMounted) {
                accelLiveDeltaRef.current += 1;
                setSteps(prev => {
                  const next = prev + 1;
                  if (userId) {
                    const today = getLocalDateString(new Date());
                    AsyncStorage.setItem(getStepsCacheKey(userId, today), next.toString()).catch(() => { });
                  }
                  return next;
                });
              }
            }
          }
        });
      } catch (err) {
        console.warn('[Pedometer] Accelerometer listener setup error:', err);
      }
    };

    const stopAccelerometer = () => {
      if (accelSubRef.current) {
        try {
          accelSubRef.current.remove();
        } catch { }
        accelSubRef.current = null;
      }
    };

    const subscribe = async () => {
      try {
        if (Platform.OS === 'android') {
          // ── Step 1: Health Connect Initialization (Awaited so initial sync recovers killed-app steps!) ──
          if (HealthConnect) {
            try {
              let hcAvailable = false;
              if (HealthConnect.getSdkStatus) {
                const status = await HealthConnect.getSdkStatus();
                hcAvailable = status === HealthConnect.SdkAvailabilityStatus?.SDK_AVAILABLE || status === 3;
              }

              if (hcAvailable && HealthConnect.initialize) {
                const isInitialized = await HealthConnect.initialize();
                if (isInitialized) {
                  let hasPermission = false;
                  try {
                    if (HealthConnect.getGrantedPermissions) {
                      const granted = await HealthConnect.getGrantedPermissions();
                      hasPermission = Array.isArray(granted) && granted.some((p: any) => p.recordType === 'Steps');
                    }
                  } catch { }

                  if (!hasPermission && HealthConnect.requestPermission) {
                    try {
                      const requested = await HealthConnect.requestPermission([
                        { accessType: 'read', recordType: 'Steps' },
                      ]);
                      hasPermission = Array.isArray(requested) && requested.some((p: any) => p.recordType === 'Steps');
                    } catch { }
                  }

                  if (hasPermission) {
                    hcReadyRef.current = true;
                  }
                }
              }
            } catch (err: any) {
              console.warn('[Pedometer] Android Health Connect init warning:', err?.message);
            }
          }

          // ── Step 2: Request Activity Recognition permission & check hardware ──
          try {
            await Pedometer.requestPermissionsAsync();
          } catch (permErr: any) {
            console.warn('[Pedometer] Android requestPermissionsAsync error:', permErr);
          }

          const hwAvailable = await Pedometer.isAvailableAsync();
          if (isMounted) {
            setIsAvailable(hwAvailable || hcReadyRef.current);
          }

          // ── Step 3: Initial sync (pulls Health Connect steps from background/killed state) ──
          await syncSteps(isMounted);
          if (!isMounted) return;

          // ── Step 4: Live hardware step watcher on Android ──
          if (hwAvailable && isMounted) {
            lastAndroidReadingRef.current = -1;
            lastAndroidRawStepsRef.current = -1;
            subscription = Pedometer.watchStepCount((result) => {
              if (result && typeof result.steps === 'number') {
                const currentReading = result.steps;
                const currentRaw = (result as any).rawSteps;
                const today = getLocalDateString(new Date());

                // ── A: Killed-app recovery via hardware boot counter (rawSteps) ──
                if (typeof currentRaw === 'number' && currentRaw > 0) {
                  if (lastAndroidRawStepsRef.current < 0) {
                    // First event of this process: recover any steps walked while app was dead/killed
                    if (savedRawOnLaunchRef.current > 0 && currentRaw > savedRawOnLaunchRef.current) {
                      const killedDelta = Math.round(currentRaw - savedRawOnLaunchRef.current);
                      if (killedDelta > 0 && isMounted) {
                        setSteps(prev => {
                          const next = prev + killedDelta;
                          if (userId) {
                            AsyncStorage.setItem(getStepsCacheKey(userId, today), next.toString()).catch(() => { });
                          }
                          return next;
                        });
                      }
                    }
                    lastAndroidRawStepsRef.current = currentRaw;
                  } else if (currentRaw > lastAndroidRawStepsRef.current) {
                    lastAndroidRawStepsRef.current = currentRaw;
                  }

                  if (userId) {
                    AsyncStorage.multiSet([
                      [getRawCounterKey(userId), currentRaw.toString()],
                      [getRawCounterDateKey(userId), today],
                    ]).catch(() => { });
                  }
                }

                // ── B: Relative steps tracking (tracks foreground and background) ──
                if (lastAndroidReadingRef.current < 0) {
                  // Establish baseline for this session
                  lastAndroidReadingRef.current = currentReading;
                  return;
                }

                // If sensor restarted or dropped
                if (currentReading < lastAndroidReadingRef.current) {
                  lastAndroidReadingRef.current = currentReading;
                  return;
                }

                const hwDelta = currentReading - lastAndroidReadingRef.current;
                lastAndroidReadingRef.current = currentReading;

                if (hwDelta > 0 && isMounted) {
                  // Reconcile with any live steps the accelerometer already displayed
                  let stepsToAdd = hwDelta;
                  if (accelLiveDeltaRef.current > 0) {
                    if (hwDelta >= accelLiveDeltaRef.current) {
                      stepsToAdd = hwDelta - accelLiveDeltaRef.current;
                      accelLiveDeltaRef.current = 0;
                    } else {
                      accelLiveDeltaRef.current -= hwDelta;
                      stepsToAdd = 0;
                    }
                  }

                  if (stepsToAdd > 0) {
                    setSteps(prev => {
                      const next = prev + stepsToAdd;
                      if (userId) {
                        AsyncStorage.setItem(getStepsCacheKey(userId, today), next.toString()).catch(() => { });
                      }
                      return next;
                    });
                  }
                }
              }
            });
          }

          // ── Step 5: Live foreground accelerometer watcher ──
          if (isMounted) {
            startAccelerometer();
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

          if (!available || !isMounted) return;

          // Initial sync from CoreMotion (picks up background steps taken while killed/closed)
          await syncSteps(isMounted);
          if (!isMounted) return;

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
                    AsyncStorage.setItem(getStepsCacheKey(userId, today), next.toString()).catch(() => { });
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
        if (Platform.OS === 'ios') {
          lastWatchStepsRef.current = 0;
        } else if (Platform.OS === 'android') {
          // On Android: preserve lastAndroidReadingRef so background walking delta is added accurately!
          startAccelerometer();
        }
        syncSteps(isMounted);
      } else {
        // App backgrounded / minimized: stop accelerometer to save 100% battery
        if (Platform.OS === 'android') {
          stopAccelerometer();
          // Reset live accelerometer pending delta so background hardware delta is 100% authoritative
          accelLiveDeltaRef.current = 0;
        }
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Periodic sync every 5 seconds while app is in foreground
    const interval = setInterval(() => {
      if (isMounted) {
        syncSteps(isMounted);
      }
    }, 5000);

    // Smartwatch Wrist Step Listener (Smartwatch priority reconciliation)
    let watchStepSub: any = null;
    if (Platform.OS === 'android') {
      watchStepSub = watchBridge.onStepSyncReceived((data) => {
        if (!isMounted) return;
        const today = getLocalDateString(new Date());
        if (data && data.steps > 0 && (!data.sessionDate || data.sessionDate === today)) {
          if (!data.userId || data.userId === userId) {
            console.log('[Pedometer] Reconciling smartwatch steps:', data.steps);
            setSteps((prev) => {
              const reconciled = Math.max(prev, data.steps);
              if (userId) {
                AsyncStorage.setItem(getStepsCacheKey(userId, today), reconciled.toString()).catch(() => { });
              }
              return reconciled;
            });
          }
        }
      });
    }

    return () => {
      isMounted = false;
      if (subscription) subscription.remove();
      if (watchStepSub) watchStepSub.remove();
      if (Platform.OS === 'android') stopAccelerometer();
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

