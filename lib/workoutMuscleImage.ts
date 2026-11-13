/**
 * Maps a workout type / muscle group (with exercise-name fallback for mixed splits)
 * to the static local thumbnail artwork in assets/ displayed behind the Play button
 * and on workout cards across iOS and Android.
 */

export const MUSCLE_IMAGE_ASSETS = {
  triceps: require('../assets/triceps.jpeg'),
  biceps: require('../assets/biceps.jpeg'),
  chest: require('../assets/chest.jpeg'),
  back: require('../assets/back-stood.png'),
  shoulder: require('../assets/shoulder.jpeg'),
  legs: require('../assets/legs.jpeg'),
  abs: require('../assets/abs.jpeg'),
  calves: require('../assets/calves.jpeg'),
  hips: require('../assets/hips.jpeg'),
  trapezius: require('../assets/trapezius.jpeg'),
  forearms: require('../assets/forearms.jpeg'),
  cardio: require('../assets/cardio.jpeg'),
  default: require('../assets/barbell.png'),
};

/**
 * Matches exercise names or specific workout descriptions against muscle categories.
 */
function matchSpecificMuscle(text: string): any | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // 1. Calves
  if (
    lower.includes('calf') ||
    lower.includes('calves') ||
    lower.includes('tibialis') ||
    lower.includes('heel raise')
  ) {
    return MUSCLE_IMAGE_ASSETS.calves;
  }

  // 2. Hips / Glutes
  if (
    lower.includes('hip') ||
    lower.includes('glute') ||
    lower.includes('adduct') ||
    lower.includes('abduct') ||
    lower.includes('bridge')
  ) {
    return MUSCLE_IMAGE_ASSETS.hips;
  }

  // 3. Trapezius / Traps
  if (
    lower.includes('trapezius') ||
    lower.includes('trap') ||
    lower.includes('shrug')
  ) {
    return MUSCLE_IMAGE_ASSETS.trapezius;
  }

  // 4. Forearms
  if (
    lower.includes('forearm') ||
    lower.includes('wrist curl') ||
    lower.includes('reverse curl') ||
    lower.includes('grip')
  ) {
    return MUSCLE_IMAGE_ASSETS.forearms;
  }

  // 5. Cardio
  if (
    lower.includes('cardio') ||
    lower.includes('treadmill') ||
    lower.includes('jump rope') ||
    lower.includes('burpee') ||
    lower.includes('jumping jack') ||
    lower.includes('mountain climber') ||
    lower.includes('cycling') ||
    lower.includes('running') ||
    lower.includes('jogging') ||
    lower.includes('hiit') ||
    lower.includes('aerobic') ||
    lower.includes('elliptical') ||
    lower.includes('rower')
  ) {
    return MUSCLE_IMAGE_ASSETS.cardio;
  }

  // 6. Triceps
  if (
    lower.includes('tricep') ||
    lower.includes('pushdown') ||
    lower.includes('skull') ||
    lower.includes('kickback') ||
    lower.includes('close grip') ||
    lower.includes('bench dip')
  ) {
    return MUSCLE_IMAGE_ASSETS.triceps;
  }

  // 7. Biceps
  if (
    lower.includes('bicep') ||
    lower.includes('curl') ||
    lower.includes('preacher') ||
    lower.includes('chin up') ||
    lower.includes('chin-up')
  ) {
    return MUSCLE_IMAGE_ASSETS.biceps;
  }

  // 8. Chest
  if (
    lower.includes('chest') ||
    lower.includes('pectoral') ||
    lower.includes('pec') ||
    lower.includes('bench press') ||
    lower.includes('push up') ||
    lower.includes('push-up') ||
    lower.includes('pushup') ||
    lower.includes('fly') ||
    lower.includes('flies') ||
    lower.includes('crossover')
  ) {
    return MUSCLE_IMAGE_ASSETS.chest;
  }

  // 9. Back
  if (
    lower.includes('back') ||
    lower.includes('lat ') ||
    lower.includes('lats') ||
    lower.includes('pulldown') ||
    lower.includes('pull up') ||
    lower.includes('pull-up') ||
    lower.includes('pullup') ||
    lower.includes('deadlift') ||
    lower.includes('row') ||
    lower.includes('rhomboid')
  ) {
    return MUSCLE_IMAGE_ASSETS.back;
  }

  // 10. Shoulders
  if (
    lower.includes('shoulder') ||
    lower.includes('delt') ||
    lower.includes('lateral raise') ||
    lower.includes('overhead press') ||
    lower.includes('arnold') ||
    lower.includes('military press') ||
    lower.includes('front raise')
  ) {
    return MUSCLE_IMAGE_ASSETS.shoulder;
  }

  // 11. Legs
  if (
    lower.includes('leg') ||
    lower.includes('lower body') ||
    lower.includes('quad') ||
    lower.includes('hamstring') ||
    lower.includes('squat') ||
    lower.includes('lunge') ||
    lower.includes('bulgarian') ||
    lower.includes('hack')
  ) {
    return MUSCLE_IMAGE_ASSETS.legs;
  }

  // 12. Abs / Core
  if (
    lower.includes('abs') ||
    lower.includes('ab ') ||
    lower === 'ab' ||
    lower.includes('abdom') ||
    lower.includes('core') ||
    lower.includes('oblique') ||
    lower.includes('crunch') ||
    lower.includes('plank') ||
    lower.includes('sit up') ||
    lower.includes('sit-up') ||
    lower.includes('situp') ||
    lower.includes('belly')
  ) {
    return MUSCLE_IMAGE_ASSETS.abs;
  }

  return null;
}

/**
 * Matches high-level muscle group / workout category labels directly.
 */
function matchMuscleGroup(normalizedGroup: string): any | null {
  if (!normalizedGroup) return null;
  const lower = normalizedGroup.toLowerCase().trim();

  if (lower.includes('calf') || lower.includes('calves')) return MUSCLE_IMAGE_ASSETS.calves;
  if (lower.includes('hip') || lower.includes('glute')) return MUSCLE_IMAGE_ASSETS.hips;
  if (lower.includes('trap')) return MUSCLE_IMAGE_ASSETS.trapezius;
  if (lower.includes('forearm')) return MUSCLE_IMAGE_ASSETS.forearms;
  if (lower.includes('cardio')) return MUSCLE_IMAGE_ASSETS.cardio;
  if (lower.includes('tricep')) return MUSCLE_IMAGE_ASSETS.triceps;
  if (lower.includes('bicep')) return MUSCLE_IMAGE_ASSETS.biceps;
  if (lower.includes('chest') || lower.includes('pectoral')) return MUSCLE_IMAGE_ASSETS.chest;
  if (lower.includes('back') || lower.includes('lat')) return MUSCLE_IMAGE_ASSETS.back;
  if (lower.includes('shoulder') || lower.includes('delt')) return MUSCLE_IMAGE_ASSETS.shoulder;
  if (
    lower.includes('leg') ||
    lower.includes('quad') ||
    lower.includes('hamstring') ||
    lower.includes('lower body')
  ) {
    return MUSCLE_IMAGE_ASSETS.legs;
  }
  if (
    lower.includes('ab') ||
    lower.includes('core') ||
    lower.includes('oblique')
  ) {
    return MUSCLE_IMAGE_ASSETS.abs;
  }
  return null;
}

/**
 * Returns the local asset thumbnail source from assets/ for a muscle group and exercise name.
 */
export function getMuscleThumbnailImage(
  muscleGroup?: string | null,
  exerciseName?: string | null
): any {
  const normalizedGroup = (muscleGroup || '').toLowerCase().trim();
  const normalizedName = (exerciseName || '').toLowerCase().trim();

  // 1. Direct match on explicit muscle group
  const matchedGroup = matchMuscleGroup(normalizedGroup);
  if (matchedGroup) return matchedGroup;

  // 2. Disambiguate 'arms' / 'arm' by checking exercise name
  if (normalizedGroup.includes('arm')) {
    return matchSpecificMuscle(normalizedName) ?? MUSCLE_IMAGE_ASSETS.biceps;
  }

  // 3. Fallback to matching exercise name
  return matchSpecificMuscle(normalizedName) ?? MUSCLE_IMAGE_ASSETS.default;
}

/**
 * Resolves a workout type label (e.g., "Chest", "Biceps", "Push Day", "Legs")
 * to the corresponding image asset in assets/.
 */
export function getWorkoutTypeImage(
  type?: string | null,
  fallbackAsset: any = MUSCLE_IMAGE_ASSETS.default
): any {
  if (!type) return fallbackAsset;
  const lower = type.toLowerCase().trim();

  // Workout splits / named routines
  if (lower.includes('push')) return require('../assets/push-day.png');
  if (lower.includes('pull')) return require('../assets/back-stood.png');
  if (lower.includes('full') || lower.includes('fullbody') || lower.includes('full body')) {
    return require('../assets/bodyweight-blast.png');
  }

  // Muscle group match
  const matchedGroup = matchMuscleGroup(lower);
  if (matchedGroup) return matchedGroup;

  if (lower.includes('arm')) return MUSCLE_IMAGE_ASSETS.biceps;

  // Specific exercise / keyword match
  return matchSpecificMuscle(lower) ?? fallbackAsset;
}
