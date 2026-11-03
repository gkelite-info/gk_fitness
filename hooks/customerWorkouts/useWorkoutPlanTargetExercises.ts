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

function isCardio(name: string): boolean {
  const l = (name || '').toLowerCase();
  return /treadmill|elliptical|spin bike|stationary bike|cycling|bicycle|rowing machine|stairmaster|air bike|ski erg/i.test(l);
}

function isStretching(name: string): boolean {
  const l = (name || '').toLowerCase();
  return l.startsWith('stretching') || l.includes('stretch') || l.includes('pose sequence');
}

function isStrictChest(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardio(name) || isStretching(name)) return false;

  // Strict disqualifiers for Chest
  if (/leg|femoral|calf|calves|squat|lunge|hip|thrust|glute|adduct|abduct|deadlift|pulldown|pull-up|pull up|pullup|chin-up|chin up|chinup|row|shrug|military press|shoulder press|overhead press|arnold|lateral raise|front raise|rear delt|bicep|tricep extension|pushdown|crunch|plank|sit up|situp|twist|clean and press|snatch/i.test(l)) {
    return false;
  }

  // Must match chest movement
  if (/bench press|chest press|chest fly|pec deck|pec fly|push-up|push up|pushup|incline press|decline press|crossover|chest dip|chest|pullover|flat dumbbell press|incline dumbbell press|decline dumbbell press|hammer press/i.test(l)) {
    return true;
  }

  if (primaryMuscle?.toUpperCase() === 'CHEST') {
    return /press|fly|flye|dip/i.test(l);
  }

  return false;
}

function isStrictBack(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardio(name) || isStretching(name)) return false;

  // Strict disqualifiers for Back (back exercises NEVER contain press, bench, chest, etc.)
  if (/press|chest|bench|pec|push-up|push up|pushup|bicep curl|tricep|skull crusher|lateral raise|front raise|upright row|crunch|sit up|situp|plank|twist|squat|lunge|leg press|leg extension|leg curl|calf|calves|fly|flye/i.test(l)) {
    return false;
  }

  // Back indicators
  if (/pull-up|pull up|pullup|chin-up|chin up|chinup|lat|pulldown|pullover|seated row|bent-over row|bent over row|t-bar|inverted row|hyperextension|back extension|deadlift/i.test(l)) {
    return true;
  }
  if (/row/i.test(l) && !/upright row/i.test(l)) {
    return true;
  }

  if (primaryMuscle?.toUpperCase() === 'BACK') {
    return /row|pull|lat|deadlift/i.test(l);
  }

  return false;
}

function isStrictShoulders(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardio(name) || isStretching(name)) return false;

  // Disqualifiers
  if (/pulldown|pull-up|pull up|pullup|chin-up|chin up|chinup|bench press|chest|pec|leg|squat|lunge|calf|bicep curl|tricep pushdown|skull crusher|crunch|sit up|situp/i.test(l)) {
    return false;
  }

  // Shoulder indicators
  if (/shoulder|overhead press|military press|arnold|lateral raise|side raise|front raise|rear delt|reverse fly|face pull|deltoid|pike push|upright row|shrug/i.test(l)) {
    return true;
  }

  if (primaryMuscle?.toUpperCase() === 'SHOULDERS' || primaryMuscle?.toUpperCase() === 'TRAPS') {
    return /press|raise|delt|shrug/i.test(l);
  }

  return false;
}

function isStrictLegs(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardio(name) || isStretching(name)) return false;

  // Disqualifiers
  if (/bench press|chest|pec|push-up|push up|pushup|pulldown|pull-up|pull up|pullup|chin-up|chin up|chinup|row|bicep curl|tricep pushdown|skull crusher|overhead press|military press|shoulder press|arnold|lateral raise|front raise|shrug|clean and press/i.test(l)) {
    return false;
  }

  // Leg indicators
  if (/squat|lunge|leg press|leg extension|leg curl|hamstring|quad|calf|calves|glute|hip thrust|glute bridge|rdl|romanian deadlift|stiff leg|hack squat|sissy|split squat|abductor|adductor|femoral|step up|hip abduction|hip adduction|hip extension/i.test(l)) {
    return true;
  }

  const pm = primaryMuscle?.toUpperCase();
  if (pm === 'QUADRICEPS' || pm === 'HAMSTRINGS' || pm === 'GLUTES' || pm === 'CALVES' || pm === 'LEGS') {
    return true;
  }

  return false;
}

function isStrictBiceps(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardio(name) || isStretching(name)) return false;

  // Disqualifiers (NEVER allow press, row, pull-up, tricep, leg)
  if (/press|row|pull-up|pull up|pullup|pulldown|tricep|skull crusher|kickback|bench|chest|squat|lunge|leg|calf|shoulder|lateral raise|crunch|sit up/i.test(l)) {
    return false;
  }

  // Bicep indicators
  if (/bicep|preacher|concentration|drag curl/i.test(l)) {
    return true;
  }
  if (/curl/i.test(l) && !/leg curl|wrist curl/i.test(l)) {
    return true;
  }

  if (primaryMuscle?.toUpperCase() === 'BICEPS') {
    return /curl/i.test(l);
  }

  return false;
}

function isStrictTriceps(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardio(name) || isStretching(name)) return false;

  // Disqualifiers
  if (/bicep|curl|squat|lunge|leg|chest fly|pulldown|pull-up|chin-up|one leg/i.test(l)) {
    return false;
  }

  // Tricep indicators
  if (/tricep|pushdown|skull crusher|overhead extension|triceps extension|close grip bench|diamond push|tricep dip|bench dip/i.test(l)) {
    return true;
  }
  if (/kickback/i.test(l) && !/one leg|leg|band one/i.test(l)) {
    return true;
  }

  if (primaryMuscle?.toUpperCase() === 'TRICEPS') {
    return /extension|pushdown|dip|press/i.test(l);
  }

  return false;
}

function isStrictAbs(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardio(name) || isStretching(name)) return false;

  // Disqualifiers (NEVER allow row, press, bench, pulldown, squat)
  if (/row|press|bench|squat|lunge|leg press|bicep curl|tricep pushdown|pulldown|shoulder/i.test(l)) {
    return false;
  }

  // Abs indicators
  if (/crunch|plank|sit up|situp|leg raise|knee raise|ab wheel|flutter kick|v-up|side bend|woodchopper|hollow|spell caster|otis-up|deadbug|russian twist/i.test(l)) {
    return true;
  }
  if (/twist/i.test(l) && !/row|pulldown/i.test(l)) {
    return true;
  }

  const pm = primaryMuscle?.toUpperCase();
  if (pm === 'ABDOMINALS' || pm === 'OBLIQUES' || pm === 'ABS') {
    return true;
  }

  return false;
}

function matchesStrictMuscle(name: string, primaryMuscle: string | null | undefined, targetGroup: string): boolean {
  const target = targetGroup.toLowerCase().trim();
  if (target === 'chest') return isStrictChest(name, primaryMuscle);
  if (target === 'back') return isStrictBack(name, primaryMuscle);
  if (target.startsWith('shoulder')) return isStrictShoulders(name, primaryMuscle);
  if (target === 'legs' || target === 'leg' || target === 'lower body') return isStrictLegs(name, primaryMuscle);
  if (target.startsWith('bicep')) return isStrictBiceps(name, primaryMuscle);
  if (target.startsWith('tricep')) return isStrictTriceps(name, primaryMuscle);
  if (target === 'abs' || target === 'core') return isStrictAbs(name, primaryMuscle);
  return false;
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

// Built-in presets for offline or edge fallback
const FALLBACK_TARGET_EXERCISES: Record<string, Array<{ name: string; sets: number; reps: string }>> = {
  chest: [
    { name: 'Barbell Bench Press', sets: 3, reps: '8-12' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
    { name: 'Cable Crossover', sets: 3, reps: '12-15' },
    { name: 'Machine Chest Press', sets: 3, reps: '10-12' },
    { name: 'Pec Deck Fly', sets: 3, reps: '12-15' },
    { name: 'Push-ups', sets: 3, reps: '15-20' },
  ],
  back: [
    { name: 'Lat Pulldown', sets: 3, reps: '10-12' },
    { name: 'Seated Cable Row', sets: 3, reps: '10-12' },
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
    { name: 'Pike Push-ups', sets: 3, reps: '10-12' },
  ],
  legs: [
    { name: 'Barbell Back Squat', sets: 3, reps: '8-10' },
    { name: 'Leg Press Machine', sets: 3, reps: '10-12' },
    { name: 'Dumbbell Goblet Squat', sets: 3, reps: '10-12' },
    { name: 'Leg Extension Machine', sets: 3, reps: '12-15' },
    { name: 'Lying Leg Curl Machine', sets: 3, reps: '10-12' },
    { name: 'Barbell Romanian Deadlift', sets: 3, reps: '8-10' },
  ],
  biceps: [
    { name: 'Standing Barbell Curl', sets: 3, reps: '8-12' },
    { name: 'Standing Dumbbell Curl', sets: 3, reps: '10-12' },
    { name: 'Dumbbell Hammer Curl', sets: 3, reps: '10-12' },
    { name: 'Preacher Curl Machine', sets: 3, reps: '10-12' },
    { name: 'Cable Bicep Curl', sets: 3, reps: '10-12' },
  ],
  triceps: [
    { name: 'Cable Tricep Pushdown', sets: 3, reps: '12-15' },
    { name: 'Cable Overhead Tricep Extension', sets: 3, reps: '10-12' },
    { name: 'Barbell Skull Crusher', sets: 3, reps: '10-12' },
    { name: 'Overhead Dumbbell Tricep Extension', sets: 3, reps: '10-12' },
    { name: 'Diamond Push-ups', sets: 3, reps: '10-15' },
  ],
  abs: [
    { name: 'Floor Crunches', sets: 3, reps: '20-25' },
    { name: 'Standard Plank', sets: 3, reps: '45-60s' },
    { name: 'Hanging Knee Raise', sets: 3, reps: '12-15' },
    { name: 'Kneeling Cable Crunch', sets: 3, reps: '15-20' },
    { name: 'Russian Twists', sets: 3, reps: '20-30' },
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

    if (!matchesStrictMuscle(name, primaryMuscle, normTarget)) return;

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

  // 1. Primary Strategy: RPC get_custom_workout_videos with larger pool
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_custom_workout_videos', {
      p_muscles: rpcMuscles,
      p_equipment: [],
      p_limit: 150,
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
    console.warn('[useWorkoutPlanTargetExercises] RPC failed, trying direct query:', err);
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
        .limit(150);

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

  // 3. Fallback Library Presets
  const fallbackKey = Object.keys(FALLBACK_TARGET_EXERCISES).find(k => normTarget.includes(k));
  if (fallbackKey && cleanList.length < 5) {
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
