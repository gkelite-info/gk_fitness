import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useFocusEffect } from 'expo-router';
import { CaretRight, Eye, PencilSimple, ArrowsLeftRight, Plus } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

import { useCustomerWeeklyPlan } from '@/hooks/customerWorkouts/useCustomerWeeklyPlan';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function WeeklyWorkoutPlan() {
  const { userId } = useUser();
  const { data: loadedPlanDays, isLoading, refetch } = useCustomerWeeklyPlan(userId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

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
      const isToday = index === currentDayIndex;
      const isRest = !dayData || dayData.workoutType === 'Rest';

      const exercisesCount = dayData?.exercises?.length || 0;

      return {
        id: dayData?.planDayId || dayStr, // use planDayId if present for valid UUID routing
        dayAbbr: dayStr.substring(0, 3).toUpperCase(),
        date: dates[index],
        type: isRest ? 'Rest Day' : dayData.workoutType,
        exercises: exercisesCount,
        duration: dayData?.durationMinutes || (exercisesCount > 0 ? (exercisesCount * 5) + 10 : 0),
        isRest: isRest,
        isToday: isToday,
        subtitle: isRest ? 'Recovery & relax' : null
      };
    });
  }, [loadedPlanDays]);



  const handleEdit = (dayId: string) => {
    router.push({
      pathname: '/(customer)/weeklyWorkoutPlan/edit-day',
      params: { day: dayId }
    });
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-2 pt-12 pb-6">
      <View className="mb-8">
        <Text className="text-white text-3xl font-semibold mb-2">Weekly Workout Plan</Text>
        <Text className="text-[#8E8E8E] text-base">Review and customize your weekly schedule.</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading && !refreshing ? (
          <View className="items-center justify-center pt-20">
            <ActivityIndicator size="large" color="#D7FF00" />
          </View>
        ) : (
          <View className="gap-4">
            {weeklyPlan.map((day, index) => (
              <View
                key={index}
                className="flex-row bg-[#111111] rounded-[24px] p-3 items-center border border-[#1A1A1A]"
              >
                <View
                  className={`w-[60px] h-[75px] rounded-xl items-center justify-center mr-4 
                  ${day.isToday ? 'bg-[#D7FF00]' : 'bg-[#1A1A1A] border border-[#2A2A2A]'}`}
                >
                  <Text
                    className={`text-[11px] font-semibold tracking-wider mb-1 
                    ${day.isToday ? 'text-black' : 'text-[#8E8E8E]'}`}
                  >
                    {day.dayAbbr}
                  </Text>
                  <Text
                    className={`text-2xl text-black 
                    ${day.isToday ? 'text-black' : (day.isRest ? 'text-[#555555]' : 'text-white')}`}
                  >
                    {day.date}
                  </Text>
                </View>

                <View className="flex-1 justify-center">
                  <View className="flex-row items-center mb-1">
                    <View
                      className={`w-2 h-2 rounded-full mr-2 
                      ${day.isRest ? 'bg-[#555555]' : 'bg-[#D7FF00]'}`}
                    />
                    <Text className="text-white text-lg font-semibold">{day.type}</Text>
                  </View>
                  <Text className="text-[#8E8E8E] text-xs">
                    {day.subtitle ? day.subtitle : `${day.exercises} Exercises`}
                  </Text>
                </View>

                {day.isRest ? (
                  <Pressable
                    onPress={() => {
                      const existingFullNames = weeklyPlan.filter(d => !d.isRest).map(d => {
                        const map: any = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };
                        return map[d.dayAbbr];
                      });
                      router.push({
                        pathname: '/(customer)/workoutPlan',
                        params: {
                          existingDays: existingFullNames.join(','),
                          targetDay: day.dayAbbr
                        }
                      });
                    }}
                    className="flex-row items-center bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-3 rounded-xl ml-2"
                  >
                    <Plus size={14} color="#D7FF00" weight="bold" />
                    <Text className="text-white text-xs font-semibold ml-2">Add Workout</Text>
                  </Pressable>
                ) : (
                  <View className="flex-row items-center gap-1.5 ml-2">
                    <Pressable
                      onPress={() => router.push({ pathname: '/(customer)/weeklyWorkoutPlan/view-day', params: { dayId: day.id } })}
                      className="items-center justify-center bg-[#161616] border border-[#2A2A2A] w-[46px] h-[46px] rounded-xl"
                    >
                      <Eye size={18} color="#D7FF00" />
                      <Text className="text-white text-[9px] font-semibold mt-1">VIEW</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleEdit(day.id)}
                      className="items-center justify-center bg-[#161616] border border-[#2A2A2A] w-[46px] h-[46px] rounded-xl"
                    >
                      <PencilSimple size={18} color="#D7FF00" />
                      <Text className="text-white text-[9px] font-semibold mt-1">EDIT</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push({ pathname: '/(customer)/weeklyWorkoutPlan/swap-day', params: { dayId: day.id } })}
                      className="items-center justify-center bg-[#161616] border border-[#2A2A2A] w-[46px] h-[46px] rounded-xl mr-2"
                    >
                      <ArrowsLeftRight size={18} color="#D7FF00" />
                      <Text className="text-white text-[9px] font-semibold mt-1">SWAP</Text>
                    </Pressable>
                    <Pressable onPress={() => router.push({ pathname: '/(customer)/weeklyWorkoutPlan/view-day', params: { dayId: day.id } })} className="p-2 -mr-2">
                      <CaretRight size={16} color="#555555" />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
