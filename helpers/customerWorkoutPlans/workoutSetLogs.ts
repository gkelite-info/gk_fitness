import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type SetType = 'working' | 'warmup' | 'dropset';

export interface SetLogParams {
  userId: string;
  dayExerciseId: string;
  planDayId: string;
  sessionDate: string; // ISO date string e.g. "2026-09-11T00:00:00.000Z"
  setNumber: number;
  setType: SetType;
  weight: number;
  reps: number;
  isCompleted: boolean;
  completedAt?: string | null;
}

export async function upsertSetLog(params: SetLogParams) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('customer_workout_set_logs')
    .upsert(
      {
        customerWorkoutSetLogId: Crypto.randomUUID(),
        userId: params.userId,
        dayExerciseId: params.dayExerciseId,
        planDayId: params.planDayId,
        sessionDate: params.sessionDate,
        setNumber: params.setNumber,
        setType: params.setType,
        weight: params.weight,
        reps: params.reps,
        isCompleted: params.isCompleted,
        completedAt: params.completedAt ?? now,
        createdAt: now,
        updatedAt: now,
      },
      {
        onConflict: 'userId,planDayId,dayExerciseId,sessionDate,setNumber',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[workoutSetLogs] upsertSetLog error:', error);
    throw error;
  }

  return data;
}

export async function fetchTodaySetLogs(
  userId: string,
  planDayId: string,
  sessionDate: string
) {
  const { data, error } = await supabase
    .from('customer_workout_set_logs')
    .select('*')
    .eq('userId', userId)
    .eq('planDayId', planDayId)
    .eq('sessionDate', sessionDate)
    .is('deletedAt', null)
    .order('dayExerciseId', { ascending: true })
    .order('setNumber', { ascending: true });

  if (error) {
    console.error('[workoutSetLogs] fetchTodaySetLogs error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchLastSessionWeights(
  userId: string,
  dayExerciseId: string,
  currentSessionDate: string
): Promise<{ setNumber: number; weight: number; reps: number }[]> {
  // Find the most recent previous session date for this exercise
  const { data: latestSessionData, error: latestError } = await supabase
    .from('customer_workout_set_logs')
    .select('sessionDate')
    .eq('userId', userId)
    .eq('dayExerciseId', dayExerciseId)
    .lt('sessionDate', currentSessionDate)
    .is('deletedAt', null)
    .order('sessionDate', { ascending: false })
    .limit(1);

  if (latestError) {
    console.error('[workoutSetLogs] fetchLastSessionWeights latestSession error:', latestError);
    return [];
  }

  if (!latestSessionData || latestSessionData.length === 0) {
    return []; // No previous session — don't pre-fill
  }

  const lastDate = latestSessionData[0].sessionDate;

  const { data, error } = await supabase
    .from('customer_workout_set_logs')
    .select('setNumber, weight, reps')
    .eq('userId', userId)
    .eq('dayExerciseId', dayExerciseId)
    .eq('sessionDate', lastDate)
    .is('deletedAt', null)
    .order('setNumber', { ascending: true });

  if (error) {
    console.error('[workoutSetLogs] fetchLastSessionWeights sets error:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    setNumber: row.setNumber,
    weight: row.weight,
    reps: row.reps,
  }));
}
