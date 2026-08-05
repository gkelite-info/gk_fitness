import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowsDownUp, Info, Clock } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCustomerWorkoutPlans } from '@/hooks/workout/useCustomerWorkoutPlans';
import { useCustomerWeeklyPlan } from '@/hooks/workout/useCustomerWeeklyPlan';
import { useSwapWorkoutDays } from '@/hooks/workout/useMutateCustomerWorkoutPlan';
import { toast } from '@/lib/toast';

export default function SwapDay() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const { userId } = useUser();
  const [selectedDayId, setSelectedDayId] = useState(''); 
  const { data: plans } = useCustomerWorkoutPlans(userId);
  const activePlanId = plans?.find((p: any) => p.isActive)?.planId || null;
  const { data: loadedPlanDays, isLoading: isQueryLoading } = useCustomerWeeklyPlan(userId);
  const swapMutation = useSwapWorkoutDays();

  const weeklyPlan = React.useMemo(() => {
    if (!loadedPlanDays) return [];

    const current = new Date();
    const currentDayOfWeek = current.getDay();
    const currentDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const diff = current.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(monday);
      nextDate.setDate(monday.getDate() + i);
      dates.push(nextDate.getDate().toString().padStart(2, '0'));
    }

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return dayOrder.map((dayStr, index) => {
      const dayData = loadedPlanDays[dayStr];
      const isRest = !dayData || dayData.workoutType === 'Rest';

      const exercisesCount = dayData?.exercises?.length || 0;

      return {
        id: dayData?.planDayId || dayStr,
        dayOfWeek: dayStr,
        dayAbbr: dayStr.substring(0, 3).toUpperCase(),
        date: dates[index],
        title: isRest ? 'Rest Day' : dayData.workoutType,
        subtitle: isRest ? 'Recovery & relax' : (dayData.workoutType || ''),
        exercises: exercisesCount,
        duration: dayData?.durationMinutes || (exercisesCount > 0 ? (exercisesCount * 5) + 10 : 0),
        isRest: isRest,
        planDayId: dayData?.planDayId || null,
      };
    });
  }, [loadedPlanDays]);

  const isLoading = isQueryLoading;

  const handleConfirmSwap = () => {
    if (!selectedDayId || !currentWorkout || !targetWorkout || !activePlanId) return;

    swapMutation.mutate({
      sourcePlanDayId: currentWorkout.planDayId,
      targetPlanDayId: targetWorkout.planDayId,
      sourceDayOfWeek: currentWorkout.dayOfWeek,
      targetDayOfWeek: targetWorkout.dayOfWeek,
      activePlanId
    }, {
      onSuccess: () => {
        toast.success(`Swapped ${currentWorkout.title} with ${targetWorkout.title}`);
        router.back();
      },
      onError: (err) => {
        console.error('Swap error:', err);
        toast.error('Failed to swap days');
      }
    });
  };

  const currentWorkout = weeklyPlan.find(d => d.id === dayId);
  const targetWorkout = weeklyPlan.find(d => d.id === selectedDayId);
  const moveToList = weeklyPlan.filter(d => d.id !== dayId);

  return (
    <View className="flex-1 bg-[#0A0A0A] pt-12 px-4 pb-20">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => router.back()}
          className="w-11 h-11 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-white text-2xl font-semibold">Swap Workout Day</Text>
          <Text className="text-[#8E8E8E] text-sm">Move this workout to another day of the week.</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#D4FF00" />
        </View>
      ) : currentWorkout ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text className="text-[#D4FF00] text-[11px] font-semibold tracking-widest uppercase mb-3 ml-1">
          Current Workout
        </Text>

        {/* Current Workout Card */}
        <View className="bg-[#121212] rounded-3xl border border-[#262626] p-4 flex-row items-center mb-1">
          <View className="bg-[#D4FF00] rounded-2xl w-[70px] h-[75px] items-center justify-center mr-4">
            <Text className="text-black text-xs font-semibold uppercase mb-0.5">{currentWorkout.dayAbbr}</Text>
            <Text className="text-black text-3xl font-black">{currentWorkout.date}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-xl font-semibold mb-1.5">{currentWorkout.title}</Text>
            <View className="flex-row items-center mb-2">
              <Clock size={12} color="#8E8E8E" />
              <Text className="text-[#8E8E8E] text-xs ml-1">{currentWorkout.duration} min</Text>
              <Text className="text-[#8E8E8E] text-xs mx-2">•</Text>
              <Text className="text-[#8E8E8E] text-xs">{currentWorkout.exercises} Exercises</Text>
            </View>
            <Text className="text-[#666666] text-[11px]">This workout will be moved to a new day.</Text>
          </View>
        </View>

        {/* Swap Icon */}
        <View className="items-center justify-center -my-3 z-10">
          <View className="w-10 h-10 rounded-full bg-[#D4FF00] items-center justify-center border-4 border-[#0A0A0A]">
            <ArrowsDownUp size={18} color="#000" weight="bold" />
          </View>
        </View>

        <Text className="text-[#D4FF00] text-[11px] font-semibold tracking-widest uppercase mb-3 ml-1 mt-4">
          Move To
        </Text>
        <Text className="text-[#8E8E8E] text-sm mb-4 ml-1">
          Select a day to move this workout to.
        </Text>

        {/* Target Days List */}
        <View className="gap-y-3 mb-6">
          {moveToList.map((item) => {
            const isSelected = selectedDayId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedDayId(item.id)}
                className={`flex-row items-center p-3 rounded-2xl border ${isSelected ? 'border-[#D4FF00] bg-[#1a1c0d]' : 'border-[#262626] bg-[#121212]'
                  }`}
              >
                <View className={`w-14 h-16 rounded-xl items-center justify-center mr-4 ${isSelected ? 'bg-[#D4FF00]' : 'bg-[#1C1C1C]'
                  }`}>
                  <Text className={`text-[10px] font-semibold uppercase mb-0.5 ${isSelected ? 'text-black' : 'text-[#8E8E8E]'
                    }`}>
                    {item.dayAbbr}
                  </Text>
                  <Text className={`text-xl font-black ${isSelected ? 'text-black' : 'text-white'
                    }`}>
                    {item.date}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-white text-base font-semibold">{item.title}</Text>
                  <Text className="text-[#8E8E8E] text-xs mt-0.5">{item.subtitle}</Text>
                </View>

                {!item.isRest ? (
                  <View className="bg-[#1C1C1C] px-2 py-1 rounded-md mr-3">
                    <Text className="text-[#666666] text-[10px] font-semibold">{item.duration} min • {item.exercises} Ex</Text>
                  </View>
                ) : null}

                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'border-[#D4FF00]' : 'border-[#444]'
                  }`}>
                  {isSelected && <View className="w-3 h-3 rounded-full bg-[#D4FF00]" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Info Box */}
        <View className="flex-row items-start bg-[#161616] border border-[#242424] rounded-2xl p-4 mb-14">
          <View className="mr-3 mt-0.5">
            <Info size={20} color="#D4FF00" weight="regular" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-sm mb-1">What happens after I swap?</Text>
            <Text className="text-[#8E8E8E] text-xs leading-5">
              The selected day's workout will move to {currentWorkout.dayOfWeek.charAt(0).toUpperCase() + currentWorkout.dayOfWeek.slice(1)}, and {currentWorkout.dayOfWeek.charAt(0).toUpperCase() + currentWorkout.dayOfWeek.slice(1)}'s workout will move to the new day.
            </Text>
          </View>
        </View>

        <View className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] px-5 pt-4 pb-8 border-t border-[#161616]">
          <Pressable
            onPress={handleConfirmSwap}
            disabled={!selectedDayId || swapMutation.isPending}
            className={`flex-1 rounded-2xl items-center justify-center h-14 flex-row gap-2 ${!selectedDayId || swapMutation.isPending ? 'bg-[#D4FF00]/50' : 'bg-[#D4FF00] active:opacity-90'
              }`}
          >
            {swapMutation.isPending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Text className="text-black font-semibold text-base">Confirm Swap</Text>
                <ArrowsDownUp size={16} color="#000" weight="bold" />
              </>
            )}
          </Pressable>
          <Pressable onPress={() => router.back()} className="w-full h-12 items-center justify-center active:opacity-70 mt-2">
            <Text className="text-white text-base font-semibold">Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
      ) : null}
    </View>
  );
}
