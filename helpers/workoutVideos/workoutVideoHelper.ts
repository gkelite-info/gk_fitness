import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { base64ToArrayBuffer } from '@/components/imageCompressor';
import { Platform } from 'react-native';

export interface WorkoutVideoAttributes {
  workoutVideoId?: string;
  workoutId: string;
  videoUrl: string;
  exerciseName?: string | null;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveWorkoutVideoParams {
  workoutVideoId?: string;
  workoutId: string;
  videoUrl: string;
  exerciseName?: string;
}

export async function fetchWorkoutVideos(page: number = 1, limit: number = 10, workoutType: string = 'all') {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('workout_videos')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (workoutType !== 'all') {
    const { data: matchedWorkouts } = await supabase
      .from('workouts')
      .select('workoutId')
      .eq('workoutType', workoutType);

    const workoutIds = matchedWorkouts?.map((w: any) => w.workoutId) || [];

    if (workoutIds.length > 0) {
      query = query.in('workoutId', workoutIds);
    } else {
      return { data: [], total: 0 };
    }
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('[workoutVideoHelper] fetchWorkoutVideos Error:', error);
    throw error;
  }

  return {
    data: data ?? [],
    total: count ?? 0,
  };
}

export async function fetchWorkoutVideosByWorkoutId(workoutId: string) {
  const { data, error } = await supabase
    .from('workout_videos')
    .select('*')
    .eq('workoutId', workoutId)
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[workoutVideoHelper] fetchWorkoutVideosByWorkoutId Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchWorkoutVideoById(workoutVideoId: string) {
  const { data, error } = await supabase
    .from('workout_videos')
    .select('*')
    .eq('workoutVideoId', workoutVideoId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[workoutVideoHelper] fetchWorkoutVideoById Error:', error);
    throw error;
  }

  return data;
}

export async function saveWorkoutVideo(videoData: SaveWorkoutVideoParams) {
  const now = new Date().toISOString();

  if (videoData.workoutVideoId) {
    const { data, error } = await supabase
      .from('workout_videos')
      .update({
        workoutId: videoData.workoutId,
        videoUrl: videoData.videoUrl,
        exerciseName: videoData.exerciseName,
        updatedAt: now,
      })
      .eq('workoutVideoId', videoData.workoutVideoId)
      .select();

    if (error) {
      console.error('[workoutVideoHelper] saveWorkoutVideo Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = videoData.workoutVideoId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('workout_videos')
      .insert([
        {
          workoutVideoId: generatedId,
          workoutId: videoData.workoutId,
          videoUrl: videoData.videoUrl,
          exerciseName: videoData.exerciseName || null,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[workoutVideoHelper] saveWorkoutVideo Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteWorkoutVideo(workoutVideoId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('workout_videos')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('workoutVideoId', workoutVideoId)
    .select();

  if (error) {
    console.error('[workoutVideoHelper] deleteWorkoutVideo Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function uploadWorkoutVideoFile(uri: string, fileExtension: string = 'mp4'): Promise<string | null> {
  try {
    const fileName = `${Date.now()}_video.${fileExtension}`;
    let fileData: ArrayBuffer | Blob;

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      fileData = await response.blob();
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      fileData = base64ToArrayBuffer(base64);
    }

    const contentType = fileExtension.toLowerCase() === 'gif' ? 'image/gif' : `video/${fileExtension}`;

    const { data, error } = await supabase.storage
      .from('workout-videos')
      .upload(fileName, fileData, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    if (data) {
      return fileName;
    }
    return null;
  } catch (error: any) {
    console.error('[workoutVideoHelper] uploadWorkoutVideoFile Error:', error);
    throw error;
  }
}
