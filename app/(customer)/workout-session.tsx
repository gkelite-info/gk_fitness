import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, CaretDown, CaretRight, Lightbulb, ArrowRight, Barbell } from 'phosphor-react-native';
import { useWorkoutPlanDayById } from '@/hooks/customerWorkouts/useWorkoutPlanDayById';
import { useWorkoutPlanDayExercises } from '@/hooks/customerWorkouts/useWorkoutPlanDayExercises';
import { useWorkoutPlanDays } from '@/hooks/customerWorkouts/useWorkoutPlanDays';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function WorkoutSession() {
  const { dayId: initialDayId } = useLocalSearchParams<{ dayId: string }>();
  const [activeDayId, setActiveDayId] = useState(initialDayId);
  const [planId, setPlanId] = useState<string | undefined>();
  const [isTipVisible, setIsTipVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { data: dayData, isLoading: isLoadingDay, refetch: refetchDay } = useWorkoutPlanDayById(activeDayId);
  const { data: eData, isLoading: isLoadingExercises, refetch: refetchExercises } = useWorkoutPlanDayExercises(activeDayId);

  useEffect(() => {
    if (dayData?.planId && !planId) {
      setPlanId(dayData.planId);
    }
  }, [dayData?.planId, planId]);

  const { data: allDays, isLoading: isLoadingAllDays, refetch: refetchAllDays } = useWorkoutPlanDays(planId || dayData?.planId);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchDay(),
      refetchExercises(),
      refetchAllDays()
    ]);
    setRefreshing(false);
  }, [refetchDay, refetchExercises, refetchAllDays]);

  const exercises = React.useMemo(() => {
    return eData ? [...eData].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) : [];
  }, [eData]);

  const daysList = React.useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const dayOrderMap: Record<string, number> = {
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7
    };

    let sortedDays = [];
    if (!allDays || allDays.length === 0) {
      sortedDays = [
        { dayOfWeek: 'Monday', workoutType: 'Chest', planDayId: '' },
        { dayOfWeek: 'Tuesday', workoutType: 'Legs', planDayId: '' },
        { dayOfWeek: 'Wednesday', workoutType: 'Abs', planDayId: '' },
        { dayOfWeek: 'Thursday', workoutType: 'Rest', planDayId: '' },
        { dayOfWeek: 'Friday', workoutType: 'Back', planDayId: '' },
        { dayOfWeek: 'Saturday', workoutType: 'Biceps', planDayId: '' },
        { dayOfWeek: 'Sunday', workoutType: 'Rest', planDayId: '' },
      ];
    } else {
      sortedDays = [...allDays].sort((a, b) => {
        const aVal = dayOrderMap[(a.dayOfWeek || '').toLowerCase()] || 8;
        const bVal = dayOrderMap[(b.dayOfWeek || '').toLowerCase()] || 8;
        return aVal - bVal;
      });
    }

    return sortedDays.map((d: any) => ({
      name: (d.dayOfWeek || '').substring(0, 3).toUpperCase(),
      label: d.workoutType === 'Rest' && !d.exercises?.length ? 'Rest' : (d.workoutType || 'Custom').split(' ')[0],
      active: d.planDayId ? d.planDayId === activeDayId : false,
      planDayId: d.planDayId,
      isToday: (d.dayOfWeek || '').toLowerCase() === todayStr
    }));
  }, [allDays, activeDayId]);

  const isLoading = isLoadingDay || isLoadingExercises || isLoadingAllDays;
  const isRestDay = dayData?.workoutType?.toLowerCase() === 'rest' && exercises.length === 0;
  const isActiveDayToday = daysList.find(d => d.active)?.isToday;


  const placeholderExercises = [
    { name: 'Flat Barbell Bench Press', sets: '4 sets', reps: '8-10 reps', image: { uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop' } },
    { name: 'Incline Dumbbell Flyes', sets: '3 sets', reps: '12 reps', image: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' } },
    { name: 'Chest Press Machine', sets: '3 sets', reps: '10 reps', image: { uri: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=200&auto=format&fit=crop' } },
    { name: 'Pushups', sets: '3 sets', reps: 'to failure', image: { uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop' } },
    { name: 'Cable Crossovers', sets: '3 sets', reps: '15 reps', image: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' } },
  ];

  return (
    <View className="flex-1 bg-[#0A0A0A] pt-12 pb-28 px-4">
      <View className="flex-row items-center mb-6">
        <Pressable onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-white text-xl font-semibold">Weekly Workout Plan</Text>
          {/* <View className="flex-row items-center mt-1">
            <Text className="text-[#8E8E8E] text-xs mr-1">11 – 17 May, 2025</Text>
            <CaretDown size={12} color="#8E8E8E" />
          </View> */}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <View className="flex-row gap-2">
            {daysList.map((d, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  if (d.planDayId) setActiveDayId(d.planDayId);
                }}
                className={`items-center justify-center rounded-2xl w-16 h-20 border ${isLoadingAllDays ? 'bg-[#18181B] border-[#262626] animate-pulse' : d.active ? 'bg-[#DFFF00] border-[#DFFF00]' : d.isToday ? 'bg-[#2A2F0A] border-[#DFFF00]' : 'bg-[#18181B] border-[#262626]'}`}
              >
                {isLoadingAllDays ? (
                  <>
                    <View className="w-6 h-3 bg-[#262626] rounded mb-1" />
                    <View className="w-8 h-4 bg-[#262626] rounded" />
                  </>
                ) : (
                  <>
                    <Text className={`text-[10px] font-semibold mb-1 ${d.active ? 'text-black' : d.isToday ? 'text-[#DFFF00]' : 'text-[#8E8E8E]'}`}>{d.name}</Text>
                    <Text className={`text-xs font-semibold ${d.active ? 'text-black' : d.isToday ? 'text-[#DFFF00]' : 'text-white'}`}>{d.label}</Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {isLoading ? (
          <View className="w-32 h-4 bg-[#262626] rounded animate-pulse mb-3 mt-1" />
        ) : (
          <Text className="text-[#DFFF00] text-xs font-semibold tracking-widest uppercase mb-3 mt-1">
            TODAY • {dayData?.dayOfWeek?.toUpperCase() || 'MONDAY'}
          </Text>
        )}

        <View className="bg-[#18181B] rounded-2xl border border-[#262626] p-4 mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-[#2A2F0A] items-center justify-center mr-4">
              <Barbell size={24} color="#DFFF00" weight="fill" />
            </View>
            <View>
              {isLoading ? (
                <>
                  <View className="w-24 h-6 bg-[#262626] rounded animate-pulse mb-2" />
                  <View className="w-32 h-3 bg-[#262626] rounded animate-pulse mb-2" />
                  <View className="w-32 h-3 bg-[#262626] rounded animate-pulse" />
                </>
              ) : (
                <>
                  <Text className="text-white text-lg font-semibold mb-1">
                    {dayData?.workoutType?.toLowerCase() === 'rest' && exercises.length > 0 ? 'Custom Workout' : (dayData?.workoutType || 'Chest Day')}
                  </Text>
                  <Text className="text-[#8E8E8E] text-xs mb-1">Focus: Pectorals and Triceps</Text>
                  <Text className="text-[#8E8E8E] text-xs flex-row items-center">
                    ⏱ {dayData?.durationMinutes || 50} min  •  📋 {exercises.length || 5} Exercises
                  </Text>
                </>
              )}
            </View>
          </View>
          <Star size={20} color="#DFFF00" weight="fill" />
        </View>

        {isRestDay ? (
          <View className="items-center justify-center py-12 mb-6">
            <Text className="text-[60px] mb-4">🧘</Text>
            <Text className="text-white text-xl font-semibold mb-2">Rest Day</Text>
            <Text className="text-[#8E8E8E] text-sm text-center px-4">Take it easy, allow your muscles to recover and prepare for the next workout.</Text>
          </View>
        ) : (
          <>
            <Text className="text-white text-lg font-semibold mb-4">Exercises</Text>

            <View className="gap-y-3 mb-6">
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <View key={index} className="flex-row items-center bg-[#18181B] rounded-2xl p-3 border border-[#262626] animate-pulse">
                    <View className="w-[50px] h-[50px] rounded-[10px] mr-3 bg-[#262626]" />
                    <View className="w-5 h-5 rounded-full border border-[#262626] bg-[#262626] mr-3" />
                    <View className="flex-1 mr-2">
                      <View className="w-32 h-4 bg-[#262626] rounded mb-2" />
                      <View className="w-20 h-3 bg-[#262626] rounded" />
                    </View>
                    <CaretRight size={16} color="#262626" />
                  </View>
                ))
              ) : (
                (exercises.length > 0 ? exercises : placeholderExercises).map((item, index) => (
                  <Pressable
                    key={index}
                    onPress={() => router.push({
                      pathname: '/(customer)/exercise-detail',
                      params: {
                        dayId: activeDayId,
                        exerciseIndex: index
                      }
                    })}
                    className="flex-row items-center bg-[#18181B] rounded-2xl p-3 border border-[#262626]"
                  >
                    <Image
                      source={item.image || { uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop' }}
                      style={{ width: 50, height: 50, borderRadius: 10, marginRight: 12 }}
                    />
                    <View className="w-5 h-5 rounded-full border border-[#DFFF00] items-center justify-center mr-3">
                      <Text className="text-[#DFFF00] text-[10px] font-semibold">{index + 1}</Text>
                    </View>

                    <View className="flex-1 mr-2">
                      <Text className="text-white text-sm font-semibold mb-1">{item.exerciseName || item.name}</Text>
                      <Text className="text-[#8E8E8E] text-xs">{item.sets || '3 sets'} • {item.reps || '10 reps'}</Text>
                    </View>

                    <CaretRight size={16} color="#555" />
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}

        {isTipVisible && (
          <View className="bg-[#18181B] rounded-xl border border-[#DFFF00] p-4 flex-row items-start mb-6">
            <Lightbulb size={20} color="#DFFF00" weight="fill" style={{ marginRight: 12, marginTop: 2 }} />
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[#DFFF00] font-semibold text-sm">Tip</Text>
                <Pressable onPress={() => setIsTipVisible(false)} hitSlop={10}>
                  <Text className="text-[#555] text-xs">✕</Text>
                </Pressable>
              </View>
              <Text className="text-[#8E8E8E] text-xs leading-5">
                Warm up for 5-10 minutes before starting your workout to prevent injury.
              </Text>
            </View>
          </View>
        )}

        {isActiveDayToday && !isRestDay && (
          <Pressable
            onPress={() => router.push({
              pathname: '/(customer)/workout-countdown',
              params: {
                dayId: activeDayId,
                workoutType: dayData?.workoutType || 'Workout',
                duration: dayData?.durationMinutes || '50',
                exercisesCount: exercises.length
              }
            })}
            className="bg-[#DFFF00] w-full rounded-2xl p-4 flex-row items-center justify-center">
            <Text className="text-black font-semibold text-lg mr-2">Start Workout</Text>
            <ArrowRight size={20} color="black" weight="bold" />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
