import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymTimingAttributes {
  timingId?: string;
  gymId: string;
  day: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymTimingParams {
  timingId?: string;
  gymId: string;
  day: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  createdBy: string;
  createdAt?: string;
}

export async function fetchGymTimings(gymId: string) {
  const { data, error } = await supabase
    .from('gym_timings')
    .select('*')
    .eq('gymId', gymId)
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[gymTimingsHelper] fetchGymTimings Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function saveGymTiming(timingData: SaveGymTimingParams) {
  const now = new Date().toISOString();

  if (timingData.timingId) {
    const { data, error } = await supabase
      .from('gym_timings')
      .update({
        gymId: timingData.gymId,
        day: timingData.day,
        openTime: timingData.openTime,
        closeTime: timingData.closeTime,
        isClosed: timingData.isClosed,
        updatedAt: now,
      })
      .eq('timingId', timingData.timingId)
      .select();

    if (error) {
      console.error('[gymTimingsHelper] saveGymTiming Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedTimingId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('gym_timings')
      .insert([
        {
          timingId: generatedTimingId,
          gymId: timingData.gymId,
          day: timingData.day,
          openTime: timingData.openTime,
          closeTime: timingData.closeTime,
          isClosed: timingData.isClosed,
          createdBy: timingData.createdBy,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[gymTimingsHelper] saveGymTiming Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function bulkSaveGymTimings(timings: SaveGymTimingParams[]) {
  // Uses upsert so we can save all days in one go
  const now = new Date().toISOString();
  
  const recordsToUpsert = timings.map(timing => ({
    timingId: timing.timingId || Crypto.randomUUID(),
    gymId: timing.gymId,
    day: timing.day,
    openTime: timing.openTime,
    closeTime: timing.closeTime,
    isClosed: timing.isClosed,
    createdBy: timing.createdBy,
    createdAt: timing.createdAt || now,
    updatedAt: now,
  }));

  const { data, error } = await supabase
    .from('gym_timings')
    .upsert(recordsToUpsert, { onConflict: 'gymId, day' })
    .select();

  if (error) {
    console.error('[gymTimingsHelper] bulkSaveGymTimings Error:', error);
    throw error;
  }

  return data ?? [];
}
