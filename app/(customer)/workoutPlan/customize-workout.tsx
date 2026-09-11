import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Plus, Check, MagnifyingGlass, ArrowsClockwise } from 'phosphor-react-native';
import { useWorkoutPlan, ExerciseItem } from './_layout';
import { useWorkoutVideos } from '@/hooks/workoutVideos/useWorkoutVideos';
import { Video, ResizeMode } from '@/components/ui/Video';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';

const IMAGE_MAP: { [key: string]: any } = {
  Chest: require('../../../assets/chest-stood.png'),
  Back: require('../../../assets/back-stood.png'),
  Shoulders: require('../../../assets/shoulders-stood.png'),
  Legs: require('../../../assets/workout.png'),
  default: require('../../../assets/barbell.png'),
};

const ExerciseMediaItem = ({ videoUrl, muscleGroup, opacity = false }: { videoUrl?: string; muscleGroup?: string; opacity?: boolean }) => {
  const [hasError, setHasError] = useState(false);

  const normalizedGroup = (muscleGroup || '').toLowerCase();
  const exerciseImage =
    normalizedGroup.includes('chest') ? IMAGE_MAP.Chest :
    normalizedGroup.includes('back') ? IMAGE_MAP.Back :
    normalizedGroup.includes('shoulder') ? IMAGE_MAP.Shoulders :
    normalizedGroup.includes('leg') ? IMAGE_MAP.Legs :
    IMAGE_MAP.default;

  if (!videoUrl || hasError) {
    return (
      <Image
        source={exerciseImage}
        className={`w-14 h-14 rounded-xl mr-4 border border-[#242424] ${opacity ? 'opacity-70' : ''}`}
        resizeMode="cover"
      />
    );
  }

  const publicUrl = videoUrl.startsWith('http')
    ? videoUrl
    : supabase.storage.from('workout-videos').getPublicUrl(videoUrl).data.publicUrl;

  const isGifOrImage = /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i.test(videoUrl);

  if (isGifOrImage) {
    return (
      <View className={`w-14 h-14 rounded-xl mr-4 border border-[#242424] overflow-hidden bg-black ${opacity ? 'opacity-70' : ''}`}>
        <Image
          source={{ uri: publicUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  return (
    <View className={`w-14 h-14 rounded-xl mr-4 border border-[#242424] overflow-hidden bg-black ${opacity ? 'opacity-70' : ''}`}>
      <Video
        source={{ uri: publicUrl }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={ResizeMode.COVER}
        useNativeControls={false}
        shouldPlay={true}
        isLooping={true}
        isMuted={true}
        usePoster={true}
        posterSource={exerciseImage}
        posterStyle={{ resizeMode: 'cover' }}
        onError={() => setHasError(true)}
      />
    </View>
  );
};

export default function CustomizeWorkout() {
  const { day, muscleGroup } = useLocalSearchParams<{ day: string; muscleGroup: string }>();
  const { planDays, setPlanDays } = useWorkoutPlan();
  const [loading, setLoading] = useState(false);

  const userContext = useUser();
  const userId = userContext.userId;
  const { data: customerProfileData } = useCustomerProfile(userId);
  const userGender = customerProfileData?.customerData?.gender?.toLowerCase() || 'all';

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [accumulatedVideos, setAccumulatedVideos] = useState<any[]>([]);

  const { data: fetchResult, isLoading: isVideosLoading, isFetching } = useWorkoutVideos(page, limit, muscleGroup, userGender);

  const total = fetchResult?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  useEffect(() => {
    if (fetchResult?.data) {
      if (page === 1) {
        setAccumulatedVideos(fetchResult.data);
      } else {
        setAccumulatedVideos((prev) => {
          const prevIds = new Set(prev.map((v) => v.workoutVideoId));
          const newUnique = fetchResult.data.filter((v: any) => !prevIds.has(v.workoutVideoId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [fetchResult, page]);

  const currentPlan = planDays[day || ''];

  const allPresets = useMemo(() => {
    return accumulatedVideos.map((video: any, index: number) => ({
      name: video.exerciseName || 'Unknown Exercise',
      category: 'Exercise',
      reps: '10-12 reps',
      isRecommended: index < 5,
      videoUrl: video.videoUrl,
      workoutVideoId: video.workoutVideoId,
    }));
  }, [accumulatedVideos]);

  const [selectedExercises, setSelectedExercises] = useState<ExerciseItem[]>(() => {
    if (currentPlan && currentPlan.exercises && currentPlan.exercises.length > 0) {
      return currentPlan.exercises;
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const recommendedPresets = useMemo(() => {
    return allPresets.filter(p => p.isRecommended || selectedExercises.some(ex => ex.exerciseName === p.name));
  }, [allPresets, selectedExercises]);

  const otherPresets = useMemo(() => {
    const others = allPresets.filter(p => !p.isRecommended && !selectedExercises.some(ex => ex.exerciseName === p.name));
    if (!searchQuery) return others;
    return others.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allPresets, searchQuery, selectedExercises]);

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
          { exerciseName: name, category, reps: '', sets: undefined as any, videoUrl, workoutVideoId, order: selectedExercises.length }
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
          { exerciseName: name, category, reps: '', sets: undefined as any, videoUrl, workoutVideoId, order: selectedExercises.length }
        ]);
      }
    } catch (error) {
      console.error('[CustomizeWorkout] handleAddOther Error:', error);
    }
  };

  const handleSaveWorkout = () => {
    try {
      if (!day) return;

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

      setPlanDays(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          dayOfWeek: day,
          workoutType: muscleGroup as any,
          exercises: selectedExercises,
          durationMinutes: selectedExercises.length * 8 + 5
        }
      }));

      router.push('/(customer)/workoutPlan/assign-days');
    } catch (error) {
      console.error('[CustomizeWorkout] handleSaveWorkout Error:', error);
    }
    finally {
      setLoading(false);
    }
  };

  const renderMedia = (videoUrl: string | undefined, opacity: boolean = false) => {
    return <ExerciseMediaItem videoUrl={videoUrl} muscleGroup={muscleGroup} opacity={opacity} />;
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-5 pb-28 justify-between">
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => router.push({ pathname: '/(customer)/workoutPlan/choose-muscle', params: { day } })}
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
            <Text className="text-[#C4EF00] font-semibold text-xs">{selectedExercises.length} Selected</Text>
          </View>
        </View>

        {isVideosLoading && page === 1 ? (
          <ActivityIndicator size="large" color="#C4EF00" className="mt-10" />
        ) : (
          <>
            {recommendedPresets.length > 0 && (
              <Text className="text-[#8E8E8E] text-xs font-semibold mb-4 tracking-wider">RECOMMENDED ({recommendedPresets.length})</Text>
            )}

            <View className="gap-3 mb-8">
              {recommendedPresets.map((ex) => {
                const selected = isChecked(ex.name);
                return (
                  <View key={ex.name} className={`border rounded-2xl overflow-hidden ${selected ? 'border-[#C4EF00]/30 bg-[#161616]' : 'border-[#27272A] bg-[#111111]'}`}>
                    <Pressable
                      onPress={() => handleToggleRecommended(ex.name, ex.category, ex.reps, ex.videoUrl, ex.workoutVideoId)}
                      className="flex-row items-center p-3.5 justify-between"
                    >
                      <View className="flex-row items-center flex-1">
                        {renderMedia(ex.videoUrl)}
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
                        {renderMedia(ex.videoUrl, true)}
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
                    onPress={() => setPage(p => p + 1)}
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
          className="w-full py-4 bg-[#C4EF00] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90 mt-4"
        >
          <Text className="text-black text-base font-semibold">
            {loading ? 'Saving...' : "Save Workout"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

