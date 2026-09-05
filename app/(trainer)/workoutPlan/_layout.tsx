import React, { createContext, useContext, useState, useCallback } from 'react';
import { Stack } from 'expo-router';

export interface ExerciseItem {
  exerciseName: string;
  category: string;
  reps: string;
  order: number;
  image?: string | null;
  videoUrl?: string | null;
  workoutVideoId?: string | null;
}

export interface WorkoutDay {
  dayOfWeek: string;
  workoutType?: string | null;
  workoutId?: string | null;
  durationMinutes?: number | null;
  exercises: ExerciseItem[];
}

interface TrainerWorkoutPlanContextType {
  targetUserId: string | null;
  setTargetUserId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedDays: string[];
  setSelectedDays: React.Dispatch<React.SetStateAction<string[]>>;
  planDays: { [key: string]: WorkoutDay };
  setPlanDays: React.Dispatch<React.SetStateAction<{ [key: string]: WorkoutDay }>>;
  resetPlan: () => void;
}

const TrainerWorkoutPlanContext = createContext<TrainerWorkoutPlanContextType | undefined>(undefined);

export const useTrainerWorkoutPlan = () => {
  const context = useContext(TrainerWorkoutPlanContext);
  if (!context) {
    throw new Error('useTrainerWorkoutPlan must be used within a TrainerWorkoutPlanProvider');
  }
  return context;
};

export default function TrainerWorkoutPlanLayout() {
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [planDays, setPlanDays] = useState<{ [key: string]: WorkoutDay }>({});

  const resetPlan = useCallback(() => {
    setTargetUserId(null);
    setSelectedDays([]);
    setPlanDays({});
  }, []);

  return (
    <TrainerWorkoutPlanContext.Provider value={{ targetUserId, setTargetUserId, selectedDays, setSelectedDays, planDays, setPlanDays, resetPlan }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="assign-days" />
        <Stack.Screen name="choose-muscle" />
        <Stack.Screen name="customize-workout" />
        <Stack.Screen name="review-plan" />
        <Stack.Screen name="success" />
      </Stack>
    </TrainerWorkoutPlanContext.Provider>
  );
}
