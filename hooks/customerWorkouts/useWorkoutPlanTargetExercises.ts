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

function isCardioMovement(name: string): boolean {
  const l = (name || '').toLowerCase();
  return /treadmill|elliptical|spin bike|stationary bike|cycling|bicycle|rowing machine|rower|stairmaster|stair climber|air bike|ski erg|skipping|jump rope|jumping jacks|burpee|running|jogging|sprint|mountain climber|battle rope|box jump|high knee|hiit/i.test(l);
}

function isStretchingMovement(name: string): boolean {
  const l = (name || '').toLowerCase();
  return l.startsWith('stretching') || l.includes('stretch') || l.includes('pose sequence') || l.includes('yoga');
}

function isStrictChest(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

  // Strict disqualifiers for Chest
  if (/leg|femoral|calf|calves|squat|lunge|hip|thrust|glute|adduct|abduct|deadlift|pulldown|pull-up|pull up|pullup|chin-up|chin up|chinup|row|shrug|military press|shoulder press|overhead press|arnold|lateral raise|front raise|rear delt|bicep|tricep extension|pushdown|crunch|plank|sit up|situp|twist|clean and press|snatch|wrist curl/i.test(l)) {
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
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

  // Strict disqualifiers for Back
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
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

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
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

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
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

  // Disqualifiers
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
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

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
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

  // Disqualifiers
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
  if (pm === 'ABDOMINALS' || pm === 'OBLIQUES' || pm === 'ABS' || pm === 'CORE') {
    return true;
  }

  return false;
}

function isStrictCalves(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

  // Disqualifiers
  if (/bench|chest|row|pull-up|pullup|shoulder|overhead press|bicep|tricep|crunch|situp/i.test(l)) {
    return false;
  }

  // Calves indicators
  if (/calf|calves|tibialis|toe raise|heel raise|donkey calf/i.test(l)) {
    return true;
  }

  const pm = primaryMuscle?.toUpperCase();
  if (pm === 'CALVES' || pm === 'CALF') {
    return true;
  }

  return false;
}

function isStrictForearms(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

  // Disqualifiers
  if (/squat|lunge|leg press|bench press|chest|shoulder press|overhead press|lat pulldown/i.test(l)) {
    return false;
  }

  // Forearm indicators
  if (/forearm|wrist curl|reverse wrist curl|reverse curl|hammer curl|farmers walk|farmer|grip|pinch/i.test(l)) {
    return true;
  }

  const pm = primaryMuscle?.toUpperCase();
  if (pm === 'FOREARMS' || pm === 'FOREARM') {
    return true;
  }

  return false;
}

function isStrictHips(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

  // Disqualifiers
  if (/bench press|chest|bicep|tricep|shoulder press|overhead press|lat pulldown|pull-up/i.test(l)) {
    return false;
  }

  // Hips & glutes indicators
  if (/hip|thrust|glute|bridge|abductor|adductor|abduction|adduction|clamshell|kickback|cable kickback|frog pump|donkey kick|pelvic/i.test(l)) {
    return true;
  }

  const pm = primaryMuscle?.toUpperCase();
  if (pm === 'HIPS' || pm === 'HIP' || pm === 'GLUTES' || pm === 'GLUTE') {
    return true;
  }

  return false;
}

function isStrictCardio(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();

  // Disqualifiers for pure cardio
  if (/bench press|barbell curl|skull crusher|bicep curl|lat pulldown|overhead press/i.test(l)) {
    return false;
  }

  if (isCardioMovement(name)) return true;

  const pm = primaryMuscle?.toUpperCase();
  if (pm === 'CARDIO') return true;

  return /jump|burpee|skip|sprint|run|cycle|bike|row|aerobic/i.test(l);
}

function isStrictTrapezius(name: string, primaryMuscle?: string | null): boolean {
  const l = (name || '').toLowerCase();
  if (isCardioMovement(name) || isStretchingMovement(name)) return false;

  // Disqualifiers
  if (/bench press|squat|lunge|leg|bicep|calf|tricep/i.test(l)) {
    return false;
  }

  // Trapezius indicators
  if (/shrug|upright row|face pull|farmer|rack pull|high pull|trap|trapezius/i.test(l)) {
    return true;
  }

  const pm = primaryMuscle?.toUpperCase();
  if (pm === 'TRAPS' || pm === 'TRAPEZIUS') return true;

  return false;
}

function isStrictArms(name: string, primaryMuscle?: string | null): boolean {
  return isStrictBiceps(name, primaryMuscle) || isStrictTriceps(name, primaryMuscle) || isStrictForearms(name, primaryMuscle);
}

export function matchesStrictMuscle(name: string, primaryMuscle: string | null | undefined, targetGroup: string): boolean {
  const target = targetGroup.toLowerCase().trim();
  if (target === 'chest') return isStrictChest(name, primaryMuscle);
  if (target === 'back') return isStrictBack(name, primaryMuscle);
  if (target.startsWith('shoulder')) return isStrictShoulders(name, primaryMuscle);
  if (target === 'legs' || target === 'leg' || target === 'lower body') return isStrictLegs(name, primaryMuscle);
  if (target.startsWith('bicep')) return isStrictBiceps(name, primaryMuscle);
  if (target.startsWith('tricep')) return isStrictTriceps(name, primaryMuscle);
  if (target === 'abs' || target === 'core') return isStrictAbs(name, primaryMuscle);
  if (target === 'calves' || target === 'calf') return isStrictCalves(name, primaryMuscle);
  if (target === 'forearms' || target === 'forearm') return isStrictForearms(name, primaryMuscle);
  if (target === 'hips' || target === 'hip' || target === 'glutes') return isStrictHips(name, primaryMuscle);
  if (target === 'cardio') return isStrictCardio(name, primaryMuscle);
  if (target === 'trapezius' || target === 'traps' || target === 'trap') return isStrictTrapezius(name, primaryMuscle);
  if (target === 'arms' || target === 'arm') return isStrictArms(name, primaryMuscle);

  // Generic fallback if primaryMuscle or exercise name matches target
  const pm = (primaryMuscle || '').toLowerCase().trim();
  if (pm && (pm === target || target.includes(pm) || pm.includes(target))) return true;
  const lName = (name || '').toLowerCase();
  if (lName.includes(target)) return true;

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
  if (target === 'calves' || target === 'calf') return ['CALVES'];
  if (target === 'forearms' || target === 'forearm') return ['FOREARMS'];
  if (target === 'hips' || target === 'hip' || target === 'glutes') return ['HIPS', 'GLUTES'];
  if (target === 'cardio') return ['CARDIO'];
  if (target === 'trapezius' || target === 'traps' || target === 'trap') return ['TRAPS', 'TRAPEZIUS'];
  if (target === 'arms' || target === 'arm') return ['BICEPS', 'TRICEPS', 'FOREARMS'];
  return [targetGroup.toUpperCase()];
}

// Built-in presets for offline or edge fallback
export const FALLBACK_TARGET_EXERCISES: Record<string, Array<{ name: string; sets: number; reps: string }>> = {
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
  calves: [
    { name: 'Standing Barbell Calf Raise', sets: 3, reps: '12-15' },
    { name: 'Seated Dumbbell Calf Raise', sets: 3, reps: '15-20' },
    { name: 'Single-Leg Bodyweight Calf Raise', sets: 3, reps: '15-20' },
    { name: 'Leg Press Calf Raise', sets: 3, reps: '12-15' },
    { name: 'Donkey Calf Raise', sets: 3, reps: '15-20' },
  ],
  forearms: [
    { name: 'Seated Dumbbell Wrist Curl', sets: 3, reps: '15-20' },
    { name: 'Reverse Barbell Wrist Curl', sets: 3, reps: '15-20' },
    { name: 'Farmers Walk', sets: 3, reps: '45-60s' },
    { name: 'Standing Reverse Barbell Curl', sets: 3, reps: '10-12' },
    { name: 'Dumbbell Hammer Hold', sets: 3, reps: '30-45s' },
  ],
  hips: [
    { name: 'Barbell Hip Thrust', sets: 3, reps: '10-12' },
    { name: 'Dumbbell Glute Bridge', sets: 3, reps: '12-15' },
    { name: 'Cable Glute Kickback', sets: 3, reps: '12-15' },
    { name: 'Seated Hip Abduction Machine', sets: 3, reps: '15-20' },
    { name: 'Lateral Resistance Band Walk', sets: 3, reps: '15-20' },
  ],
  cardio: [
    { name: 'Treadmill Incline Walk / Run', sets: 1, reps: '20-30 min' },
    { name: 'Stationary Spin Bike Intervals', sets: 1, reps: '20-25 min' },
    { name: 'Rowing Machine Intervals', sets: 1, reps: '15-20 min' },
    { name: 'Stair Climber Machine', sets: 1, reps: '15-20 min' },
    { name: 'Jump Rope High Intensity', sets: 3, reps: '3-5 min' },
    { name: 'Burpees & Mountain Climbers', sets: 3, reps: '15-20' },
  ],
  trapezius: [
    { name: 'Barbell Shrug', sets: 3, reps: '10-12' },
    { name: 'Dumbbell Shrug', sets: 3, reps: '12-15' },
    { name: 'Cable Face Pull with High Pull', sets: 3, reps: '15-20' },
    { name: 'Behind-the-Back Barbell Shrug', sets: 3, reps: '10-12' },
    { name: 'Smith Machine Shrug', sets: 3, reps: '12-15' },
  ],
  arms: [
    { name: 'Standing Barbell Curl', sets: 3, reps: '10-12' },
    { name: 'Cable Tricep Pushdown', sets: 3, reps: '12-15' },
    { name: 'Dumbbell Hammer Curl', sets: 3, reps: '10-12' },
    { name: 'Overhead Dumbbell Tricep Extension', sets: 3, reps: '10-12' },
    { name: 'Seated Dumbbell Wrist Curl', sets: 3, reps: '15-20' },
  ],
};

export async function fetchTargetMuscleExercises(
  targetMuscle: string,
  preferredGender: string = 'male'
): Promise<TargetExerciseVideo[]> {
  const normTarget = (targetMuscle || 'all').toLowerCase().trim();
  const categoryLabel = normTarget.charAt(0).toUpperCase() + normTarget.slice(1);
  const rpcMuscles = getRpcMusclesForTarget(normTarget);
  const preferredRole = (preferredGender || 'male').toLowerCase().trim().includes('female') ? 'female' : 'male';
  const oppositeRole = preferredRole === 'female' ? 'male' : 'female';

  const seenNames = new Set<string>();
  const cleanList: TargetExerciseVideo[] = [];

  const extractWorkoutRole = (workouts: any): string | null => {
    if (!workouts) return null;
    if (Array.isArray(workouts)) {
      return (workouts[0]?.role || '').toLowerCase().trim() || null;
    }
    return (workouts.role || '').toLowerCase().trim() || null;
  };

  // 1. Fetch all workouts to strictly identify IDs that belong to the opposite gender
  const oppositeWorkoutIds = new Set<string>();
  const preferredWorkoutIds: string[] = [];

  try {
    const { data: allWorkouts } = await supabase
      .from('workouts')
      .select('workoutId, workoutType, role')
      .or('is_deleted.eq.false,is_deleted.is.null');

    (allWorkouts || []).forEach((w: any) => {
      const wRole = (w.role || '').toLowerCase().trim();
      if (wRole === oppositeRole) {
        oppositeWorkoutIds.add(w.workoutId);
      } else {
        const wt = (w.workoutType || '').toLowerCase().trim();
        let isMatch = false;
        if (normTarget === 'chest') isMatch = wt.includes('chest');
        else if (normTarget === 'back') isMatch = wt.includes('back');
        else if (normTarget.startsWith('shoulder')) isMatch = wt.includes('shoulder') || wt.includes('trap');
        else if (normTarget === 'legs' || normTarget === 'leg' || normTarget === 'lower body') isMatch = wt.includes('leg') || wt.includes('quad') || wt.includes('hamstring') || wt.includes('glute');
        else if (normTarget.startsWith('bicep')) isMatch = wt.includes('bicep') || wt.includes('arm');
        else if (normTarget.startsWith('tricep')) isMatch = wt.includes('tricep') || wt.includes('arm');
        else if (normTarget === 'abs' || normTarget === 'core') isMatch = wt.includes('abs') || wt.includes('core');
        else if (normTarget === 'calves' || normTarget === 'calf') isMatch = wt.includes('calf') || wt.includes('calves');
        else if (normTarget === 'forearms' || normTarget === 'forearm') isMatch = wt.includes('forearm');
        else if (normTarget === 'hips' || normTarget === 'hip') isMatch = wt.includes('hip') || wt.includes('glute');
        else if (normTarget === 'cardio') isMatch = wt.includes('cardio');
        else if (normTarget === 'trapezius' || normTarget === 'traps') isMatch = wt.includes('trap');
        else isMatch = wt.includes(normTarget) || normTarget.includes(wt);

        if (isMatch) {
          preferredWorkoutIds.push(w.workoutId);
        }
      }
    });
  } catch (err) {
    console.warn('[useWorkoutPlanTargetExercises] Workouts preload error:', err);
  }

  const addItem = (
    id: string,
    name: string,
    videoUrl?: string | null,
    primaryMuscle?: string | null,
    sets?: number,
    reps?: string,
    workoutId?: string | null,
    role?: string | null
  ) => {
    if (!name) return;
    const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenNames.has(norm)) return;

    // 1. Strict rejection if this video belongs to opposite gender workoutId
    if (workoutId && oppositeWorkoutIds.has(workoutId)) {
      return;
    }

    // 2. Strict rejection if role explicitly matches opposite role
    const cleanRole = (role || '').toLowerCase().trim();
    if (cleanRole === oppositeRole) {
      return;
    }

    // 3. Strict videoUrl inspection
    if (videoUrl && typeof videoUrl === 'string') {
      const lowerUrl = videoUrl.toLowerCase();
      if (preferredRole === 'male') {
        if (/female|women|woman|\/female\/|_female|-female|female_|women_/i.test(lowerUrl)) {
          return;
        }
      } else {
        if (/male|men|man|\/male\/|_male|-male|male_|men_/i.test(lowerUrl)) {
          return;
        }
      }
    }

    // 4. Strict exercise name inspection
    const lowerName = name.toLowerCase();
    if (preferredRole === 'male') {
      if (/\(female\)|\(women\)|\(woman\)|female\s|women\s/i.test(lowerName)) {
        return;
      }
    } else {
      if (/\(male\)|\(men\)|\(man\)|male\s|men\s/i.test(lowerName)) {
        return;
      }
    }

    // 5. Strict muscle matching
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

  // Strategy 1: Direct Supabase query matching preferredWorkoutIds
  if (preferredWorkoutIds.length > 0) {
    try {
      const { data: directData } = await supabase
        .from('workout_videos')
        .select(`
          workoutVideoId,
          workoutId,
          exerciseName,
          videoUrl,
          primaryMuscle,
          defaultSets,
          defaultReps,
          workouts:workoutId (
            role
          )
        `)
        .in('workoutId', preferredWorkoutIds)
        .or('is_deleted.eq.false,is_deleted.is.null')
        .not('videoUrl', 'is', null)
        .order('createdAt', { ascending: false })
        .limit(150);

      if (directData && directData.length > 0) {
        for (const item of directData) {
          const itemRole = extractWorkoutRole(item.workouts);
          addItem(
            item.workoutVideoId,
            item.exerciseName,
            item.videoUrl,
            item.primaryMuscle,
            item.defaultSets,
            item.defaultReps,
            item.workoutId,
            itemRole
          );
        }
      }
    } catch (err) {
      console.warn('[useWorkoutPlanTargetExercises] Strategy 1 error:', err);
    }
  }

  // Strategy 2: Query by primaryMuscle (strictly excluding oppositeWorkoutIds)
  if (cleanList.length < 10) {
    try {
      let query = supabase
        .from('workout_videos')
        .select(`
          workoutVideoId,
          workoutId,
          exerciseName,
          videoUrl,
          primaryMuscle,
          defaultSets,
          defaultReps,
          workouts:workoutId (
            role
          )
        `)
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
          const itemRole = extractWorkoutRole(item.workouts);
          addItem(
            item.workoutVideoId,
            item.exerciseName,
            item.videoUrl,
            item.primaryMuscle,
            item.defaultSets,
            item.defaultReps,
            item.workoutId,
            itemRole
          );
        }
      }
    } catch (err) {
      console.warn('[useWorkoutPlanTargetExercises] Strategy 2 error:', err);
    }
  }

  // Strategy 3: Fallback Library Presets
  const fallbackKey = Object.keys(FALLBACK_TARGET_EXERCISES).find(k => normTarget.includes(k) || k.includes(normTarget));
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
        p.reps,
        null,
        preferredRole
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
