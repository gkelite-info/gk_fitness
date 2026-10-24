import { supabase } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/dateUtils';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyFitnessStats, FitnessRepository, WaterLogEntry } from './fitness.types';

const DEFAULT_WATER_GOAL = 2500; // 2.5L in ML
const DEFAULT_CALORIE_GOAL = 500;
const DEFAULT_STEP_GOAL = 10000;
const DEFAULT_RESTING_CALORIES = 1850;

async function getOrCreateDailySummary(userId: string, date: string) {
  const { data, error } = await supabase
    .from('daily_health_summaries')
    .select('*')
    .eq('userId', userId)
    .eq('date', date)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) return data;

  // Retrieve user custom step goal if cached, otherwise fallback to default
  let userStepGoal = DEFAULT_STEP_GOAL;
  try {
    const cachedGoal = await AsyncStorage.getItem(`@gk_step_goal_${userId}`);
    if (cachedGoal) {
      const parsed = parseInt(cachedGoal, 10);
      if (!isNaN(parsed) && parsed > 0) userStepGoal = parsed;
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
    waterGoal: 2.5,
    streak: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { data: insertedData, error: insertError } = await supabase
    .from('daily_health_summaries')
    .insert(newSummary)
    .select()
    .single();

  if (insertError) {
    // In case of race condition (unique violation)
    if (insertError.code === '23505') { 
      const { data: retryData } = await supabase
        .from('daily_health_summaries')
        .select('*')
        .eq('userId', userId)
        .eq('date', date)
        .single();
      return retryData;
    }
    throw insertError;
  }
  return insertedData;
}

export const supabaseFitnessService: FitnessRepository = {
  getDailyStats: async (userId: string, date: string): Promise<DailyFitnessStats> => {
    try {
      const summary = await getOrCreateDailySummary(userId, date);
      let steps = summary.steps || 0;
      let calories = summary.activeCalories || 0;

      // Check local cache in case steps were updated offline or pending debounce
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

      return {
        date: summary.date,
        steps,
        calories,
        waterGoalML: (summary.waterGoal || 2.5) * 1000,
        stepGoal: summary.stepGoal || DEFAULT_STEP_GOAL,
      };
    } catch (err) {
      console.warn('[supabaseFitnessService] getDailyStats fallback to local cache:', err);
      let cachedSteps = 0;
      try {
        const cached = await AsyncStorage.getItem(`@gk_steps_${userId}_${date}`);
        if (cached) cachedSteps = parseInt(cached, 10) || 0;
      } catch {}

      return {
        date,
        steps: cachedSteps,
        calories: Math.round(cachedSteps * 0.04),
        waterGoalML: DEFAULT_WATER_GOAL,
        stepGoal: DEFAULT_STEP_GOAL,
      };
    }
  },

  updateSteps: async (userId: string, date: string, steps: number, calories: number): Promise<void> => {
    // Cache locally immediately
    try {
      await AsyncStorage.setItem(`@gk_steps_${userId}_${date}`, steps.toString());
    } catch {}

    const summary = await getOrCreateDailySummary(userId, date);
    const newSteps = Math.max(summary.steps || 0, steps);
    const newCalories = Math.max(summary.activeCalories || 0, calories);
    const { error } = await supabase
      .from('daily_health_summaries')
      .update({
        steps: newSteps,
        activeCalories: newCalories,
        updatedAt: new Date().toISOString(),
      })
      .eq('summaryId', summary.summaryId);

    if (error) throw error;
  },

  getStepGoal: async (userId: string): Promise<number> => {
    try {
      const cached = await AsyncStorage.getItem(`@gk_step_goal_${userId}`);
      if (cached) {
        const parsed = parseInt(cached, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}

    const { data, error } = await supabase
      .from('daily_health_summaries')
      .select('stepGoal')
      .eq('userId', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && data.stepGoal) {
      try {
        await AsyncStorage.setItem(`@gk_step_goal_${userId}`, data.stepGoal.toString());
      } catch {}
      return data.stepGoal;
    }
    return DEFAULT_STEP_GOAL;
  },

  setStepGoal: async (userId: string, goal: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(`@gk_step_goal_${userId}`, goal.toString());
    } catch {}

    const today = getLocalDateString(new Date());
    const summary = await getOrCreateDailySummary(userId, today);
    const { error } = await supabase
      .from('daily_health_summaries')
      .update({
        stepGoal: goal,
        updatedAt: new Date().toISOString(),
      })
      .eq('summaryId', summary.summaryId);

    if (error) throw error;
  },

  getWaterGoal: async (userId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('daily_health_summaries')
      .select('waterGoal')
      .eq('userId', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) throw error;
    if (data && data.waterGoal) return data.waterGoal * 1000;
    return DEFAULT_WATER_GOAL;
  },

  setWaterGoal: async (userId: string, goalML: number): Promise<void> => {
    const today = getLocalDateString(new Date());
    const summary = await getOrCreateDailySummary(userId, today);
    const { error } = await supabase
      .from('daily_health_summaries')
      .update({
        waterGoal: goalML / 1000,
        updatedAt: new Date().toISOString(),
      })
      .eq('summaryId', summary.summaryId);

    if (error) throw error;
  },

  logWater: async (userId: string, amountML: number, date: string): Promise<WaterLogEntry> => {
    const now = new Date();
    
    const newLog = {
      logId: Crypto.randomUUID(),
      userId,
      metricType: 'WATER',
      value: amountML,
      unit: 'ml',
      loggedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const { error: logError } = await supabase
      .from('health_metric_logs')
      .insert(newLog);

    if (logError) throw logError;

    const summary = await getOrCreateDailySummary(userId, date);
    const newWaterIntake = (summary.waterIntake || 0) + (amountML / 1000);
    
    const { error: updateError } = await supabase
      .from('daily_health_summaries')
      .update({
        waterIntake: newWaterIntake,
        updatedAt: now.toISOString(),
      })
      .eq('summaryId', summary.summaryId);

    if (updateError) throw updateError;

    return {
      id: newLog.logId,
      date,
      timestamp: now.getTime(),
      amountML,
    };
  },

  deleteWaterLog: async (userId: string, logId: string, amountML: number, date: string): Promise<void> => {
    const { error: logError } = await supabase
      .from('health_metric_logs')
      .delete()
      .eq('logId', logId)
      .eq('userId', userId);

    if (logError) throw logError;

    const summary = await getOrCreateDailySummary(userId, date);
    const newWaterIntake = Math.max(0, (summary.waterIntake || 0) - (amountML / 1000));
    
    const { error: updateError } = await supabase
      .from('daily_health_summaries')
      .update({
        waterIntake: newWaterIntake,
        updatedAt: new Date().toISOString(),
      })
      .eq('summaryId', summary.summaryId);

    if (updateError) throw updateError;
  },

  getWaterLogs: async (userId: string, date: string): Promise<WaterLogEntry[]> => {
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

    if (error) throw error;

    return (data || []).map(log => ({
      id: log.logId,
      date,
      timestamp: new Date(log.loggedAt).getTime(),
      amountML: log.value,
    }));
  },

  getDailyTotalWater: async (userId: string, date: string): Promise<number> => {
    const summary = await getOrCreateDailySummary(userId, date);
    return (summary.waterIntake || 0) * 1000;
  }
};
