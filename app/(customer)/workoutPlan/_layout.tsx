import React, { createContext, useContext, useState, useCallback } from 'react';
import { Stack } from 'expo-router';

export interface ExerciseItem {
  exerciseName: string;
  category: string;
  reps: string;
  order: number;
  image?: string | null;
}

export interface WorkoutDay {
  dayOfWeek: string;
  workoutType?: "Chest" | "Back" | "Legs" | "Arms" | "Shoulders" | "Core" | "Cardio" | "Yoga" | "Rest" | null;
  durationMinutes?: number | null;
  exercises: ExerciseItem[];
}

interface WorkoutPlanContextType {
  selectedDays: string[]; // e.g. ['Monday', 'Tuesday']
  setSelectedDays: React.Dispatch<React.SetStateAction<string[]>>;
  planDays: { [key: string]: WorkoutDay };
  setPlanDays: React.Dispatch<React.SetStateAction<{ [key: string]: WorkoutDay }>>;
  resetPlan: () => void;
}

const WorkoutPlanContext = createContext<WorkoutPlanContextType | undefined>(undefined);

export const useWorkoutPlan = () => {
  const context = useContext(WorkoutPlanContext);
  if (!context) {
    throw new Error('useWorkoutPlan must be used within a WorkoutPlanProvider');
  }
  return context;
};

export default function WorkoutPlanLayout() {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [planDays, setPlanDays] = useState<{ [key: string]: WorkoutDay }>({});

  const resetPlan = useCallback(() => {
    setSelectedDays([]);
    setPlanDays({});
  }, []);

  return (
    <WorkoutPlanContext.Provider value={{ selectedDays, setSelectedDays, planDays, setPlanDays, resetPlan }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="assign-days" />
        <Stack.Screen name="choose-muscle" />
        <Stack.Screen name="customize-workout" />
        <Stack.Screen name="review-plan" />
      </Stack>
    </WorkoutPlanContext.Provider>
  );
}
