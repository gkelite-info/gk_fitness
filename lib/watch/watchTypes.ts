/**
 * GK Gymlife Smartwatch Protocol Contracts & Types
 * Bridges Phone (React Native / Expo) <-> Watch (Wear OS Compose / watchOS)
 */

export interface WatchExercise {
  dayExerciseId: string;
  exerciseName: string;
  category: string;
  sets: number;
  reps: string;
  order: number;
  videoUrl?: string | null;
}

export interface WatchWorkoutPayload {
  type: 'WORKOUT_SESSION';
  userId: string;
  planDayId: string;
  sessionDate: string; // ISO date YYYY-MM-DD
  workoutType: string;
  durationMinutes: number;
  isTrainerPlan: boolean;
  isCustom: boolean;
  exercises: WatchExercise[];
  restTimerSeconds: number;
  restTimerEnabled: boolean;
}

export interface WatchSetLog {
  dayExerciseId: string;
  planDayId: string;
  sessionDate: string;
  setNumber: number;
  setType: 'working' | 'warmup' | 'dropset';
  weight: number;
  reps: number;
  isCompleted: boolean;
  completedAt: string;
  source: 'wearos' | 'watchos';
}

export interface WatchWorkoutSummary {
  planDayId: string;
  sessionDate: string;
  durationMinutes: number;
  completedExercisesCount: number;
  totalSetsCompleted: number;
  completedAt: string;
  source: 'wearos' | 'watchos';
}

export interface WatchHeartRateLog {
  heartRate: number;
  recordedAt: string;
  planDayId?: string;
  sessionDate: string;
  source: 'wearos' | 'watchos';
}

export interface WatchConnectionStatus {
  isPaired: boolean;
  isReachable: boolean;
  deviceName?: string | null;
  nodeId?: string | null;
  platform: 'wearos' | 'watchos' | 'none';
}

export const WATCH_DATA_PATHS = {
  WORKOUT_SESSION: '/gk/workout-session',
  HEARTBEAT: '/gk/heartbeat',
  SET_LOG_MESSAGE: '/gk/set-log',
  WORKOUT_COMPLETE_MESSAGE: '/gk/workout-complete',
  HEART_RATE_MESSAGE: '/gk/heart-rate',
} as const;
