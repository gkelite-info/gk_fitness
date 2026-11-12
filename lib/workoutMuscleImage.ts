/**
 * Maps a workout type / muscle group (with exercise-name fallback for mixed splits)
 * to the static local thumbnail artwork displayed behind the Play button.
 */
const MUSCLE_IMAGE_ASSETS = {
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

function matchSpecificMuscle(text: string): any | null {
  if (!text) return null;
  if (text.includes('calf') || text.includes('calves') || text.includes('tibialis') || text.includes('heel raise')) {
    return MUSCLE_IMAGE_ASSETS.calves;
  }
  if (text.includes('hip') || text.includes('glute') || text.includes('adduct') || text.includes('abduct')) {
    return MUSCLE_IMAGE_ASSETS.hips;
  }
  if (text.includes('trapezius') || text.includes('trap') || text.includes('shrug')) {
    return MUSCLE_IMAGE_ASSETS.trapezius;
  }
  if (text.includes('forearm') || text.includes('wrist curl') || text.includes('reverse curl')) {
    return MUSCLE_IMAGE_ASSETS.forearms;
  }
  if (text.includes('cardio') || text.includes('treadmill') || text.includes('jump rope') || text.includes('burpee') || text.includes('jumping jack') || text.includes('mountain climber') || text.includes('cycling') || text.includes('running')) {
    return MUSCLE_IMAGE_ASSETS.cardio;
  }
  if (text.includes('tricep') || text.includes('pushdown') || text.includes('skull') || text.includes('kickback')) {
    return MUSCLE_IMAGE_ASSETS.triceps;
  }
  if (text.includes('bicep') || text.includes('curl')) {
    return MUSCLE_IMAGE_ASSETS.biceps;
  }
  if (text.includes('chest') || text.includes('pectoral') || text.includes('bench press') || text.includes('push up') || text.includes('push-up') || text.includes('pushup') || text.includes('fly')) {
    return MUSCLE_IMAGE_ASSETS.chest;
  }
  if (text.includes('back') || text.includes('lat ') || text.includes('lats') || text.includes('pulldown') || text.includes('pull up') || text.includes('pull-up') || text.includes('deadlift') || text.includes('row')) {
    return MUSCLE_IMAGE_ASSETS.back;
  }
  if (text.includes('shoulder') || text.includes('delt') || text.includes('lateral raise') || text.includes('overhead press') || text.includes('arnold')) {
    return MUSCLE_IMAGE_ASSETS.shoulder;
  }
  if (text.includes('leg') || text.includes('lower body') || text.includes('quad') || text.includes('hamstring') || text.includes('squat') || text.includes('lunge')) {
    return MUSCLE_IMAGE_ASSETS.legs;
  }
  if (text.includes('abs') || text.includes('ab ') || text === 'ab' || text.includes('core') || text.includes('oblique') || text.includes('crunch') || text.includes('plank') || text.includes('sit up') || text.includes('sit-up')) {
    return MUSCLE_IMAGE_ASSETS.abs;
  }
  return null;
}

function matchMuscleGroup(normalizedGroup: string): any | null {
  if (!normalizedGroup) return null;
  if (normalizedGroup.includes('calf') || normalizedGroup.includes('calves')) return MUSCLE_IMAGE_ASSETS.calves;
  if (normalizedGroup.includes('hip') || normalizedGroup.includes('glute')) return MUSCLE_IMAGE_ASSETS.hips;
  if (normalizedGroup.includes('trap')) return MUSCLE_IMAGE_ASSETS.trapezius;
  if (normalizedGroup.includes('forearm')) return MUSCLE_IMAGE_ASSETS.forearms;
  if (normalizedGroup.includes('cardio')) return MUSCLE_IMAGE_ASSETS.cardio;
  if (normalizedGroup.includes('tricep')) return MUSCLE_IMAGE_ASSETS.triceps;
  if (normalizedGroup.includes('bicep')) return MUSCLE_IMAGE_ASSETS.biceps;
  if (normalizedGroup.includes('chest') || normalizedGroup.includes('pectoral')) return MUSCLE_IMAGE_ASSETS.chest;
  if (normalizedGroup.includes('back') || normalizedGroup.includes('lat')) return MUSCLE_IMAGE_ASSETS.back;
  if (normalizedGroup.includes('shoulder') || normalizedGroup.includes('delt')) return MUSCLE_IMAGE_ASSETS.shoulder;
  if (
    normalizedGroup.includes('leg') ||
    normalizedGroup.includes('quad') ||
    normalizedGroup.includes('hamstring') ||
    normalizedGroup.includes('lower body')
  ) {
    return MUSCLE_IMAGE_ASSETS.legs;
  }
  if (normalizedGroup.includes('ab') || normalizedGroup.includes('core')) return MUSCLE_IMAGE_ASSETS.abs;
  return null;
}

export function getMuscleThumbnailImage(
  muscleGroup?: string | null,
  exerciseName?: string | null
) {
  const normalizedGroup = (muscleGroup || '').toLowerCase().trim();
  const normalizedName = (exerciseName || '').toLowerCase().trim();

  // Direct match on explicit workout types (specific groups checked before broader ones)
  const matchedGroup = matchMuscleGroup(normalizedGroup);
  if (matchedGroup) return matchedGroup;
  if (normalizedGroup.includes('arm')) {
    return matchSpecificMuscle(normalizedName) ?? MUSCLE_IMAGE_ASSETS.biceps;
  }

  return matchSpecificMuscle(normalizedName) ?? MUSCLE_IMAGE_ASSETS.default;
}

/**
 * Resolves a workout type label (e.g., "Chest", "Biceps", "Push Day") to its local thumbnail artwork.
 */
export function getWorkoutTypeImage(
  type?: string | null,
  fallbackAsset: any = MUSCLE_IMAGE_ASSETS.default
) {
  if (!type) return fallbackAsset;
  const lower = type.toLowerCase().trim();
  if (lower.includes('push')) return require('../assets/push-day.png');
  if (lower.includes('pull')) return require('../assets/back-stood.png');
  if (lower.includes('full')) return require('../assets/bodyweight-blast.png');
  const matchedGroup = matchMuscleGroup(lower);
  if (matchedGroup) return matchedGroup;
  if (lower.includes('arm')) return MUSCLE_IMAGE_ASSETS.biceps;
  return matchSpecificMuscle(lower) ?? fallbackAsset;
}
