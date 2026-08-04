import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { DailyFitnessStats, FitnessRepository, WaterLogEntry } from './fitness.types';

const STORAGE_KEYS = {
  DAILY_STATS: '@fitness_daily_stats_',
  WATER_GOAL: '@fitness_water_goal_',
  WATER_LOGS: '@fitness_water_logs_',
};

const DEFAULT_WATER_GOAL = 2500; // 2.5L

export const localFitnessService: FitnessRepository = {
  getDailyStats: async (userId: string, date: string): Promise<DailyFitnessStats> => {
    const key = `${STORAGE_KEYS.DAILY_STATS}${userId}_${date}`;
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      // Return defaults if none exist
      return {
        date,
        steps: 0,
        calories: 0,
        waterGoalML: DEFAULT_WATER_GOAL,
      };
    } catch (e) {
      console.error('Error fetching daily stats', e);
      throw e;
    }
  },

  updateSteps: async (userId: string, date: string, steps: number, calories: number): Promise<void> => {
    const key = `${STORAGE_KEYS.DAILY_STATS}${userId}_${date}`;
    try {
      const existing = await localFitnessService.getDailyStats(userId, date);
      const updated = { ...existing, steps, calories };
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating steps', e);
      throw e;
    }
  },

  getWaterGoal: async (userId: string): Promise<number> => {
    const key = `${STORAGE_KEYS.WATER_GOAL}${userId}`;
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return parseInt(data, 10);
      }
      return DEFAULT_WATER_GOAL;
    } catch (e) {
      console.error('Error fetching water goal', e);
      throw e;
    }
  },

  setWaterGoal: async (userId: string, goalML: number): Promise<void> => {
    const key = `${STORAGE_KEYS.WATER_GOAL}${userId}`;
    try {
      await AsyncStorage.setItem(key, goalML.toString());
    } catch (e) {
      console.error('Error setting water goal', e);
      throw e;
    }
  },

  logWater: async (userId: string, amountML: number, date: string): Promise<WaterLogEntry> => {
    const key = `${STORAGE_KEYS.WATER_LOGS}${userId}_${date}`;
    try {
      const newEntry: WaterLogEntry = {
        id: Crypto.randomUUID(),
        date,
        timestamp: Date.now(),
        amountML,
      };

      const existingLogs = await localFitnessService.getWaterLogs(userId, date);
      const updatedLogs = [...existingLogs, newEntry];
      await AsyncStorage.setItem(key, JSON.stringify(updatedLogs));

      return newEntry;
    } catch (e) {
      console.error('Error logging water', e);
      throw e;
    }
  },

  getWaterLogs: async (userId: string, date: string): Promise<WaterLogEntry[]> => {
    const key = `${STORAGE_KEYS.WATER_LOGS}${userId}_${date}`;
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (e) {
      console.error('Error fetching water logs', e);
      throw e;
    }
  },

  getDailyTotalWater: async (userId: string, date: string): Promise<number> => {
    try {
      const logs = await localFitnessService.getWaterLogs(userId, date);
      return logs.reduce((total, log) => total + log.amountML, 0);
    } catch (e) {
      console.error('Error calculating total water', e);
      throw e;
    }
  }
};
