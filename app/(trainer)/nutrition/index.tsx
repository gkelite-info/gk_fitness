import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTrainerMealPlan } from '@/hooks/trainerMealPlans/useTrainerMealPlan';
import { useUser } from '@/context/UserContext';
import { useLocalSearchParams } from 'expo-router';
import { useCustomerOnboardingData } from '@/hooks/customers/useCustomerOnboardingData';
import { calculateNutritionTargets } from '@/lib/nutritionCalculator';
import {
  CaretLeft,
  ChartBar,
  Flame,
  Cpu,
  List,
  Calendar,
  Info,
  CaretRight,
  FireIcon,
  HeartStraightIcon
} from 'phosphor-react-native';

export default function NutritionAnalysis() {
  const router = useRouter();
  const { targetUserId, customerName } = useLocalSearchParams<{ targetUserId: string, customerName?: string }>();
  
  const { data: fullPlan, isLoading: isLoadingPlan } = useTrainerMealPlan(targetUserId);
  const { data: onboardingData, isLoading: isLoadingOnboarding } = useCustomerOnboardingData(targetUserId);

  const [targets, setTargets] = useState<{
    targetCalories: number;
    targetProtein: number;
    targetFat: number;
    targetCarbs: number;
  } | null>(null);

  useEffect(() => {
    if (targetUserId) {
      calculateNutritionTargets(targetUserId)
        .then(res => setTargets(res))
        .catch(console.error);
    }
  }, [targetUserId]);

  const isLoading = isLoadingPlan || isLoadingOnboarding || !targets;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  const hasMeals = fullPlan?.days?.some(d => d.meals && d.meals.length > 0);
  if (fullPlan && fullPlan.days && fullPlan.days.length > 0 && hasMeals) {
    return <Redirect href={{ pathname: '/(trainer)/nutrition/my-nutrition-plan', params: { targetUserId } } as any} />;
  }

  const getPrimaryGoalDisplay = (goal: string) => {
    switch (goal?.toLowerCase()) {
      case 'loseweight': return 'Weight Loss';
      case 'buildmuscle': return 'Build Muscle';
      case 'gainweight': return 'Gain Weight';
      case 'stayfit': return 'Stay Fit';
      case 'improveendurance': return 'Improve Endurance';
      default: return 'Maintenance';
    }
  };

  const getPrimaryGoalDesc = (goal: string) => {
    switch (goal?.toLowerCase()) {
      case 'loseweight': return 'Lose weight in a healthy way and improve overall fitness.';
      case 'buildmuscle': return 'Focus on hypertrophy and strength gains.';
      case 'gainweight': return 'Healthy weight gain with structured nutrition.';
      case 'stayfit': return 'Maintain current physique and optimize health.';
      case 'improveendurance': return 'Optimize nutrition for sustained energy and performance.';
      default: return 'Maintain your current health and fitness levels.';
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222222] items-center justify-center mb-6 active:opacity-80">
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>

        <Text className="text-white text-[40px] leading-[44px] font-semibold tracking-tight">{customerName ? `${customerName.split(' ')[0]}'s` : 'Your'}</Text>
        <Text className="text-[#C4EF00] text-[40px] leading-[44px] font-semibold tracking-tight mb-4">Nutrition Needs</Text>

        <Text className="text-[#8E8E93] text-[13px] leading-5 mb-8">
          Based on {customerName ? 'their' : 'your'} profile, goal and activity level, here's what {customerName ? 'their' : 'your'} body needs every day.
        </Text>

        <View className="flex-row items-center gap-2 mb-4">
          <ChartBar size={18} color="#C4EF00" weight="fill" />
          <Text className="text-white text-xs font-semibold tracking-[0.1em]">DAILY NUTRITION NEEDS</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-5 px-5">
          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#FF453A]/10 items-center justify-center mb-4">
              <FireIcon size={20} color="#FF453A" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">CALORIES</Text>
            <Text className="text-white text-2xl font-semibold mb-1">{targets?.targetCalories}</Text>
            <Text className="text-[#555555] text-[10px]">kcal / day</Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#34C759]/10 items-center justify-center mb-4">
              <Cpu size={20} color="#34C759" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">PROTEIN</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">{targets?.targetProtein}</Text>
              <Text className="text-white text-sm font-semibold ml-0.5">g</Text>
            </View>
            <Text className="text-[#555555] text-[10px]">30% of calories</Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#FF9F0A]/10 items-center justify-center mb-4">
              <List size={20} color="#FF9F0A" weight="bold" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">CARBS</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">{targets?.targetCarbs}</Text>
              <Text className="text-white text-sm font-semibold ml-0.5">g</Text>
            </View>
            <Text className="text-[#555555] text-[10px]">45% of calories</Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-8 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#2E1C3D] items-center justify-center mb-4">
              <HeartStraightIcon size={20} color="#A855F7" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">FAT</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">{targets?.targetFat}</Text>
              <Text className="text-white text-sm font-semibold ml-0.5">g</Text>
            </View>
            <Text className="text-[#555555] text-[10px]">25% of calories</Text>
          </View>
        </ScrollView>

        <View className="bg-[#141414] border border-[#222222] rounded-[32px] p-5 mb-4">
          <View className="flex-row justify-between mb-6">
            <View className="flex-1 pr-4 pt-1">
              <Text className="text-[#C4EF00] text-[10px] font-semibold tracking-widest mb-2">CURRENT GOAL</Text>
              <Text className="text-white text-2xl font-semibold mb-1">{getPrimaryGoalDisplay(onboardingData?.primaryGoal || '')}</Text>
              <Text className="text-[#8E8E93] text-xs leading-5">
                {getPrimaryGoalDesc(onboardingData?.primaryGoal || '')}
              </Text>
            </View>
            <View className="bg-[#1A1A1A] rounded-[20px] p-4 items-center justify-center self-start border border-[#2A2A2A]">
              <Text className="text-[#8E8E93] text-[10px] mb-1">Target Weight</Text>
              <Text className="text-white text-xl font-semibold mb-2">{onboardingData?.targetWeight || '--'} kg</Text>
              <Text className="text-[#8E8E93] text-[10px]">Current: <Text className="text-[#C4EF00]">{onboardingData?.weight || '--'} kg</Text></Text>
            </View>
          </View>

          <View className="h-[1px] bg-[#222222] w-full mb-5" />

          <View className="flex-row justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-11 h-11 rounded-xl bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A]">
                <Calendar size={20} color="#C4EF00" />
              </View>
              <View>
                <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5">Expected{'\n'}Duration</Text>
                <Text className="text-white text-sm font-semibold">12 Weeks</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-11 h-11 rounded-xl bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A]">
                <Flame size={20} color="#C4EF00" />
              </View>
              <View>
                <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5">Est. Weekly{'\n'}Loss</Text>
                <Text className="text-white text-sm font-semibold">0.5 - 0.7 kg</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 flex-row items-center">
          <View className="w-11 h-11 rounded-full bg-[#1A1A1A] items-center justify-center mr-4 border border-[#2A2A2A]">
            <Info size={20} color="#C4EF00" />
          </View>
          <View className="flex-1 pr-2">
            <Text className="text-[#C4EF00] text-xs font-semibold mb-1">How we calculated this?</Text>
            <Text className="text-[#8E8E93] text-[10px] leading-4">
              These values are calculated using your age, height, weight, activity level and workout frequency.
            </Text>
          </View>
          <CaretRight size={14} color="#555555" weight="bold" />
        </View>

        <View className="p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 110 }}>
          <Pressable
            onPress={() => router.push({
              pathname: '/(trainer)/nutrition/food-preferences',
              params: { targetUserId, customerName }
            } as any)}
            className="bg-[#C4EF00] rounded-[20px] py-4 flex-row items-center justify-center active:opacity-90">
            <Text className="text-black font-semibold text-lg mr-2">Continue</Text>
            <CaretRight size={18} color="#000000" weight="bold" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}


