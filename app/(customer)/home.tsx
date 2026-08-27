import React, { useEffect, useState } from 'react';
import { View, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerMediumHaptic } from '@/lib/haptics';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomerDashboardData } from '@/hooks/customerWorkouts/useCustomerDashboardData';
import { useCustomerOnboardingStatus, sessionSkippedUsers } from '@/hooks/auth/useCustomerOnboardingStatus';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import { fetchGymCustomerMembershipPlans } from '@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipPlans';
import {
  Star,
  QrCode,
  Barbell,
  Clock,
  ArrowRight,
  Flame,
  Footprints,
  Drop,
  Lightning,
  ForkKnife,
  BowlFood,
} from 'phosphor-react-native';
import { usePedometer } from '@/hooks/fitness/usePedometer';
import { useFitnessStats } from '@/hooks/fitness/useFitnessStats';



export default function CustomerHome() {
  const { name, userId } = useUser();
  const firstName = name?.split(' ')[0] || 'Customer';
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: dashboardData, isLoading: isLoadingDashboard, refetch: refetchDashboard } = useCustomerDashboardData(userId);
  const { data: onboardingStatus, isLoading: isCheckingOnboarding, refetch: refetchOnboarding } = useCustomerOnboardingStatus(userId);

  const todayWorkoutDayId = dashboardData?.todayWorkout?.dayId || null;
  const todayWorkoutType = dashboardData?.todayWorkout?.type || 'Rest';
  const todayDuration = dashboardData?.todayWorkout?.duration?.toString() || '0';
  const todayExercisesCount = dashboardData?.todayWorkout?.exercisesCount?.toString() || '0';

  const [planName, setPlanName] = useState<string>('MEMBER');
  const [daysLeft, setDaysLeft] = useState<number | string>('--');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);

  const openCamera = () => {
    router.push('/(customer)/home/scan');
  };



  useEffect(() => {
    async function fetchMembershipInfo() {
      if (!userId) return;
      try {
        const plans = await fetchGymCustomerMembershipPlans(undefined, userId);
        const activePlan = plans.find((p: any) => p.is_Active && p.endDate);
        if (activePlan) {
          const end = new Date(activePlan.endDate);
          const now = new Date();
          const diffTime = end.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const currentDaysLeft = diffDays > 0 ? diffDays : 0;
          setDaysLeft(currentDaysLeft);

          let percentage = 0;
          if (activePlan.startDate) {
            const start = new Date(activePlan.startDate);
            const totalTime = end.getTime() - start.getTime();
            const totalDays = Math.ceil(totalTime / (1000 * 60 * 60 * 24));
            if (totalDays > 0) {
              percentage = (currentDaysLeft / totalDays) * 100;
              percentage = Math.min(Math.max(percentage, 0), 100);
            }
          }
          setProgressPercentage(percentage);

          const { data: planDetails } = await supabase
            .from('gym_membership_plans')
            .select('planName')
            .eq('planId', activePlan.planId)
            .maybeSingle();

          if (planDetails?.planName) {
            setPlanName(planDetails.planName.toUpperCase());
          }
        }
      } catch (err) {
        console.error('Error fetching membership info', err);
      }
    }
    fetchMembershipInfo();
  }, [userId]);

  const today = new Date().toISOString().split('T')[0];
  const { steps, calories } = usePedometer();
  const { data: stats, refetch: refetchStats } = useFitnessStats(userId, today);

  const onRefresh = React.useCallback(async () => {
    triggerMediumHaptic();
    setRefreshing(true);
    try {
      await Promise.all([
        refetchDashboard(),
        refetchOnboarding(),
        refetchStats(),
      ]);
    } catch (error) {
      console.error('[Customer Home] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchDashboard, refetchOnboarding, refetchStats]);

  const waterGoal = stats?.waterGoalML || 2500;
  const waterTotal = stats?.totalWaterML || 0;

  useEffect(() => {
    if (userId && onboardingStatus && !isCheckingOnboarding) {
      if (!onboardingStatus.isOnboarded && !onboardingStatus.isSkipped) {
        router.replace('/(customer)/(onboarding)/step1');
      }
    }
  }, [userId, onboardingStatus, isCheckingOnboarding, router]);

  if (isCheckingOnboarding || isLoadingDashboard) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#d4ff00" />
      </View>
    );
  }

  const weeklyBars = [
    { day: 'M', height: 45, active: true },
    { day: 'T', height: 75, active: true },
    { day: 'W', height: 60, active: true },
    { day: 'T', height: 85, active: true },
    { day: 'F', height: 25, active: false },
    { day: 'S', height: 35, active: false },
    { day: 'S', height: 20, active: false },
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="mb-5">
        <Text className="text-[#8E8E93] text-sm font-medium">
          Hi {firstName} 👋
        </Text>
        <Text className="text-white text-lg font-semibold mt-1">
          Every rep. Every step. <Text className="text-[#D7FF00]">Better than yesterday.</Text>
        </Text>
      </View>

      <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-6 h-6 rounded-full bg-[#D7FF00] items-center justify-center">
              <Star size={14} color="#000000" weight="fill" />
            </View>
            <Text className="text-[#D7FF00] text-xs font-semibold tracking-wider">
              {planName}
            </Text>
          </View>

          <View className="flex-row items-baseline gap-2 mb-3">
            <Text className="text-white text-4xl font-semibold">{daysLeft}</Text>
            <Text className="text-[#8E8E93] text-sm font-medium">Days Left</Text>
          </View>

          <View className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden">
            <View className="h-full bg-[#D7FF00] rounded-full" style={{ width: `${progressPercentage}%` }} />
          </View>
        </View>

        <View className="w-[1px] h-16 bg-[#262626] mx-2" />

        <Pressable onPress={openCamera} className="items-center justify-center pl-2 active:opacity-80">
          <View className="w-12 h-12 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] items-center justify-center mb-1">
            <QrCode size={26} color="#D7FF00" />
          </View>
          <Text className="text-white text-[11px] font-semibold text-center">Check-in</Text>
          <Text className="text-[#8E8E93] text-[10px] text-center">(QR)</Text>
        </Pressable>
      </View>

      <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4 relative overflow-hidden flex-row items-center justify-between">
        <View className="flex-1 z-10 pr-2">
          <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider mb-1">
            TODAY'S WORKOUT
          </Text>
          {todayWorkoutDayId && todayWorkoutType ? (
            <>
              <Text className="text-white text-2xl font-semibold mb-2">
                {todayWorkoutType}
              </Text>

              <View className="flex-row items-center gap-3 mb-4">
                <View className="flex-row items-center gap-1.5">
                  <Barbell size={16} color="#8E8E93" />
                  <Text className="text-[#8E8E93] text-xs font-medium">{todayExercisesCount} Exercises</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Clock size={16} color="#8E8E93" />
                  <Text className="text-[#8E8E93] text-xs font-medium">{todayDuration} min</Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  router.push({
                    pathname: '/(customer)/workout-countdown',
                    params: {
                      dayId: todayWorkoutDayId,
                      workoutType: todayWorkoutType,
                      duration: todayDuration,
                      exercisesCount: todayExercisesCount
                    }
                  });
                }}
                className="bg-[#D7FF00] rounded-full py-3 px-5 flex-row items-center justify-center self-start active:opacity-90"
              >
                <Text className="text-black font-semibold text-sm mr-2">Start Workout</Text>
                <View className="w-6 h-6 rounded-full bg-black/10 items-center justify-center">
                  <ArrowRight size={14} color="#000000" weight="bold" />
                </View>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-white text-lg font-semibold mb-4 leading-tight">
                No Workout{'\n'}Scheduled
              </Text>
              <Pressable
                onPress={() => router.push('/(customer)/workoutPlan')}
                className="bg-[#D7FF00] rounded-full py-3 px-5 flex-row items-center justify-center active:opacity-90 mt-1"
              >
                <Text className="text-black font-semibold text-sm mr-2">Add workout plan</Text>
                <View className="w-6 h-6 rounded-full bg-black/10 items-center justify-center">
                  <ArrowRight size={14} color="#000000" weight="bold" />
                </View>
              </Pressable>
            </>
          )}
        </View>

        <View className="items-end justify-center">
          <Image
            source={require('../../assets/fit-1.png')}
            style={{ width: 145, height: 160 }}
            resizeMode="contain"
          />
        </View>
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-3 mb-4">
        <Pressable onPress={() => router.push('/(customer)/fitness/calories')} className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4 active:opacity-80">
          <View className="w-8 h-8 rounded-full bg-[#FF453A]/10 items-center justify-center mb-2">
            <Flame size={20} color="#FF453A" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">{calories}</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            CALORIES KCAL
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#FF453A] rounded-full" style={{ width: `${Math.min((calories / 500) * 100, 100)}%` }} />
          </View>
        </Pressable>

        <Pressable onPress={() => router.push('/(customer)/fitness/steps')} className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4 active:opacity-80">
          <View className="w-8 h-8 rounded-full bg-[#C3F400]/10 items-center justify-center mb-2">
            <Footprints size={20} color="#C3F400" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">{steps.toLocaleString()}</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            STEPS
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#C3F400] rounded-full" style={{ width: `${Math.min((steps / 10000) * 100, 100)}%` }} />
          </View>
        </Pressable>

        <Pressable onPress={() => router.push('/(customer)/fitness/water')} className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4 active:opacity-80">
          <View className="w-8 h-8 rounded-full bg-[#00DBE7]/10 items-center justify-center mb-2">
            <Drop size={20} color="#00DBE7" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">{(waterTotal / 1000).toFixed(1)}</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            WATER (LITERS)
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#00DBE7] rounded-full" style={{ width: `${Math.min((waterTotal / waterGoal) * 100, 100)}%` }} />
          </View>
        </Pressable>

        <View className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4">
          <View className="w-8 h-8 rounded-full bg-[#FB923C]/10 items-center justify-center mb-2">
            <Lightning size={20} color="#FB923C" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">12</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            DAY STREAK
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#FB923C] rounded-full" style={{ width: '85%' }} />
          </View>
        </View>
      </View>

      <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider">
            WEEKLY PROGRESS
          </Text>
          <Pressable className="flex-row items-center gap-1 active:opacity-80">
            <Text className="text-[#8E8E93] text-xs font-medium">View All</Text>
            <ArrowRight size={13} color="#8E8E93" />
          </Pressable>
        </View>

        <View className="flex-row items-end justify-between">
          <View className="justify-end mb-2">
            <View className="flex-row items-baseline">
              <Text className="text-white text-4xl font-semibold">68</Text>
              <Text className="text-white text-xl font-semibold ml-0.5">%</Text>
            </View>
            <Text className="text-[#8E8E93] text-xs font-medium mt-1">Completed</Text>
          </View>

          <View className="flex-row items-end gap-2.5">
            {weeklyBars.map((item, index) => (
              <View key={index} className="items-center gap-2">
                <View className="w-3.5 h-20 bg-[#1E1E1E] rounded-full justify-end overflow-hidden">
                  <View
                    className="w-full rounded-full"
                    style={{
                      height: `${item.height}%`,
                      backgroundColor: item.active ? '#C4EF00' : '#2A2A2A',
                    }}
                  />
                </View>
                <Text className="text-[#8E8E93] text-[11px] font-semibold">{item.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4 relative overflow-hidden flex-row items-center justify-between">
        <View className="flex-1 z-10 py-1">
          <View className="w-10 h-10 rounded-2xl bg-[#C0F905]/10 items-center justify-center mb-3">
            <BowlFood size={22} color="#C0F905" weight="fill" />
          </View>

          <Text className="text-white text-2xl font-semibold tracking-tight mb-1">Today's Meal Plan</Text>

          <Text className="text-[#8E8E93] text-[11px] font-medium mb-5">
            Dinner  <Text className="text-[#C0F905]">●</Text>  Breakfast  <Text className="text-[#C0F905]">●</Text>  Lunch  <Text className="text-[#C0F905]">●</Text>  Snack  <Text className="text-[#C0F905]">●</Text>
          </Text>

          <View className="flex-row items-center gap-2 mb-6">
            <View className="w-8 h-8 rounded-full border-2 border-[#C0F905] items-center justify-center">
              <ForkKnife size={14} color="#C0F905" weight="fill" />
            </View>
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-[#C0F905] text-lg font-bold">3</Text>
              <Text className="text-[#8E8E93] text-xs font-medium">of <Text className="text-[#D4D4D4] font-semibold text-sm">4</Text> meals planned</Text>
            </View>
          </View>

          <Pressable
            // @ts-ignore
            onPress={() => router.push('/(customer)/nutrition')}
            className="bg-[#C4EF00] rounded-xl py-3 px-5 flex-row items-center justify-center self-start active:opacity-90">
            <Text className="text-black font-semibold text-sm mr-2">View Meal Plan</Text>
            <ArrowRight size={16} color="#000000" />
          </Pressable>
        </View>

        <View className="absolute -right-24 top-0 bottom-0 justify-center">
          <Image
            source={require('../../assets/home_diet_image.png')}
            style={{ width: 280, height: 280 }}
            resizeMode="contain"
          />
        </View>
      </View>
    </ScrollView>
  );
}
