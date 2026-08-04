import React, { useEffect, useState } from 'react';
import { View, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
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
} from 'phosphor-react-native';

export const sessionSkippedUsers = new Set<string>();

export default function CustomerHome() {
  const { name, userId } = useUser();
  const firstName = name?.split(' ')[0] || 'Customer';
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [todayWorkoutDayId, setTodayWorkoutDayId] = useState<string | null>(null);
  const [todayWorkoutType, setTodayWorkoutType] = useState('Back & Biceps');
  const [todayDuration, setTodayDuration] = useState('50');
  const [todayExercisesCount, setTodayExercisesCount] = useState('0');

  const openCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        alert("You've refused to allow this app to access your camera!");
        return;
      }
      await ImagePicker.launchCameraAsync();
    } catch (error) {
      console.log('Error opening camera:', error);
    }
  };

  useEffect(() => {
    async function fetchTodayWorkout() {
      if (!userId) return;
      try {
        const plans = await fetchCustomerWorkoutPlans(userId);
        const activePlan = plans.find((p: any) => p.isActive);
        if (activePlan) {
          const days = await fetchWorkoutPlanDays(activePlan.planId);
          const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const todayString = dayOrder[new Date().getDay()];
          const todayData = days.find((d: any) => d.dayOfWeek.toLowerCase() === todayString);
          if (todayData && todayData.workoutType !== 'Rest') {
            setTodayWorkoutDayId(todayData.planDayId);
            setTodayWorkoutType(todayData.workoutType);
            setTodayDuration(todayData.durationMinutes?.toString() || '45');
            const exs = await fetchWorkoutPlanDayExercises(todayData.planDayId);
            setTodayExercisesCount(exs?.length?.toString() || '0');
          }
        }
      } catch (err) {
        console.error('Error fetching today workout', err);
      }
    }
    fetchTodayWorkout();
  }, [userId]);

  useEffect(() => {
    async function checkOnboarding() {
      if (!userId) {
        setChecking(false);
        return;
      }

      if (sessionSkippedUsers.has(userId)) {
        setChecking(false);
        return;
      }

      try {
        const skipped = await AsyncStorage.getItem(`@onboarding_skipped_${userId}`);
        if (skipped === 'true') {
          setChecking(false);
          return;
        }

        const { data, error } = await supabase
          .from('customer_onboarding')
          .select('onboardingId')
          .eq('createdBy', userId)
          .maybeSingle();

        if (!data) {
          router.replace('/(customer)/(onboarding)/step1');
        } else {
          setChecking(false);
        }
      } catch (err) {
        console.error('Error checking onboarding status', err);
        setChecking(false);
      }
    }

    checkOnboarding();
  }, [userId, router]);

  if (checking) {
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
              PREMIUM MEMBER
            </Text>
          </View>

          <View className="flex-row items-baseline gap-2 mb-3">
            <Text className="text-white text-4xl font-semibold">28</Text>
            <Text className="text-[#8E8E93] text-sm font-medium">Days Left</Text>
          </View>

          <View className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden">
            <View className="h-full bg-[#D7FF00] rounded-full" style={{ width: '45%' }} />
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
              if (todayWorkoutDayId) {
                router.push({
                  pathname: '/(customer)/workout-countdown',
                  params: {
                    dayId: todayWorkoutDayId,
                    workoutType: todayWorkoutType,
                    duration: todayDuration,
                    exercisesCount: todayExercisesCount
                  }
                });
              } else {
                alert("You don't have an active workout scheduled for today.");
              }
            }}
            className="bg-[#D7FF00] rounded-full py-3 px-5 flex-row items-center justify-center self-start active:opacity-90"
          >
            <Text className="text-black font-semibold text-sm mr-2">Start Workout</Text>
            <View className="w-6 h-6 rounded-full bg-black/10 items-center justify-center">
              <ArrowRight size={14} color="#000000" weight="bold" />
            </View>
          </Pressable>
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
        <View className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4">
          <View className="w-8 h-8 rounded-full bg-[#C3F400]/10 items-center justify-center mb-2">
            <Flame size={20} color="#C3F400" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">520</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            CALORIES KCAL
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#C3F400] rounded-full" style={{ width: '60%' }} />
          </View>
        </View>

        <View className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4">
          <View className="w-8 h-8 rounded-full bg-[#C3F400]/10 items-center justify-center mb-2">
            <Footprints size={20} color="#C3F400" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">7,845</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            STEPS
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#C3F400] rounded-full" style={{ width: '78%' }} />
          </View>
        </View>

        <View className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4">
          <View className="w-8 h-8 rounded-full bg-[#00DBE7]/10 items-center justify-center mb-2">
            <Drop size={20} color="#00DBE7" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">2.3</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            WATER (LITERS)
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#00DBE7] rounded-full" style={{ width: '55%' }} />
          </View>
        </View>

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
    </ScrollView>
  );
}
