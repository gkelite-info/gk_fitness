import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretLeft, CaretRight, Quotes } from 'phosphor-react-native';
import { useTrainerWorkoutPlan } from './_layout';

export default function TrainerSuccessPlanScreen() {
  const { workoutsCount } = useLocalSearchParams();
  const { resetPlan } = useTrainerWorkoutPlan();

  const count = parseInt(workoutsCount as string) || 0;
  const recoveryCount = 7 - count;

  const handleCreateAnother = () => {
    try {
      resetPlan();
      router.replace('/(trainer)/create-workout-plan' as any);
    } catch (error) {
      console.error('[TrainerSuccessPlanScreen] handleCreateAnother Error:', error);
    }
  };

  const handleGoToPlans = () => {
    try {
      resetPlan();
      router.replace('/(trainer)/plans' as any);
    } catch (error) {
      console.error('[TrainerSuccessPlanScreen] handleGoToPlans Error:', error);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-12 pb-28 justify-between">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="flex-row items-center mb-6">
          <Pressable
            onPress={handleGoToPlans}
            className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] active:opacity-70"
          >
            <CaretLeft size={20} color="#fff" />
          </Pressable>
        </View>

        <Text className="text-white text-[32px] font-semibold leading-10 mb-1">
          Customer Workout <Text className="text-[#CCFF00] text-[32px] font-semibold">Plan</Text>
        </Text>
        <Text className="text-white text-[32px] font-semibold leading-10 mb-3">
          is Ready! 🥳
        </Text>
        <Text className="text-[#8E8E8E] text-base leading-5 mb-8">
          The custom weekly workout plan has been assigned to your customer.
        </Text>

        <View className="bg-[#161616] border border-[#242424] p-5 rounded-3xl mb-5">
          <Text className="text-white font-semibold text-base mb-4">Assigned Plan Summary</Text>
          <View className="flex-row justify-between w-full">
            <View className="bg-[#111111] border border-[#242424] w-[33%] aspect-[3/4] rounded-2xl items-center justify-center p-1">
              <Text className="text-[#8E8E8E] text-[9px] font-semibold tracking-wider mb-1">TYPE</Text>
              <Text className="text-[#CCFF00] text-xs font-semibold text-center leading-4">Trainer{'\n'}Plan</Text>
            </View>
            <View className="bg-[#111111] border border-[#242424] w-[33%] aspect-[3/4] rounded-2xl items-center justify-center p-1">
              <Text className="text-[#8E8E8E] text-[9px] font-semibold tracking-wider mb-1">WORKOUTS</Text>
              <Text className="text-white text-xl font-semibold">{count}</Text>
            </View>
            <View className="bg-[#111111] border border-[#242424] w-[33%] aspect-[3/4] rounded-2xl items-center justify-center p-1">
              <Text className="text-[#8E8E8E] text-[9px] font-semibold tracking-wider mb-1">RECOVERY</Text>
              <Text className="text-white text-xl font-semibold">{recoveryCount}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#161616] border border-[#242424] p-6 rounded-3xl mb-6">
          <View className="mb-3">
            <Quotes size={32} color="#CCFF00" weight="fill" />
          </View>
          <Text className="text-white text-xl font-semibold mb-2">Great guidance builds champion athletes.</Text>
          <Text className="text-[#8E8E8E] text-sm leading-5">
            Your assigned plan will now be visible to the customer.
          </Text>
        </View>

        <View className="gap-3">
          <Pressable
            onPress={handleCreateAnother}
            className="w-full py-4 bg-[#CCFF00] rounded-2xl flex-row items-center justify-center active:opacity-90 relative"
          >
            <Text className="text-black text-base font-semibold">Assign Plan to Another Customer</Text>
            <View className="absolute right-5">
              <CaretRight size={20} color="#000" weight="bold" />
            </View>
          </Pressable>

          <Pressable
            onPress={handleGoToPlans}
            className="w-full py-4 bg-[#111111] border border-[#242424] rounded-2xl flex-row items-center justify-center active:bg-[#1A1A1A] relative"
          >
            <Text className="text-white text-base font-semibold">Back to Plans</Text>
            <View className="absolute right-5">
              <CaretRight size={20} color="#555" weight="bold" />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
