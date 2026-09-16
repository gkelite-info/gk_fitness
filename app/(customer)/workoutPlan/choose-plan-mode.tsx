import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import { ArrowLeft, Repeat, CalendarPlus, Check, CaretRight } from 'phosphor-react-native';
import { useWorkoutPlan } from './_layout';

export default function ChoosePlanMode() {
  const { planMode, setPlanMode } = useWorkoutPlan();

  const handleContinue = () => {
    router.push('/(customer)/workoutPlan/assign-days');
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-5 pb-28 justify-between">
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => router.push('/(customer)/workoutPlan')}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">Plan Mode</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <Text className="text-white text-2xl font-semibold mb-2">How should we build</Text>
        <Text className="text-[#C4EF00] text-2xl font-semibold mb-2">your month?</Text>
        <Text className="text-[#8E8E8E] text-sm mb-8 leading-5">
          Choose whether you want to repeat a single week's schedule, or customize each week independently.
        </Text>

        <View className="gap-4 mb-8">
          <Pressable
            onPress={() => setPlanMode('repeat')}
            className={`border p-5 rounded-3xl ${planMode === 'repeat' ? 'border-[#C4EF00] bg-[#1a1a1a]' : 'border-[#27272A] bg-[#111111]'}`}
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className={`w-12 h-12 rounded-full items-center justify-center ${planMode === 'repeat' ? 'bg-[#C4EF00]' : 'bg-[#222]'}`}>
                <Repeat size={24} color={planMode === 'repeat' ? '#000' : '#8E8E8E'} weight="fill" />
              </View>
              <View className={`w-6 h-6 rounded-full border items-center justify-center ${planMode === 'repeat' ? 'border-[#C4EF00] bg-[#C4EF00]' : 'border-[#27272A]'}`}>
                {planMode === 'repeat' && <Check size={12} color="#000" weight="bold" />}
              </View>
            </View>
            <Text className={`text-xl font-semibold mb-1 ${planMode === 'repeat' ? 'text-white' : 'text-[#8E8E8E]'}`}>Repeat Weekly</Text>
            <Text className="text-[#8E8E8E] text-sm leading-5">
              Set your week once. We'll automatically repeat it for the full month. Great for consistent routines.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPlanMode('custom')}
            className={`border p-5 rounded-3xl ${planMode === 'custom' ? 'border-[#C4EF00] bg-[#1a1a1a]' : 'border-[#27272A] bg-[#111111]'}`}
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className={`w-12 h-12 rounded-full items-center justify-center ${planMode === 'custom' ? 'bg-[#C4EF00]' : 'bg-[#222]'}`}>
                <CalendarPlus size={24} color={planMode === 'custom' ? '#000' : '#8E8E8E'} weight="fill" />
              </View>
              <View className={`w-6 h-6 rounded-full border items-center justify-center ${planMode === 'custom' ? 'border-[#C4EF00] bg-[#C4EF00]' : 'border-[#27272A]'}`}>
                {planMode === 'custom' && <Check size={12} color="#000" weight="bold" />}
              </View>
            </View>
            <Text className={`text-xl font-semibold mb-1 ${planMode === 'custom' ? 'text-white' : 'text-[#8E8E8E]'}`}>Custom Monthly</Text>
            <Text className="text-[#8E8E8E] text-sm leading-5">
              Configure each of the 4 weeks independently. Ideal for progressive overload or varied training blocks.
            </Text>
          </Pressable>
        </View>
        
        <Pressable
          onPress={handleContinue}
          className="w-full py-4 bg-[#C4EF00] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90"
        >
          <Text className="text-black text-base font-semibold">Continue</Text>
          <CaretRight size={18} color="#000" weight="bold" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
