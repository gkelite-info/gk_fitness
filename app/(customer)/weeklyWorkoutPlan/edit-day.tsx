import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretLeft, Trash, MagnifyingGlass, Plus, Clock, Barbell, ArrowsClockwise } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useUserById } from '@/hooks/users';
import { toast } from '@/lib/toast';
import { useCustomerWeeklyPlan } from '@/hooks/customerWorkouts/useCustomerWeeklyPlan';
import { useWorkoutPlanDayById } from '@/hooks/customerWorkouts/useWorkoutPlanDayById';
import { useWorkoutPlanDayExercises } from '@/hooks/customerWorkouts/useWorkoutPlanDayExercises';
import { useSaveWorkoutDayExercises, useMakeRestDay } from '@/hooks/customerWorkouts/useMutateCustomerWorkoutPlan';
import { useWorkoutVideos } from '@/hooks/workoutVideos/useWorkoutVideos';
import { useWorkoutPlanTargetExercises } from '@/hooks/customerWorkouts/useWorkoutPlanTargetExercises';
import { ExerciseMediaPlayer } from '@/components/workout/ExerciseMediaPlayer';
import ConfirmModal from '@/components/ConfirmModal';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useQueryClient } from '@tanstack/react-query';

const SUGGESTIONS_PAGE_SIZE = 5;
const VALID_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function EditWorkoutDay() {
  const { day, dayName, weekNumber } = useLocalSearchParams<{ day: string; dayName?: string; weekNumber?: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const { userId, gender, role } = useUser();
  const { data: customerProfileData } = useCustomerProfile(userId);
  const { data: userRecord } = useUserById(userId);

  const userGender = useMemo<'male' | 'female'>(() => {
    const raw = (
      (role === 'customer' ? customerProfileData?.customerData?.gender : null) ||
      gender ||
      userRecord?.gender ||
      customerProfileData?.customerData?.gender ||
      'male'
    ).toString().trim().toLowerCase();
    return raw.includes('female') ? 'female' : 'male';
  }, [role, gender, userRecord?.gender, customerProfileData?.customerData?.gender]);

  const [dayInfo, setDayInfo] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ index: number; ex: any } | null>(null);
  const [restModalVisible, setRestModalVisible] = useState(false);
  const [isMakingRest, setIsMakingRest] = useState(false);
  const [visibleCount, setVisibleCount] = useState(SUGGESTIONS_PAGE_SIZE);
  const [playingVideoKey, setPlayingVideoKey] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const trimmedDayParam = (day || '').toString().trim();
  const isWeekdayParam = Boolean(trimmedDayParam && VALID_WEEKDAYS.includes(trimmedDayParam.toLowerCase()));
  const isPlanDayIdParam = Boolean(trimmedDayParam && !isWeekdayParam);

  const { data: dayById, isLoading: isLoadingDayById } = useWorkoutPlanDayById(isPlanDayIdParam ? trimmedDayParam : null);
  const { data: weeklyPlan, isLoading: isLoadingWeeklyPlan } = useCustomerWeeklyPlan(!isPlanDayIdParam ? userId : null);

  const parsedWeek = weekNumber ? parseInt(weekNumber, 10) : 1;
  const weekdayKeyCapitalized = trimmedDayParam
    ? trimmedDayParam.charAt(0).toUpperCase() + trimmedDayParam.slice(1).toLowerCase()
    : '';
  const weekDaysMap = weeklyPlan?.[parsedWeek];
  const dayData = isPlanDayIdParam
    ? dayById
    : (weekDaysMap?.[trimmedDayParam] || weekDaysMap?.[weekdayKeyCapitalized] || weekDaysMap?.[trimmedDayParam.toLowerCase()] || null);

  const trimmedDayNameParam = (dayName || '').toString().trim();
  const dayStr = useMemo(() => {
    if (dayById?.dayOfWeek && VALID_WEEKDAYS.includes(String(dayById.dayOfWeek).trim().toLowerCase())) {
      return String(dayById.dayOfWeek).trim();
    }
    if (dayData?.dayOfWeek && VALID_WEEKDAYS.includes(String(dayData.dayOfWeek).trim().toLowerCase())) {
      return String(dayData.dayOfWeek).trim();
    }
    if (trimmedDayNameParam && VALID_WEEKDAYS.includes(trimmedDayNameParam.toLowerCase())) {
      return trimmedDayNameParam;
    }
    if (isWeekdayParam) {
      return trimmedDayParam;
    }
    return '';
  }, [dayById?.dayOfWeek, dayData?.dayOfWeek, trimmedDayNameParam, isWeekdayParam, trimmedDayParam]);

  const currentPlanDayId = isPlanDayIdParam ? trimmedDayParam : (dayData?.planDayId || null);

  const { data: fetchedExercises, isLoading: isLoadingExercises, refetch: refetchExercises } = useWorkoutPlanDayExercises(currentPlanDayId, userGender);

  const rawWorkoutType = (dayData?.workoutType || '').toString().trim();
  const normalizedWorkoutType = rawWorkoutType.toLowerCase();
  const isSpecificMuscleDay = Boolean(
    normalizedWorkoutType &&
    normalizedWorkoutType !== 'all' &&
    normalizedWorkoutType !== 'rest'
  );

  // Fetch ALL exercises matching this workout day's muscle group & gender
  const {
    data: targetMuscleExercises = [],
    isLoading: isLoadingTargetExercises,
    isFetching: isFetchingTargetExercises,
    refetch: refetchTargetExercises,
  } = useWorkoutPlanTargetExercises(
    isSpecificMuscleDay ? normalizedWorkoutType : '',
    userGender
  );

  // Fallback for "Rest" / "All" days so the user still gets the full catalog
  const {
    data: allVideosData,
    isLoading: isLoadingAllVideos,
    isFetching: isFetchingAllVideos,
    refetch: refetchAllVideos,
  } = useWorkoutVideos(
    1,
    250,
    'all',
    userGender,
    'all',
    '',
    { enabled: Boolean(dayData) && !isSpecificMuscleDay }
  );

  const queryClient = useQueryClient();

  const onRefresh = async () => {
    setIsRefreshing(true);
    setVisibleCount(SUGGESTIONS_PAGE_SIZE);
    await Promise.all([
      refetchExercises(),
      isSpecificMuscleDay ? refetchTargetExercises() : refetchAllVideos(),
      queryClient.invalidateQueries({ queryKey: ['workoutPlanDay', currentPlanDayId] }),
      queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan', userId] }),
    ]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    setVisibleCount(SUGGESTIONS_PAGE_SIZE);
  }, [currentPlanDayId, normalizedWorkoutType, searchQuery]);

  const saveExercisesMutation = useSaveWorkoutDayExercises();
  const makeRestMutation = useMakeRestDay();

  const isLoading = isLoadingDayById || isLoadingWeeklyPlan || isLoadingExercises;
  const isLoadingSuggestions = isSpecificMuscleDay
    ? (isLoadingTargetExercises || isFetchingTargetExercises)
    : (isLoadingAllVideos || isFetchingAllVideos);

  useEffect(() => {
    if (fetchedExercises) {
      setExercises(fetchedExercises);
    }
  }, [fetchedExercises]);

  useEffect(() => {
    if (!dayStr) {
      setDayInfo(null);
      return;
    }

    const current = new Date();
    const currentDayOfWeek = current.getDay();
    const diff = current.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    const dayIndex = VALID_WEEKDAYS.indexOf(dayStr.toLowerCase());
    const targetDate = new Date(monday);
    if (dayIndex !== -1) {
      targetDate.setDate(monday.getDate() + dayIndex);
    }

    const formattedDay = dayStr.charAt(0).toUpperCase() + dayStr.slice(1).toLowerCase();
    const hasWorkoutType = Boolean(dayData?.workoutType && String(dayData.workoutType).trim().toLowerCase() !== 'rest');

    setDayInfo({
      name: formattedDay,
      abbr: dayStr.substring(0, 3).toUpperCase(),
      dateStr: targetDate.getDate().toString().padStart(2, '0'),
      type: hasWorkoutType ? dayData.workoutType : 'Rest Day',
      duration: dayData?.durationMinutes || 0
    });
  }, [dayStr, dayData]);

  const handleTogglePlay = useCallback((key: string) => {
    setPlayingVideoKey((prev) => (prev === key ? null : key));
  }, []);

  const handleAddExercise = (ex: any) => {
    const targetName = (ex.exerciseName || '').trim().toLowerCase();
    if (exercises.some(e => (e.exerciseName || '').trim().toLowerCase() === targetName)) return;

    setExercises(prev => [...prev, {
      exerciseName: ex.exerciseName || 'Exercise',
      category: 'General',
      sets: 3,
      reps: '10',
      order: prev.length + 1,
      image: null,
      videoUrl: ex.videoUrl,
      workoutVideoId: ex.workoutVideoId,
      isNew: true
    }]);
  };

  const openDeleteModal = (index: number, ex: any) => {
    setPlayingVideoKey(null);
    setExerciseToDelete({ index, ex });
    setDeleteModalVisible(true);
  };

  const confirmDeleteExercise = () => {
    if (exerciseToDelete) {
      const { index, ex } = exerciseToDelete;
      if (ex.dayExerciseId) {
        setDeletedExerciseIds(prev => (
          prev.includes(ex.dayExerciseId) ? prev : [...prev, ex.dayExerciseId]
        ));
      }
      setExercises((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
    }
    setDeleteModalVisible(false);
    setExerciseToDelete(null);
  };

  const hasNoExercises = exercises.length === 0;
  const hasUnsavedChanges = exercises.some(e => e.isNew) || deletedExerciseIds.length > 0;
  const isSaveDisabled = isSaving || hasNoExercises || !hasUnsavedChanges;

  const handleSave = async () => {
    if (!currentPlanDayId || isSaving) return;
    if (exercises.length === 0) {
      toast.error('Please select at least 1 exercise to save changes.');
      return;
    }

    try {
      setIsSaving(true);
      await saveExercisesMutation.mutateAsync({
        deletedExerciseIds,
        exercises: exercises,
        currentPlanDayId
      });
      setDeletedExerciseIds([]);
      toast.success('Day updated successfully!');
      router.back();
    } catch (err) {
      toast.error('Failed to save exercises');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmMakeRestDay = async () => {
    if (!currentPlanDayId || !dayData || isMakingRest) return;

    try {
      setIsMakingRest(true);
      await makeRestMutation.mutateAsync({ planDayId: currentPlanDayId, planId: dayData.planId, dayOfWeek: dayData.dayOfWeek });
      setRestModalVisible(false);
      toast.success('Marked as Rest Day!');
      router.back();
    } catch (err) {
      setRestModalVisible(false);
      toast.error('Failed to mark as Rest Day');
    } finally {
      setIsMakingRest(false);
    }
  };

  const allSuggestionsForDay = useMemo(() => {
    const rawList = isSpecificMuscleDay
      ? targetMuscleExercises
      : (allVideosData?.data || []);

    const seenNames = new Set<string>();
    const deduped: any[] = [];
    for (const item of rawList) {
      const nameKey = (item.exerciseName || '').trim().toLowerCase();
      if (!nameKey || seenNames.has(nameKey)) continue;
      seenNames.add(nameKey);
      deduped.push(item);
    }
    return deduped;
  }, [isSpecificMuscleDay, targetMuscleExercises, allVideosData?.data]);

  const plannedExerciseNames = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exercises) {
      const nameKey = (ex.exerciseName || '').trim().toLowerCase();
      if (nameKey) set.add(nameKey);
    }
    return set;
  }, [exercises]);

  const filteredSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allSuggestionsForDay.filter((ex) => {
      const nameKey = (ex.exerciseName || '').trim().toLowerCase();
      if (plannedExerciseNames.has(nameKey)) return false;
      if (query && !nameKey.includes(query)) return false;
      return true;
    });
  }, [allSuggestionsForDay, plannedExerciseNames, searchQuery]);

  const visibleSuggestions = useMemo(
    () => filteredSuggestions.slice(0, visibleCount),
    [filteredSuggestions, visibleCount]
  );

  const hasMore = visibleCount < filteredSuggestions.length;
  const remainingCount = Math.max(0, filteredSuggestions.length - visibleCount);

  const renderSuggestionsFooter = () => {
    if (isLoadingSuggestions && filteredSuggestions.length === 0) {
      return (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color="#D7FF00" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View className="py-4 items-center">
          <Pressable
            onPress={() => setVisibleCount((prev) => prev + SUGGESTIONS_PAGE_SIZE)}
            className="flex-row items-center gap-x-2 bg-[#141414] border border-[#242424] px-5 py-3 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#D7FF00" />
            <Text className="text-white text-sm font-semibold">
              Load More ({remainingCount} left)
            </Text>
          </Pressable>
        </View>
      );
    }
    if (filteredSuggestions.length === 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#666666] text-xs font-sans">
            {searchQuery.trim() ? 'No matching exercises found' : 'All exercises for this workout are already in your plan'}
          </Text>
        </View>
      );
    }
    return (
      <View className="py-6 items-center">
        <Text className="text-[#666666] text-xs font-sans">End of suggestions</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-3 pb-20">
      <View className="flex-row items-center mb-5">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#111111] border border-[#242424] rounded-full items-center justify-center mr-3"
        >
          <CaretLeft size={20} color="#fff" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-xl font-semibold">Customize {dayInfo?.name || 'Workout'}</Text>
          <Text className="text-[#8E8E8E] text-xs mt-1">
            Edit your exercises for <Text className="text-[#D7FF00] text-xs">{dayInfo?.type ? dayInfo.type.charAt(0).toUpperCase() + dayInfo.type.slice(1) : 'the day'}.</Text>
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="items-center justify-center pt-20">
          <ActivityIndicator size="large" color="#D7FF00" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <CustomRefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
            />
          }
        >
          <View className="flex-row bg-[#111111] border border-[#242424] rounded-3xl p-4 items-center mb-8">
            <View className="w-[70px] h-[85px] rounded-2xl bg-[#D7FF00] items-center justify-center mr-5">
              <Text className="text-black text-xs font-semibold tracking-wider mb-1">{dayInfo?.abbr}</Text>
              <Text className="text-black text-2xl font-semibold font-sans">{dayInfo?.dateStr}</Text>
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-white text-xl font-semibold mb-2">{dayInfo?.type ? dayInfo.type.charAt(0).toUpperCase() + dayInfo.type.slice(1) : ''}</Text>
              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center">
                  <View className="mr-1.5">
                    <Barbell size={14} color="#8E8E8E" weight="fill" />
                  </View>
                  <Text className="text-[#8E8E8E] text-xs font-medium">{exercises.length} Exs</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="mr-1.5">
                    <Clock size={14} color="#8E8E8E" weight="fill" />
                  </View>
                  <Text className="text-[#8E8E8E] text-xs font-medium">{dayInfo?.duration} Min</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-semibold">Planned Exercises</Text>
              {exercises.length > 0 && (
                <Text className="text-[#8E8E8E] text-xs font-semibold">{exercises.length} Items</Text>
              )}
            </View>

            <View className="gap-3">
              {exercises.length === 0 ? (
                <View className="bg-[#111111] border border-[#FF453A]/40 rounded-2xl px-4 py-5 items-center">
                  <Text className="text-[#FF453A] text-sm font-medium text-center">
                    No exercises selected. Select at least 1 exercise below to save.
                  </Text>
                </View>
              ) : (
                exercises.map((ex, index) => {
                  const mediaKey = `planned-${ex.dayExerciseId || ex.workoutVideoId || ex.exerciseName || index}`;
                  return (
                    <View
                      key={ex.dayExerciseId || `${ex.workoutVideoId || ex.exerciseName}-${index}`}
                      className="flex-row bg-[#111111] border border-[#242424] rounded-2xl p-4 items-center"
                    >
                      <ExerciseMediaPlayer
                        videoUrl={ex.videoUrl}
                        muscleGroup={isSpecificMuscleDay ? rawWorkoutType : (ex.primaryMuscle || rawWorkoutType || dayInfo?.type)}
                        exerciseName={ex.exerciseName}
                        customImage={ex.image}
                        containerClassName="w-[50px] h-[50px] rounded-[10px] mr-3 overflow-hidden bg-black relative border border-[#242424] items-center justify-center"
                        badgeSize="sm"
                        staticImageResizeMode="contain"
                        isPlaying={playingVideoKey === mediaKey && !deleteModalVisible && !restModalVisible}
                        onTogglePlay={() => handleTogglePlay(mediaKey)}
                      />
                      <View className="w-5 h-5 rounded-full border border-[#D7FF00] items-center justify-center mr-3">
                        <Text className="text-[#D7FF00] text-[10px] font-semibold">{index + 1}</Text>
                      </View>
                      <View className="flex-1 pr-2">
                        <Text className="text-white text-base font-semibold mb-1">{ex.exerciseName}</Text>
                      </View>
                      <Pressable
                        onPress={() => openDeleteModal(index, ex)}
                        hitSlop={8}
                        className="p-2"
                      >
                        <Trash size={20} color="#FF453A" />
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-widest uppercase">
              Add More Exercises
            </Text>
            {filteredSuggestions.length > 0 && (
              <Text className="text-[#8E8E8E] text-xs font-medium">
                Showing {visibleSuggestions.length} of {filteredSuggestions.length}
              </Text>
            )}
          </View>

          <View className="flex-row bg-[#111111] border border-[#242424] rounded-2xl px-4 py-3.5 items-center mb-6">
            <MagnifyingGlass size={18} color="#8E8E8E" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor="#8E8E8E"
              className="flex-1 ml-3 text-white text-sm font-sans"
            />
          </View>

          <View className="flex-row flex-wrap justify-between">
            {visibleSuggestions.map((ex, index) => {
              const suggestionKey = `suggestion-${ex.workoutVideoId || ex.exerciseName || index}`;
              return (
                <View
                  key={ex.workoutVideoId || `${ex.exerciseName}-${index}`}
                  className="w-[48%] bg-[#111111] border border-[#242424] rounded-3xl overflow-hidden mb-4"
                >
                  <ExerciseMediaPlayer
                    videoUrl={ex.videoUrl}
                    muscleGroup={isSpecificMuscleDay ? rawWorkoutType : (ex.primaryMuscle || rawWorkoutType)}
                    exerciseName={ex.exerciseName}
                    containerClassName="w-full h-32 overflow-hidden bg-black relative items-center justify-center"
                    badgeSize="lg"
                    staticImageResizeMode="cover"
                    isPlaying={playingVideoKey === suggestionKey && !deleteModalVisible && !restModalVisible}
                    onTogglePlay={() => handleTogglePlay(suggestionKey)}
                  />
                  <View className="p-4">
                    <Text numberOfLines={2} className="text-white text-sm font-semibold mb-1">
                      {ex.exerciseName || 'Exercise'}
                    </Text>
                    <Pressable
                      onPress={() => handleAddExercise(ex)}
                      hitSlop={8}
                      className="w-8 h-8 bg-[#D7FF00] rounded-full items-center justify-center self-end active:opacity-70 mt-2"
                    >
                      <Plus size={16} color="#000" weight="bold" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          {renderSuggestionsFooter()}

          <View className="mt-8 mb-4">
            {hasNoExercises && (
              <View className="mb-3 bg-[#FF453A]/10 border border-[#FF453A]/30 rounded-xl px-4 py-2.5">
                <Text className="text-[#FF453A] text-xs font-medium text-center">
                  Select at least 1 exercise to save changes.
                </Text>
              </View>
            )}
            <Pressable
              onPress={handleSave}
              disabled={isSaveDisabled}
              className={`w-full py-4 rounded-2xl items-center justify-center ${isSaveDisabled
                ? 'bg-[#D7FF00]/40 opacity-60'
                : 'bg-[#D7FF00] active:opacity-80'
                }`}
            >
              {isSaving ? (
                <ActivityIndicator color="black" />
              ) : (
                <Text className="text-black font-semibold text-base">Save Changes</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setPlayingVideoKey(null);
                setRestModalVisible(true);
              }}
              disabled={isMakingRest || dayInfo?.type === 'Rest Day'}
              className={`w-full py-4 mt-3 rounded-2xl items-center justify-center border border-[#333] ${isMakingRest || dayInfo?.type === 'Rest Day'
                ? 'opacity-50'
                : 'active:opacity-70 bg-[#161616]'
                }`}
            >
              {isMakingRest ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Make Rest Day</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}

      <ConfirmModal
        visible={deleteModalVisible}
        title="Remove Exercise?"
        description={`Are you sure you want to remove ${exerciseToDelete?.ex?.exerciseName || 'this exercise'}?`}
        onConfirm={confirmDeleteExercise}
        onClose={() => {
          setDeleteModalVisible(false);
          setExerciseToDelete(null);
        }}
        confirmText="Remove"
        confirmButtonColor="bg-red-500"
        icon={<Trash size={32} color="#EF4444" weight="fill" />}
      />
      <ConfirmModal
        visible={restModalVisible}
        title="Make Rest Day"
        description="Are you sure you want to make this a rest day? All exercises for this day will be removed."
        onConfirm={confirmMakeRestDay}
        onClose={() => setRestModalVisible(false)}
        confirmText="Confirm"
      />
    </View>
  );
}

