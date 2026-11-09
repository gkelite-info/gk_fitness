import { matchesStrictMuscle } from '@/hooks/customerWorkouts/useWorkoutPlanTargetExercises';
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

let cachedGender: string | null = null;
async function getUserGender(): Promise<string> {
  if (cachedGender) return cachedGender;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: cust } = await supabase
        .from('gym_customers')
        .select('gender')
        .or(`customerId.eq.${user.id},userId.eq.${user.id}`)
        .maybeSingle();
      if (cust?.gender) {
        cachedGender = cust.gender.toLowerCase();
        return cachedGender as string;
      }

      const { data: u } = await supabase
        .from('users')
        .select('gender')
        .eq('userId', user.id)
        .maybeSingle();
      if (u?.gender) {
        cachedGender = u.gender.toLowerCase();
        return cachedGender as string;
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

let cachedWorkoutVideos: any[] | null = null;
let cachedWorkoutVideosTime: number = 0;

async function getWorkoutVideos() {
  const now = Date.now();
  if (cachedWorkoutVideos && (now - cachedWorkoutVideosTime < 60000)) {
     return cachedWorkoutVideos;
  }
  const { data: wvRows } = await supabase
    .from('workout_videos')
    .select('workoutVideoId, videoUrl, exerciseName, workoutId, workouts:workoutId(role, isStretching)')
    .eq('is_deleted', false);
  
  if (wvRows) {
    cachedWorkoutVideos = wvRows;
    cachedWorkoutVideosTime = now;
  }
  return wvRows || [];
}

export async function enrichExercisesWithVideos(exercises: any[], targetGender?: string) {
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
                    list.find((v: any) => !v.gender || v.gender === 'all');
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
      const wvRows = await getWorkoutVideos();

      if (wvRows && wvRows.length > 0) {
        const nameGroupMap = new Map<string, any[]>();
        const idGroupMap = new Map<string, any[]>();

        wvRows.forEach((row: any) => {
          let rowGender = (Array.isArray(row.workouts) ? row.workouts[0]?.role : row.workouts?.role || row.gender || 'all').toLowerCase();
          const isStretching = Array.isArray(row.workouts) ? !!row.workouts[0]?.isStretching : !!row.workouts?.isStretching;
          const urlStr = typeof row.videoUrl === 'object' ? row.videoUrl?.uri : row.videoUrl;
          if (!isRealVideoUrl(urlStr)) return;

          const item = { videoUrl: urlStr, gender: rowGender, isStretching };

          if (row.workoutVideoId && missingVideoIdSet.has(row.workoutVideoId)) {
            if (!idGroupMap.has(row.workoutVideoId)) idGroupMap.set(row.workoutVideoId, []);
            idGroupMap.get(row.workoutVideoId)!.push(item);
          }

          if (row.exerciseName) {
            const n = normalizeName(row.exerciseName);
            if (!nameGroupMap.has(n)) nameGroupMap.set(n, []);
            nameGroupMap.get(n)!.push(item);
          }
        });

        // Resolve by ID
        idGroupMap.forEach((items, id) => {
          const match = items.find((i: any) => i.gender === gender) || items.find((i: any) => !i.gender || i.gender === 'all') || items[0];
          if (match) videoMap.set(id, match);
        });

        // Resolve by Name
        nameGroupMap.forEach((items, normName) => {
          const match = items.find((i: any) => i.gender === gender) || items.find((i: any) => !i.gender || i.gender === 'all') || items[0];
          if (match) nameMap.set(normName, match);
        });
      }
    } catch (e) {
      console.warn('[workoutPlanDayExercisesHelper] Error enriching videos:', e);
    }
  }

  return processed.map((exercise: any) => {
    let videoUrl = exercise.videoUrl;
    let isStretching = false;

    if (!videoUrl && exercise.workoutVideoId && videoMap.has(exercise.workoutVideoId)) {
      const hit = videoMap.get(exercise.workoutVideoId);
      videoUrl = hit?.videoUrl;
      isStretching = !!hit?.isStretching;
    }

    if (!videoUrl && exercise.exerciseName) {
      const n = normalizeName(exercise.exerciseName);
      if (nameMap.has(n)) {
        const hit = nameMap.get(n);
        videoUrl = hit?.videoUrl;
        isStretching = !!hit?.isStretching;
      }
    }

    return {
      ...exercise,
      videoUrl: videoUrl || null,
      isStretching,
    };
  });
}

/**
 * Automatically seeds 4-6 default exercises for a newly created or empty workout day
 * by intelligently querying workouts and workout_videos from Supabase.
 */
export async function autoSeedPlanDayExercises(planDayId: string, targetGender?: string) {
  try {
    let gender = targetGender?.toLowerCase();
    if (!gender || gender === 'all') {
      gender = await getUserGender();
    }
    if (!gender) gender = 'male';

    const { data: dayData, error: dayError } = await supabase
      .from('workout_plan_days')
      .select('workoutType, workoutId')
      .eq('planDayId', planDayId)
      .maybeSingle();

    if (dayError || !dayData) {
      return [];
    }

    const workoutType = dayData.workoutType;
    if (!workoutType || workoutType.toLowerCase() === 'rest' || workoutType.toLowerCase() === 'recovery') {
      return [];
    }

    const { data: videos, error: videosError } = await supabase
      .from('workout_videos')
      .select('workoutVideoId, exerciseName, videoUrl, workoutId, workouts:workoutId(role, muscleGroup, isStretching)')
      .eq('is_deleted', false);

    if (videosError || !videos || videos.length === 0) {
      return [];
    }

    const candidates = videos.filter((v: any) => {
      const role = (Array.isArray(v.workouts) ? v.workouts[0]?.role : v.workouts?.role || 'all').toLowerCase();
      if (role !== 'all' && role !== gender) return false;

      const muscleGroup = Array.isArray(v.workouts) ? v.workouts[0]?.muscleGroup : v.workouts?.muscleGroup;
      return matchesStrictMuscle(workoutType, v.exerciseName, muscleGroup);
    });

    const chosen = candidates.length > 0 ? candidates.slice(0, 5) : videos.slice(0, 4);
    const now = new Date().toISOString();

    const seededRecords = chosen.map((v: any, index: number) => ({
      dayExerciseId: Crypto.randomUUID(),
      planDayId,
      workoutVideoId: v.workoutVideoId,
      exerciseName: v.exerciseName || 'Exercise',
      category: workoutType,
      reps: '10-12',
      order: index,
      sets: 3,
      image: null,
      videoUrl: typeof v.videoUrl === 'object' ? v.videoUrl.uri : v.videoUrl,
      createdAt: now,
      updatedAt: now,
    }));

    if (seededRecords.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('workout_plan_day_exercises')
        .insert(seededRecords)
        .select();

      if (!insertError && inserted) {
        return inserted;
      }
    }

    return seededRecords;
  } catch (err) {
    console.warn('[workoutPlanDayExercisesHelper] autoSeedPlanDayExercises error:', err);
    return [];
  }
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
    if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
      console.warn('[workoutPlanDayExercisesHelper] Join failed, falling back to simple query');
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

  let finalData = data ?? [];

  if (finalData.length === 0 && planDayId) {
    finalData = await autoSeedPlanDayExercises(planDayId, targetGender);
  }

  return await enrichExercisesWithVideos(finalData, targetGender);
}

export async function fetchPaginatedWorkoutPlanDayExercises(planDayId: string, page: number = 1, limit: number = 6, targetGender?: string) {
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

  let paginatedData = data ?? [];
  let paginatedCount = count ?? 0;
  if (paginatedData.length === 0 && page === 1 && planDayId) {
    paginatedData = await autoSeedPlanDayExercises(planDayId, targetGender);
    paginatedCount = paginatedData.length;
  }

  const enriched = await enrichExercisesWithVideos(paginatedData, targetGender);
  return {
    data: enriched,
    total: paginatedCount,
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

const isValidUUID = (id?: string | null): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
};

export async function saveWorkoutPlanDayExercise(exerciseData: SaveWorkoutPlanDayExerciseParams) {
  const now = new Date().toISOString();
  const safeWorkoutVideoId = isValidUUID(exerciseData.workoutVideoId) ? exerciseData.workoutVideoId : null;
  const safeSets = Number(exerciseData.sets) > 0 ? Number(exerciseData.sets) : 3;
  const safeReps = exerciseData.reps?.toString().trim() || '10-12';

  if (exerciseData.dayExerciseId) {
    const { data, error } = await supabase
      .from('workout_plan_day_exercises')
      .update({
        planDayId: exerciseData.planDayId,
        workoutVideoId: safeWorkoutVideoId,
        exerciseName: exerciseData.exerciseName,
        category: exerciseData.category,
        reps: safeReps,
        order: exerciseData.order,
        sets: safeSets,
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
          workoutVideoId: safeWorkoutVideoId,
          exerciseName: exerciseData.exerciseName,
          category: exerciseData.category,
          reps: safeReps,
          order: exerciseData.order,
          sets: safeSets,
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
