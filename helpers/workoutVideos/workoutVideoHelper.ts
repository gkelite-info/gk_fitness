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

export function mapWorkoutTypeToDbEnums(workoutType?: string): string[] {
  if (!workoutType) return [];
  const normalized = workoutType.toLowerCase().trim();
  if (!normalized || normalized === 'all') return [];

  if (normalized === 'legs' || normalized === 'leg' || normalized === 'lower body') {
    return ['hips', 'calves', 'legs'];
  }
  if (normalized === 'arms' || normalized === 'arm') {
    return ['biceps', 'triceps', 'forearms', 'arms'];
  }
  if (normalized.startsWith('shoulder')) {
    return ['shoulder'];
  }
  if (normalized.startsWith('tricep')) {
    return ['triceps', 'tricep'];
  }
  if (normalized.startsWith('bicep')) {
    return ['biceps'];
  }
  if (normalized === 'abs' || normalized === 'core') {
    return ['abs'];
  }
  if (normalized === 'chest') {
    return ['chest'];
  }
  if (normalized === 'back') {
    return ['back'];
  }
  if (normalized === 'calves' || normalized === 'calf') {
    return ['calves'];
  }
  if (normalized === 'hips' || normalized === 'hip') {
    return ['hips'];
  }
  if (normalized === 'cardio') {
    return ['cardio'];
  }
  if (normalized === 'forearms' || normalized === 'forearm') {
    return ['forearms'];
  }
  if (normalized === 'trapezius' || normalized === 'traps') {
    return ['trapezius'];
  }

  return [normalized];
}

export async function fetchWorkoutVideos(
  page: number = 1,
  limit: number = 10,
  workoutType: string = 'all',
  role: string = 'all',
  isStretching: string = 'all'
) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('workout_videos')
    .select('*', { count: 'exact' })
    .or('is_deleted.eq.false,is_deleted.is.null')
    .order('createdAt', { ascending: false });

  const mappedTypes = mapWorkoutTypeToDbEnums(workoutType);
  const normalizedRole = (role || 'all').toLowerCase().trim();
  const isRoleFilterActive = normalizedRole === 'male' || normalizedRole === 'female';

  if (mappedTypes.length > 0 || isRoleFilterActive || isStretching !== 'all') {
    const buildWorkoutsQuery = (applyRole: boolean) => {
      let q = supabase
        .from('workouts')
        .select('workoutId')
        .or('is_deleted.eq.false,is_deleted.is.null');

      if (mappedTypes.length === 1) {
        q = q.eq('workoutType', mappedTypes[0]);
      } else if (mappedTypes.length > 1) {
        q = q.in('workoutType', mappedTypes);
      }

      if (applyRole && isRoleFilterActive) {
        q = q.eq('role', normalizedRole);
      }

      if (isStretching !== 'all') {
        if (isStretching === 'stretching') {
          q = q.eq('isStretching', true);
        } else {
          q = q.or('isStretching.eq.false,isStretching.is.null');
        }
      }

      return q;
    };

    let { data: matchedWorkouts, error: workoutsError } = await buildWorkoutsQuery(true);

    if (workoutsError) {
      console.warn('[workoutVideoHelper] workoutsQuery error:', workoutsError);
    }

    let workoutIds = matchedWorkouts?.map((w: any) => w.workoutId) || [];

    // Fallback 1: If role was filtered (e.g. 'female' or 'male') but no workouts were found, try matching without the role filter
    if (workoutIds.length === 0 && isRoleFilterActive) {
      const fallbackRes = await buildWorkoutsQuery(false);
      workoutIds = fallbackRes.data?.map((w: any) => w.workoutId) || [];
    }

    if (workoutIds.length > 0) {
      query = query.in('workoutId', workoutIds);
    } else {
      console.warn(`[workoutVideoHelper] No workouts matched for type="${workoutType}" and role="${role}".`);
    }
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    if (error.code === 'PGRST103') {
      return { data: [], total: count ?? 0 };
    }
    console.error('[workoutVideoHelper] fetchWorkoutVideos Error:', error);
    throw error;
  }

  // Fallback 2: If on page 1 the returned data is completely empty,
  // do a safety fallback so the user NEVER gets an empty recommended/more exercises screen!
  if ((!data || data.length === 0) && page === 1 && workoutType !== 'all') {
    const fallbackQuery = await supabase
      .from('workout_videos')
      .select('*', { count: 'exact' })
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (fallbackQuery.data && fallbackQuery.data.length > 0) {
      return {
        data: fallbackQuery.data,
        total: fallbackQuery.count ?? fallbackQuery.data.length,
      };
    }
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
