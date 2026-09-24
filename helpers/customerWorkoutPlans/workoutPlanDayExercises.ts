import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface WorkoutPlanDayExerciseAttributes {
  dayExerciseId?: string;
  planDayId: string;
  workoutVideoId?: string | null;
  exerciseName: string;
  category: string;
  reps: string;
  order: number;
  sets: number;
  image?: string | null;
  videoUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveWorkoutPlanDayExerciseParams {
  dayExerciseId?: string;
  planDayId: string;
  workoutVideoId?: string | null;
  exerciseName: string;
  category: string;
  reps: string;
  order: number;
  sets: number;
  image?: string | null;
  videoUrl?: string | null;
}

function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

async function getUserGender(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: cust } = await supabase
        .from('gym_customers')
        .select('gender')
        .eq('customerId', user.id)
        .maybeSingle();
      if (cust?.gender) {
        return cust.gender.toLowerCase();
      }
    }
  } catch (e) {
    // ignore error
  }
  return 'male';
}

function isRealVideoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().trim();
  if (lower.includes('unsplash.com')) return false;
  if (lower.includes('workout-videos')) return true;
  if (lower.match(/\.(mp4|mov|webm|gif)(\?.*)?$/i)) return true;
  return false;
}

async function enrichExercisesWithVideos(exercises: any[], targetGender?: string) {
  if (!exercises || exercises.length === 0) return [];

  let gender = targetGender?.toLowerCase();
  if (!gender || gender === 'all') {
    gender = await getUserGender();
  }
  if (!gender) gender = 'male';

  const missingVideoIdSet = new Set<string>();
  const missingNameSet = new Set<string>();

  const processed = exercises.map((exercise: any) => {
    let vUrl = isRealVideoUrl(exercise.videoUrl) ? exercise.videoUrl : null;

    if (!vUrl && exercise.workout_videos) {
      const list = Array.isArray(exercise.workout_videos) ? exercise.workout_videos : [exercise.workout_videos];
      const match = list.find((v: any) => v.gender?.toLowerCase() === gender) ||
                    list.find((v: any) => !v.gender || v.gender === 'all') ||
                    list[0];
      if (match?.videoUrl) {
        const urlStr = typeof match.videoUrl === 'object' ? match.videoUrl.uri : match.videoUrl;
        if (isRealVideoUrl(urlStr)) vUrl = urlStr;
      }
    }

    if (!vUrl && isRealVideoUrl(exercise.image)) {
      vUrl = typeof exercise.image === 'object' ? exercise.image.uri : exercise.image;
    }

    if (!vUrl && exercise.workoutVideoId) {
      missingVideoIdSet.add(exercise.workoutVideoId);
    }
    if (!vUrl && exercise.exerciseName) {
      missingNameSet.add(exercise.exerciseName.trim());
    }

    return {
      ...exercise,
      videoUrl: vUrl || null,
      workout_videos: undefined,
    };
  });

  const videoMap = new Map<string, { videoUrl: string, isStretching: boolean }>();
  const nameMap = new Map<string, { videoUrl: string, isStretching: boolean }>();

  if (missingNameSet.size > 0 || missingVideoIdSet.size > 0) {
    try {
      const { data: wvRows } = await supabase
        .from('workout_videos')
        .select('workoutVideoId, videoUrl, exerciseName, workoutId, workouts:workoutId(role, isStretching)')
        .eq('is_deleted', false);

      if (wvRows && wvRows.length > 0) {
        const nameGroupMap = new Map<string, any[]>();
        const idGroupMap = new Map<string, any[]>();

        wvRows.forEach((row: any) => {
          const rowGender = row.workouts?.role?.toLowerCase() || row.gender?.toLowerCase() || 'all';
          const rowStretching = row.workouts?.isStretching || false;
          const item = { videoUrl: row.videoUrl, gender: rowGender, isStretching: rowStretching };

          if (row.workoutVideoId) {
            if (!idGroupMap.has(row.workoutVideoId)) idGroupMap.set(row.workoutVideoId, []);
            idGroupMap.get(row.workoutVideoId)!.push(item);
          }
          if (row.exerciseName) {
            const normName = normalizeName(row.exerciseName);
            if (!nameGroupMap.has(normName)) nameGroupMap.set(normName, []);
            nameGroupMap.get(normName)!.push(item);
          }
        });

        const pickBestVideo = (items: any[]) => {
          if (!items || items.length === 0) return null;
          const genderMatch = items.find(i => i.gender === gender);
          if (genderMatch) return genderMatch;
          const allMatch = items.find(i => i.gender === 'all' || !i.gender);
          if (allMatch) return allMatch;
          return items[0];
        };

        idGroupMap.forEach((items, wId) => {
          const best = pickBestVideo(items);
          if (best) videoMap.set(wId, best);
        });

        nameGroupMap.forEach((items, nameKey) => {
          const best = pickBestVideo(items);
          if (best) nameMap.set(nameKey, best);
        });
      }
    } catch (e) {
      console.warn('[workoutPlanDayExercisesHelper] Error fetching workout_videos:', e);
    }
  }

  return processed.map((ex: any) => {
    if (ex.videoUrl) return ex;

    if (ex.workoutVideoId && videoMap.has(ex.workoutVideoId)) {
      const matchObj = videoMap.get(ex.workoutVideoId);
      if (matchObj) {
        return { ...ex, videoUrl: matchObj.videoUrl, isStretching: matchObj.isStretching };
      }
    }

    if (ex.exerciseName) {
      const normName = normalizeName(ex.exerciseName);
      if (nameMap.has(normName)) {
        const matchObj = nameMap.get(normName);
        if (matchObj) {
          return { ...ex, videoUrl: matchObj.videoUrl, isStretching: matchObj.isStretching };
        }
      }

      for (const [key, matchObj] of nameMap.entries()) {
        if (matchObj && (key.includes(normName) || normName.includes(key))) {
          return { ...ex, videoUrl: matchObj.videoUrl, isStretching: matchObj.isStretching };
        }
      }
    }

    return ex;
  });
}

export async function fetchWorkoutPlanDayExercises(planDayId?: string, targetGender?: string) {
  let query = supabase
    .from('workout_plan_day_exercises')
    .select('*, workout_videos:workoutVideoId(videoUrl)')
    .is('deletedAt', null)
    .order('order', { ascending: true });

  if (planDayId) {
    query = query.eq('planDayId', planDayId);
  }

  const { data, error } = await query;

  if (error) {
    // Fallback: if the join fails (e.g. no FK relationship), retry without join
    if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
      console.warn('[workoutPlanDayExercisesHelper] Join failed, falling back to plain select');
      let fallbackQuery = supabase
        .from('workout_plan_day_exercises')
        .select('*')
        .is('deletedAt', null)
        .order('order', { ascending: true });

      if (planDayId) {
        fallbackQuery = fallbackQuery.eq('planDayId', planDayId);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        console.error('[workoutPlanDayExercisesHelper] fetchWorkoutPlanDayExercises Fallback Error:', fallbackError);
        throw fallbackError;
      }
      return await enrichExercisesWithVideos(fallbackData ?? [], targetGender);
    }
    console.error('[workoutPlanDayExercisesHelper] fetchWorkoutPlanDayExercises Error:', error);
    throw error;
  }

  return await enrichExercisesWithVideos(data ?? [], targetGender);
}

export async function fetchPaginatedWorkoutPlanDayExercises(planDayId: string, page: number, limit: number, targetGender?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from('workout_plan_day_exercises')
    .select('*, workout_videos:workoutVideoId(videoUrl)', { count: 'exact' })
    .eq('planDayId', planDayId)
    .is('deletedAt', null)
    .order('order', { ascending: true })
    .range(from, to);

  if (error) {
    // Fallback: if the join fails, retry without join
    if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
      console.warn('[workoutPlanDayExercisesHelper] Paginated join failed, falling back');
      const { data: fbData, count: fbCount, error: fbError } = await supabase
        .from('workout_plan_day_exercises')
        .select('*', { count: 'exact' })
        .eq('planDayId', planDayId)
        .is('deletedAt', null)
        .order('order', { ascending: true })
        .range(from, to);

      if (fbError) {
        console.error('[workoutPlanDayExercisesHelper] fetchPaginatedWorkoutPlanDayExercises Fallback Error:', fbError);
        throw fbError;
      }
      const enrichedFb = await enrichExercisesWithVideos(fbData ?? [], targetGender);
      return { data: enrichedFb, total: fbCount ?? 0 };
    }
    console.error('[workoutPlanDayExercisesHelper] fetchPaginatedWorkoutPlanDayExercises Error:', error);
    throw error;
  }

  const enriched = await enrichExercisesWithVideos(data ?? [], targetGender);
  return {
    data: enriched,
    total: count ?? 0,
  };
}

export async function fetchWorkoutPlanDayExerciseById(dayExerciseId: string) {
  const { data, error } = await supabase
    .from('workout_plan_day_exercises')
    .select('*')
    .eq('dayExerciseId', dayExerciseId)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[workoutPlanDayExercisesHelper] fetchWorkoutPlanDayExerciseById Error:', error);
    throw error;
  }

  return data;
}

export async function saveWorkoutPlanDayExercise(exerciseData: SaveWorkoutPlanDayExerciseParams) {
  const now = new Date().toISOString();

  if (exerciseData.dayExerciseId) {
    const { data, error } = await supabase
      .from('workout_plan_day_exercises')
      .update({
        planDayId: exerciseData.planDayId,
        workoutVideoId: exerciseData.workoutVideoId,
        exerciseName: exerciseData.exerciseName,
        category: exerciseData.category,
        reps: exerciseData.reps,
        order: exerciseData.order,
        sets: exerciseData.sets,
        image: exerciseData.image,
        videoUrl: exerciseData.videoUrl,
        updatedAt: now,
      })
      .eq('dayExerciseId', exerciseData.dayExerciseId)
      .select();

    if (error) {
      console.error('[workoutPlanDayExercisesHelper] saveWorkoutPlanDayExercise Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedDayExerciseId = exerciseData.dayExerciseId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('workout_plan_day_exercises')
      .insert([
        {
          dayExerciseId: generatedDayExerciseId,
          planDayId: exerciseData.planDayId,
          workoutVideoId: exerciseData.workoutVideoId || null,
          exerciseName: exerciseData.exerciseName,
          category: exerciseData.category,
          reps: exerciseData.reps,
          order: exerciseData.order,
          sets: exerciseData.sets,
          image: exerciseData.image || null,
          videoUrl: exerciseData.videoUrl || null,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[workoutPlanDayExercisesHelper] saveWorkoutPlanDayExercise Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteWorkoutPlanDayExercise(dayExerciseId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('workout_plan_day_exercises')
    .update({
      deletedAt: now,
      updatedAt: now,
    })
    .eq('dayExerciseId', dayExerciseId)
    .select();

  if (error) {
    console.error('[workoutPlanDayExercisesHelper] deleteWorkoutPlanDayExercise Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
