import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Plus, Check, MagnifyingGlass, ArrowsClockwise } from 'phosphor-react-native';
import { useWorkoutPlan, ExerciseItem } from './_layout';
import { useWorkoutPlanTargetExercises } from '@/hooks/customerWorkouts/useWorkoutPlanTargetExercises';
import { ExerciseMediaPlayer } from '@/components/workout/ExerciseMediaPlayer';
import { toast } from '@/lib/toast';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useUserById } from '@/hooks/users';

export default function CustomizeWorkout() {
  const { day, muscleGroup, workoutId: paramWorkoutId, gender: paramGender } = useLocalSearchParams<{ day: string; muscleGroup: string; workoutId?: string; gender?: string }>();
  const { planDays, setPlanDays, currentEditingWeek } = useWorkoutPlan();
  const [loading, setLoading] = useState(false);

  const userContext = useUser();
  const userId = userContext.userId;
  const { data: customerProfileData } = useCustomerProfile(userId);
  const { data: userRecord } = useUserById(userId);

  // Directly resolve gender based on user's profile
  const userGender = useMemo<'male' | 'female'>(() => {
    const raw = (
      paramGender ||
      (userContext.role === 'customer' ? customerProfileData?.customerData?.gender : null) ||
      userContext.gender ||
      userRecord?.gender ||
      customerProfileData?.customerData?.gender ||
      'male'
    ).toString().trim().toLowerCase();

    return raw.includes('female') ? 'female' : 'male';
  }, [paramGender, userContext.role, userContext.gender, userRecord?.gender, customerProfileData?.customerData?.gender]);

  const normalizedMuscleGroup = (muscleGroup || 'all').toLowerCase();

  const [displayCount, setDisplayCount] = useState(12);

  const { data: cleanExercises = [], isLoading: isVideosLoading, isFetching } = useWorkoutPlanTargetExercises(
    normalizedMuscleGroup,
    userGender
  );
  const isExercisesLoading = isVideosLoading || (isFetching && cleanExercises.length === 0);

  const visibleExercises = useMemo(() => {
    return cleanExercises.slice(0, displayCount);
  }, [cleanExercises, displayCount]);

  const hasMore = displayCount < cleanExercises.length;

  useEffect(() => {
    setDisplayCount(12);
    setSearchQuery('');
  }, [userGender, normalizedMuscleGroup]);

  const currentPlan = planDays[currentEditingWeek]?.[day || ''];

  const allPresets = useMemo(() => {
    const total = visibleExercises.length;
    const recommendedCutoff = total <= 5 ? Math.max(1, Math.floor(total / 2)) : 5;
    return visibleExercises.map((video: any, index: number) => ({
      name: video.exerciseName || 'Unknown Exercise',
      category: video.category || (muscleGroup ? muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1) : 'Exercise'),
      reps: '10-12 reps',
      isRecommended: index < recommendedCutoff,
      videoUrl: video.videoUrl,
      workoutVideoId: video.workoutVideoId,
    }));
  }, [visibleExercises, muscleGroup]);

  const isSameSavedMuscle = Boolean(
    currentPlan?.workoutType &&
    muscleGroup &&
    currentPlan.workoutType.trim().toLowerCase() === muscleGroup.trim().toLowerCase()
  );

  const [selectedExercises, setSelectedExercises] = useState<ExerciseItem[]>(() => {
    if (isSameSavedMuscle && currentPlan && currentPlan.exercises && currentPlan.exercises.length > 0) {
      return currentPlan.exercises;
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [playingExerciseName, setPlayingExerciseName] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  const handleBack = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setPlayingExerciseName(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/(customer)/workoutPlan/choose-muscle', params: { day } } as any);
    }
  }, [day]);

  const recommendedPresets = useMemo(() => {
    return allPresets.filter(p => p.isRecommended || selectedExercises.some(ex => ex.exerciseName === p.name));
  }, [allPresets, selectedExercises]);

  const otherPresets = useMemo(() => {
    // When user searches, search across ALL clean exercises for this muscle
    const pool = searchQuery ? cleanExercises : visibleExercises;
    const others = pool
      .map((video: any, index: number) => ({
        name: video.exerciseName || 'Unknown Exercise',
        category: video.category || (muscleGroup ? muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1) : 'Exercise'),
        reps: '10-12 reps',
        isRecommended: !searchQuery && index < 5,
        videoUrl: video.videoUrl,
        workoutVideoId: video.workoutVideoId,
      }))
      .filter(p => !p.isRecommended && !selectedExercises.some(ex => ex.exerciseName === p.name));

    if (!searchQuery) return others;
    return others.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 15);
  }, [cleanExercises, visibleExercises, searchQuery, selectedExercises, muscleGroup]);

  const isChecked = (name: string) => {
    return selectedExercises.some(ex => ex.exerciseName === name);
  };

  const updateExerciseDetails = (name: string, field: 'sets' | 'reps', value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setSelectedExercises(prev =>
      prev.map(ex =>
        ex.exerciseName === name ? { ...ex, [field]: field === 'sets' ? (numericValue ? parseInt(numericValue, 10) : undefined) : numericValue } : ex
      )
    );
  };

  const handleToggleRecommended = (name: string, category: string, reps: string, videoUrl: string, workoutVideoId: string) => {
    try {
      if (isChecked(name)) {
        setSelectedExercises(selectedExercises.filter(ex => ex.exerciseName !== name));
      } else {
        setSelectedExercises([
          ...selectedExercises,
          { exerciseName: name, category, reps: '10', sets: 3, videoUrl, workoutVideoId, order: selectedExercises.length }
        ]);
      }
    } catch (error) {
      console.error('[CustomizeWorkout] handleToggleRecommended Error:', error);
    }
  };

  const handleAddOther = (name: string, category: string, reps: string, videoUrl: string, workoutVideoId: string) => {
    try {
      if (!isChecked(name)) {
        setSelectedExercises([
          ...selectedExercises,
          { exerciseName: name, category, reps: '10', sets: 3, videoUrl, workoutVideoId, order: selectedExercises.length }
        ]);
      }
    } catch (error) {
      console.error('[CustomizeWorkout] handleAddOther Error:', error);
    }
  };

  const handleSaveWorkout = () => {
    try {
      if (!day || loading || isExercisesLoading) return;

      if (selectedExercises.length === 0) {
        toast.error('Please select at least one exercise for your workout.');
        return;
      }

      for (const ex of selectedExercises) {
        const hasSets = ex.sets !== undefined && ex.sets !== null && !isNaN(ex.sets) && Number(ex.sets) > 0;
        const hasReps = ex.reps !== undefined && ex.reps !== null && ex.reps.toString().trim() !== '';

        if (!hasSets && !hasReps) {
          toast.error(`Enter Sets and Reps for ${ex.exerciseName}`);
          return;
        }
        if (!hasSets) {
          toast.error(`Enter the Sets for ${ex.exerciseName}`);
          return;
        }
        if (!hasReps) {
          toast.error(`Enter the Reps for ${ex.exerciseName}`);
          return;
        }
      }

      setLoading(true);

      const validParamWorkoutId =
        typeof paramWorkoutId === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramWorkoutId.trim())
          ? paramWorkoutId.trim()
          : null;

      setPlanDays(prev => {
        const weekData = prev[currentEditingWeek] || {};
        const existingDay = weekData[day];
        const keepsSameMuscle = Boolean(
          existingDay?.workoutType &&
          muscleGroup &&
          existingDay.workoutType.trim().toLowerCase() === muscleGroup.trim().toLowerCase()
        );
        return {
          ...prev,
          [currentEditingWeek]: {
            ...weekData,
            [day]: {
              ...(existingDay || {}),
              dayOfWeek: day,
              workoutType: muscleGroup as any,
              workoutId: validParamWorkoutId ?? (keepsSameMuscle ? (existingDay?.workoutId ?? null) : null),
              exercises: selectedExercises,
              durationMinutes: selectedExercises.length * 8 + 5
            }
          }
        };
      });

      setPlayingExerciseName(null);

      if (router.canDismiss()) {
        router.dismissTo('/(customer)/workoutPlan/assign-days' as any);
      } else {
        router.replace('/(customer)/workoutPlan/assign-days' as any);
      }
    } catch (error) {
      console.error('[CustomizeWorkout] handleSaveWorkout Error:', error);
    }
    finally {
      setLoading(false);
    }
  };

  const renderMedia = (
    videoUrl: string | undefined,
    opacity: boolean = false,
    exerciseName?: string
  ) => {
    const isPlaying = Boolean(exerciseName && playingExerciseName === exerciseName);
    return (
      <ExerciseMediaPlayer
        videoUrl={videoUrl}
        muscleGroup={muscleGroup}
        exerciseName={exerciseName}
        containerClassName="w-14 h-14 rounded-xl mr-4 border border-[#242424] overflow-hidden bg-black relative items-center justify-center"
        activeBorderClassName="w-14 h-14 rounded-xl mr-4 border border-[#C4EF00]/50 overflow-hidden bg-black relative items-center justify-center"
        badgeSize="sm"
        accentColor="#C4EF00"
        dimmed={opacity}
        isPlaying={isPlaying}
        onTogglePlay={() => {
          if (!exerciseName) return;
          setPlayingExerciseName(prev => (prev === exerciseName ? null : exerciseName));
        }}
      />
    );
  };

  const isSaveDisabled = isExercisesLoading || selectedExercises.length === 0 || loading;

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-5 pb-28 justify-between">
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">Customize Workout</Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <Text className="text-white text-2xl font-semibold mb-1">Customize {day} -</Text>
        <Text className="text-[#C4EF00] text-2xl font-semibold mb-2">{muscleGroup} Workout</Text>
        <Text className="text-[#8E8E8E] text-sm mb-6 leading-5">
          Select and arrange exercises for your workout.
        </Text>

        <View className="flex-row bg-[#161616] p-4 rounded-2xl border border-[#242424] items-center w-full justify-between mb-6">
          <View className="flex-row items-center flex-1 mr-4">
            <View className="mr-3 bg-[#C4EF00]/10 p-2.5 rounded-xl border border-[#C4EF00]/20">
              <Star size={20} color="#C4EF00" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm">Recommended for {muscleGroup}</Text>
              <Text className="text-[#8E8E8E] text-xs leading-4">
                Balanced selection based on your goal.
              </Text>
            </View>
          </View>
          <View className="bg-[#C4EF00]/10 px-3 py-1.5 rounded-xl border border-[#C4EF00]/20">
            <Text className="text-[#C4EF00] font-semibold text-xs">{selectedExercises.length} selected</Text>
          </View>
        </View>

        {isExercisesLoading ? (
          <ActivityIndicator size="large" color="#C4EF00" className="mt-10" />
        ) : (
          <>
            {allPresets.length === 0 && (
              <View className="py-12 items-center justify-center bg-[#141414] rounded-2xl border border-[#242424] px-6 my-6">
                <Text className="text-white text-base font-semibold mb-1">No exercises found</Text>
                <Text className="text-[#8E8E8E] text-xs text-center leading-4 mb-2">
                  No exercises currently match this muscle group.
                </Text>
              </View>
            )}

            {recommendedPresets.length > 0 && (
              <Text className="text-[#8E8E8E] text-xs font-semibold mb-4 tracking-wider">RECOMMENDED ({recommendedPresets.length})</Text>
            )}

            <View className="gap-3 mb-8">
              {recommendedPresets.map((ex) => {
                const selected = isChecked(ex.name);
                return (
                  <View key={ex.name} className={`border rounded-2xl overflow-hidden ${selected ? 'border-[#C4EF00]/30 bg-[#161616]' : 'border-[#27272A] bg-[#111111]'}`}>
                    <Pressable
                      onPress={() => {
                        handleToggleRecommended(ex.name, ex.category, ex.reps, ex.videoUrl, ex.workoutVideoId);
                      }}
                      className="flex-row items-center p-3.5 justify-between"
                    >
                      <View className="flex-row items-center flex-1">
                        {renderMedia(ex.videoUrl, false, ex.name)}
                        <View className="flex-1 pr-2">
                          <Text className="text-white font-semibold text-base">{ex.name}</Text>
                          <View className="flex-row items-center gap-1.5 mt-1">
                            <View className="bg-[#27272A] px-2 py-0.5 rounded-md">
                              <Text className="text-[#8E8E8E] text-[10px] font-semibold">{ex.category}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View className={`w-6 h-6 rounded-full border items-center justify-center ${selected
                        ? 'border-[#C4EF00] bg-[#C4EF00]'
                        : 'border-[#27272A]'
                        }`}>
                        {selected && <Check size={12} color="#000" weight="bold" />}
                      </View>
                    </Pressable>

                    {selected && (() => {
                      const selectedEx = selectedExercises.find(e => e.exerciseName === ex.name);
                      return (
                        <View className="flex-row items-center px-4 pb-4 pt-1">
                          <Text className="text-[#8E8E8E] text-sm mr-3">Sets</Text>
                          <TextInput
                            value={selectedEx?.sets?.toString() || ''}
                            onChangeText={(val) => updateExerciseDetails(ex.name, 'sets', val)}
                            placeholder="2"
                            placeholderTextColor="#555"
                            keyboardType="numeric"
                            className="bg-[#111] border border-[#27272A] rounded-lg w-16 h-10 px-3 text-white text-center mr-6 font-semibold"
                          />
                          <Text className="text-[#8E8E8E] text-sm mr-3">Reps</Text>
                          <TextInput
                            value={selectedEx?.reps || ''}
                            onChangeText={(val) => updateExerciseDetails(ex.name, 'reps', val)}
                            placeholder="10"
                            placeholderTextColor="#555"
                            keyboardType="numeric"
                            className="bg-[#111] border border-[#27272A] rounded-lg w-16 h-10 px-3 text-white text-center font-semibold"
                          />
                        </View>
                      );
                    })()}
                  </View>
                );
              })}
            </View>

            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#8E8E8E] text-xs font-semibold tracking-wider">MORE {muscleGroup?.toUpperCase()} EXERCISES</Text>
              <Pressable
                onPress={() => setShowSearchInput(!showSearchInput)}
                className="flex-row items-center gap-1.5 active:opacity-75"
              >
                <MagnifyingGlass size={15} color="#C4EF00" weight="bold" />
                <Text className="text-[#C4EF00] text-xs font-semibold">Search</Text>
              </Pressable>
            </View>

            {showSearchInput && (
              <View className="bg-[#111111] border border-[#27272A] rounded-2xl flex-row items-center px-4 py-3 mb-4 w-full">
                <MagnifyingGlass size={18} color="#8E8E8E" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search other exercises..."
                  placeholderTextColor="#8E8E8E"
                  className="flex-1 text-white ml-2 text-sm font-sans"
                  keyboardAppearance="dark"
                />
              </View>
            )}

            <View className="gap-3">
              {otherPresets.map((ex) => {
                const added = isChecked(ex.name);
                return (
                  <View
                    key={ex.name}
                    className={`border rounded-2xl overflow-hidden ${added ? 'border-[#C4EF00]/20 bg-[#161616]/50' : 'border-[#27272A] bg-[#111111]'}`}
                  >
                    <View className="flex-row items-center p-3.5 justify-between">
                      <View className="flex-row items-center flex-1">
                        {renderMedia(ex.videoUrl, true, ex.name)}
                        <View className="flex-1 pr-2">
                          <Text className="text-white font-semibold text-base">{ex.name}</Text>
                          <View className="flex-row items-center gap-1.5 mt-1">
                            <View className="bg-[#27272A] px-2 py-0.5 rounded-md">
                              <Text className="text-[#8E8E8E] text-[10px] font-semibold">{ex.category}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleAddOther(ex.name, ex.category, ex.reps, ex.videoUrl, ex.workoutVideoId)}
                        disabled={added}
                        className={`w-8 h-8 rounded-full border items-center justify-center ${added
                          ? 'border-[#C4EF00]/20 bg-[#C4EF00]/10'
                          : 'border-[#C4EF00] bg-transparent active:bg-[#C4EF00]/10'
                          }`}
                      >
                        {added ? (
                          <Check size={14} color="#C4EF00" weight="bold" />
                        ) : (
                          <Plus size={14} color="#C4EF00" weight="bold" />
                        )}
                      </Pressable>
                    </View>

                    {added && (() => {
                      const selectedEx = selectedExercises.find(e => e.exerciseName === ex.name);
                      return (
                        <View className="flex-row items-center px-4 pb-4 pt-1">
                          <Text className="text-[#8E8E8E] text-sm mr-3">Sets</Text>
                          <TextInput
                            value={selectedEx?.sets?.toString() || ''}
                            onChangeText={(val) => updateExerciseDetails(ex.name, 'sets', val)}
                            placeholder="2"
                            placeholderTextColor="#555"
                            keyboardType="numeric"
                            className="bg-[#111] border border-[#27272A] rounded-lg w-16 h-10 px-3 text-white text-center mr-6 font-semibold"
                          />
                          <Text className="text-[#8E8E8E] text-sm mr-3">Reps</Text>
                          <TextInput
                            value={selectedEx?.reps || ''}
                            onChangeText={(val) => updateExerciseDetails(ex.name, 'reps', val)}
                            placeholder="10"
                            placeholderTextColor="#555"
                            keyboardType="numeric"
                            className="bg-[#111] border border-[#27272A] rounded-lg w-16 h-10 px-3 text-white text-center font-semibold"
                          />
                        </View>
                      );
                    })()}
                  </View>
                );
              })}

              {hasMore && !searchQuery && (
                <View className="py-4 items-center">
                  <Pressable
                    onPress={() => setDisplayCount(prev => prev + 8)}
                    disabled={isFetching}
                    className="flex-row items-center gap-x-2 bg-[#141414] border border-[#2A2A2A] px-4 py-2.5 rounded-xl active:opacity-70"
                  >
                    {isFetching ? (
                      <ActivityIndicator size="small" color="#C4EF00" />
                    ) : (
                      <>
                        <ArrowsClockwise size={16} color="#C4EF00" />
                        <Text className="text-white text-sm font-semibold">Load More</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}

        <Pressable
          onPress={handleSaveWorkout}
          disabled={isSaveDisabled}
          className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-2 mt-4 ${!isSaveDisabled
            ? 'bg-[#C4EF00] active:opacity-90'
            : 'bg-[#222222] border border-[#2E2E2E] opacity-50'
            }`}
        >
          <Text className={`text-base font-semibold ${!isSaveDisabled ? 'text-black' : 'text-[#8E8E8E]'}`}>
            {loading ? 'Saving...' : "Save Workout"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

