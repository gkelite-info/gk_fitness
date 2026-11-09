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
  if (target.startsWith('shoulder')) return ['SHOULDERS', 'SHOULDER', 'TRAPS'];
  if (target === 'legs' || target === 'leg' || target === 'lower body') return ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'HIPS', 'LEGS'];
  if (target.startsWith('bicep')) return ['BICEPS', 'ARMS'];
  if (target.startsWith('tricep')) return ['TRICEPS', 'TRICEP', 'ARMS'];
  if (target === 'abs' || target === 'core') return ['ABDOMINALS', 'OBLIQUES', 'ABS'];
  if (target === 'calves' || target === 'calf') return ['CALVES', 'CALF', 'LEGS'];
  if (target === 'forearms' || target === 'forearm') return ['FOREARMS', 'ARMS'];
  if (target === 'hips' || target === 'hip' || target === 'glutes') return ['HIPS', 'GLUTES', 'LEGS'];
  if (target === 'cardio') return ['CARDIO'];
  if (target === 'trapezius' || target === 'traps' || target === 'trap') return ['TRAPS', 'TRAPEZIUS', 'BACK'];
  if (target === 'arms' || target === 'arm') return ['BICEPS', 'TRICEPS', 'FOREARMS', 'ARMS'];
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

// Comprehensive sets of verified female and male workout IDs
const KNOWN_FEMALE_WORKOUT_IDS = new Set([
  '24cc9244-1cdd-4219-a481-f1fbe952cebe', 'fbe1ea60-bd91-45de-b914-6e1d925a48ec', '659a3d98-9fd7-4fd4-8109-84272955dd0e',
  '3ceb9c04-2541-4304-8a74-974a955cd7dc', 'c00d785e-07de-4dac-99be-73e1026ff0bb', 'c3e5a606-ee60-4169-9fae-6a4c9abfce80',
  '04d1b9b0-114d-4ab5-a402-97596c7b870b', '5e612e83-95de-4b58-b61e-208321de9344', '0c7d2a9d-4983-4e16-9e81-49af8d0092ee',
  '4118af16-310f-476f-af0f-3fa370090295', 'cd5cf6ef-7138-4962-8fd4-7f26360740e9', '6668148e-d1c8-4512-812c-8c18078d620a',
  '72bf26fd-d939-4b57-a016-89545e959536', '4188b63b-3c2b-42d8-a8f3-f4a315f906de', '5002ca9f-79fd-4c84-967b-38c4e189bead',
  '8ace356d-d3f1-492c-bfbd-596226617078', 'd2e12c77-e24a-4de2-8f0e-9a867b67d17e', '36f6b8e2-7ea8-4f06-8e90-d680cc6ca459',
  '376bb182-29eb-462e-afa5-735c7290dc24', 'fcce6813-f150-4cf7-a513-564ed5980af5'
]);

const KNOWN_MALE_WORKOUT_IDS = new Set([
  'ab312b33-c4de-4f0e-973b-04f90d171704', '3e4e5e91-4f2a-4f8a-9364-2b6eb2ed852d', 'fd825955-71c9-4051-afd5-2e1ac5cab0f2',
  'c65725f4-0796-49c6-b3b3-0499352171c4', 'eb1b8c97-d092-4b8a-916b-0f71ed7df9e3', '51b8b98e-ad22-4842-b50b-894d89c82663',
  'd889858d-6c4d-4c32-b14d-cbc3001bed49', '33b025a2-3cc7-452f-9965-e5e5030c23ca', '6b331de1-909a-4faf-98f6-6c9812af87d1',
  '497f6524-6589-488f-915b-74b98b8e25c7', '1fbafb6b-b8e0-4ea3-b530-742841899b74', '08eb0fc4-7c0a-4b07-8f71-c4ae6c0b3877',
  '86b2f9f8-fe4d-4dd2-a553-9df050c5c83b', '901f9918-4801-4ca9-9a1a-ebd60f52e7d4', '81c4f6f9-3114-4836-98a6-d774ed282183',
  '05fa3e87-ff22-4b66-ba2a-ee1fb29042cc', 'e8f1397b-58fc-480e-a159-583337eb6870', 'e34c4133-0489-4cb2-b0f8-cbf81ea85fc0',
  '890f6299-76af-4863-8338-734cd6fdf05d', 'd4c30013-0fb4-44c7-9dc8-1ac92b3e2f3f', 'db026b0b-3903-43e9-a791-1294471f0faf',
  '97938dd3-aa25-4d00-9dab-b2fbcbdb45c3'
]);

export function isExerciseMatchingGender(
  preferredRole: 'male' | 'female',
  videoUrl?: string | null,
  workoutId?: string | null,
  role?: string | null,
  exerciseName?: string | null
): boolean {
  const oppositeRole = preferredRole === 'female' ? 'male' : 'female';

  // 1. Check explicit role
  if (role) {
    const cleanRole = role.toLowerCase().trim();
    if (cleanRole === oppositeRole) return false;
  }

  // 2. Check workout ID sets
  if (workoutId) {
    if (preferredRole === 'male' && KNOWN_FEMALE_WORKOUT_IDS.has(workoutId)) return false;
    if (preferredRole === 'female' && KNOWN_MALE_WORKOUT_IDS.has(workoutId)) return false;
  }

  // 3. Check video URL timestamp & explicit keywords
  if (videoUrl && typeof videoUrl === 'string') {
    const lowerUrl = videoUrl.toLowerCase();
    if (preferredRole === 'male') {
      if (/female|women|woman|\/female\/|_female|-female|female_|women_/i.test(lowerUrl)) return false;
    } else {
      if (/male|men|man|\/male\/|_male|-male|male_|men_/i.test(lowerUrl)) return false;
    }

    const filename = videoUrl.split('/').pop() || videoUrl;
    const ts = parseInt(filename.split('_')[0], 10);
    if (!isNaN(ts)) {
      if (preferredRole === 'male' && ts >= 1789025000000) return false;
      if (preferredRole === 'female' && ts < 1789025000000) return false;
    }
  }

  // 4. Check exercise name keywords
  if (exerciseName && typeof exerciseName === 'string') {
    const lowerName = exerciseName.toLowerCase();
    if (preferredRole === 'male') {
      if (/\(female\)|\(women\)|\(woman\)|female\s|women\s/i.test(lowerName)) return false;
    } else {
      if (/\(male\)|\(men\)|\(man\)|male\s|men\s/i.test(lowerName)) return false;
    }
  }

  return true;
}

export async function fetchTargetMuscleExercises(
  targetMuscle: string,
  preferredGender: string = 'male'
): Promise<TargetExerciseVideo[]> {
  const normTarget = (targetMuscle || 'all').toLowerCase().trim();
  const categoryLabel = normTarget.charAt(0).toUpperCase() + normTarget.slice(1);
  const rpcMuscles = getRpcMusclesForTarget(normTarget);
  const preferredRole: 'male' | 'female' = (preferredGender || 'male').toLowerCase().trim().includes('female') ? 'female' : 'male';
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

  // 1. Fetch all workouts to identify IDs that belong to the opposite gender if accessible
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

    // Strict gender filtering: reject any opposite gender workout ID or video
    if (workoutId && oppositeWorkoutIds.has(workoutId)) {
      return;
    }
    if (!isExerciseMatchingGender(preferredRole, videoUrl, workoutId, role, name)) {
      return;
    }

    // Strict muscle matching
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

  // Strategy 0: Primary RPC query using get_custom_workout_videos (SECURITY DEFINER, immune to anon RLS)
  try {
    const { data: rpcVideos, error: rpcError } = await supabase.rpc('get_custom_workout_videos', {
      p_muscles: rpcMuscles,
      p_equipment: [],
      p_limit: 65,
      p_exclude: [],
    });

    if (!rpcError && Array.isArray(rpcVideos) && rpcVideos.length > 0) {
      for (const item of rpcVideos) {
        addItem(
          item.workout_video_id || item.workoutVideoId,
          item.exercise_name || item.exerciseName,
          item.video_url || item.videoUrl,
          item.muscle || item.category || categoryLabel,
          item.default_sets || 3,
          item.default_reps || '10-12',
          item.workout_id || item.workoutId,
          null
        );
      }
    }
  } catch (rpcErr) {
    console.warn('[useWorkoutPlanTargetExercises] Strategy 0 RPC error:', rpcErr);
  }

  // Strategy 1: Direct Supabase query matching preferredWorkoutIds
  if (preferredWorkoutIds.length > 0 && cleanList.length < 10) {
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
      const donor = cleanList[i % Math.max(cleanList.length, 1)];
      addItem(
        `preset-${fallbackKey}-${i}`,
        p.name,
        donor?.videoUrl || null,
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
