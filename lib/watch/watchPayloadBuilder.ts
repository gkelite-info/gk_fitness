import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchWorkoutPayload, WatchExercise } from './watchTypes';

const REST_TIMER_DURATION_KEY = '@restTimer_duration';
const REST_TIMER_ENABLED_KEY = '@restTimer_enabled';

export interface BuildPayloadOptions {
  userId: string;
  planDayId: string;
  workoutType?: string;
  durationMinutes?: number;
  isTrainerPlan?: boolean;
  isCustom?: boolean;
  exercises: any[];
}

/**
 * Builds a normalized, validated WatchWorkoutPayload ready to be pushed to Wear OS / watchOS.
 * Reads stored rest timer preferences from AsyncStorage.
 */
export async function buildWatchWorkoutPayload(options: BuildPayloadOptions): Promise<WatchWorkoutPayload> {
  const {
    userId,
    planDayId,
    workoutType = 'Workout',
    durationMinutes = 45,
    isTrainerPlan = false,
    isCustom = false,
    exercises,
  } = options;

  let restTimerSeconds = 90;
  let restTimerEnabled = true;

  try {
    const [storedDuration, storedEnabled] = await Promise.all([
      AsyncStorage.getItem(REST_TIMER_DURATION_KEY),
      AsyncStorage.getItem(REST_TIMER_ENABLED_KEY),
    ]);
    if (storedDuration !== null) {
      const parsed = parseInt(storedDuration, 10);
      if (!isNaN(parsed) && parsed > 0) restTimerSeconds = parsed;
    }
    if (storedEnabled !== null) {
      restTimerEnabled = storedEnabled === 'true';
    }
  } catch (err) {
    console.warn('[watchPayloadBuilder] Failed to read rest timer preferences:', err);
  }

  const todayIso = new Date().toISOString().split('T')[0];

  const normalizedExercises: WatchExercise[] = (exercises || []).map((ex, index) => {
    let setsCount = 3;
    if (typeof ex.sets === 'number') {
      setsCount = ex.sets;
    } else if (typeof ex.sets === 'string') {
      const match = ex.sets.match(/\d+/);
      if (match) setsCount = parseInt(match[0], 10);
    }

    let repsStr = '10';
    if (typeof ex.reps === 'string' && ex.reps.trim().length > 0) {
      repsStr = ex.reps.trim();
    } else if (typeof ex.reps === 'number') {
      repsStr = String(ex.reps);
    }

    return {
      dayExerciseId: ex.dayExerciseId || ex.id || `temp-${index}`,
      exerciseName: ex.exerciseName || ex.name || 'Exercise',
      category: ex.category || ex.primaryMuscle || workoutType,
      sets: setsCount,
      reps: repsStr,
      order: typeof ex.order === 'number' ? ex.order : index,
      videoUrl: ex.videoUrl || ex.image || null,
    };
  });

  return {
    type: 'WORKOUT_SESSION',
    userId,
    planDayId,
    sessionDate: todayIso,
    workoutType,
    durationMinutes,
    isTrainerPlan,
    isCustom,
    exercises: normalizedExercises,
    restTimerSeconds,
    restTimerEnabled,
  };
}
