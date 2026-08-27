import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, ActivityIndicator, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretLeft, Trash, MagnifyingGlass, Plus, Clock, Barbell, ArrowsClockwise } from 'phosphor-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';
import { useCustomerWeeklyPlan } from '@/hooks/customerWorkouts/useCustomerWeeklyPlan';
import { useWorkoutPlanDayById } from '@/hooks/customerWorkouts/useWorkoutPlanDayById';
import { useWorkoutPlanDayExercises } from '@/hooks/customerWorkouts/useWorkoutPlanDayExercises';
import { useSaveWorkoutDayExercises, useMakeRestDay } from '@/hooks/customerWorkouts/useMutateCustomerWorkoutPlan';
import { useWorkoutVideos } from '@/hooks/workoutVideos/useWorkoutVideos';
import { supabase } from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useQueryClient } from '@tanstack/react-query';

export default function EditWorkoutDay() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const { userId } = useUser();
  const [dayInfo, setDayInfo] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ index: number, ex: any } | null>(null);
  const [restModalVisible, setRestModalVisible] = useState(false);
  const [isMakingRest, setIsMakingRest] = useState(false);

  const isUUID = day ? day.includes('-') : false;

  const { data: dayById, isLoading: isLoadingDayById } = useWorkoutPlanDayById(isUUID ? day : null);
  const { data: weeklyPlan, isLoading: isLoadingWeeklyPlan } = useCustomerWeeklyPlan(!isUUID ? userId : null);

  const dayData = isUUID ? dayById : (weeklyPlan ? weeklyPlan[day] : null);
  const dayStr = isUUID && dayById ? dayById.dayOfWeek : day;
  const currentPlanDayId = isUUID ? day : (dayData?.planDayId || null);

  const { data: fetchedExercises, isLoading: isLoadingExercises, refetch: refetchExercises } = useWorkoutPlanDayExercises(currentPlanDayId);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [accumulatedSuggestions, setAccumulatedSuggestions] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentWorkoutType = dayData?.workoutType || 'all';
  const { data: globalVideosData, isFetching: isFetchingSuggestions, refetch: refetchSuggestions } = useWorkoutVideos(page, limit, currentWorkoutType);

  const queryClient = useQueryClient();

  const onRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    await Promise.all([
      refetchExercises(),
      refetchSuggestions(),
      queryClient.invalidateQueries({ queryKey: ['workoutPlanDay', currentPlanDayId] }),
      queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan', userId] })
    ]);
    setIsRefreshing(false);
  };

  const total = globalVideosData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    if (globalVideosData?.data) {
      if (page === 1) {
        setAccumulatedSuggestions(globalVideosData.data);
      } else {
        setAccumulatedSuggestions((prev) => {
          const prevIds = new Set(prev.map((e) => e.workoutVideoId));
          const newUnique = globalVideosData.data.filter((e: any) => !prevIds.has(e.workoutVideoId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [globalVideosData, page]);

  const saveExercisesMutation = useSaveWorkoutDayExercises();
  const makeRestMutation = useMakeRestDay();

  const isLoading = isLoadingDayById || isLoadingWeeklyPlan || isLoadingExercises;

  useEffect(() => {
    if (fetchedExercises) {
      setExercises(fetchedExercises);
    }
  }, [fetchedExercises]);

  useEffect(() => {
    if (dayStr) {
      const current = new Date();
      const currentDayOfWeek = current.getDay();
      const diff = current.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
      const monday = new Date(current.setDate(diff));

      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayIndex = dayOrder.indexOf(dayStr.toLowerCase());
      const targetDate = new Date(monday);
      if (dayIndex !== -1) {
        targetDate.setDate(monday.getDate() + dayIndex);
      }

      setDayInfo({
        name: dayStr.charAt(0).toUpperCase() + dayStr.slice(1),
        abbr: dayStr.substring(0, 3).toUpperCase(),
        dateStr: targetDate.getDate().toString().padStart(2, '0'),
        type: dayData && dayData.workoutType !== 'Rest' ? dayData.workoutType : 'Rest Day',
        duration: dayData?.durationMinutes || 0
      });
    }
  }, [dayStr, dayData]);

  const handleAddExercise = (ex: any) => {
    if (exercises.some(e => e.exerciseName === ex.exerciseName)) return;

    setExercises(prev => [...prev, {
      exerciseName: ex.exerciseName || 'Exercise',
      category: 'General',
      reps: '10 - 12 reps',
      order: prev.length + 1,
      image: null,
      videoUrl: ex.videoUrl,
      workoutVideoId: ex.workoutVideoId,
      isNew: true
    }]);
  };

  const openDeleteModal = (index: number, ex: any) => {
    setExerciseToDelete({ index, ex });
    setDeleteModalVisible(true);
  };

  const confirmDeleteExercise = () => {
    if (exerciseToDelete) {
      const { index, ex } = exerciseToDelete;
      if (ex.dayExerciseId) {
        setDeletedExerciseIds(prev => [...prev, ex.dayExerciseId]);
      }
      const newExs = [...exercises];
      newExs.splice(index, 1);
      setExercises(newExs);
    }
    setDeleteModalVisible(false);
    setExerciseToDelete(null);
  };

  const handleSave = () => {
    if (!currentPlanDayId) return;

    const newExs = exercises.filter(ex => ex.isNew);

    saveExercisesMutation.mutate({
      deletedExerciseIds,
      newExercises: newExs,
      currentPlanDayId
    }, {
      onSuccess: () => {
        setDeletedExerciseIds([]);
        toast.success('Day updated successfully!');
        router.back();
      },
      onError: (err) => {
        toast.error('Failed to save exercises');
      }
    });
  };

  const confirmMakeRestDay = () => {
    if (!currentPlanDayId || !dayData) return;

    makeRestMutation.mutate({ planDayId: currentPlanDayId, planId: dayData.planId, dayOfWeek: dayData.dayOfWeek }, {
      onSuccess: () => {
        setRestModalVisible(false);
        toast.success('Marked as Rest Day!');
        router.back();
      },
      onError: () => {
        setRestModalVisible(false);
        toast.error('Failed to mark as Rest Day');
      }
    });
  };

  const hasMore = page < totalPages;

  const renderFooter = () => {
    if (isFetchingSuggestions && page > 1) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#D7FF00" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View className="py-4 items-center">
          <Pressable
            onPress={() => setPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#141414] border border-[#242424] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#D7FF00" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedSuggestions.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#666666] text-xs font-sans">End of suggestions</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-12 pb-20">
      <View className="flex-row items-center mb-8">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#111111] border border-[#242424] rounded-full items-center justify-center mr-4"
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
        <FlatList
          data={accumulatedSuggestions.filter(ex =>
            !exercises.some(e => e.exerciseName === ex.exerciseName) &&
            (ex.exerciseName || '').toLowerCase().includes(searchQuery.toLowerCase())
          )}
          keyExtractor={(item) => item.workoutVideoId || Math.random().toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={
            <CustomRefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
            />
          }
          ListHeaderComponent={
            <>
              <View className="flex-row bg-[#111111] border border-[#242424] rounded-3xl p-4 items-center mb-8">
                <View className="w-[70px] h-[85px] rounded-2xl bg-[#D7FF00] items-center justify-center mr-5">
                  <Text className="text-black text-xs font-semibold tracking-wider mb-1">{dayInfo?.abbr}</Text>
                  <Text className="text-black text-3xl font-black">{dayInfo?.dateStr}</Text>
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
                    <Text className="text-[#8E8E8E] text-sm text-center py-5">No exercises added for this day yet.</Text>
                  ) : (
                    exercises.map((ex, index) => {
                      const fullVideoUrl = ((url?: string | null) => {
                        if (!url) return null;
                        if (url.startsWith('http://') || url.startsWith('https://')) return url;
                        return supabase.storage.from('workout-videos').getPublicUrl(url).data.publicUrl;
                      })(ex.videoUrl);

                      return (
                        <View
                          key={ex.dayExerciseId || index.toString()}
                          className="flex-row bg-[#111111] border border-[#242424] rounded-2xl p-4 items-center"
                        >
                          {fullVideoUrl ? (
                            fullVideoUrl.toLowerCase().endsWith('.gif') ? (
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
                              source={typeof ex.image === 'string' && ex.image ? { uri: ex.image } : (ex.image || { uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop' })}
                              style={{ width: 50, height: 50, borderRadius: 10, marginRight: 12 }}
                            />
                          )}
                          <View className="w-5 h-5 rounded-full border border-[#D7FF00] items-center justify-center mr-3">
                            <Text className="text-[#D7FF00] text-[10px] font-semibold">{index + 1}</Text>
                          </View>
                          <View className="flex-1 pr-2">
                            <Text className="text-white text-base font-semibold mb-1">{ex.exerciseName}</Text>
                            {/* <Text className="text-[#8E8E8E] text-[10px]">{ex.category}</Text> */}
                          </View>
                          {/* <View className="items-end mr-4">
                          <Text className="text-[#D7FF00] text-[11px] font-semibold mb-1">{ex.reps}</Text>
                        </View> */}
                          <Pressable onPress={() => openDeleteModal(index, ex)} className="p-1">
                            <Trash size={20} color="#FF453A" />
                          </Pressable>
                        </View>
                      )
                    })
                  )}
                </View>
              </View>

              <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-widest mb-4 uppercase">
                Add More Exercises
              </Text>

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
            </>
          }
          ListFooterComponent={
            <>
              {renderFooter()}
              <View className="mt-8 mb-4">
                <Pressable
                  onPress={handleSave}
                  disabled={isSaving || (!exercises.some(e => e.isNew) && deletedExerciseIds.length === 0)}
                  className={`w-full py-4 rounded-2xl items-center justify-center ${isSaving || (!exercises.some(e => e.isNew) && deletedExerciseIds.length === 0)
                    ? 'bg-[#D7FF00]/50'
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
                  onPress={() => setRestModalVisible(true)}
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
            </>
          }
          renderItem={({ item: ex }) => {
            const fullVideoUrl = ((url?: string | null) => {
              if (!url) return null;
              if (url.startsWith('http://') || url.startsWith('https://')) return url;
              return supabase.storage.from('workout-videos').getPublicUrl(url).data.publicUrl;
            })(ex.videoUrl);

            return (
              <View className="w-[48%] bg-[#111111] border border-[#242424] rounded-3xl overflow-hidden">
                {fullVideoUrl ? (
                  fullVideoUrl.toLowerCase().endsWith('.gif') ? (
                    <Image
                      source={{ uri: fullVideoUrl }}
                      className="w-full h-32"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-32 overflow-hidden bg-black">
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
                    source={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop' }}
                    className="w-full h-32"
                    resizeMode="cover"
                  />
                )}
                <View className="p-4">
                  <Text numberOfLines={1} className="text-white text-sm font-semibold mb-1">{ex.exerciseName || 'Exercise'}</Text>
                  <Pressable
                    onPress={() => handleAddExercise(ex)}
                    className="w-8 h-8 bg-[#D7FF00] rounded-full items-center justify-center self-end active:opacity-70 mt-2"
                  >
                    <Plus size={16} color="#000" weight="bold" />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <ConfirmModal
        visible={deleteModalVisible}
        title="Remove Exercise?"
        description={`Are you sure you want to delete ${exerciseToDelete?.ex?.exerciseName}?`}
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
