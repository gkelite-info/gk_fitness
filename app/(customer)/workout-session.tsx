import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, CaretDown, CaretRight, Lightbulb, ArrowRight, Barbell } from 'phosphor-react-native';
import { Video, ResizeMode } from '@/components/ui/Video';
import { supabase } from '@/lib/supabase';
import { useWorkoutPlanDayById } from '@/hooks/customerWorkouts/useWorkoutPlanDayById';
import { useWorkoutPlanDayExercises } from '@/hooks/customerWorkouts/useWorkoutPlanDayExercises';
import { useWorkoutPlanDays } from '@/hooks/customerWorkouts/useWorkoutPlanDays';
import { useTrainerWorkoutPlanDayById } from '@/hooks/trainerWorkoutPlans/useTrainerWorkoutPlanDayById';
import { useTrainerWorkoutPlanDayExercises } from '@/hooks/trainerWorkoutPlans/useTrainerWorkoutPlanDayExercises';
import { useTrainerWorkoutPlanDays } from '@/hooks/trainerWorkoutPlans/useTrainerWorkoutPlanDays';
import { useCurrentPlanWeek } from '@/hooks/customerWorkouts/useCurrentPlanWeek';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';

export default function WorkoutSession() {
  const { dayId: initialDayId, isTrainer } = useLocalSearchParams<{ dayId: string; isTrainer?: string }>();
  const [activeDayId, setActiveDayId] = useState(initialDayId);
  const [planId, setPlanId] = useState<string | undefined>();
  const [isTipVisible, setIsTipVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (initialDayId) {
      setActiveDayId(initialDayId);
    }
  }, [initialDayId]);

  const userContext = useUser();
  const userId = userContext.userId;
  const { data: customerProfileData } = useCustomerProfile(userId);
  const userGender = customerProfileData?.customerData?.gender?.toLowerCase() || 'all';

  const { data: customerDayData, isLoading: isLoadingCustomerDay, refetch: refetchCustomerDay } = useWorkoutPlanDayById(activeDayId);
  const { data: customerEData, isLoading: isLoadingCustomerEx, refetch: refetchCustomerEx } = useWorkoutPlanDayExercises(activeDayId, userGender);

  const { data: trainerDayData, isLoading: isLoadingTrainerDay, refetch: refetchTrainerDay } = useTrainerWorkoutPlanDayById(activeDayId);
  const { data: trainerEData, isLoading: isLoadingTrainerEx, refetch: refetchTrainerEx } = useTrainerWorkoutPlanDayExercises(activeDayId);

  const isTrainerPlan = isTrainer === 'true' || (!customerDayData && !!trainerDayData);
  const dayData = isTrainerPlan ? trainerDayData : customerDayData;
  const eData = isTrainerPlan ? trainerEData : customerEData;
  const isLoadingDay = isTrainerPlan ? isLoadingTrainerDay : isLoadingCustomerDay;
  const isLoadingExercises = isTrainerPlan ? isLoadingTrainerEx : isLoadingCustomerEx;

  const { currentWeekNumber } = useCurrentPlanWeek();

  useEffect(() => {
    if (dayData?.planId && !planId) {
      setPlanId(dayData.planId);
    }
  }, [dayData?.planId, planId]);

  const { data: customerAllDays, isLoading: isLoadingCustomerAllDays, refetch: refetchCustomerAllDays } = useWorkoutPlanDays(!isTrainerPlan ? (planId || dayData?.planId) : undefined);
  const { data: trainerAllDays, isLoading: isLoadingTrainerAllDays, refetch: refetchTrainerAllDays } = useTrainerWorkoutPlanDays(isTrainerPlan ? (planId || dayData?.planId) : undefined);

  const allDays = isTrainerPlan ? trainerAllDays : customerAllDays;
  const isLoadingAllDays = isTrainerPlan ? isLoadingTrainerAllDays : isLoadingCustomerAllDays;

  const refetchDay = isTrainerPlan ? refetchTrainerDay : refetchCustomerDay;
  const refetchExercises = isTrainerPlan ? refetchTrainerEx : refetchCustomerEx;
  const refetchAllDays = isTrainerPlan ? refetchTrainerAllDays : refetchCustomerAllDays;

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
    if (!eData) return [];
    const checkStretching = (item: any) => {
      if (item.isStretching) return true;
      const cat = (item.category || '').toLowerCase();
      const name = (item.exerciseName || item.name || '').toLowerCase();
      return cat.includes('stretch') || name.includes('stretch') || name.includes('warmup') || name.includes('warm up') || name.includes('mobility');
    };

    return [...eData].sort((a: any, b: any) => {
      const aStretch = checkStretching(a) ? 1 : 0;
      const bStretch = checkStretching(b) ? 1 : 0;
      if (aStretch !== bStretch) return bStretch - aStretch;
      return (a.order || 0) - (b.order || 0);
    });
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
      const targetWeek = dayData?.weekNumber || currentWeekNumber || 1;
      let matchingDays = isTrainerPlan
        ? [...allDays]
        : [...allDays].filter((d: any) => (d.weekNumber || 1) === targetWeek);

      if (!isTrainerPlan && matchingDays.length === 0) {
        matchingDays = [...allDays].filter((d: any) => (d.weekNumber || 1) === 1);
      }
      if (matchingDays.length === 0) {
        matchingDays = [...allDays];
      }

      sortedDays = matchingDays.sort((a, b) => {
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
  }, [allDays, activeDayId, dayData?.weekNumber, currentWeekNumber, isTrainerPlan]);

  const isLoading = isLoadingDay || isLoadingExercises || isLoadingAllDays;
  const isRestDay = dayData?.workoutType?.toLowerCase() === 'rest' && exercises.length === 0;
  const activeDayInList = daysList.find(d => d.active);
  const isActiveDayToday = activeDayInList ? activeDayInList.isToday : (dayData?.dayOfWeek?.toLowerCase() === new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());


  const placeholderExercises = [
    { name: 'Flat Barbell Bench Press', sets: '4 sets', reps: '8-10 reps', image: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' } },
    { name: 'Incline Dumbbell Flyes', sets: '3 sets', reps: '12 reps', image: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' } },
    { name: 'Chest Press Machine', sets: '3 sets', reps: '10 reps', image: { uri: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=200&auto=format&fit=crop' } },
    { name: 'Pushups', sets: '3 sets', reps: 'to failure', image: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' } },
    { name: 'Cable Crossovers', sets: '3 sets', reps: '15 reps', image: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' } },
  ];

  const getVideoUrlFromItem = (item: any) => {
    if (!item) return null;
    if (item.videoUrl) return item.videoUrl;
    if (item.workout_videos) {
      let wv = null;
      if (Array.isArray(item.workout_videos)) {
        wv = item.workout_videos.find((v: any) => v.gender?.toLowerCase() === userGender);
        if (!wv) {
          wv = item.workout_videos.find((v: any) => !v.gender || v.gender?.toLowerCase() === 'all' || v.gender === '');
        }
        if (!wv && item.workout_videos.length > 0) {
          wv = item.workout_videos[0];
        }
      } else {
        wv = item.workout_videos;
      }
      if (wv?.videoUrl) return wv.videoUrl;
    }
    const imgCandidate = item.image || item.imageUrl;
    const imgStr = typeof imgCandidate === 'string' ? imgCandidate : (typeof imgCandidate === 'object' && imgCandidate?.uri ? imgCandidate.uri : null);
    if (imgStr && typeof imgStr === 'string') {
      const lower = imgStr.toLowerCase();
      if (lower.includes('workout-videos') || lower.match(/\.(mp4|mov|webm|gif)(\?.*)?$/i)) {
        return imgStr;
      }
    }
    return null;
  };

  const getFullVideoUrl = (rawUrl?: any) => {
    if (!rawUrl) return null;
    let url = typeof rawUrl === 'object' && rawUrl?.uri ? rawUrl.uri : (typeof rawUrl === 'string' ? rawUrl : null);
    if (!url) return null;
    url = url.trim();
    if (!url) return null;

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('data:')) {
      return url;
    }
    return supabase.storage.from('workout-videos').getPublicUrl(url).data.publicUrl;
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pt-12 px-4">
      <View className="flex-row items-center mb-6">
        <Pressable onPress={() => router.push('/(customer)/home')} className="mr-4">
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
        contentContainerStyle={{ paddingBottom: 100 }}
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
                className={`items-center justify-center rounded-2xl w-16 h-20 border ${isLoadingAllDays ? 'bg-[#18181B] border-[#262626]' : d.active ? 'bg-[#DFFF00] border-[#DFFF00]' : d.isToday ? 'bg-[#2A2F0A] border-[#DFFF00]' : 'bg-[#18181B] border-[#262626]'}`}
              >
                {isLoadingAllDays ? (
                  <>
                    <View className="w-6 h-3 bg-[#262626] rounded mb-1" />
                    <View className="w-8 h-4 bg-[#262626] rounded" />
                  </>
                ) : (
                  <>
                    <Text className={`text-[10px] font-semibold mb-1 ${d.active ? 'text-black' : d.isToday ? 'text-[#DFFF00]' : 'text-[#8E8E8E]'}`}>{d.name}</Text>
                    <Text className={`text-xs font-semibold ${d.active ? 'text-black' : d.isToday ? 'text-[#DFFF00]' : 'text-white'}`}>
                      {d.label ? d.label.charAt(0).toUpperCase() + d.label.slice(1) : ''}
                    </Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {isLoading ? (
          <View className="w-32 h-4 bg-[#262626] rounded mb-3 mt-1" />
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
                  <View className="w-24 h-6 bg-[#262626] rounded mb-2" />
                  <View className="w-32 h-3 bg-[#262626] rounded mb-2" />
                  <View className="w-32 h-3 bg-[#262626] rounded" />
                </>
              ) : (
                <>
                  <Text className="text-white text-lg font-semibold mb-1">
                    {(() => {
                      const text = dayData?.workoutType?.toLowerCase() === 'rest' && exercises.length > 0 ? 'Custom Workout' : (dayData?.workoutType || 'Chest Day');
                      return text.charAt(0).toUpperCase() + text.slice(1);
                    })()}
                  </Text>
                  <Text className="text-[#8E8E8E] text-xs mb-1">
                    Focus: {dayData?.workoutType ? `${dayData.workoutType.charAt(0).toUpperCase() + dayData.workoutType.slice(1)} Target` : 'General Fitness'}
                  </Text>
                  <Text className="text-[#8E8E8E] text-xs flex-row items-center">
                    ⏱ {dayData?.durationMinutes || 45} min  •  📋 {exercises.length} Exercises
                  </Text>
                </>
              )}
            </View>
          </View>
          <Star size={20} color="#DFFF00" weight="fill" />
        </View>

        {/* Rest Day view */}
        {isRestDay ? (
          <View className="bg-[#18181B] rounded-3xl p-6 border border-[#262626] items-center text-center my-4">
            <View className="w-16 h-16 rounded-full bg-[#242A00] items-center justify-center mb-4">
              <Barbell size={32} color="#DFFF00" />
            </View>
            <Text className="text-white text-xl font-bold mb-2">Rest & Recovery Day</Text>
            <Text className="text-[#8E8E8E] text-center text-sm mb-4">
              No exercises planned for today. Take time to rest, hydrate, and stretch.
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-white text-lg font-semibold mb-4">Exercises</Text>

            <View className="gap-y-3 mb-6">
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <View key={index} className="flex-row items-center bg-[#18181B] rounded-2xl p-3 border border-[#262626]">
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
                (exercises.length > 0 ? exercises : placeholderExercises).map((item, index) => {
                  const rawVideoUrl = getVideoUrlFromItem(item);
                  const fullVideoUrl = getFullVideoUrl(rawVideoUrl);
                  const isGif = fullVideoUrl ? (fullVideoUrl.toLowerCase().includes('.gif') || fullVideoUrl.toLowerCase().includes('format=gif')) : false;

                  return (
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
                      {fullVideoUrl ? (
                        isGif ? (
                          <Image
                            source={{ uri: fullVideoUrl }}
                            style={{ width: 50, height: 50, borderRadius: 10, marginRight: 12 }}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={{ width: 50, height: 50, borderRadius: 10, marginRight: 12, overflow: 'hidden' }}>
                            <Video
                              source={{ uri: fullVideoUrl }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode={ResizeMode.COVER}
                              shouldPlay
                              isLooping
                              isMuted
                            />
                          </View>
                        )
                      ) : (
                        <Image
                          source={typeof item.image === 'string' && item.image && !item.image.includes('1571019614242') ? { uri: item.image } : (item.image && typeof item.image === 'object' && item.image.uri ? item.image : { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' })}
                          style={{ width: 50, height: 50, borderRadius: 10, marginRight: 12 }}
                        />
                      )}
                      <View className="w-5 h-5 rounded-full border border-[#DFFF00] items-center justify-center mr-3">
                        <Text className="text-[#DFFF00] text-[10px] font-semibold">{index + 1}</Text>
                      </View>

                      <View className="flex-1 mr-2">
                        <Text className="text-white text-base font-semibold mb-0.5">
                          {(() => {
                            const name = item.exerciseName || item.name || '';
                            return name.charAt(0).toUpperCase() + name.slice(1);
                          })()}
                        </Text>
                        <Text className="text-[#8E8E8E] text-xs">{item.category}</Text>
                      </View>

                      <CaretRight size={16} color="#555" />
                    </Pressable>
                  )
                })
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
              pathname: '/(customer)/exercise-detail',
              params: {
                dayId: activeDayId,
                exerciseIndex: 0
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

