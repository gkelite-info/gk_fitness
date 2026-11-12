import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check } from 'phosphor-react-native';
import { useWorkoutPlan } from './_layout';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useUserById } from '@/hooks/users';
import { useWorkouts } from '@/hooks/workouts/useWorkouts';

const MUSCLE_SUBTITLES: Record<string, string> = {
  chest: 'Target your chest muscles',
  back: 'Target your back muscles',
  shoulder: 'Target your shoulder muscles',
  abs: 'Target your core & abs',
  biceps: 'Target your bicep muscles',
  calves: 'Target your calf muscles',
  cardio: 'Boost endurance & burn calories',
  forearms: 'Target your forearm & grip strength',
  hips: 'Target your hips & glutes',
  trapezius: 'Target your upper back & traps',
  triceps: 'Target your tricep muscles',
  legs: 'Target your leg muscles',
};

const DEFAULT_MUSCLE_GROUPS = [
  { id: 'chest', workoutId: 'chest', title: 'Chest', subtitle: MUSCLE_SUBTITLES.chest },
  { id: 'back', workoutId: 'back', title: 'Back', subtitle: MUSCLE_SUBTITLES.back },
  { id: 'shoulder', workoutId: 'shoulder', title: 'Shoulder', subtitle: MUSCLE_SUBTITLES.shoulder },
  { id: 'abs', workoutId: 'abs', title: 'Abs', subtitle: MUSCLE_SUBTITLES.abs },
  { id: 'biceps', workoutId: 'biceps', title: 'Biceps', subtitle: MUSCLE_SUBTITLES.biceps },
  { id: 'calves', workoutId: 'calves', title: 'Calves', subtitle: MUSCLE_SUBTITLES.calves },
  { id: 'cardio', workoutId: 'cardio', title: 'Cardio', subtitle: MUSCLE_SUBTITLES.cardio },
  { id: 'forearms', workoutId: 'forearms', title: 'Forearms', subtitle: MUSCLE_SUBTITLES.forearms },
  { id: 'hips', workoutId: 'hips', title: 'Hips', subtitle: MUSCLE_SUBTITLES.hips },
  { id: 'trapezius', workoutId: 'trapezius', title: 'Trapezius', subtitle: MUSCLE_SUBTITLES.trapezius },
  { id: 'triceps', workoutId: 'triceps', title: 'Triceps', subtitle: MUSCLE_SUBTITLES.triceps },
];

function getCanonicalMuscleKey(rawType: string): string {
  const lower = (rawType || '').toLowerCase().trim();
  if (lower.startsWith('shoulder')) return 'shoulder';
  if (lower.startsWith('tricep')) return 'triceps';
  if (lower.startsWith('bicep')) return 'biceps';
  if (lower === 'calf' || lower === 'calves') return 'calves';
  if (lower === 'hip' || lower === 'hips') return 'hips';
  if (lower === 'trap' || lower === 'traps' || lower === 'trapezius') return 'trapezius';
  if (lower === 'forearm' || lower === 'forearms') return 'forearms';
  return lower;
}

export default function ChooseMuscleGroup() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { planDays, setPlanDays, currentEditingWeek } = useWorkoutPlan();

  const userContext = useUser();
  const userId = userContext.userId;
  const { data: customerProfileData } = useCustomerProfile(userId);
  const { data: userRecord } = useUserById(userId);

  const rawGender = (
    (userContext.role === 'customer' ? customerProfileData?.customerData?.gender : null) ||
    userContext.gender ||
    userRecord?.gender ||
    customerProfileData?.customerData?.gender ||
    'male'
  ).toString().trim().toLowerCase();

  const userGender = rawGender.includes('female') ? 'female' : 'male';

  const { data: workouts, isLoading } = useWorkouts(userGender);

  const currentPlan = planDays[currentEditingWeek]?.[day || ''];
  const selectedType = (currentPlan?.exercises && currentPlan.exercises.length > 0)
    ? currentPlan.workoutType
    : undefined;

  const handleSelectMuscle = (type: string, workoutId: string) => {
    try {
      if (!day) return;

      const isValidUUID = (id?: string | null): boolean => {
        if (!id || typeof id !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
      };

      const resolvedWorkout = workouts?.find(w => w.workoutType?.toLowerCase() === type.toLowerCase());
      const safeWorkoutId = isValidUUID(workoutId) ? workoutId : (resolvedWorkout?.workoutId || null);

      router.push({
        pathname: '/(customer)/workoutPlan/customize-workout',
        params: {
          day,
          muscleGroup: type,
          workoutId: safeWorkoutId || '',
          gender: userGender,
        }
      });
    } catch (error) {
      console.error('[ChooseMuscleGroup] handleSelectMuscle Error:', error);
    }
  };

  const muscleGroupsToDisplay = React.useMemo(() => {
    const merged: Array<{ id: string; workoutId: string; title: string; subtitle: string }> = [];
    const seenCanonical = new Set<string>();

    // First collect database workout entries (preserving real workoutId when present)
    if (workouts && workouts.length > 0) {
      for (const w of workouts) {
        const typeStr = (w.workoutType || '').trim();
        if (!typeStr) continue;
        const canonical = getCanonicalMuscleKey(typeStr);
        if (seenCanonical.has(canonical)) continue;
        seenCanonical.add(canonical);

        merged.push({
          id: typeStr,
          workoutId: w.workoutId || typeStr,
          title: canonical.charAt(0).toUpperCase() + canonical.slice(1),
          subtitle: MUSCLE_SUBTITLES[canonical] || `Target your ${typeStr} muscles`,
        });
      }
    }

    // Ensure all 11 supported workout types are always available even if the DB only returned a subset
    for (const def of DEFAULT_MUSCLE_GROUPS) {
      const canonical = getCanonicalMuscleKey(def.id);
      if (!seenCanonical.has(canonical)) {
        seenCanonical.add(canonical);
        merged.push(def);
      }
    }

    return merged;
  }, [workouts]);

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-5 pb-28 justify-between">
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(customer)/workoutPlan/assign-days' as any);
            }
          }}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">Select Muscle Group</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <Text className="text-white text-2xl font-semibold mb-2">Choose Muscle Group</Text>
        <Text className="text-white text-2xl font-semibold mb-2">for {day}</Text>
        <Text className="text-[#8E8E8E] text-sm mb-6 leading-5">
          Select the muscle group you want to train on {day}.
        </Text>

        {isLoading && muscleGroupsToDisplay.length === 0 ? (
          <ActivityIndicator size="large" color="#C4EF00" className="mt-10" />
        ) : (
          <View className="flex-row flex-wrap justify-between w-full">
            {muscleGroupsToDisplay.map((item: any) => {
              const isSelected = Boolean(
                selectedType &&
                getCanonicalMuscleKey(selectedType) === getCanonicalMuscleKey(item.id)
              );
              return (
                <Pressable
                  key={item.workoutId}
                  onPress={() => handleSelectMuscle(item.id, item.workoutId)}
                  className={`w-[48%] p-4 rounded-2xl border mb-4 justify-between h-32 ${isSelected
                    ? 'border-[#C4EF00] bg-[#1a1a1a]'
                    : 'border-[#27272A] bg-[#111111]'
                    }`}
                >
                  <View className="flex-row justify-between items-start">
                    <Text className={`font-semibold text-lg ${isSelected ? 'text-[#C4EF00]' : 'text-white'}`}>
                      {item.title}
                    </Text>

                    <View className={`w-6 h-6 rounded-full border items-center justify-center ${isSelected
                      ? 'border-[#C4EF00] bg-[#C4EF00]'
                      : 'border-[#27272A]'
                      }`}>
                      {isSelected && <Check size={12} color="#000" weight="bold" />}
                    </View>
                  </View>

                  <Text className="text-[#8E8E8E] text-xs leading-4">
                    {item.subtitle}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
