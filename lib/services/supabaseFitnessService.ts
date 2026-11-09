import { supabase } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/dateUtils';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyFitnessStats, FitnessRepository, WaterLogEntry } from './fitness.types';

const DEFAULT_WATER_GOAL = 3000; // 3.0L in ML
const DEFAULT_CALORIE_GOAL = 500;
const DEFAULT_STEP_GOAL = 10000;
const DEFAULT_RESTING_CALORIES = 1850;

async function getOrCreateDailySummary(userId: string, date: string) {
  try {
    const { data, error } = await supabase
      .from('daily_health_summaries')
      .select('*')
      .eq('userId', userId)
      .eq('date', date)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[supabaseFitnessService] getOrCreateDailySummary select notice:', error);
    }

    if (data) return data;
  } catch (err) {
    console.warn('[supabaseFitnessService] getOrCreateDailySummary select err:', err);
  }

  // Retrieve user custom step goal if cached, otherwise fallback to default
  let userStepGoal = DEFAULT_STEP_GOAL;
  try {
    const cachedGoal = await AsyncStorage.getItem(`@gk_step_goal_${userId}`);
    if (cachedGoal) {
      const parsed = parseInt(cachedGoal, 10);
      if (!isNaN(parsed) && parsed > 0) userStepGoal = parsed;
    }
  } catch {}

  // Retrieve user custom water goal (from onboarding or cached goal)
  let userWaterGoalLiters = 3.0;
  try {
    const goalML = await supabaseFitnessService.getWaterGoal(userId);
    if (goalML > 0) {
      userWaterGoalLiters = goalML / 1000;
    }
  } catch {}

  // Create new summary
  const newSummary = {
    summaryId: Crypto.randomUUID(),
    userId,
    date,
    steps: 0,
    stepGoal: userStepGoal,
    activeCalories: 0,
    calorieGoal: DEFAULT_CALORIE_GOAL,
    restingCalories: DEFAULT_RESTING_CALORIES,
    activeMinutes: 0,
    waterIntake: 0,
    waterGoal: userWaterGoalLiters,
    streak: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const { data: insertedData, error: insertError } = await supabase
      .from('daily_health_summaries')
      .insert(newSummary)
      .select()
      .single();

    if (!insertError && insertedData) {
      return insertedData;
    }

    // In case of race condition (unique violation)
    if (insertError?.code === '23505') { 
      const { data: retryData } = await supabase
        .from('daily_health_summaries')
        .select('*')
        .eq('userId', userId)
        .eq('date', date)
        .single();
      if (retryData) return retryData;
    }
  } catch (err) {
    console.warn('[supabaseFitnessService] getOrCreateDailySummary insert notice:', err);
  }

  return newSummary;
}

export const supabaseFitnessService: FitnessRepository = {
  getDailyStats: async (userId: string, date: string): Promise<DailyFitnessStats> => {
    let steps = 0;
    let calories = 0;
    let stepGoal = DEFAULT_STEP_GOAL;
    let waterGoalML = DEFAULT_WATER_GOAL;

    try {
      const summary = await getOrCreateDailySummary(userId, date);
      steps = summary?.steps || 0;
      calories = summary?.activeCalories || 0;
      stepGoal = summary?.stepGoal || DEFAULT_STEP_GOAL;
      if (summary?.waterGoal) {
        waterGoalML = Math.round(summary.waterGoal * 1000);
      }
    } catch (err) {
      console.warn('[supabaseFitnessService] getDailyStats summary notice:', err);
    }

    // Check local step cache
    try {
      const cached = await AsyncStorage.getItem(`@gk_steps_${userId}_${date}`);
      if (cached) {
        const parsed = parseInt(cached, 10);
        if (!isNaN(parsed) && parsed > steps) {
          steps = parsed;
          calories = Math.max(calories, Math.round(parsed * 0.04));
        }
      }
    } catch {}

    // Check water goal (from onboarding or cached goal)
    try {
      const goal = await supabaseFitnessService.getWaterGoal(userId);
      if (goal > 0) {
        waterGoalML = goal;
      }
    } catch {}

    return {
      date,
      steps,
      calories,
      waterGoalML,
      stepGoal,
    };
  },

  updateSteps: async (userId: string, date: string, steps: number, calories: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(`@gk_steps_${userId}_${date}`, steps.toString());
    } catch {}

    try {
      const summary = await getOrCreateDailySummary(userId, date);
      const newSteps = Math.max(summary?.steps || 0, steps);
      const newCalories = Math.max(summary?.activeCalories || 0, calories);
      if (summary?.summaryId) {
        await supabase
          .from('daily_health_summaries')
          .update({
            steps: newSteps,
            activeCalories: newCalories,
            updatedAt: new Date().toISOString(),
          })
          .eq('summaryId', summary.summaryId);
      }
    } catch (err) {
      console.warn('[supabaseFitnessService] updateSteps remote notice:', err);
    }
  },

  getStepGoal: async (userId: string): Promise<number> => {
    try {
      const cached = await AsyncStorage.getItem(`@gk_step_goal_${userId}`);
      if (cached) {
        const parsed = parseInt(cached, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from('daily_health_summaries')
        .select('stepGoal')
        .eq('userId', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.stepGoal) {
        AsyncStorage.setItem(`@gk_step_goal_${userId}`, data.stepGoal.toString()).catch(() => {});
        return data.stepGoal;
      }
    } catch {}

    return DEFAULT_STEP_GOAL;
  },

  setStepGoal: async (userId: string, goal: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(`@gk_step_goal_${userId}`, goal.toString());
    } catch {}

    const today = getLocalDateString(new Date());
    try {
      const summary = await getOrCreateDailySummary(userId, today);
      if (summary?.summaryId) {
        await supabase
          .from('daily_health_summaries')
          .update({
            stepGoal: goal,
            updatedAt: new Date().toISOString(),
          })
          .eq('summaryId', summary.summaryId);
      }
    } catch (err) {
      console.warn('[supabaseFitnessService] setStepGoal remote notice:', err);
    }
  },

  getWaterGoal: async (userId: string): Promise<number> => {
    // 1. Check local cached goal first
    try {
      const cached = await AsyncStorage.getItem(`@gk_water_goal_${userId}`);
      if (cached) {
        const parsed = parseInt(cached, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      const cachedFitness = await AsyncStorage.getItem(`@fitness_water_goal_${userId}`);
      if (cachedFitness) {
        const parsed = parseInt(cachedFitness, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}

    // 2. Check customer onboarding data (both local cache and Supabase)
    try {
      let onboardingDailyWater: string | number | null = null;
      const cachedOnboarding = await AsyncStorage.getItem(`@customer_onboarding_${userId}`);
      if (cachedOnboarding) {
        const parsed = JSON.parse(cachedOnboarding);
        if (parsed?.dailyWaterGoal) {
          onboardingDailyWater = parsed.dailyWaterGoal;
        }
      }

      if (!onboardingDailyWater) {
        const { data: obData } = await supabase
          .from('customer_onboarding')
          .select('dailyWaterGoal')
          .eq('createdBy', userId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (obData?.dailyWaterGoal) {
          onboardingDailyWater = obData.dailyWaterGoal;
        }
      }

      if (onboardingDailyWater) {
        const parsedGoal = parseFloat(String(onboardingDailyWater));
        if (!isNaN(parsedGoal) && parsedGoal > 0) {
          // If in liters (e.g. 2.5, 3.0, 3.5), convert to ML
          const goalML = parsedGoal <= 20 ? Math.round(parsedGoal * 1000) : Math.round(parsedGoal);
          AsyncStorage.setItem(`@gk_water_goal_${userId}`, String(goalML)).catch(() => {});
          AsyncStorage.setItem(`@fitness_water_goal_${userId}`, String(goalML)).catch(() => {});
          return goalML;
        }
      }
    } catch (e) {
      console.warn('[supabaseFitnessService] Error checking onboarding water goal:', e);
    }

    // 3. Check daily_health_summaries in Supabase
    try {
      const { data, error } = await supabase
        .from('daily_health_summaries')
        .select('waterGoal')
        .eq('userId', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data?.waterGoal) {
        const goalML = Math.round(data.waterGoal * 1000);
        AsyncStorage.setItem(`@gk_water_goal_${userId}`, String(goalML)).catch(() => {});
        return goalML;
      }
    } catch {}

    return DEFAULT_WATER_GOAL;
  },

  setWaterGoal: async (userId: string, goalML: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(`@gk_water_goal_${userId}`, goalML.toString());
      await AsyncStorage.setItem(`@fitness_water_goal_${userId}`, goalML.toString());
    } catch {}

    const today = getLocalDateString(new Date());
    try {
      const summary = await getOrCreateDailySummary(userId, today);
      if (summary?.summaryId) {
        await supabase
          .from('daily_health_summaries')
          .update({
            waterGoal: goalML / 1000,
            updatedAt: new Date().toISOString(),
          })
          .eq('summaryId', summary.summaryId);
      }
    } catch (e) {
      console.warn('[supabaseFitnessService] setWaterGoal remote notice:', e);
    }
  },

  logWater: async (userId: string, amountML: number, date: string): Promise<WaterLogEntry> => {
    const now = new Date();
    const logId = Crypto.randomUUID();
    const newEntry: WaterLogEntry = {
      id: logId,
      date,
      timestamp: now.getTime(),
      amountML,
    };

    // 1. Immediately persist locally in AsyncStorage
    const storageKey = `@fitness_water_logs_${userId}_${date}`;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const existing: WaterLogEntry[] = raw ? JSON.parse(raw) : [];
      const updated = [...existing, newEntry];
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (localErr) {
      console.warn('[supabaseFitnessService] Error saving water log locally:', localErr);
    }

    // 2. Attempt remote Supabase sync (does not throw or block if RLS or offline)
    try {
      const newLog = {
        logId,
        userId,
        metricType: 'WATER',
        value: amountML,
        unit: 'ml',
        loggedAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await supabase.from('health_metric_logs').insert(newLog);

      const summary = await getOrCreateDailySummary(userId, date);
      if (summary?.summaryId) {
        const newWaterIntake = (summary.waterIntake || 0) + (amountML / 1000);
        await supabase
          .from('daily_health_summaries')
          .update({
            waterIntake: newWaterIntake,
            updatedAt: now.toISOString(),
          })
          .eq('summaryId', summary.summaryId);
      }
    } catch (remoteErr) {
      console.warn('[supabaseFitnessService] Remote water log sync notice:', remoteErr);
    }

    return newEntry;
  },

  deleteWaterLog: async (userId: string, logId: string, amountML: number, date: string): Promise<void> => {
    // 1. Remove locally
    const storageKey = `@fitness_water_logs_${userId}_${date}`;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const existing: WaterLogEntry[] = JSON.parse(raw);
        const updated = existing.filter((log) => log.id !== logId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      }
    } catch (localErr) {
      console.warn('[supabaseFitnessService] Error deleting water log locally:', localErr);
    }

    // 2. Attempt remote delete
    try {
      await supabase
        .from('health_metric_logs')
        .delete()
        .eq('logId', logId)
        .eq('userId', userId);

      const summary = await getOrCreateDailySummary(userId, date);
      if (summary?.summaryId) {
        const newWaterIntake = Math.max(0, (summary.waterIntake || 0) - (amountML / 1000));
        await supabase
          .from('daily_health_summaries')
          .update({
            waterIntake: newWaterIntake,
            updatedAt: new Date().toISOString(),
          })
          .eq('summaryId', summary.summaryId);
      }
    } catch (remoteErr) {
      console.warn('[supabaseFitnessService] Remote deleteWaterLog notice:', remoteErr);
    }
  },

  getWaterLogs: async (userId: string, date: string): Promise<WaterLogEntry[]> => {
    const storageKey = `@fitness_water_logs_${userId}_${date}`;
    let localLogs: WaterLogEntry[] = [];
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        localLogs = JSON.parse(raw);
      }
    } catch {}

    let remoteLogs: WaterLogEntry[] = [];
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('health_metric_logs')
        .select('*')
        .eq('userId', userId)
        .eq('metricType', 'WATER')
        .gte('loggedAt', startOfDay.toISOString())
        .lte('loggedAt', endOfDay.toISOString())
        .order('loggedAt', { ascending: true });

      if (!error && data) {
        remoteLogs = data.map(log => ({
          id: log.logId,
          date,
          timestamp: new Date(log.loggedAt).getTime(),
          amountML: log.value,
        }));
      }
    } catch (err) {
      console.warn('[supabaseFitnessService] Remote getWaterLogs notice:', err);
    }

    // Merge remote and local (deduplicate by id)
    const logMap = new Map<string, WaterLogEntry>();
    remoteLogs.forEach((log) => logMap.set(log.id, log));
    localLogs.forEach((log) => logMap.set(log.id, log));

    const merged = Array.from(logMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Keep local cache fresh with merged logs
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
    } catch {}

    return merged;
  },

  getDailyTotalWater: async (userId: string, date: string): Promise<number> => {
    try {
      const logs = await supabaseFitnessService.getWaterLogs(userId, date);
      return logs.reduce((acc, item) => acc + (item.amountML || 0), 0);
    } catch {
      return 0;
    }
  }
};
