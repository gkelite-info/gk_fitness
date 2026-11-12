import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Pressable, Animated } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams, useIsFocused } from 'expo-router';
import { ArrowLeft, CaretRight, Robot, Lightbulb, Calendar, Check } from 'phosphor-react-native';
import { useWorkoutPlan } from './_layout';
import { useUser } from '@/context/UserContext';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import { useCustomerWeeklyPlan } from '@/hooks/customerWorkouts/useCustomerWeeklyPlan';

const ShimmerBox = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ opacity }} className="w-[22%] aspect-square rounded-2xl bg-[#2A2A2A] mb-3 border border-[#333]" />
  );
};

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
  const { selectedDays, setSelectedDays, setPlanDays } = useWorkoutPlan();
  const { existingDays, targetDay, addRequestId } = useLocalSearchParams<{
    existingDays?: string;
    targetDay?: string;
    addRequestId?: string;
  }>();
  const { userId } = useUser();
  const isFocused = useIsFocused();
  const [isLoading, setIsLoading] = useState(false);
  const handledSyncKeyRef = useRef<string | null>(null);

  const existingDaysList = React.useMemo(
    () => (existingDays ? existingDays.split(',').filter(Boolean) : []),
    [existingDays]
  );
  const hasIncomingParams = existingDaysList.length > 0 || Boolean(targetDay);
  const syncKey = hasIncomingParams
    ? `${addRequestId || ''}|${existingDays || ''}|${targetDay || ''}`
    : null;

  useEffect(() => {
    if (!hasIncomingParams) {
      handledSyncKeyRef.current = null;
    }
  }, [hasIncomingParams]);

  const shouldSyncFromParams =
    isFocused &&
    hasIncomingParams &&
    (!syncKey || handledSyncKeyRef.current !== syncKey);

  const { data: loadedPlanDays, isLoading: isQueryLoading } = useCustomerWeeklyPlan(
    shouldSyncFromParams ? userId : null
  );

  useEffect(() => {
    if (!isFocused || !hasIncomingParams || !userId) return;
    if (syncKey && handledSyncKeyRef.current === syncKey) return;
    if (!targetDay && selectedDays.length > 0) return;

    if (isQueryLoading) {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);

    if (loadedPlanDays && loadedPlanDays[1]) {
      setPlanDays(loadedPlanDays);
    }

    const dayMap: Record<string, string> = {
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      THU: 'Thursday',
      FRI: 'Friday',
      SAT: 'Saturday',
      SUN: 'Sunday',
    };
    const targetFull = targetDay ? dayMap[targetDay] : null;
    const toSelect = [...existingDaysList];

    if (targetFull && !toSelect.includes(targetFull)) {
      toSelect.push(targetFull);
    }

    if (syncKey) {
      handledSyncKeyRef.current = syncKey;
    }

    setSelectedDays(toSelect);
  }, [
    isFocused,
    hasIncomingParams,
    existingDaysList,
    targetDay,
    syncKey,
    selectedDays.length,
    userId,
    loadedPlanDays,
    isQueryLoading,
  ]);

  const handleToggleDay = (day: string) => {
    try {
      if (selectedDays.includes(day)) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      } else {
        setSelectedDays([...selectedDays, day]);
      }
    } catch (error) {
      console.error('[BuildWeeklyPlan] handleToggleDay Error:', error);
    }
  };

  const handleContinue = () => {
    try {
      if (selectedDays.length > 0) {
        router.push('/(customer)/workoutPlan/choose-plan-mode');
      }
    } catch (error) {
      console.error('[BuildWeeklyPlan] handleContinue Error:', error);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-5 pb-28 justify-between">
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => router.replace('/(customer)/workout')}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}>
        <View className="items-center justify-center mb-6 bg-[#161616] p-6 rounded-full border border-[#242424] w-26 h-26">
          <Robot size={44} color="#C4EF00" weight="fill" />
        </View>

        <Text className="text-white text-3xl font-semibold text-center mb-2">Build Your</Text>
        <Text className="text-[#C4EF00] text-4xl font-semibold text-center mb-3">Monthly Plan</Text>
        <Text className="text-[#8E8E8E] text-sm text-center px-4 mb-5 leading-5">
          Choose the days you'd like to crush your workouts this month.
        </Text>

        <View className="w-full flex-row justify-between items-center mb-4 px-1">
          <Text className="text-[#8E8E8E] text-xs font-semibold tracking-wider">SELECT WORKOUT DAYS</Text>
          <View className="bg-[#C4EF00]/10 px-2.5 py-1 rounded-full border border-[#C4EF00]/20">
            <Text className="text-[#C4EF00] text-xs font-semibold">{selectedDays.length} DAYS</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between w-full">
          {isLoading ? (
            DAYS_OF_WEEK.map((day) => (
              <ShimmerBox key={day} />
            ))
          ) : (
            DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDays.includes(day);
              const isExisting = existingDaysList.includes(day);
              const shortName = day.substring(0, 3);
              return (
                <Pressable
                  key={day}
                  onPress={() => {
                    if (isExisting) return;
                    handleToggleDay(day);
                  }}
                  className={`w-[22%] aspect-square rounded-2xl items-center justify-center mb-3 border ${isSelected ? 'border-[#C4EF00] bg-[#1a1a1a]' : 'border-[#27272A] bg-[#111111]'
                    } ${isExisting ? 'opacity-50' : ''}`}
                >
                  <Text className={`font-semibold text-base mb-2 ${isSelected ? 'text-[#C4EF00]' : 'text-[#8E8E8E]'}`}>
                    {shortName}
                  </Text>

                  <View className={`w-6 h-6 rounded-full border items-center justify-center ${isSelected ? 'border-[#C4EF00] bg-[#C4EF00]' : 'border-[#27272A]'
                    }`}>
                    {isSelected && <Check size={12} color="#000" weight="bold" />}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View className="flex-row bg-[#161616] p-4 rounded-2xl border border-[#242424] items-center w-full mb-3">
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
