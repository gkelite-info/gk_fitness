import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check } from 'phosphor-react-native';
import { useWorkoutPlan } from './_layout';
import { useWorkouts } from '@/hooks/workouts/useWorkouts';

export default function ChooseMuscleGroup() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { planDays, setPlanDays } = useWorkoutPlan();
  const { data: workouts, isLoading } = useWorkouts();

  const currentPlan = planDays[day || ''];
  const selectedType = currentPlan?.workoutType;

  const handleSelectMuscle = (type: string, workoutId: string) => {
    try {
      if (!day) return;

      setPlanDays(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          dayOfWeek: day,
          workoutType: type,
          workoutId: workoutId,
          exercises: prev[day]?.exercises || []
        }
      }));

      router.push({
        pathname: '/(customer)/workoutPlan/customize-workout',
        params: { day, muscleGroup: type }
      });
    } catch (error) {
      console.error('[ChooseMuscleGroup] handleSelectMuscle Error:', error);
    }
  };

  const dynamicMuscleGroups = workouts?.map(w => {
    const typeStr = w.workoutType;
    return {
      id: typeStr,
      workoutId: w.workoutId,
      title: typeStr.charAt(0).toUpperCase() + typeStr.slice(1),
      subtitle: `Target your ${typeStr} muscles`
    };
  }) || [];

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-5 pb-28 justify-between">
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => router.push('/(customer)/workoutPlan/assign-days')}
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

        {isLoading ? (
          <ActivityIndicator size="large" color="#C4EF00" className="mt-10" />
        ) : (
          <View className="flex-row flex-wrap justify-between w-full">
            {dynamicMuscleGroups.map((item) => {
              const isSelected = selectedType === item.id;
              return (
                <Pressable
                  key={item.id}
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
