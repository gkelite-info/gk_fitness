import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import { ArrowLeft, CaretRight, Robot, Lightbulb, Calendar, Check } from 'phosphor-react-native';
import { useWorkoutPlan } from './_layout';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export default function BuildWeeklyPlan() {
  const { selectedDays, setSelectedDays } = useWorkoutPlan();

  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleContinue = () => {
    if (selectedDays.length > 0) {
      router.push('/(customer)/workoutPlan/assign-days');
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-12 pb-28 justify-between">
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => router.replace('/(customer)/workout')}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}>
        <View className="items-center justify-center mb-6 bg-[#161616] p-6 rounded-full border border-[#242424] w-36 h-36">
          <Robot size={64} color="#C4EF00" weight="fill" />
        </View>

        <Text className="text-white text-3xl font-semibold text-center mb-2">Build Your</Text>
        <Text className="text-[#C4EF00] text-4xl font-black text-center mb-3">Weekly Plan</Text>
        <Text className="text-[#8E8E8E] text-base text-center px-4 mb-8 leading-5">
          Choose the days you'd like to crush your workouts.
        </Text>

        <View className="w-full flex-row justify-between items-center mb-4 px-1">
          <Text className="text-[#8E8E8E] text-xs font-semibold tracking-wider">SELECT WORKOUT DAYS</Text>
          <View className="bg-[#C4EF00]/10 px-2.5 py-1 rounded-full border border-[#C4EF00]/20">
            <Text className="text-[#C4EF00] text-xs font-semibold">{selectedDays.length} DAYS</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between w-full mb-8">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDays.includes(day);
            const shortName = day.substring(0, 3);
            return (
              <Pressable
                key={day}
                onPress={() => handleToggleDay(day)}
                className={`w-[22%] aspect-square rounded-2xl items-center justify-center mb-3 border ${isSelected
                  ? 'border-[#C4EF00] bg-[#1a1a1a]'
                  : 'border-[#27272A] bg-[#111111]'
                  }`}
              >
                <Text className={`font-semibold text-base mb-2 ${isSelected ? 'text-[#C4EF00]' : 'text-[#8E8E8E]'}`}>
                  {shortName}
                </Text>

                <View className={`w-6 h-6 rounded-full border items-center justify-center ${isSelected
                  ? 'border-[#C4EF00] bg-[#C4EF00]'
                  : 'border-[#27272A]'
                  }`}>
                  {isSelected && <Check size={12} color="#000" weight="bold" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row bg-[#161616] p-4 rounded-2xl border border-[#242424] items-center w-full mb-6">
          <View className="mr-3">
            <Lightbulb size={24} color="#C4EF00" weight="fill" />
          </View>
          <Text className="text-[#8E8E8E] text-sm flex-1 leading-4">
            You can always edit your plan or rest days later.
          </Text>
        </View>

        <Pressable
          onPress={handleContinue}
          disabled={selectedDays.length === 0}
          className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-2 ${selectedDays.length > 0 ? 'bg-[#C4EF00] active:opacity-90' : 'bg-[#222] opacity-50'
            }`}
        >
          <Text className={`text-base font-semibold ${selectedDays.length > 0 ? 'text-black' : 'text-[#8E8E8E]'}`}>
            Continue
          </Text>
          <CaretRight size={18} color={selectedDays.length > 0 ? '#000' : '#8E8E8E'} weight="bold" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
