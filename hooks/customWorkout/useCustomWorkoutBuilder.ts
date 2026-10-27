import { useState, useCallback } from 'react';

// Muscle group values (matching workout-cool ExerciseAttributeValueEnum)
export type MuscleValue =
  | 'BICEPS' | 'SHOULDERS' | 'CHEST' | 'BACK' | 'GLUTES'
  | 'TRICEPS' | 'HAMSTRINGS' | 'QUADRICEPS' | 'FOREARMS'
  | 'CALVES' | 'TRAPS' | 'ABDOMINALS' | 'OBLIQUES';

// Equipment values
export type EquipmentValue =
  | 'BODY_ONLY' | 'DUMBBELL' | 'BARBELL' | 'CABLE'
  | 'MACHINE' | 'BENCH' | 'PULLUP_BAR' | 'KETTLEBELLS'
  | 'BANDS' | 'WEIGHT_PLATE';

export type WorkoutBuilderStep = 1 | 2 | 3;

export interface GeneratedExercise {
  exercise_id: string;
  exercise_name: string;
  category: string;
  description?: string | null;
  default_sets: number;
  default_reps: string;
  video_url?: string | null;
  image_url?: string | null;
  difficulty: string;
  is_primary_muscle: boolean;
  muscle_group: string;
  sort_order: number;
  // Aliases for compatibility
  workoutVideoId?: string;
  exerciseName?: string;
  videoUrl?: string | null;
}

export function useCustomWorkoutBuilder() {
  const [currentStep, setCurrentStep] = useState<WorkoutBuilderStep>(1);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentValue[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleValue[]>([]);
  const [generatedExercises, setGeneratedExercises] = useState<GeneratedExercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [exercisesError, setExercisesError] = useState<string | null>(null);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (Math.min(prev + 1, 3) as WorkoutBuilderStep));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (Math.max(prev - 1, 1) as WorkoutBuilderStep));
  }, []);

  const toggleEquipment = useCallback((equipment: EquipmentValue) => {
    setSelectedEquipment((prev) => {
      if (prev.includes(equipment)) {
        return prev.filter((e) => e !== equipment);
      } else {
        return [...prev, equipment];
      }
    });
  }, []);

  const clearEquipment = useCallback(() => {
    setSelectedEquipment([]);
  }, []);

  const toggleMuscle = useCallback((muscle: MuscleValue) => {
    setSelectedMuscles((prev) => {
      if (prev.includes(muscle)) {
        return prev.filter((m) => m !== muscle);
      } else {
        return [...prev, muscle];
      }
    });
  }, []);

  const clearMuscles = useCallback(() => {
    setSelectedMuscles([]);
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setGeneratedExercises((prev) => prev.filter((e) => e.exercise_id !== exerciseId));
  }, []);

  const reorderExercises = useCallback((newExercises: GeneratedExercise[]) => {
    setGeneratedExercises(newExercises);
  }, []);

  const canProceedToNext = currentStep === 1
    ? selectedEquipment.length > 0
    : currentStep === 2
      ? selectedMuscles.length > 0
      : generatedExercises.length > 0;

  const reset = useCallback(() => {
    setCurrentStep(1);
    setSelectedEquipment([]);
    setSelectedMuscles([]);
    setGeneratedExercises([]);
    setIsLoadingExercises(false);
    setExercisesError(null);
  }, []);

  return {
    currentStep,
    selectedEquipment,
    selectedMuscles,
    generatedExercises,
    isLoadingExercises,
    exercisesError,
    nextStep,
    prevStep,
    toggleEquipment,
    clearEquipment,
    toggleMuscle,
    clearMuscles,
    setGeneratedExercises,
    setIsLoadingExercises,
    setExercisesError,
    removeExercise,
    reorderExercises,
    canProceedToNext,
    reset,
  };
}
