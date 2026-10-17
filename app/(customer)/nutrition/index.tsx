import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, Redirect } from 'expo-router';
import { useCustomerMealPlan } from '@/hooks/customerMealPlans/useCustomerMealPlan';
import { useCustomerOnboardingData } from '@/hooks/customers/useCustomerOnboardingData';
import { useUser } from '@/context/UserContext';
import {
  CaretLeft,
  ChartBar,
  Flame,
  Cpu,
  List,
  Calendar,
  Info,
  CaretRight,
  Fire,
  HeartStraight
} from 'phosphor-react-native';

export default function NutritionAnalysis() {
  const router = useRouter();
  const { userId, gender: userGender, dob: userDob } = useUser();
  const { data: fullPlan, isLoading: isLoadingPlan } = useCustomerMealPlan(userId as any);
  const { data: onboardingData, isLoading: isOnboardingLoading } = useCustomerOnboardingData(userId ?? undefined);

  const hasOnboardingData = useMemo(() => {
    if (!onboardingData) return false;
    const weightNum = parseFloat(String(onboardingData.weight || '0'));
    const heightNum = parseFloat(String(onboardingData.height || '0'));
    return (
      (weightNum > 0 || heightNum > 0 || !!onboardingData.primaryGoal) &&
      !!onboardingData.onboardingId
    );
  }, [onboardingData]);

  const nutritionTargets = useMemo(() => {
    if (!hasOnboardingData || !onboardingData) {
      return null;
    }

    const weight = parseFloat(String(onboardingData.weight || '0')) || 70;
    const height = parseFloat(String(onboardingData.height || '0')) || 170;
    const goal = (onboardingData.primaryGoal || '').toLowerCase();

    let age = 30;
    if (userDob) {
      const birthDate = new Date(userDob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge > 10 && calculatedAge < 100) {
          age = calculatedAge;
        }
      }
    }

    const gender = (userGender || 'male').toLowerCase();

    // BMR (Mifflin-St Jeor formula)
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }

    // TDEE Multiplier
    let workoutDaysCount = 3;
    if (Array.isArray(onboardingData.workoutDays)) {
      workoutDaysCount = onboardingData.workoutDays.length;
    } else if (typeof onboardingData.workoutDays === 'string') {
      try {
        const parsed = JSON.parse(onboardingData.workoutDays);
        if (Array.isArray(parsed)) workoutDaysCount = parsed.length;
      } catch (e) {
        // ignore
      }
    }

    let tdeeMultiplier = 1.2;
    if (workoutDaysCount >= 6) {
      tdeeMultiplier = 1.725;
    } else if (workoutDaysCount >= 4) {
      tdeeMultiplier = 1.55;
    } else if (workoutDaysCount >= 1) {
      tdeeMultiplier = 1.375;
    }

    let calories = Math.round(bmr * tdeeMultiplier);

    switch (goal) {
      case 'loseweight':
      case 'weightloss':
        calories -= 500;
        break;
      case 'buildmuscle':
      case 'musclegain':
      case 'gainweight':
        calories += 300;
        break;
      default:
        break;
    }

    const minCalories = gender.includes('female') ? 1200 : 1500;
    if (calories < minCalories) {
      calories = minCalories;
    }

    // Macro targets: 30% Protein, 45% Carbs, 25% Fat
    const protein = Math.round((calories * 0.30) / 4);
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories * 0.45) / 4);

    return {
      calories,
      protein,
      carbs,
      fat,
      proteinPercent: 30,
      carbsPercent: 45,
      fatPercent: 25,
    };
  }, [hasOnboardingData, onboardingData, userGender, userDob]);

  const getPrimaryGoalDisplay = (goal?: string | null) => {
    if (!goal) return '-';
    switch (goal.toLowerCase()) {
      case 'loseweight':
      case 'weightloss':
        return 'Weight Loss';
      case 'buildmuscle':
      case 'musclegain':
        return 'Build Muscle';
      case 'gainweight':
        return 'Gain Weight';
      case 'stayfit':
      case 'maintainfitness':
        return 'Stay Fit';
      case 'improveendurance':
      case 'imporoveendurance':
        return 'Improve Endurance';
      default:
        return goal.charAt(0).toUpperCase() + goal.slice(1);
    }
  };

  const getPrimaryGoalDesc = (goal?: string | null) => {
    if (!goal) return 'No active goal set. Please complete your onboarding.';
    switch (goal.toLowerCase()) {
      case 'loseweight':
      case 'weightloss':
        return 'Lose weight in a healthy way and improve overall fitness.';
      case 'buildmuscle':
      case 'musclegain':
        return 'Focus on hypertrophy and strength gains.';
      case 'gainweight':
        return 'Healthy weight gain with structured nutrition.';
      case 'stayfit':
      case 'maintainfitness':
        return 'Maintain current physique and optimize health.';
      case 'improveendurance':
      case 'imporoveendurance':
        return 'Optimize nutrition for sustained energy and performance.';
      default:
        return 'Maintain your current health and fitness levels.';
    }
  };

  const getDurationDisplay = (timeframe?: string | null) => {
    if (!timeframe || timeframe.trim() === '') return '-';
    return timeframe
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const getWeeklyRateInfo = (goal?: string | null) => {
    if (!hasOnboardingData || !goal) {
      return {
        label: `Est. Weekly\nRate`,
        value: '-',
      };
    }
    switch (goal.toLowerCase()) {
      case 'loseweight':
      case 'weightloss':
        return {
          label: `Est. Weekly\nLoss`,
          value: '0.5 - 0.7 kg',
        };
      case 'buildmuscle':
      case 'musclegain':
      case 'gainweight':
        return {
          label: `Est. Weekly\nGain`,
          value: '0.25 - 0.5 kg',
        };
      case 'stayfit':
      case 'maintainfitness':
        return {
          label: `Est. Weekly\nTarget`,
          value: 'Maintain',
        };
      case 'improveendurance':
      case 'imporoveendurance':
        return {
          label: `Est. Weekly\nTarget`,
          value: 'Endurance',
        };
      default:
        return {
          label: `Est. Weekly\nTarget`,
          value: '-',
        };
    }
  };

  const weeklyRateInfo = getWeeklyRateInfo(onboardingData?.primaryGoal);

  if (isLoadingPlan || isOnboardingLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  if (fullPlan && fullPlan.days && fullPlan.days.length > 0) {
    return <Redirect href="/(customer)/nutrition/my-nutrition-plan" />;
  }

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push('/(customer)/home')} className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222222] items-center justify-center mb-6 active:opacity-80">
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>

        <Text className="text-white text-[40px] leading-[44px] font-semibold tracking-tight">Your Nutrition</Text>
        <Text className="text-[#C4EF00] text-[40px] leading-[44px] font-semibold tracking-tight mb-4">Analysis</Text>

        <Text className="text-[#8E8E93] text-[13px] leading-5 mb-8">
          Based on your profile, goal and activity level, here's what your body needs every day.
        </Text>

        <View className="flex-row items-center gap-2 mb-4">
          <ChartBar size={18} color="#C4EF00" weight="fill" />
          <Text className="text-white text-xs font-semibold tracking-[0.1em]">DAILY NUTRITION NEEDS</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-5 px-5">
          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#FF453A]/10 items-center justify-center mb-4">
              <Fire size={20} color="#FF453A" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">CALORIES</Text>
            <Text className="text-white text-2xl font-semibold mb-1">
              {nutritionTargets ? nutritionTargets.calories.toLocaleString() : '0'}
            </Text>
            <Text className="text-[#555555] text-[10px]">
              {nutritionTargets ? 'kcal / day' : '-'}
            </Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#34C759]/10 items-center justify-center mb-4">
              <Cpu size={20} color="#34C759" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">PROTEIN</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">
                {nutritionTargets ? nutritionTargets.protein : '0'}
              </Text>
              <Text className="text-white text-sm font-semibold ml-0.5">
                {nutritionTargets ? 'g' : 'g'}
              </Text>
            </View>
            <Text className="text-[#555555] text-[10px]">
              {nutritionTargets ? `${nutritionTargets.proteinPercent}% of calories` : '-'}
            </Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#FF9F0A]/10 items-center justify-center mb-4">
              <List size={20} color="#FF9F0A" weight="bold" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">CARBS</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">
                {nutritionTargets ? nutritionTargets.carbs : '0'}
              </Text>
              <Text className="text-white text-sm font-semibold ml-0.5">
                {nutritionTargets ? 'g' : 'g'}
              </Text>
            </View>
            <Text className="text-[#555555] text-[10px]">
              {nutritionTargets ? `${nutritionTargets.carbsPercent}% of calories` : '-'}
            </Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-8 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#2E1C3D] items-center justify-center mb-4">
              <HeartStraight size={20} color="#A855F7" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">FAT</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">
                {nutritionTargets ? nutritionTargets.fat : '0'}
              </Text>
              <Text className="text-white text-sm font-semibold ml-0.5">
                {nutritionTargets ? 'g' : 'g'}
              </Text>
            </View>
            <Text className="text-[#555555] text-[10px]">
              {nutritionTargets ? `${nutritionTargets.fatPercent}% of calories` : '-'}
            </Text>
          </View>
        </ScrollView>

        <View className="bg-[#141414] border border-[#222222] rounded-[32px] p-5 mb-4">
          <View className="flex-row justify-between mb-6">
            <View className="flex-1 pr-4 pt-1">
              <Text className="text-[#C4EF00] text-[10px] font-semibold tracking-widest mb-2">CURRENT GOAL</Text>
              <Text className="text-white text-2xl font-semibold mb-1">
                {hasOnboardingData ? getPrimaryGoalDisplay(onboardingData?.primaryGoal) : '-'}
              </Text>
              <Text className="text-[#8E8E93] text-xs leading-5">
                {hasOnboardingData ? getPrimaryGoalDesc(onboardingData?.primaryGoal) : 'No active goal set. Please complete your onboarding.'}
              </Text>
            </View>
            <View className="bg-[#1A1A1A] rounded-[20px] p-4 items-center justify-center self-start border border-[#2A2A2A]">
              <Text className="text-[#8E8E93] text-[10px] mb-1">Target Weight</Text>
              <Text className="text-white text-xl font-semibold mb-2">
                {hasOnboardingData && onboardingData?.targetWeight && Number(onboardingData.targetWeight) > 0 ? `${onboardingData.targetWeight} kg` : '-'}
              </Text>
              <Text className="text-[#8E8E93] text-[10px]">Current: <Text className="text-[#C4EF00]">
                {hasOnboardingData && onboardingData?.weight && Number(onboardingData.weight) > 0 ? `${onboardingData.weight} kg` : '-'}
              </Text></Text>
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
                <Text className="text-white text-sm font-semibold">
                  {hasOnboardingData ? getDurationDisplay(onboardingData?.goalTimeframe) : '-'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-11 h-11 rounded-xl bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A]">
                <Flame size={20} color="#C4EF00" />
              </View>
              <View>
                <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5">{weeklyRateInfo.label}</Text>
                <Text className="text-white text-sm font-semibold">{weeklyRateInfo.value}</Text>
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
            onPress={() => router.push('/(customer)/nutrition/food-preferences')}
            className="bg-[#C4EF00] rounded-[20px] py-4 flex-row items-center justify-center active:opacity-90">
            <Text className="text-black font-semibold text-lg mr-2">Continue</Text>
            <CaretRight size={18} color="#000000" weight="bold" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
