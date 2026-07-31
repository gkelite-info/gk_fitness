import React, { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import { ArrowLeft, CaretRight, Calendar, Lightbulb } from 'phosphor-react-native';
import { useWorkoutPlan } from './_layout';

export default function AssignDays() {
  const { selectedDays, planDays, setPlanDays } = useWorkoutPlan();

  useEffect(() => {
    if (selectedDays.length === 0) {
      router.replace('/(customer)/workoutPlan' as any);
    }
  }, [selectedDays]);

  const handleSelectDay = (day: string) => {
    try {
      router.push({
        pathname: '/(customer)/workoutPlan/choose-muscle' as any,
        params: { day }
      });
    } catch (error) {
      console.error('[AssignDays] handleSelectDay Error:', error);
    }
  };

  const handleGetSuggestions = () => {
    try {
      const count = selectedDays.length;
      const newPlanDays = { ...planDays };
      type WorkoutTypeOption = "Chest" | "Back" | "Legs" | "Arms" | "Shoulders" | "Core" | "Cardio" | "Yoga" | "Rest";

      selectedDays.forEach((day, index) => {
        let workoutType: WorkoutTypeOption = "Rest";

        if (count === 3) {
          const split: WorkoutTypeOption[] = ["Chest", "Back", "Legs"];
          workoutType = split[index % 3];
        } else if (count === 4) {
          const split: WorkoutTypeOption[] = ["Chest", "Back", "Legs", "Shoulders"];
          workoutType = split[index % 4];
        } else if (count === 5) {
          const split: WorkoutTypeOption[] = ["Chest", "Back", "Legs", "Arms", "Shoulders"];
          workoutType = split[index % 5];
        } else {
          const split: WorkoutTypeOption[] = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Cardio"];
          workoutType = split[index % split.length];
        }

        newPlanDays[day] = {
          dayOfWeek: day,
          workoutType,
          exercises: newPlanDays[day]?.exercises || []
        };
      });

      setPlanDays(newPlanDays);
    } catch (error) {
      console.error('[AssignDays] handleGetSuggestions Error:', error);
    }
  };

  const handleNext = () => {
    try {
      router.push('/(customer)/workoutPlan/review-plan' as any);
    } catch (error) {
      console.error('[AssignDays] handleNext Error:', error);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-12 pb-28 justify-between">
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => router.push('/(customer)/workoutPlan' as any)}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">Assign Workouts</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <Text className="text-white text-2xl font-semibold mb-2">Assign Workout Type</Text>
        <Text className="text-white text-2xl font-semibold mb-2">to Each Day</Text>
        <Text className="text-[#8E8E8E] text-sm mb-6 leading-5">
          Choose the type of workout you want to do on each workout day.
        </Text>

        <Text className="text-[#8E8E8E] text-xs font-semibold mb-3 tracking-wider">YOUR SELECTED WORKOUT DAYS</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {selectedDays.map((day) => {
            const shortName = day.substring(0, 3);
            return (
              <View
                key={day}
                className="flex-row items-center bg-[#C4EF00]/10 border border-[#C4EF00]/30 px-4 py-2 rounded-xl"
              >
                <Text className="text-[#C4EF00] font-semibold text-sm">{shortName}</Text>
                <View className="w-2.5 h-2.5 rounded-full bg-[#C4EF00] ml-2" />
              </View>
            );
          })}
        </View>

        <View className="gap-3 mb-6">
          {selectedDays.map((day) => {
            const dayPlan = planDays[day];
            const shortDay = day.substring(0, 3).toUpperCase();
            const hasWorkout = dayPlan && dayPlan.workoutType;
            const workoutLabel = hasWorkout ? `${dayPlan.workoutType} Workout` : "Choose Workout Type";

            return (
              <Pressable
                key={day}
                onPress={() => handleSelectDay(day)}
                className={`flex-row items-center border p-4 rounded-2xl justify-between ${hasWorkout ? 'border-[#C4EF00]/30 bg-[#161616]' : 'border-[#27272A] bg-[#111111]'
                  }`}
              >
                <View className="flex-row items-center flex-1">
                  <View className="bg-[#C4EF00]/10 border border-[#C4EF00]/20 p-2.5 rounded-xl items-center justify-center mr-4 w-12">
                    <Calendar size={18} color="#C4EF00" weight="bold" />
                    <Text className="text-[#C4EF00] text-[9px] font-black mt-0.5">{shortDay}</Text>
                  </View>

                  <View className="flex-1 pr-2">
                    <Text className={`font-semibold text-base ${hasWorkout ? 'text-white' : 'text-[#8E8E8E]'}`}>
                      {workoutLabel}
                    </Text>
                    {hasWorkout && (
                      <Text className="text-[#8E8E8E] text-xs mt-0.5">
                        {dayPlan.exercises?.length || 0} Exercises
                      </Text>
                    )}
                  </View>
                </View>

                <CaretRight size={18} color={hasWorkout ? "#C4EF00" : "#8E8E8E"} />
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row bg-[#161616] p-4 rounded-2xl border border-[#242424] items-center w-full justify-between">
          <View className="flex-row items-center flex-1 mr-4">
            <View className="mr-3">
              <Lightbulb size={24} color="#C4EF00" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm">Need help?</Text>
              <Text className="text-[#8E8E8E] text-xs leading-4">
                We'll suggest the best workout split based on your goal.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleGetSuggestions}
            className="border border-[#C4EF00] px-4 py-2 rounded-xl active:bg-[#C4EF00]/10"
          >
            <Text className="text-[#C4EF00] font-semibold text-xs">Get Suggestions</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleNext}
          className="w-full py-4 bg-[#C4EF00] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90 mt-4"
        >
          <Text className="text-black text-base font-semibold">Next</Text>
          <CaretRight size={18} color="#000" weight="bold" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
