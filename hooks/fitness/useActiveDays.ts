import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';

export interface ActiveDaysData {
  activeDaysCount: number;
  totalDaysInMonth: number;
  daysLeft: number;
  currentDay: number;
  monthName: string;
  activeDates: string[];
}

const getStorageKey = (userId: string) => `@gk_active_days_${userId}`;

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Records the current day as an active app open day for the user.
 * Stores in AsyncStorage and syncs to Supabase daily_health_summaries.
 */
export async function recordActiveDay(userId: string | null): Promise<void> {
  if (!userId) return;
  const todayStr = getLocalDateString(new Date());

  try {
    // 1. Local AsyncStorage record
    const storageKey = getStorageKey(userId);
    const existingRaw = await AsyncStorage.getItem(storageKey);
    let days: string[] = [];
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) {
          days = parsed;
        }
      } catch {}
    }
    if (!days.includes(todayStr)) {
      days.push(todayStr);
      await AsyncStorage.setItem(storageKey, JSON.stringify(days));
    }

    // 2. Sync to Supabase daily_health_summaries (cloud persistent storage)
    const { data: existingSummary } = await supabase
      .from('daily_health_summaries')
      .select('summaryId')
      .eq('userId', userId)
      .eq('date', todayStr)
      .maybeSingle();

    if (!existingSummary) {
      const newId = Crypto.randomUUID();
      await supabase
        .from('daily_health_summaries')
        .insert({
          summaryId: newId,
          userId,
          date: todayStr,
          steps: 0,
          activeCalories: 0,
          restingCalories: 1850,
          waterIntake: 0,
          streak: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
    } else {
      await supabase
        .from('daily_health_summaries')
        .update({ updatedAt: new Date().toISOString() })
        .eq('summaryId', existingSummary.summaryId);
    }
  } catch (err) {
    console.warn('[useActiveDays] Error recording active day:', err);
  }
}

export function useActiveDays(userId: string | null) {
  const queryClient = useQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const daysLeft = Math.max(0, totalDaysInMonth - currentDay);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleString('default', { month: 'long' });

  // Record active day on hook invocation
  useEffect(() => {
    if (userId) {
      recordActiveDay(userId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['activeDays', userId, monthPrefix] });
      });
    }
  }, [userId, monthPrefix]);

  return useQuery<ActiveDaysData>({
    queryKey: ['activeDays', userId, monthPrefix],
    queryFn: async (): Promise<ActiveDaysData> => {
      if (!userId) {
        return {
          activeDaysCount: 0,
          totalDaysInMonth,
          daysLeft,
          currentDay,
          monthName,
          activeDates: [],
        };
      }

      const todayStr = getLocalDateString(now);
      const uniqueDays = new Set<string>();
      // User is viewing the app right now, so today is guaranteed active
      uniqueDays.add(todayStr);

      // 1. Read from AsyncStorage
      try {
        const storageKey = getStorageKey(userId);
        const existingRaw = await AsyncStorage.getItem(storageKey);
        if (existingRaw) {
          const days: string[] = JSON.parse(existingRaw);
          if (Array.isArray(days)) {
            days.forEach((d) => {
              if (typeof d === 'string' && d.startsWith(monthPrefix)) {
                uniqueDays.add(d);
              }
            });
          }
        }
      } catch (err) {
        console.warn('[useActiveDays] AsyncStorage read error:', err);
      }

      // 2. Query Supabase daily_health_summaries, workouts, and measurements for this month
      try {
        const startDate = `${monthPrefix}-01`;
        const endDate = `${monthPrefix}-${String(totalDaysInMonth).padStart(2, '0')}`;

        const [dailyRes, workoutRes, measureRes] = await Promise.allSettled([
          supabase
            .from('daily_health_summaries')
            .select('date')
            .eq('userId', userId)
            .gte('date', startDate)
            .lte('date', endDate),
          supabase
            .from('customer_workout_logs')
            .select('loggedAt')
            .eq('userId', userId)
            .gte('loggedAt', `${startDate}T00:00:00`)
            .lte('loggedAt', `${endDate}T23:59:59`),
          supabase
            .from('customer_measurements')
            .select('loggedAt')
            .eq('userId', userId)
            .gte('loggedAt', `${startDate}T00:00:00`)
            .lte('loggedAt', `${endDate}T23:59:59`),
        ]);

        if (dailyRes.status === 'fulfilled' && dailyRes.value.data) {
          dailyRes.value.data.forEach((row: any) => {
            if (row.date && String(row.date).startsWith(monthPrefix)) {
              uniqueDays.add(String(row.date).slice(0, 10));
            }
          });
        }

        if (workoutRes.status === 'fulfilled' && workoutRes.value.data) {
          workoutRes.value.data.forEach((row: any) => {
            if (row.loggedAt) {
              const dStr = getLocalDateString(new Date(row.loggedAt));
              if (dStr.startsWith(monthPrefix)) {
                uniqueDays.add(dStr);
              }
            }
          });
        }

        if (measureRes.status === 'fulfilled' && measureRes.value.data) {
          measureRes.value.data.forEach((row: any) => {
            if (row.loggedAt) {
              const dStr = getLocalDateString(new Date(row.loggedAt));
              if (dStr.startsWith(monthPrefix)) {
                uniqueDays.add(dStr);
              }
            }
          });
        }

        // Cache merged dates back into AsyncStorage
        const storageKey = getStorageKey(userId);
        const allDates = Array.from(uniqueDays);
        await AsyncStorage.setItem(storageKey, JSON.stringify(allDates));
      } catch (err) {
        console.warn('[useActiveDays] Supabase sync error:', err);
      }

      // Filter to dates in this month up to today
      const validThisMonthDays = Array.from(uniqueDays).filter((d) => {
        if (!d.startsWith(monthPrefix)) return false;
        const dayNum = parseInt(d.slice(8, 10), 10);
        return dayNum >= 1 && dayNum <= currentDay;
      });

      const activeDaysCount = validThisMonthDays.length;

      return {
        activeDaysCount,
        totalDaysInMonth,
        daysLeft,
        currentDay,
        monthName,
        activeDates: validThisMonthDays,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

