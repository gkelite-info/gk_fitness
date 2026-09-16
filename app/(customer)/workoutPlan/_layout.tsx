import React, { createContext, useContext, useState, useCallback } from 'react';
import { Stack } from 'expo-router';

export interface ExerciseItem {
  exerciseName: string;
  category: string;
  reps: string;
  order: number;
  sets?: number;
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

interface WorkoutPlanContextType {
  selectedDays: string[];
  setSelectedDays: React.Dispatch<React.SetStateAction<string[]>>;
  planMode: 'repeat' | 'custom';
  setPlanMode: React.Dispatch<React.SetStateAction<'repeat' | 'custom'>>;
  currentEditingWeek: number;
  setCurrentEditingWeek: React.Dispatch<React.SetStateAction<number>>;
  planDays: { [week: number]: { [key: string]: WorkoutDay } };
  setPlanDays: React.Dispatch<React.SetStateAction<{ [week: number]: { [key: string]: WorkoutDay } }>>;
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
  const [planMode, setPlanMode] = useState<'repeat' | 'custom'>('repeat');
  const [currentEditingWeek, setCurrentEditingWeek] = useState<number>(1);
  const [planDays, setPlanDays] = useState<{ [week: number]: { [key: string]: WorkoutDay } }>({ 1: {}, 2: {}, 3: {}, 4: {} });

  const resetPlan = useCallback(() => {
    setSelectedDays([]);
    setPlanMode('repeat');
    setCurrentEditingWeek(1);
    setPlanDays({ 1: {}, 2: {}, 3: {}, 4: {} });
  }, []);

  return (
    <WorkoutPlanContext.Provider value={{ 
      selectedDays, setSelectedDays, 
      planMode, setPlanMode,
      currentEditingWeek, setCurrentEditingWeek,
      planDays, setPlanDays, resetPlan 
    }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="choose-plan-mode" />
        <Stack.Screen name="assign-days" />
        <Stack.Screen name="choose-muscle" />
        <Stack.Screen name="customize-workout" />
        <Stack.Screen name="review-plan" />
      </Stack>
    </WorkoutPlanContext.Provider>
  );
}
