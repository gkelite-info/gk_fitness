import React, { useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  Barbell,
  ArrowRight,
  ArrowLeft,
  Lightning,
  Check,
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';

import { EquipmentSelector } from './EquipmentSelector';
import { MuscleBodyMap } from './MuscleBodyMap';
import { GeneratedExerciseList } from './GeneratedExerciseList';
import {
  useCustomWorkoutBuilder,
  GeneratedExercise,
  EquipmentValue,
} from '@/hooks/customWorkout/useCustomWorkoutBuilder';
import {
  getCustomExercises,
  startCustomWorkoutSession,
} from '@/helpers/customWorkout/customWorkoutHelper';

// ──────────────────────────────────────────────────────────────
// Step indicator
// ──────────────────────────────────────────────────────────────
const STEPS = [
  { number: 1, label: 'Equipment' },
  { number: 2, label: 'Muscles' },
  { number: 3, label: 'Exercises' },
];

function StepHeader({ currentStep }: { currentStep: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1 mb-6">
      {STEPS.map((step, i) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;

        return (
          <React.Fragment key={step.number}>
            {/* Step bubble */}
            <View className="items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center border
                  ${isActive
                    ? 'bg-[#C4EF00] border-[#C4EF00]'
                    : isCompleted
                      ? 'bg-[#1A2000] border-[#C4EF00]'
                      : 'bg-[#111111] border-[#27272A]'
                  }`}
              >
                {isCompleted ? (
                  <Check size={14} color="#C4EF00" weight="bold" />
                ) : (
                  <Text
                    className={`text-xs font-semibold ${isActive ? 'text-black' : 'text-[#555]'}`}
                  >
                    {step.number}
                  </Text>
                )}
              </View>
              <Text
                className={`text-[10px] mt-1 font-semibold ${
                  isActive ? 'text-[#C4EF00]' : isCompleted ? 'text-[#666]' : 'text-[#444]'
                }`}
              >
                {step.label}
              </Text>
            </View>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <View
                className={`h-0.5 flex-1 mb-4 ${isCompleted ? 'bg-[#C4EF00]' : 'bg-[#27272A]'}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Step heading + description
// ──────────────────────────────────────────────────────────────
const STEP_CONTENT = [
  {
    title: 'What Equipment Do You Have?',
    description: 'Select all the equipment available to you right now.',
  },
  {
    title: 'Which Muscles to Target?',
    description: 'Tap muscle groups on the body map to focus your workout.',
  },
  {
    title: 'Your Custom Workout',
    description: 'Review, reorder or shuffle exercises. Click any to preview.',
  },
];

// ──────────────────────────────────────────────────────────────
// Main builder
// ──────────────────────────────────────────────────────────────
export function CustomWorkoutBuilder() {
  const userContext = useUser();
  const userId = userContext.userId;
  const { data: customerProfileData } = useCustomerProfile(userId);

  const rawGender = (
    (userContext.role === 'customer' ? customerProfileData?.customerData?.gender : null) ||
    customerProfileData?.customerData?.gender ||
    customerProfileData?.onboardingData?.gender ||
    userContext.gender ||
    'male'
  ).toString().trim().toLowerCase();

  const userGender = rawGender.includes('female') ? 'female' : 'male';

  const {
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
    setGeneratedExercises,
    setIsLoadingExercises,
    setExercisesError,
    removeExercise,
    reorderExercises,
    canProceedToNext,
    reset,
  } = useCustomWorkoutBuilder();

  const [isStarting, setIsStarting] = React.useState(false);

  // ── Step 2 → 3: fetch exercises ──
  const handleNext = useCallback(async () => {
    if (currentStep === 2) {
      // Fetch exercises from Supabase, prioritized by user gender
      setIsLoadingExercises(true);
      setExercisesError(null);
      nextStep();
      try {
        const exercises = await getCustomExercises({
          muscles: selectedMuscles,
          equipment: selectedEquipment,
          limit: 3,
          gender: userGender,
        });
        setGeneratedExercises(exercises);
      } catch (e: any) {
        setExercisesError(e.message ?? 'Failed to load exercises. Please try again.');
      } finally {
        setIsLoadingExercises(false);
      }
    } else {
      nextStep();
    }
  }, [currentStep, selectedMuscles, selectedEquipment, userGender, nextStep, setGeneratedExercises, setIsLoadingExercises, setExercisesError]);

  // ── Exercise shuffle update ──
  const handleExerciseUpdated = useCallback(
    (updated: GeneratedExercise, oldId: string) => {
      const newList = generatedExercises.map(ex =>
        ex.exercise_id === oldId
          ? { ...updated, sort_order: ex.sort_order }
          : ex
      );
      reorderExercises(newList);
    },
    [generatedExercises, reorderExercises]
  );

  // ── Start workout ──
  const handleStartWorkout = useCallback(async () => {
    if (!userId || generatedExercises.length === 0) return;
    setIsStarting(true);
    try {
      const planDayId = await startCustomWorkoutSession({
        userId,
        selectedEquipment,
        selectedMuscles,
        exercises: generatedExercises,
        userGender,
      });

      // Seamlessly navigate to exercise-detail with the created plan dayId
      router.push({
        pathname: '/(customer)/exercise-detail',
        params: {
          dayId: planDayId,
          exerciseIndex: 0,
          isCustom: 'true',
        },
      } as any);
    } catch (e: any) {
      Alert.alert('Error', 'Could not start workout. Please try again.');
      console.error('[CustomWorkoutBuilder] Start workout error:', e);
    } finally {
      setIsStarting(false);
    }
  }, [userId, generatedExercises, selectedEquipment, selectedMuscles, userGender]);

  const stepInfo = STEP_CONTENT[currentStep - 1];
  const allEquipment: EquipmentValue[] = [
    'BODY_ONLY', 'DUMBBELL', 'BARBELL', 'CABLE', 'MACHINE',
    'KETTLEBELLS', 'BANDS', 'WEIGHT_PLATE', 'PULLUP_BAR', 'BENCH',
  ];

  return (
    <View className="w-full">
      {/* Step indicator */}
      <StepHeader currentStep={currentStep} />

      {/* Step heading */}
      <View className="mb-5">
        <Text className="text-white text-xl font-semibold mb-1">{stepInfo.title}</Text>
        <Text className="text-[#8E8E8E] text-sm">{stepInfo.description}</Text>
      </View>

      {/* Step content */}
      {currentStep === 1 && (
        <EquipmentSelector
          selectedEquipment={selectedEquipment}
          onToggle={toggleEquipment}
          onClear={clearEquipment}
          onSelectAll={() => allEquipment.forEach(eq => {
            if (!selectedEquipment.includes(eq)) toggleEquipment(eq);
          })}
        />
      )}

      {currentStep === 2 && (
        <MuscleBodyMap
          selectedMuscles={selectedMuscles}
          onToggleMuscle={toggleMuscle}
        />
      )}

      {currentStep === 3 && (
        <GeneratedExerciseList
          exercises={generatedExercises}
          selectedEquipment={selectedEquipment}
          selectedMuscles={selectedMuscles}
          isLoading={isLoadingExercises}
          error={exercisesError}
          onReorder={reorderExercises}
          onRemove={removeExercise}
          onExerciseUpdated={handleExerciseUpdated}
          userGender={userGender}
        />
      )}

      {/* Navigation Buttons */}
      <View className="flex-row items-center gap-3 mt-8 pb-10">
        {currentStep > 1 && (
          <Pressable
            onPress={prevStep}
            className="flex-1 py-3.5 rounded-xl border border-[#27272A] bg-[#111111] items-center justify-center flex-row gap-2 active:opacity-70"
          >
            <ArrowLeft size={18} color="#8E8E8E" weight="bold" />
            <Text className="text-[#8E8E8E] font-semibold text-sm">Back</Text>
          </Pressable>
        )}

        {currentStep < 3 ? (
          <Pressable
            onPress={handleNext}
            disabled={!canProceedToNext}
            className={`flex-1 py-3.5 rounded-xl items-center justify-center flex-row gap-2
              ${canProceedToNext ? 'bg-[#C4EF00] active:opacity-80' : 'bg-[#27272A] opacity-50'}
            `}
          >
            <Text
              className={`font-semibold text-sm ${canProceedToNext ? 'text-black' : 'text-[#666]'}`}
            >
              {currentStep === 1 ? 'Target Muscles' : 'Generate Workout'}
            </Text>
            <ArrowRight
              size={18}
              color={canProceedToNext ? '#000000' : '#666666'}
              weight="bold"
            />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleStartWorkout}
            disabled={isStarting || generatedExercises.length === 0 || isLoadingExercises}
            className={`flex-1 py-3.5 rounded-xl items-center justify-center flex-row gap-2
              ${!isStarting && generatedExercises.length > 0 && !isLoadingExercises
                ? 'bg-[#C4EF00] active:opacity-80'
                : 'bg-[#27272A] opacity-50'}
            `}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Lightning size={18} color="#000000" weight="fill" />
                <Text className="text-black font-semibold text-sm">Start Workout</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
