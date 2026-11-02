import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface TargetExerciseVideo {
  workoutVideoId: string;
  exerciseName: string;
  videoUrl?: string | null;
  category: string;
  primaryMuscle?: string | null;
  defaultSets?: number;
  defaultReps?: string;
  difficulty?: string;
}

function isCardioExercise(name: string): boolean {
  const lower = (name || '').toLowerCase();
  return /treadmill|elliptical|spin bike|stationary bike|cycling|bicycle|rowing machine|stairmaster|air bike|ski erg/i.test(lower);
}

function inferExerciseMuscle(name: string, primaryMuscle?: string | null): string {
  const lower = (name || '').toLowerCase();

  if (isCardioExercise(name)) return 'CARDIO';

  if (lower.startsWith('stretching') || lower.includes('stretch') || lower.includes('pose sequence')) {
    return 'STRETCHING';
  }

  // Common mislabeled leg/glute exercises
  if (
    lower.includes('hip adduction') ||
    lower.includes('hip extension') ||
    lower.includes('hip flexor') ||
    lower.includes('hip abduction') ||
    lower.includes('rear kick') ||
    lower.includes('bridge') ||
    lower.includes('thrust')
  ) {
    return 'LEGS';
  }

  // High-confidence name heuristics that override mislabeled primaryMuscle
  if (lower.includes('calf') || lower.includes('calves')) return 'CALVES';
  if (lower.includes('hamstring') || lower.includes('leg curl') || lower.includes('rdl') || lower.includes('romanian deadlift') || lower.includes('stiff leg')) return 'LEGS';
  if (lower.includes('glute') || lower.includes('hip thrust') || lower.includes('glute bridge') || lower.includes('abductor') || lower.includes('adductor') || lower.includes('donkey kick')) return 'LEGS';
  if (lower.includes('squat') || lower.includes('leg extension') || lower.includes('leg press') || lower.includes('lunge') || lower.includes('hack') || lower.includes('step up') || lower.includes('leg wide press')) return 'LEGS';

  if (lower.includes('wrist curl') || lower.includes('forearm') || lower.includes('dead hang')) return 'FOREARMS';
  if (lower.includes('bicep') || (lower.includes('curl') && !lower.includes('leg curl') && !lower.includes('wrist')) || lower.includes('preacher') || lower.includes('hammer curl')) return 'BICEPS';
  if (lower.includes('tricep') || lower.includes('pushdown') || lower.includes('skull crusher') || lower.includes('kickback') || lower.includes('close grip bench') || lower.includes('diamond push') || lower.includes('dip')) return 'TRICEPS';

  if (lower.includes('shrug') || lower.includes('trap')) return 'TRAPS';
  if (lower.includes('shoulder') || lower.includes('overhead press') || lower.includes('military press') || lower.includes('lateral raise') || lower.includes('front raise') || lower.includes('rear delt') || lower.includes('face pull') || lower.includes('arnold') || lower.includes('deltoid') || lower.includes('pike')) return 'SHOULDERS';

  if (lower.includes('russian twist') || lower.includes('side plank') || lower.includes('woodchopper') || lower.includes('side bend') || lower.includes('oblique')) return 'ABS';
  if (lower.includes('crunch') || lower.includes('plank') || lower.includes('sit up') || lower.includes('situp') || lower.includes('ab wheel') || lower.includes('hanging leg') || lower.includes('hanging knee') || lower.includes('flutter kick')) return 'ABS';

  if (lower.includes('bench press') || lower.includes('chest press') || lower.includes('chest fly') || lower.includes('pec deck') || lower.includes('push-up') || lower.includes('push up') || lower.includes('pushup') || lower.includes('incline press') || lower.includes('decline press') || lower.includes('crossover') || lower.includes('chest') || lower.includes('pullover')) return 'CHEST';
  if (lower.includes('lat pulldown') || lower.includes('pull-up') || lower.includes('pull up') || lower.includes('pullup') || lower.includes('chin-up') || lower.includes('chin up') || lower.includes('chinup') || lower.includes('seated row') || lower.includes('bent-over row') || lower.includes('bent over row') || lower.includes('t-bar') || lower.includes('pulldown') || lower.includes('inverted row') || lower.includes('row') || lower.includes('back')) return 'BACK';

  if (primaryMuscle) {
    const pm = primaryMuscle.toUpperCase().trim();
    if (pm === 'QUADRICEPS' || pm === 'HAMSTRINGS' || pm === 'GLUTES' || pm === 'CALVES' || pm === 'LEGS') return 'LEGS';
    if (pm === 'ABDOMINALS' || pm === 'OBLIQUES' || pm === 'ABS') return 'ABS';
    return pm;
  }

  return 'OTHER';
}

function matchesTargetMuscle(exerciseName: string, primaryMuscle: string | null | undefined, targetGroup: string): boolean {
  const target = targetGroup.toUpperCase().trim();
  const inferred = inferExerciseMuscle(exerciseName, primaryMuscle);

  if (target === 'LEGS' || target === 'LEG' || target === 'LOWER BODY') {
    return inferred === 'LEGS' || inferred === 'CALVES';
  }
  if (target === 'ABS' || target === 'CORE') {
    return inferred === 'ABS';
  }
  if (target === 'CHEST') {
    return inferred === 'CHEST';
  }
  if (target === 'BACK') {
    return inferred === 'BACK';
  }
  if (target === 'SHOULDERS' || target === 'SHOULDER') {
    return inferred === 'SHOULDERS' || inferred === 'TRAPS';
  }
  if (target === 'BICEPS' || target === 'BICEP') {
    return inferred === 'BICEPS';
  }
  if (target === 'TRICEPS' || target === 'TRICEP') {
    return inferred === 'TRICEPS';
  }
  if (target === 'ARMS' || target === 'ARM') {
    return inferred === 'BICEPS' || inferred === 'TRICEPS' || inferred === 'FOREARMS';
  }
  return inferred === target;
}

function getRpcMusclesForTarget(targetGroup: string): string[] {
  const target = targetGroup.toLowerCase().trim();
  if (target === 'chest') return ['CHEST'];
  if (target === 'back') return ['BACK'];
  if (target.startsWith('shoulder')) return ['SHOULDERS', 'TRAPS'];
  if (target === 'legs' || target === 'leg' || target === 'lower body') return ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES'];
  if (target.startsWith('bicep')) return ['BICEPS'];
  if (target.startsWith('tricep')) return ['TRICEPS'];
  if (target === 'abs' || target === 'core') return ['ABDOMINALS', 'OBLIQUES'];
  if (target === 'arms' || target === 'arm') return ['BICEPS', 'TRICEPS', 'FOREARMS'];
  return [targetGroup.toUpperCase()];
}

// Built-in high-quality presets if database returns few or zero items
const FALLBACK_TARGET_EXERCISES: Record<string, Array<{ name: string; sets: number; reps: string }>> = {
  chest: [
    { name: 'Barbell Bench Press', sets: 3, reps: '8-12' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
    { name: 'Cable Crossover', sets: 3, reps: '12-15' },
    { name: 'Machine Chest Press', sets: 3, reps: '10-12' },
    { name: 'Pec Deck Fly', sets: 3, reps: '12-15' },
    { name: 'Push-ups', sets: 3, reps: '15-20' },
    { name: 'Dumbbell Chest Fly', sets: 3, reps: '12-15' },
  ],
  back: [
    { name: 'Lat Pulldown', sets: 3, reps: '10-12' },
    { name: 'Seated Cable Row', sets: 3, reps: '10-12' },
    { name: 'Machine Seated Row', sets: 3, reps: '10-12' },
    { name: 'Wide Grip Pull-up', sets: 3, reps: '6-10' },
    { name: 'Barbell Bent-Over Row', sets: 3, reps: '8-12' },
    { name: 'Single-Arm Dumbbell Row', sets: 3, reps: '10-12' },
    { name: 'Inverted Row', sets: 3, reps: '10-12' },
  ],
  shoulders: [
    { name: 'Overhead Barbell Press', sets: 3, reps: '8-10' },
    { name: 'Seated Dumbbell Shoulder Press', sets: 3, reps: '10-12' },
    { name: 'Dumbbell Lateral Raise', sets: 3, reps: '12-15' },
    { name: 'Cable Face Pull', sets: 3, reps: '15-20' },
    { name: 'Machine Shoulder Press', sets: 3, reps: '10-12' },
    { name: 'Cable Lateral Raise', sets: 3, reps: '12-15' },
    { name: 'Pike Push-ups', sets: 3, reps: '10-12' },
  ],
  legs: [
    { name: 'Barbell Back Squat', sets: 3, reps: '8-10' },
    { name: 'Leg Press Machine', sets: 3, reps: '10-12' },
    { name: 'Dumbbell Goblet Squat', sets: 3, reps: '10-12' },
    { name: 'Leg Extension Machine', sets: 3, reps: '12-15' },
    { name: 'Lying Leg Curl Machine', sets: 3, reps: '10-12' },
    { name: 'Barbell Romanian Deadlift', sets: 3, reps: '8-10' },
    { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12' },
    { name: 'Standing Calf Raise Machine', sets: 3, reps: '15-20' },
  ],
  biceps: [
    { name: 'Standing Barbell Curl', sets: 3, reps: '8-12' },
    { name: 'Standing Dumbbell Curl', sets: 3, reps: '10-12' },
    { name: 'Dumbbell Hammer Curl', sets: 3, reps: '10-12' },
    { name: 'Preacher Curl Machine', sets: 3, reps: '10-12' },
    { name: 'Cable Bicep Curl', sets: 3, reps: '10-12' },
    { name: 'Incline Dumbbell Curl', sets: 3, reps: '10-12' },
  ],
  triceps: [
    { name: 'Cable Tricep Pushdown', sets: 3, reps: '12-15' },
    { name: 'Cable Overhead Tricep Extension', sets: 3, reps: '10-12' },
    { name: 'Barbell Skull Crusher', sets: 3, reps: '10-12' },
    { name: 'Overhead Dumbbell Tricep Extension', sets: 3, reps: '10-12' },
    { name: 'Machine Tricep Dip', sets: 3, reps: '10-12' },
    { name: 'Diamond Push-ups', sets: 3, reps: '10-15' },
  ],
  abs: [
    { name: 'Floor Crunches', sets: 3, reps: '20-25' },
    { name: 'Standard Plank', sets: 3, reps: '45-60s' },
    { name: 'Hanging Knee Raise', sets: 3, reps: '12-15' },
    { name: 'Kneeling Cable Crunch', sets: 3, reps: '15-20' },
    { name: 'Russian Twists', sets: 3, reps: '20-30' },
    { name: 'Side Plank', sets: 3, reps: '30-45s' },
  ],
};

export async function fetchTargetMuscleExercises(
  targetMuscle: string,
  preferredGender: string = 'male'
): Promise<TargetExerciseVideo[]> {
  const normTarget = (targetMuscle || 'all').toLowerCase().trim();
  const categoryLabel = normTarget.charAt(0).toUpperCase() + normTarget.slice(1);
  const rpcMuscles = getRpcMusclesForTarget(normTarget);

  const seenNames = new Set<string>();
  const cleanList: TargetExerciseVideo[] = [];

  // Helper to add clean exercise item
  const addItem = (
    id: string,
    name: string,
    videoUrl?: string | null,
    primaryMuscle?: string | null,
    sets?: number,
    reps?: string
  ) => {
    if (!name) return;
    const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenNames.has(norm)) return;

    if (!matchesTargetMuscle(name, primaryMuscle, normTarget)) return;

    seenNames.add(norm);
    cleanList.push({
      workoutVideoId: id,
      exerciseName: name,
      videoUrl: videoUrl || null,
      category: categoryLabel,
      primaryMuscle: primaryMuscle || categoryLabel,
      defaultSets: sets || 3,
      defaultReps: reps || '10-12',
    });
  };

  // 1. Primary Strategy: RPC get_custom_workout_videos
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_custom_workout_videos', {
      p_muscles: rpcMuscles,
      p_equipment: [],
      p_limit: 100,
      p_exclude: [],
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      for (const item of rpcData) {
        addItem(
          item.workout_video_id || item.workoutVideoId,
          item.exercise_name || item.exerciseName,
          item.video_url || item.videoUrl,
          item.muscle || item.primaryMuscle,
          item.default_sets || item.defaultSets,
          item.default_reps || item.defaultReps
        );
      }
    }
  } catch (err) {
    console.warn('[useWorkoutPlanTargetExercises] RPC failed, trying fallback:', err);
  }

  // 2. Direct Supabase Query Strategy (if RPC had fewer than 10 clean exercises)
  if (cleanList.length < 10) {
    try {
      let query = supabase
        .from('workout_videos')
        .select('workoutVideoId, exerciseName, videoUrl, primaryMuscle, defaultSets, defaultReps')
        .or('is_deleted.eq.false,is_deleted.is.null')
        .not('videoUrl', 'is', null)
        .order('createdAt', { ascending: false })
        .limit(100);

      const muscleKey = rpcMuscles[0];
      if (muscleKey) {
        query = query.ilike('primaryMuscle', `%${muscleKey}%`);
      }

      const { data: directData } = await query;
      if (directData && directData.length > 0) {
        for (const item of directData) {
          addItem(
            item.workoutVideoId,
            item.exerciseName,
            item.videoUrl,
            item.primaryMuscle,
            item.defaultSets,
            item.defaultReps
          );
        }
      }
    } catch (err) {
      console.warn('[useWorkoutPlanTargetExercises] Direct query failed:', err);
    }
  }

  // 3. Fallback Library Presets (guarantees the user is never left with an empty screen)
  const fallbackKey = Object.keys(FALLBACK_TARGET_EXERCISES).find(k => normTarget.includes(k));
  if (fallbackKey && cleanList.length < 6) {
    const presets = FALLBACK_TARGET_EXERCISES[fallbackKey] || [];
    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      addItem(
        `preset-${fallbackKey}-${i}`,
        p.name,
        null,
        categoryLabel,
        p.sets,
        p.reps
      );
    }
  }

  return cleanList;
}

export function useWorkoutPlanTargetExercises(targetMuscle: string, preferredGender: string = 'male') {
  return useQuery({
    queryKey: ['workoutPlanTargetExercises', targetMuscle?.toLowerCase(), preferredGender],
    queryFn: async () => {
      if (!targetMuscle) return [];
      return await fetchTargetMuscleExercises(targetMuscle, preferredGender);
    },
    staleTime: 5 * 60 * 1000,
  });
}

