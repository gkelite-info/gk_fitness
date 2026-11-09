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
  equipment?: string[] | null;
  primaryMuscle?: string | null;
  secondaryMuscles?: string[] | null;
  difficulty?: string | null;
  defaultSets?: number | null;
  defaultReps?: string | null;
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
  equipment?: string[];
  primaryMuscle?: string | null;
  secondaryMuscles?: string[];
  difficulty?: string;
  defaultSets?: number;
  defaultReps?: string;
}

export function mapWorkoutTypeToDbEnums(workoutType?: string): string[] {
  if (!workoutType) return [];
  const normalized = workoutType.toLowerCase().trim();
  if (!normalized || normalized === 'all') return [];

  if (normalized === 'legs' || normalized === 'leg' || normalized === 'lower body' || normalized.includes('lower body')) {
    return ['legs', 'calves', 'hips'];
  }
  if (normalized === 'upper body' || normalized.includes('upper body')) {
    return ['chest', 'back', 'shoulder', 'biceps', 'triceps', 'tricep', 'forearms', 'arms', 'trapezius'];
  }
  if (normalized === 'full body' || normalized.includes('full body')) {
    return ['chest', 'back', 'shoulder', 'legs', 'abs', 'biceps', 'triceps', 'tricep', 'forearms', 'arms', 'calves', 'hips'];
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
  if (normalized === 'abs' || normalized === 'core' || normalized.includes('abs')) {
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

export const MALE_WORKOUT_IDS: Record<string, string[]> = {
  chest: ['ab312b33-c4de-4f0e-973b-04f90d171704', '3e4e5e91-4f2a-4f8a-9364-2b6eb2ed852d'],
  back: ['c65725f4-0796-49c6-b3b3-0499352171c4', 'eb1b8c97-d092-4b8a-916b-0f71ed7df9e3'],
  shoulder: ['51b8b98e-ad22-4842-b50b-894d89c82663', 'd889858d-6c4d-4c32-b14d-cbc3001bed49'],
  shoulders: ['51b8b98e-ad22-4842-b50b-894d89c82663', 'd889858d-6c4d-4c32-b14d-cbc3001bed49'],
  abs: ['497f6524-6589-488f-915b-74b98b8e25c7', '1fbafb6b-b8e0-4ea3-b530-742841899b74'],
  cardio: ['e8f1397b-58fc-480e-a159-583337eb6870', 'e34c4133-0489-4cb2-b0f8-cbf81ea85fc0'],
  calves: ['d4c30013-0fb4-44c7-9dc8-1ac92b3e2f3f', '890f6299-76af-4863-8338-734cd6fdf05d'],
  forearms: ['db026b0b-3903-43e9-a791-1294471f0faf', '97938dd3-aa25-4d00-9dab-b2fbcbdb45c3'],
  trapezius: ['fd825955-71c9-4051-afd5-2e1ac5cab0f2', 'a5453724-2e9e-49d1-9525-d03394aa6d2c'],
  hips: ['33b025a2-3cc7-452f-9965-e5e5030c23ca', '6b331de1-909a-4faf-98f6-6c9812af87d1'],
  legs: ['33b025a2-3cc7-452f-9965-e5e5030c23ca', 'd4c30013-0fb4-44c7-9dc8-1ac92b3e2f3f', '6b331de1-909a-4faf-98f6-6c9812af87d1'],
  arms: ['db026b0b-3903-43e9-a791-1294471f0faf', '51b8b98e-ad22-4842-b50b-894d89c82663', 'ab312b33-c4de-4f0e-973b-04f90d171704'],
  biceps: ['db026b0b-3903-43e9-a791-1294471f0faf', 'ab312b33-c4de-4f0e-973b-04f90d171704'],
  triceps: ['ab312b33-c4de-4f0e-973b-04f90d171704', '51b8b98e-ad22-4842-b50b-894d89c82663'],
};

export const FEMALE_WORKOUT_IDS: Record<string, string[]> = {
  chest: ['24cc9244-1cdd-4219-a481-f1fbe952cebe', 'fbe1ea60-bd91-45de-b914-6e1d925a48ec'],
  back: ['3ceb9c04-2541-4304-8a74-974a955cd7dc', 'c00d785e-07de-4dac-99be-73e1026ff0bb'],
  shoulder: ['c3e5a606-ee60-4169-9fae-6a4c9abfce80', '04d1b9b0-114d-4ab5-a402-97596c7b870b'],
  shoulders: ['c3e5a606-ee60-4169-9fae-6a4c9abfce80', '04d1b9b0-114d-4ab5-a402-97596c7b870b'],
  abs: ['4118af16-310f-476f-af0f-3fa370090295', '08eb0fc4-7c0a-4b07-8f71-c4ae6c0b3877'],
  cardio: ['5002ca9f-79fd-4c84-967b-38c4e189bead', '8ace356d-d3f1-492c-bfbd-596226617078'],
  calves: ['d2e12c77-e24a-4de2-8f0e-9a867b67d17e', '36f6b8e2-7ea8-4f06-8e90-d680cc6ca459'],
  forearms: ['376bb182-29eb-462e-afa5-735c7290dc24', 'fcce6813-f150-4cf7-a513-564ed5980af5'],
  trapezius: ['659a3d98-9fd7-4fd4-8109-84272955dd0e', 'cbe830c4-50f9-45f4-b6f2-afad20a4bfcd'],
  hips: ['5e612e83-95de-4b58-b61e-208321de9344', '0c7d2a9d-4983-4e16-9e81-49af8d0092ee'],
  legs: ['5e612e83-95de-4b58-b61e-208321de9344', 'd2e12c77-e24a-4de2-8f0e-9a867b67d17e', '0c7d2a9d-4983-4e16-9e81-49af8d0092ee'],
  arms: ['376bb182-29eb-462e-afa5-735c7290dc24', 'c3e5a606-ee60-4169-9fae-6a4c9abfce80', '24cc9244-1cdd-4219-a481-f1fbe952cebe'],
  biceps: ['376bb182-29eb-462e-afa5-735c7290dc24'],
  triceps: ['24cc9244-1cdd-4219-a481-f1fbe952cebe', 'c3e5a606-ee60-4169-9fae-6a4c9abfce80'],
};

export function isExerciseMatchingGender(
  exercise: {
    videoUrl?: string | null;
    workoutId?: string | null;
    workouts?: { role?: string } | null;
  },
  targetGender: string
): boolean {
  const norm = (targetGender || '').toLowerCase().trim();
  if (norm !== 'male' && norm !== 'female') return true;

  const vid = exercise.videoUrl || '';
  const wid = exercise.workoutId || '';
  const workoutRole = (exercise.workouts?.role || '').toLowerCase().trim();

  if (workoutRole) {
    if (norm === 'male' && workoutRole === 'female') return false;
    if (norm === 'female' && workoutRole === 'male') return false;
    if (workoutRole === norm) return true;
  }

  const allFemaleWids = new Set(Object.values(FEMALE_WORKOUT_IDS).flat());
  const allMaleWids = new Set(Object.values(MALE_WORKOUT_IDS).flat());

  if (norm === 'male') {
    // Strictly reject female video prefix 178903
    if (vid.includes('178903')) return false;
    // Strictly reject known female workout IDs
    if (allFemaleWids.has(wid)) return false;
    // Known male prefixes or male workout IDs are guaranteed matches
    if (
      vid.includes('178902') ||
      vid.includes('178774') ||
      vid.includes('178895') ||
      vid.includes('178896') ||
      vid.includes('178780') ||
      allMaleWids.has(wid)
    ) {
      return true;
    }
    return !vid.includes('178903') && !allFemaleWids.has(wid);
  } else {
    // norm === 'female'
    // Strictly reject male video prefixes
    if (
      vid.includes('178902') ||
      vid.includes('178774') ||
      vid.includes('178895') ||
      vid.includes('178896') ||
      vid.includes('178780')
    ) {
      return false;
    }
    // Strictly reject known male workout IDs
    if (allMaleWids.has(wid)) return false;
    if (vid.includes('178903') || allFemaleWids.has(wid)) {
      return true;
    }
    return !allMaleWids.has(wid);
  }
}

export function getRpcMusclesForTarget(targetGroup: string): string[] {
  const target = (targetGroup || '').toLowerCase().trim();
  if (target === 'chest') return ['CHEST'];
  if (target === 'back') return ['BACK'];
  if (target.includes('shoulder')) return ['SHOULDERS', 'TRAPS', 'SHOULDER'];
  if (target.includes('leg') || target.includes('hip') || target.includes('calf') || target.includes('lower body')) {
    return ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'HIPS', 'LEGS'];
  }
  if (target.includes('bicep')) return ['BICEPS'];
  if (target.includes('tricep')) return ['TRICEPS'];
  if (target.includes('abs') || target.includes('core')) return ['ABDOMINALS', 'OBLIQUES', 'ABS'];
  if (target.includes('arm')) return ['BICEPS', 'TRICEPS', 'FOREARMS'];
  if (target.includes('cardio')) return ['CARDIO'];
  return [targetGroup.toUpperCase()];
}

export function isExerciseMatchingMuscle(name: string, targetMuscle: string): boolean {
  const l = (name || '').toLowerCase();
  const m = (targetMuscle || '').toLowerCase().trim();
  if (!m || m === 'all') return true;

  if (m === 'chest') {
    if (/leg|femoral|calf|calves|squat|lunge|hip|thrust|glute|adduct|abduct|quad|hamstring|runner|knee|boat/i.test(l)) return false;
    if (l.includes('stretch')) return true;
    return /bench|press|fly|pec|push-up|push up|pushup|dip|crossover|chest/i.test(l);
  }
  if (m === 'back') {
    if (/bench|pec|chest press|push-up|push up|pushup|adduct|abduct|quad|calf|hamstring|runner|knee|boat/i.test(l)) return false;
    if (l.includes('stretch')) return true;
    return /row|pull|lat|deadlift|hyperextension|back/i.test(l);
  }
  if (m.includes('shoulder')) {
    if (/bench press|pec|chest press|squat|lunge|leg|pulldown|quad|hamstring|calf|runner|knee|boat/i.test(l)) return false;
    if (l.includes('stretch')) return true;
    return /shoulder|press|raise|delt|shrug|upright/i.test(l);
  }
  if (m === 'abs' || m === 'core') {
    if (/bench press|pec|chest press|squat|lunge|quad|calf/i.test(l)) return false;
    if (l.includes('stretch')) return true;
    return /crunch|raise|plank|sit up|situp|twist|ab|core/i.test(l);
  }
  if (m === 'legs' || m === 'leg' || m === 'calves' || m === 'hips') {
    if (/bench press|chest|pec|pulldown|bicep|tricep/i.test(l)) return false;
    if (l.includes('stretch')) return true;
    return /squat|lunge|press|extension|curl|calf|glute|hip|adduct|abduct|leg|thrust|deadlift|rdl|step up/i.test(l);
  }
  if (m.includes('bicep')) {
    if (/press|row|tricep|squat|lunge|leg|calf|shoulder|bench|chest|quad/i.test(l)) return false;
    if (l.includes('stretch')) return /bicep|arm/i.test(l);
    return /curl|bicep/i.test(l);
  }
  if (m.includes('tricep')) {
    if (/bicep|curl|squat|lunge|leg|chest fly|pulldown|quad/i.test(l)) return false;
    if (l.includes('stretch')) return /tricep|arm/i.test(l);
    return /tricep|pushdown|skull|extension|dip|kickback/i.test(l);
  }
  return true;
}

export function mapWorkoutTypeToRpcMuscles(workoutType?: string): string[] {
  if (!workoutType) return [];
  const norm = workoutType.toLowerCase().trim();
  if (norm === 'all' || norm === 'full body' || norm.includes('full body')) {
    return ['CHEST', 'BACK', 'SHOULDERS', 'SHOULDER', 'TRAPS', 'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'HIPS', 'LEGS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'ARMS', 'ABDOMINALS', 'OBLIQUES', 'ABS'];
  }
  if (norm === 'upper body' || norm.includes('upper body')) {
    return ['CHEST', 'BACK', 'SHOULDERS', 'SHOULDER', 'TRAPS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'ARMS'];
  }
  if (norm === 'lower body' || norm.includes('lower body') || norm === 'legs' || norm === 'leg') {
    return ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'HIPS', 'LEGS'];
  }
  if (norm === 'abs' || norm === 'core' || norm.includes('abs')) {
    return ['ABDOMINALS', 'OBLIQUES', 'ABS'];
  }
  if (norm === 'chest') return ['CHEST'];
  if (norm === 'back') return ['BACK'];
  if (norm.startsWith('shoulder')) return ['SHOULDERS', 'SHOULDER', 'TRAPS'];
  if (norm.startsWith('bicep')) return ['BICEPS', 'ARMS'];
  if (norm.startsWith('tricep')) return ['TRICEPS', 'TRICEP', 'ARMS'];
  if (norm === 'arms' || norm === 'arm') return ['BICEPS', 'TRICEPS', 'FOREARMS', 'ARMS'];
  if (norm === 'calves' || norm === 'calf') return ['CALVES', 'LEGS'];
  if (norm === 'hips' || norm === 'hip') return ['HIPS', 'GLUTES', 'LEGS'];
  if (norm === 'cardio') return ['CARDIO'];
  return [workoutType.toUpperCase()];
}

export async function fetchWorkoutVideos(
  page: number = 1,
  limit: number = 10,
  workoutType: string = 'all',
  role: string = 'all',
  isStretching: string = 'all',
  searchQuery: string = '',
  strictRole: boolean = false
) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. Server-side search filter across exerciseName and primaryMuscle
  const cleanSearch = (searchQuery || '').trim();
  // Robustly resolve user gender if role is not passed or is 'all'
  let normalizedRole = (role || 'all').toLowerCase().trim();
  if (normalizedRole !== 'male' && normalizedRole !== 'female') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: cust } = await supabase
          .from('gym_customers')
          .select('gender')
          .or(`customerId.eq.${user.id},userId.eq.${user.id}`)
          .maybeSingle();
        if (cust?.gender) {
          normalizedRole = cust.gender.toLowerCase().trim().includes('female') ? 'female' : 'male';
        } else {
          const { data: u } = await supabase
            .from('users')
            .select('gender')
            .eq('userId', user.id)
            .maybeSingle();
          if (u?.gender) {
            normalizedRole = u.gender.toLowerCase().trim().includes('female') ? 'female' : 'male';
          }
        }
      }
    } catch {
      // fallback
    }
  }

  const isRoleFilterActive = normalizedRole === 'male' || normalizedRole === 'female';

  // Pre-load opposite gender workoutIds to strictly blacklist them
  let oppositeWorkoutIdsSet: Set<string> | undefined;
  if (isRoleFilterActive) {
    const oppositeRole = normalizedRole === 'male' ? 'female' : 'male';
    const { data: oppWorkouts } = await supabase
      .from('workouts')
      .select('workoutId')
      .eq('role', oppositeRole)
      .or('is_deleted.eq.false,is_deleted.is.null');

    if (oppWorkouts && oppWorkouts.length > 0) {
      oppositeWorkoutIdsSet = new Set(oppWorkouts.map((w: any) => w.workoutId));
    }
  }

  const mappedTypes = mapWorkoutTypeToDbEnums(workoutType);

  // Combined helper to filter videos strictly by gender, blacklist, muscle, and search
  const filterListStrictly = (list: any[]): any[] => {
    return list.filter((v: any) => {
      const vid = v.videoUrl || v.video_url || '';
      const wid = v.workoutId || v.workout_id || '';
      const name = v.exerciseName || v.exercise_name || '';

      if (isRoleFilterActive) {
        // 1. Blacklist check from opposite gender workout IDs
        if (oppositeWorkoutIdsSet && wid && oppositeWorkoutIdsSet.has(wid)) {
          return false;
        }

        // 2. Strict gender matching helper (prefixes & known IDs)
        const matchesGender = isExerciseMatchingGender(
          { videoUrl: vid, workoutId: wid, workouts: v.workouts },
          normalizedRole
        );
        if (!matchesGender) return false;

        // 3. Regex check on URL and exercise name
        const urlLower = vid.toLowerCase();
        const exNameLower = name.toLowerCase();
        if (normalizedRole === 'male') {
          if (/female|women|woman|\/female\/|_female|-female|female_/i.test(urlLower)) return false;
          if (/\(female\)|\(women\)|\(woman\)|female\s|women\s/i.test(exNameLower)) return false;
        } else {
          if (/male|men|man|\/male\/|_male|-male|male_/i.test(urlLower)) return false;
          if (/\(male\)|\(men\)|\(man\)|male\s|men\s/i.test(exNameLower)) return false;
        }
      }

      // 4. Target muscle group check
      if (workoutType && workoutType !== 'all') {
        const matchesM = isExerciseMatchingMuscle(name, workoutType);
        if (!matchesM) return false;
      }

      // 5. Search query check
      if (cleanSearch) {
        const searchNorm = cleanSearch.toLowerCase();
        const matchesSearch =
          name.toLowerCase().includes(searchNorm) ||
          (v.primaryMuscle || v.muscle || '').toLowerCase().includes(searchNorm) ||
          (v.category || '').toLowerCase().includes(searchNorm);
        if (!matchesSearch) return false;
      }

      return true;
    });
  };

  // Strategy 1: If specific muscle group is requested, use RPC get_custom_workout_videos with getRpcMusclesForTarget
  // This bypasses table RLS and reliably retrieves all exercises across all workouts with complete metadata
  if (workoutType && workoutType !== 'all') {
    try {
      const targetMuscles = getRpcMusclesForTarget(workoutType);

      const { data: rpcVideos, error: rpcErr } = await supabase.rpc('get_custom_workout_videos', {
        p_muscles: targetMuscles,
        p_equipment: [],
        p_limit: 250,
        p_exclude: []
      });

      if (!rpcErr && Array.isArray(rpcVideos) && rpcVideos.length > 0) {
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const dedupedRpc: any[] = [];

        for (const r of rpcVideos) {
          const id = r.workout_video_id || r.workoutVideoId;
          const nameNorm = (r.exercise_name || r.exerciseName || '').toLowerCase().trim();
          if (id && seenIds.has(id)) continue;
          if (nameNorm && seenNames.has(nameNorm)) continue;
          if (id) seenIds.add(id);
          if (nameNorm) seenNames.add(nameNorm);

          dedupedRpc.push({
            workoutVideoId: id,
            workoutId: r.workout_id || r.workoutId,
            exerciseName: r.exercise_name || r.exerciseName,
            videoUrl: r.video_url || r.videoUrl,
            primaryMuscle: r.muscle || r.primaryMuscle,
            equipment: r.equipment,
            defaultSets: r.default_sets || r.defaultSets,
            defaultReps: r.default_reps || r.defaultReps || '10-12 reps',
            difficulty: r.difficulty,
            category: r.category || (workoutType ? workoutType.charAt(0).toUpperCase() + workoutType.slice(1) : 'Exercise'),
            is_deleted: false,
          });
        }

        const strictlyFiltered = filterListStrictly(dedupedRpc);

        if (strictlyFiltered.length > 0) {
          const paged = strictlyFiltered.slice(from, to + 1);
          return {
            data: paged,
            total: strictlyFiltered.length,
          };
        }
      } else if (rpcErr) {
        console.warn('[fetchWorkoutVideos] RPC warning/error:', rpcErr);
      }
    } catch (rpcError) {
      console.warn('[workoutVideoHelper] RPC fallback error:', rpcError);
    }
  }

  // Strategy 2: Direct query to workouts and workout_videos table
  try {
    let targetWorkoutIds: string[] = [];

    if (mappedTypes.length > 0 || isRoleFilterActive || isStretching !== 'all') {
      let q = supabase
        .from('workouts')
        .select('workoutId, role, workoutType')
        .or('is_deleted.eq.false,is_deleted.is.null');

      if (mappedTypes.length === 1) {
        q = q.eq('workoutType', mappedTypes[0]);
      } else if (mappedTypes.length > 1) {
        q = q.in('workoutType', mappedTypes);
      }

      if (isRoleFilterActive) {
        q = q.eq('role', normalizedRole);
      }

      if (isStretching !== 'all') {
        if (isStretching === 'stretching') {
          q = q.eq('isStretching', true);
        } else {
          q = q.or('isStretching.eq.false,isStretching.is.null');
        }
      }

      const { data: matchedWorkouts, error: workoutsError } = await q;

      if (workoutsError) {
        console.warn('[workoutVideoHelper] workoutsQuery error:', workoutsError);
      }

      if (matchedWorkouts && matchedWorkouts.length > 0) {
        targetWorkoutIds = matchedWorkouts.map((w: any) => w.workoutId);
      }

      // If no workouts matched, use role-based dictionaries as fallback
      if (targetWorkoutIds.length === 0 && isRoleFilterActive) {
        const typeKey = (mappedTypes[0] || workoutType).toLowerCase();
        const dict = normalizedRole === 'male' ? MALE_WORKOUT_IDS : FEMALE_WORKOUT_IDS;
        targetWorkoutIds = dict[typeKey] || dict[workoutType.toLowerCase()] || [];
      }
    }

    let query = supabase
      .from('workout_videos')
      .select('*, workouts:workoutId(role, workoutType)', { count: 'exact' })
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('createdAt', { ascending: false });

    if (cleanSearch) {
      query = query.or(`exerciseName.ilike.%${cleanSearch}%,primaryMuscle.ilike.%${cleanSearch}%`);
    }

    if (targetWorkoutIds.length > 0) {
      query = query.in('workoutId', targetWorkoutIds);
    } else if (workoutType !== 'all') {
      const muscleKey = mappedTypes[0] || workoutType;
      if (muscleKey) {
        query = query.ilike('primaryMuscle', `%${muscleKey}%`);
      }
    }

    const { data, error, count } = await query.limit(200);

    if (!error && data && data.length > 0) {
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const dedupedData: any[] = [];

      for (const item of data) {
        const id = item.workoutVideoId;
        const nameNorm = (item.exerciseName || '').toLowerCase().trim();
        if (id && seenIds.has(id)) continue;
        if (nameNorm && seenNames.has(nameNorm)) continue;
        if (id) seenIds.add(id);
        if (nameNorm) seenNames.add(nameNorm);
        dedupedData.push(item);
      }

      const cleanData = filterListStrictly(dedupedData);
      if (cleanData.length > 0) {
        const paged = cleanData.slice(from, to + 1);
        return {
          data: paged,
          total: cleanData.length,
        };
      }
    }

    // Fallback: If still empty, check primaryMuscle fallback query respecting role
    if (page === 1 && workoutType !== 'all' && !cleanSearch) {
      const muscleKey = mappedTypes[0] || workoutType;
      if (muscleKey && muscleKey !== 'all') {
        const byMuscleRes = await supabase
          .from('workout_videos')
          .select('*, workouts:workoutId(role, workoutType)', { count: 'exact' })
          .ilike('primaryMuscle', `%${muscleKey}%`)
          .or('is_deleted.eq.false,is_deleted.is.null')
          .order('createdAt', { ascending: false })
          .limit(100);

        if (byMuscleRes.data && byMuscleRes.data.length > 0) {
          const filteredByMuscle = filterListStrictly(byMuscleRes.data);
          if (filteredByMuscle.length > 0) {
            const paged = filteredByMuscle.slice(from, to + 1);
            return {
              data: paged,
              total: filteredByMuscle.length,
            };
          }
        }
      }

      // Secondary RPC Fallback
      try {
        const targetMuscles = [workoutType.toUpperCase()];
        const { data: rpcVideos } = await supabase.rpc('get_custom_workout_videos', {
          p_muscles: targetMuscles,
          p_equipment: [],
          p_limit: limit,
          p_exclude: []
        });
        if (rpcVideos && rpcVideos.length > 0) {
          const mappedRpc = rpcVideos.map((r: any) => ({
            workoutVideoId: r.workout_video_id || r.workoutVideoId,
            workoutId: r.workout_id || r.workoutId,
            exerciseName: r.exercise_name || r.exerciseName,
            videoUrl: r.video_url || r.videoUrl,
            primaryMuscle: r.muscle || r.primaryMuscle,
            equipment: r.equipment,
            defaultSets: r.default_sets || r.defaultSets,
            defaultReps: r.default_reps || r.defaultReps,
            difficulty: r.difficulty,
            is_deleted: false,
          }));
          const filteredRpc = filterListStrictly(mappedRpc);
          if (filteredRpc.length > 0) {
            const paged = filteredRpc.slice(from, to + 1);
            return {
              data: paged,
              total: filteredRpc.length,
            };
          }
        }
      } catch {
        // ignore RPC fallback error
      }
    }
  } catch (err) {
    console.warn('[workoutVideoHelper] Direct query fallback error:', err);
  }

  return {
    data: [],
    total: 0,
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
    const updatePayload: any = {
      workoutId: videoData.workoutId,
      videoUrl: videoData.videoUrl,
      exerciseName: videoData.exerciseName,
      updatedAt: now,
    };

    if (videoData.equipment !== undefined) updatePayload.equipment = videoData.equipment;
    if (videoData.primaryMuscle !== undefined) updatePayload.primaryMuscle = videoData.primaryMuscle;
    if (videoData.secondaryMuscles !== undefined) updatePayload.secondaryMuscles = videoData.secondaryMuscles;
    if (videoData.difficulty !== undefined) updatePayload.difficulty = videoData.difficulty;
    if (videoData.defaultSets !== undefined) updatePayload.defaultSets = videoData.defaultSets;
    if (videoData.defaultReps !== undefined) updatePayload.defaultReps = videoData.defaultReps;

    const { data, error } = await supabase
      .from('workout_videos')
      .update(updatePayload)
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
          equipment: videoData.equipment || ['BODY_ONLY'],
          primaryMuscle: videoData.primaryMuscle || null,
          secondaryMuscles: videoData.secondaryMuscles || [],
          difficulty: videoData.difficulty || 'intermediate',
          defaultSets: videoData.defaultSets ?? 3,
          defaultReps: videoData.defaultReps || '10-12',
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
