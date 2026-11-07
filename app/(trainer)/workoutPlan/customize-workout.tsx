import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, TextInput, ActivityIndicator, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Plus, Check, MagnifyingGlass, ArrowsClockwise, PlayCircle, X, SpeakerHigh, SpeakerSimpleSlash } from 'phosphor-react-native';
import { useTrainerWorkoutPlan, ExerciseItem } from './_layout';
import { useWorkoutVideos } from '@/hooks/workoutVideos/useWorkoutVideos';
import { isExerciseMatchingGender } from '@/helpers/workoutVideos/workoutVideoHelper';
import { Video, ResizeMode } from '@/components/ui/Video';
import { supabase } from '@/lib/supabase';
import { useCachedVideoUri, prefetchVideoList, getSupabaseVideoPublicUrl } from '@/lib/videoCache';

const IMAGE_MAP: { [key: string]: any } = {
  Chest: require('../../../assets/chest-stood.png'),
  Back: require('../../../assets/back-stood.png'),
  Shoulders: require('../../../assets/shoulders-stood.png'),
  Legs: require('../../../assets/workout.png'),
  Abs: require('../../../assets/workout_abs.jpg'),
  Arms: require('../../../assets/dumbell.png'),
  default: require('../../../assets/barbell.png'),
};

const ExerciseMediaItem = ({
  videoUrl,
  muscleGroup,
  onPress,
}: {
  videoUrl?: string;
  muscleGroup?: string;
  onPress?: () => void;
}) => {
  const [hasError, setHasError] = useState(false);
  const { uri: cachedUri } = useCachedVideoUri(videoUrl);

  const normalizedGroup = (muscleGroup || '').toLowerCase();
  const exerciseImage =
    normalizedGroup.includes('chest') ? IMAGE_MAP.Chest :
      normalizedGroup.includes('back') ? IMAGE_MAP.Back :
        normalizedGroup.includes('shoulder') ? IMAGE_MAP.Shoulders :
          (normalizedGroup.includes('leg') || normalizedGroup.includes('hip') || normalizedGroup.includes('calf')) ? IMAGE_MAP.Legs :
            (normalizedGroup.includes('ab') || normalizedGroup.includes('core')) ? IMAGE_MAP.Abs :
              (normalizedGroup.includes('bicep') || normalizedGroup.includes('tricep') || normalizedGroup.includes('arm')) ? IMAGE_MAP.Arms :
                IMAGE_MAP.default;

  const publicUrl = cachedUri || getSupabaseVideoPublicUrl(videoUrl || '');

  if (!videoUrl || hasError || !publicUrl) {
    return (
      <Pressable onPress={onPress} disabled={!onPress}>
        <Image
          source={exerciseImage}
          className="w-14 h-14 rounded-xl mr-4 border border-[#242424]"
          resizeMode="cover"
        />
      </Pressable>
    );
  }

  const isGifOrImage = /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i.test(videoUrl);

  if (isGifOrImage) {
    return (
      <Pressable onPress={onPress} disabled={!onPress}>
        <View className="w-14 h-14 rounded-xl mr-4 border border-[#242424] overflow-hidden bg-black">
          <Image
            source={{ uri: publicUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setHasError(true)}
          />
        </View>
      </Pressable>
    );
  }

  // Display and play videos with local on-device caching enabled
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View className="w-14 h-14 rounded-xl mr-4 border border-[#242424] overflow-hidden bg-black">
        <Video
          source={{ uri: publicUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.COVER}
          useNativeControls={false}
          shouldPlay={true}
          isLooping={true}
          isMuted={true}
          fallback={
            <Image
              source={exerciseImage}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          }
          onError={() => setHasError(true)}
        />
      </View>
    </Pressable>
  );
};

const ExerciseVideoPreviewModal = ({
  exercise,
  muscleGroup,
  visible,
  onClose,
  isSelected,
  onToggleSelect,
}: {
  exercise: any | null;
  muscleGroup?: string;
  visible: boolean;
  onClose: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) => {
  const { uri: videoSource, isCached } = useCachedVideoUri(exercise?.videoUrl);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    setHasError(false);
    setIsPlaying(true);
  }, [exercise?.videoUrl, visible]);

  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  };

  if (!visible || !exercise) return null;

  const normalizedGroup = (muscleGroup || '').toLowerCase();
  const exerciseImage =
    normalizedGroup.includes('chest') ? IMAGE_MAP.Chest :
      normalizedGroup.includes('back') ? IMAGE_MAP.Back :
        normalizedGroup.includes('shoulder') ? IMAGE_MAP.Shoulders :
          (normalizedGroup.includes('leg') || normalizedGroup.includes('hip') || normalizedGroup.includes('calf')) ? IMAGE_MAP.Legs :
            (normalizedGroup.includes('ab') || normalizedGroup.includes('core')) ? IMAGE_MAP.Abs :
              (normalizedGroup.includes('bicep') || normalizedGroup.includes('tricep') || normalizedGroup.includes('arm')) ? IMAGE_MAP.Arms :
                IMAGE_MAP.default;

  const isGifOrImage = /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i.test(exercise.videoUrl || '');
  const activeSource = videoSource || getSupabaseVideoPublicUrl(exercise.videoUrl || '');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/85 items-center justify-center p-5">
        <View className="bg-[#141414] border border-[#27272A] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-[#242424]">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold text-lg" numberOfLines={1}>
                {exercise.name}
              </Text>
              <Text className="text-[#8E8E8E] text-xs mt-0.5">
                {exercise.category} · {exercise.reps || '10-12 reps'}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-[#242424] items-center justify-center active:opacity-70"
            >
              <X size={16} color="#FFF" />
            </Pressable>
          </View>

          {/* Media Player Area */}
          <View className="w-full aspect-[4/3] bg-black items-center justify-center relative overflow-hidden">
            {isGifOrImage && activeSource ? (
              <Image
                source={{ uri: activeSource }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                onError={() => setHasError(true)}
              />
            ) : activeSource && !hasError ? (
              <Video
                source={{ uri: activeSource }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls={false}
                shouldPlay={isPlaying}
                isLooping={true}
                isMuted={isMuted}
                fallback={
                  <Image
                    source={exerciseImage}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                }
                onError={() => setHasError(true)}
              />
            ) : (
              <Image
                source={exerciseImage}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            )}

            {/* Cache status pill */}
            {isCached && (
              <View className="absolute top-3 left-3 bg-[#CCFF00]/20 border border-[#CCFF00]/40 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                <Check size={10} color="#CCFF00" weight="bold" />
                <Text className="text-[#CCFF00] text-[9px] font-bold uppercase tracking-wider">
                  Cached on device
                </Text>
              </View>
            )}

            {/* Sound Toggle */}
            {!isGifOrImage && activeSource && !hasError && (
              <Pressable
                onPress={() => setIsMuted(!isMuted)}
                className="absolute top-3 right-3 bg-black/60 border border-white/20 p-2 rounded-full active:opacity-75"
              >
                {isMuted ? (
                  <SpeakerSimpleSlash size={16} color="#FFF" />
                ) : (
                  <SpeakerHigh size={16} color="#CCFF00" />
                )}
              </Pressable>
            )}
          </View>

          {/* Footer Controls */}
          <View className="p-4 flex-row items-center justify-between gap-3 bg-[#111111]">
            <Pressable
              onPress={onToggleSelect}
              className={`flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2 ${isSelected ? 'bg-[#27272A] border border-[#3A3A3A]' : 'bg-[#CCFF00]'
                }`}
            >
              {isSelected ? (
                <>
                  <Check size={16} color="#FFF" weight="bold" />
                  <Text className="text-white font-semibold text-sm">Selected</Text>
                </>
              ) : (
                <>
                  <Plus size={16} color="#000" weight="bold" />
                  <Text className="text-black font-semibold text-sm">Add to Workout</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleClose}
              className="px-5 py-3.5 bg-[#222222] border border-[#333333] rounded-xl active:opacity-75"
            >
              <Text className="text-white font-semibold text-sm">Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function CustomizeWorkoutScreen() {
  const {
    day,
    muscleGroup,
    customerGender: paramGender,
  } = useLocalSearchParams<{
    day: string;
    muscleGroup: string;
    customerGender?: 'male' | 'female';
  }>();
  const {
    planDays,
    setPlanDays,
    targetUserId,
    customerGender: contextCustomerGender,
    setCustomerGender,
  } = useTrainerWorkoutPlan();
  const [loading, setLoading] = useState(false);

  // Strict Gender Resolution: do not load fallback videos until gender is verified
  const initialGender = (paramGender || contextCustomerGender || null) as 'male' | 'female' | null;
  const [resolvedGender, setResolvedGender] = useState<'male' | 'female' | null>(initialGender);
  const [isGenderResolving, setIsGenderResolving] = useState(!initialGender);

  useEffect(() => {
    let isMounted = true;
    async function determineGender() {
      if (resolvedGender) {
        setIsGenderResolving(false);
        return;
      }

      const genderToCheck = paramGender || contextCustomerGender;
      if (genderToCheck && (genderToCheck === 'male' || genderToCheck === 'female')) {
        if (isMounted) {
          setResolvedGender(genderToCheck);
          setCustomerGender(genderToCheck);
          setIsGenderResolving(false);
        }
        return;
      }

      if (targetUserId) {
        try {
          setIsGenderResolving(true);
          // 1. Check gym_customers
          const { data: gc } = await supabase
            .from('gym_customers')
            .select('gender')
            .or(`userId.eq.${targetUserId},customerId.eq.${targetUserId}`)
            .maybeSingle();

          if (gc?.gender) {
            const g = gc.gender.toLowerCase().trim();
            if (g === 'female' || g === 'male') {
              if (isMounted) {
                setResolvedGender(g as 'male' | 'female');
                setCustomerGender(g as 'male' | 'female');
                setIsGenderResolving(false);
              }
              return;
            }
          }

          // 2. Check individual_customer_trainers table
          const { data: ict } = await supabase
            .from('individual_customer_trainers')
            .select('userId, user:users!individual_customer_trainers_userId_fkey(gender)')
            .or(`individualCustomerTrainerId.eq.${targetUserId},userId.eq.${targetUserId}`)
            .maybeSingle();

          const indGender = (ict as any)?.user?.gender;
          if (indGender) {
            const g = indGender.toLowerCase().trim();
            if (g === 'female' || g === 'male') {
              if (isMounted) {
                setResolvedGender(g as 'male' | 'female');
                setCustomerGender(g as 'male' | 'female');
                setIsGenderResolving(false);
              }
              return;
            }
          }

          // 3. Check users table
          const { data: u } = await supabase
            .from('users')
            .select('gender')
            .eq('userId', targetUserId)
            .maybeSingle();

          if (u?.gender) {
            const g = u.gender.toLowerCase().trim();
            if (g === 'female' || g === 'male') {
              if (isMounted) {
                setResolvedGender(g as 'male' | 'female');
                setCustomerGender(g as 'male' | 'female');
                setIsGenderResolving(false);
              }
              return;
            }
          }
        } catch (err) {
          console.error('[CustomizeWorkoutScreen] Error determining customer gender:', err);
        }
      }

      if (isMounted) {
        setResolvedGender('male');
        setCustomerGender('male');
        setIsGenderResolving(false);
      }
    }

    determineGender();
    return () => {
      isMounted = false;
    };
  }, [paramGender, contextCustomerGender, targetUserId]);

  const [page, setPage] = useState(1);
  const [limit] = useState(40);
  const [visibleOtherCount, setVisibleOtherCount] = useState(5);
  const [accumulatedVideos, setAccumulatedVideos] = useState<any[]>([]);

  useEffect(() => {
    setPage(1);
    setVisibleOtherCount(5);
    setAccumulatedVideos([]);
    setSearchQuery('');
    setShowSearchInput(false);
  }, [muscleGroup, resolvedGender]);

  // STRICT GENDER LOADING: Query is strictly enabled ONLY when gender has been resolved
  const isGenderReady = !isGenderResolving && !!resolvedGender;

  const {
    data: fetchResult,
    isLoading: isVideosLoading,
    isFetching,
  } = useWorkoutVideos(
    page,
    limit,
    muscleGroup,
    resolvedGender || 'all',
    'all',
    '',
    { enabled: isGenderReady, strictRole: true }
  );

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
  const [previewExercise, setPreviewExercise] = useState<any | null>(null);

  const allPresets = useMemo(() => {
    const listToUse = accumulatedVideos.length > 0 ? accumulatedVideos : (fetchResult?.data || []);
    const seen = new Set<string>();
    const uniqueList: any[] = [];

    for (const item of listToUse) {
      const key = (item.exerciseName || item.name || '').toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueList.push(item);
    }

    const cutoff = uniqueList.length <= 4 ? Math.max(1, Math.floor(uniqueList.length / 2)) : 4;

    return uniqueList
      .filter((video: any) => {
        if (!resolvedGender) return false;
        return isExerciseMatchingGender(
          {
            videoUrl: video.videoUrl,
            workoutId: video.workoutId,
            workouts: video.workouts,
          },
          resolvedGender
        );
      })
      .map((video: any, index: number) => {
        const isStretch = (video.exerciseName || video.name || '').toLowerCase().includes('stretch');
        return {
          name: video.exerciseName || video.name || 'Unknown Exercise',
          category: isStretch
            ? 'Stretching'
            : (video.category || (muscleGroup ? muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1) : 'Exercise')),
          reps: video.defaultReps || (isStretch ? '30-45 sec' : '10-12 reps'),
          isRecommended: index < cutoff && !isStretch,
          videoUrl: video.videoUrl,
          workoutVideoId: video.workoutVideoId,
        };
      });
  }, [accumulatedVideos, fetchResult?.data, resolvedGender, muscleGroup]);

  const [selectedExercises, setSelectedExercises] = useState<ExerciseItem[]>(() => {
    if (currentPlan && currentPlan.exercises && currentPlan.exercises.length > 0) {
      return currentPlan.exercises;
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const recommendedPresets = useMemo(() => {
    return allPresets.filter(p => p.isRecommended);
  }, [allPresets]);

  const otherPresets = useMemo(() => {
    const others = allPresets.filter(p => !p.isRecommended);
    if (!searchQuery.trim()) return others;
    const q = searchQuery.toLowerCase().trim();
    return others.filter(ex => ex.name.toLowerCase().includes(q));
  }, [allPresets, searchQuery]);

  const displayedOtherPresets = useMemo(() => {
    if (searchQuery.trim()) return otherPresets;
    return otherPresets.slice(0, visibleOtherCount);
  }, [otherPresets, visibleOtherCount, searchQuery]);

  const canLoadMoreOthers = useMemo(() => {
    if (searchQuery.trim()) return false;
    return visibleOtherCount < otherPresets.length || hasMore;
  }, [searchQuery, visibleOtherCount, otherPresets.length, hasMore]);

  const handleLoadMoreOthers = () => {
    const nextCount = visibleOtherCount + 5;
    setVisibleOtherCount(nextCount);
    if (nextCount >= otherPresets.length && hasMore && !isFetching) {
      setPage(p => p + 1);
    }
  };

  useEffect(() => {
    if (allPresets.length > 0) {
      const urls = [
        ...recommendedPresets.map(p => p.videoUrl),
        ...displayedOtherPresets.map(p => p.videoUrl),
      ].filter(Boolean);
      prefetchVideoList(urls);
    }
  }, [allPresets, displayedOtherPresets, recommendedPresets]);

  const isChecked = (name: string, workoutVideoId?: string) => {
    const targetName = (name || '').trim().toLowerCase();
    return selectedExercises.some(ex => {
      if (workoutVideoId && ex.workoutVideoId && ex.workoutVideoId === workoutVideoId) return true;
      return (ex.exerciseName || '').trim().toLowerCase() === targetName;
    });
  };

  const handleToggleExercise = (
    name: string,
    category: string,
    reps: string,
    videoUrl?: string | null,
    workoutVideoId?: string | null
  ) => {
    try {
      const targetName = (name || '').trim().toLowerCase();
      setSelectedExercises(prev => {
        const exists = prev.some(ex => {
          if (workoutVideoId && ex.workoutVideoId && ex.workoutVideoId === workoutVideoId) return true;
          return (ex.exerciseName || '').trim().toLowerCase() === targetName;
        });

        if (exists) {
          return prev.filter(ex => {
            if (workoutVideoId && ex.workoutVideoId && ex.workoutVideoId === workoutVideoId) return false;
            return (ex.exerciseName || '').trim().toLowerCase() !== targetName;
          });
        } else {
          return [
            ...prev,
            {
              exerciseName: name,
              category,
              reps,
              videoUrl: videoUrl || null,
              workoutVideoId: workoutVideoId || null,
              order: prev.length,
            }
          ];
        }
      });
    } catch (error) {
      console.error('[CustomizeWorkoutScreen] handleToggleExercise Error:', error);
    }
  };

  const handleToggleRecommended = handleToggleExercise;
  const handleToggleOther = handleToggleExercise;

  const handleSaveWorkout = () => {
    try {
      if (!day) return;
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

      router.push('/(trainer)/workoutPlan/assign-days' as any);
    } catch (error) {
      console.error('[CustomizeWorkoutScreen] handleSaveWorkout Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMedia = (videoUrl: string | undefined, onPress?: () => void) => {
    return <ExerciseMediaItem videoUrl={videoUrl} muscleGroup={muscleGroup} onPress={onPress} />;
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-5 pb-28 justify-between">
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => router.push({ pathname: '/(trainer)/workoutPlan/choose-muscle' as any, params: { day } })}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">Customize Workout</Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 pr-2">
            <Text className="text-white text-2xl font-semibold mb-1">Customize {day} -</Text>
            <Text className="text-[#CCFF00] text-2xl font-semibold mb-2">{muscleGroup} Workout</Text>
          </View>
          <View className="bg-[#CCFF00]/10 px-3 py-1.5 rounded-full border border-[#CCFF00]/30 self-start">
            <Text className="text-[#CCFF00] text-[11px] font-bold uppercase tracking-wider">
              {resolvedGender ? `${resolvedGender}` : 'CHECKING GENDER...'}
            </Text>
          </View>
        </View>

        <Text className="text-[#8E8E8E] text-sm mb-6 leading-5">
          Select and arrange {resolvedGender ? `${resolvedGender} ` : ''}exercises for your customer's workout. Tap any video thumbnail to preview.
        </Text>

        <View className="flex-row bg-[#161616] p-4 rounded-2xl border border-[#242424] items-center w-full justify-between mb-6">
          <View className="flex-row items-center flex-1 mr-4">
            <View className="mr-3 bg-[#CCFF00]/10 p-2.5 rounded-xl border border-[#CCFF00]/20">
              <Star size={20} color="#CCFF00" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm">Recommended for {muscleGroup}</Text>
              <Text className="text-[#8E8E8E] text-xs leading-4">
                Strictly displaying {resolvedGender || 'customer'} exercises.
              </Text>
            </View>
          </View>
          <View className="bg-[#CCFF00]/10 px-3 py-1.5 rounded-xl border border-[#CCFF00]/20">
            <Text className="text-[#CCFF00] font-semibold text-xs">{selectedExercises.length} Selected</Text>
          </View>
        </View>

        {isGenderResolving || !isGenderReady ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
            <Text className="text-white text-base font-semibold mt-4">Checking customer profile...</Text>
            <Text className="text-[#8E8E8E] text-xs mt-1">Resolving gender before loading workout videos</Text>
          </View>
        ) : (isVideosLoading || (isFetching && page === 1 && (!fetchResult || !fetchResult.data)) || (!fetchResult && isGenderReady)) ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
            <Text className="text-[#8E8E8E] text-xs mt-3">Fetching {resolvedGender} exercises...</Text>
          </View>
        ) : (
          <>
            {recommendedPresets.length === 0 && otherPresets.length === 0 && (
              <View className="py-12 items-center justify-center bg-[#111111] rounded-2xl border border-[#27272A] p-6 mb-6">
                <Text className="text-white text-base font-semibold mb-1">No {resolvedGender} exercises found</Text>
                <Text className="text-[#8E8E8E] text-xs text-center leading-4">
                  There are no workout videos available for {muscleGroup} matching gender "{resolvedGender}".
                </Text>
              </View>
            )}

            {recommendedPresets.length > 0 && (
              <Text className="text-[#8E8E8E] text-xs font-semibold mb-4 tracking-wider">RECOMMENDED ({recommendedPresets.length})</Text>
            )}

            <View className="gap-3 mb-8">
              {recommendedPresets.map((ex, index) => {
                const selected = isChecked(ex.name, ex.workoutVideoId);
                return (
                  <View
                    key={`rec-${ex.workoutVideoId || ex.name}-${index}`}
                    className={`flex-row items-center border p-3.5 rounded-2xl justify-between ${selected ? 'border-[#CCFF00]/40 bg-[#161616]' : 'border-[#27272A] bg-[#111111]'
                      }`}
                  >
                    <Pressable
                      onPress={() => setPreviewExercise(ex)}
                      className="flex-row items-center flex-1 active:opacity-85 mr-2"
                    >
                      {renderMedia(ex.videoUrl, () => setPreviewExercise(ex))}
                      <View className="flex-1 pr-2">
                        <Text className="text-white font-semibold text-base">{ex.name}</Text>
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <View className="bg-[#27272A] px-2 py-0.5 rounded-md">
                            <Text className="text-[#8E8E8E] text-[10px] font-semibold">{ex.category}</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => handleToggleRecommended(ex.name, ex.category, ex.reps, ex.videoUrl, ex.workoutVideoId)}
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                      className={`w-8 h-8 rounded-full border items-center justify-center active:opacity-75 ${selected
                          ? 'border-[#CCFF00] bg-[#CCFF00]'
                          : 'border-[#CCFF00] bg-transparent active:bg-[#CCFF00]/10'
                        }`}
                    >
                      {selected ? (
                        <Check size={14} color="#000" weight="bold" />
                      ) : (
                        <Plus size={14} color="#CCFF00" weight="bold" />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#8E8E8E] text-xs font-semibold tracking-wider">
                MORE {muscleGroup?.toUpperCase()} EXERCISES ({displayedOtherPresets.length}{otherPresets.length > displayedOtherPresets.length ? ` of ${otherPresets.length}` : ''})
              </Text>
              <Pressable
                onPress={() => setShowSearchInput(!showSearchInput)}
                className="flex-row items-center gap-1.5 active:opacity-75"
              >
                <MagnifyingGlass size={15} color="#CCFF00" weight="bold" />
                <Text className="text-[#CCFF00] text-xs font-semibold">Search</Text>
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
              {displayedOtherPresets.length === 0 && (
                <View className="py-8 items-center justify-center bg-[#111111] rounded-2xl border border-[#27272A] p-4">
                  <Text className="text-[#8E8E8E] text-xs text-center leading-4">
                    {searchQuery
                      ? `No exercises found matching "${searchQuery}".`
                      : `No additional ${muscleGroup} exercises available for ${resolvedGender}.`}
                  </Text>
                </View>
              )}

              {displayedOtherPresets.map((ex, index) => {
                const added = isChecked(ex.name, ex.workoutVideoId);
                return (
                  <View
                    key={`other-${ex.workoutVideoId || ex.name}-${index}`}
                    className={`flex-row items-center border p-3.5 rounded-2xl justify-between ${added ? 'border-[#CCFF00]/40 bg-[#161616]' : 'border-[#27272A] bg-[#111111]'
                      }`}
                  >
                    <Pressable
                      onPress={() => setPreviewExercise(ex)}
                      className="flex-row items-center flex-1 active:opacity-85 mr-2"
                    >
                      {renderMedia(ex.videoUrl, () => setPreviewExercise(ex))}
                      <View className="flex-1 pr-2">
                        <Text className="text-white font-semibold text-base">{ex.name}</Text>
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <View className="bg-[#27272A] px-2 py-0.5 rounded-md">
                            <Text className="text-[#8E8E8E] text-[10px] font-semibold">{ex.category}</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => handleToggleOther(ex.name, ex.category, ex.reps, ex.videoUrl, ex.workoutVideoId)}
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                      className={`w-8 h-8 rounded-full border items-center justify-center active:opacity-75 ${added
                          ? 'border-[#CCFF00] bg-[#CCFF00]'
                          : 'border-[#CCFF00] bg-transparent active:bg-[#CCFF00]/10'
                        }`}
                    >
                      {added ? (
                        <Check size={14} color="#000" weight="bold" />
                      ) : (
                        <Plus size={14} color="#CCFF00" weight="bold" />
                      )}
                    </Pressable>
                  </View>
                );
              })}

              {canLoadMoreOthers && (
                <View className="py-4 items-center">
                  <Pressable
                    onPress={handleLoadMoreOthers}
                    disabled={isFetching}
                    className="flex-row items-center justify-center gap-x-2 bg-[#141414] border border-[#2A2A2A] px-5 py-3 rounded-2xl active:opacity-70"
                  >
                    {isFetching ? (
                      <ActivityIndicator size="small" color="#CCFF00" />
                    ) : (
                      <>
                        <ArrowsClockwise size={16} color="#CCFF00" />
                        <Text className="text-white text-sm font-semibold">Load 5 More</Text>
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
          className="w-full py-4 bg-[#CCFF00] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90 mt-4"
        >
          <Text className="text-black text-base font-semibold">
            {loading ? 'Saving...' : "Save Workout"}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Video Preview Modal with Device Caching */}
      <ExerciseVideoPreviewModal
        exercise={previewExercise}
        muscleGroup={muscleGroup}
        visible={!!previewExercise}
        onClose={() => setPreviewExercise(null)}
        isSelected={previewExercise ? isChecked(previewExercise.name, previewExercise.workoutVideoId) : false}
        onToggleSelect={() => {
          if (previewExercise) {
            handleToggleOther(
              previewExercise.name,
              previewExercise.category,
              previewExercise.reps,
              previewExercise.videoUrl,
              previewExercise.workoutVideoId
            );
          }
        }}
      />
    </View>
  );
}

