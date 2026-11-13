import React, { useState, useMemo, useEffect } from 'react';
import { View, Pressable, Modal, ScrollView, Dimensions, ActivityIndicator, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { X, Barbell, Lightbulb, Play, Pause, ArrowsClockwise } from 'phosphor-react-native';
import { Video, ResizeMode } from '@/components/ui/Video';
import { supabase } from '@/lib/supabase';
import { GeneratedExercise, MuscleValue } from '@/hooks/customWorkout/useCustomWorkoutBuilder';
import { getMuscleThumbnailImage } from '@/lib/workoutMuscleImage';
import {
  MUSCLE_TO_WORKOUT_TYPES,
  MUSCLE_RPC_ALIASES,
  isExerciseVideoMatchingGender,
} from '@/helpers/customWorkout/customWorkoutHelper';
import {
  FEMALE_WORKOUT_IDS,
  MALE_WORKOUT_IDS,
} from '@/helpers/workoutVideos/workoutVideoHelper';
import { MUSCLE_LABELS } from './MuscleBodyMap';
import { triggerLightHaptic } from '@/lib/haptics';

interface ExercisePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: GeneratedExercise | null;
  onShuffle?: (exercise: GeneratedExercise) => void;
  isShuffling?: boolean;
  userGender?: string;
}

export function ExercisePreviewModal({
  visible,
  onClose,
  exercise,
  onShuffle,
  isShuffling = false,
  userGender,
}: ExercisePreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFirstFrameReady, setIsFirstFrameReady] = useState(false);
  const [dynamicVideo, setDynamicVideo] = useState<string | null>(null);
  const [isResolvingVideo, setIsResolvingVideo] = useState(false);

  const preferredRole: 'female' | 'male' = (userGender || 'male').toLowerCase().trim().includes('female') ? 'female' : 'male';

  const rawVideo = useMemo(() => {
    let candidateUrl: string | null = null;

    if (exercise?.video_url || (exercise as any)?.videoUrl) {
      candidateUrl = exercise?.video_url || (exercise as any)?.videoUrl || null;
    } else if ((exercise as any)?.workout_videos) {
      const wvList = (exercise as any).workout_videos;
      if (Array.isArray(wvList)) {
        const match = wvList.find((v: any) => isExerciseVideoMatchingGender(v, preferredRole));
        if (match?.videoUrl) candidateUrl = match.videoUrl;
        else if (wvList[0]?.videoUrl) candidateUrl = wvList[0].videoUrl;
      } else if (wvList?.videoUrl) {
        candidateUrl = wvList.videoUrl;
      }
    }

    // Verify candidateUrl matches preferredRole
    if (candidateUrl) {
      const isMatch = isExerciseVideoMatchingGender(
        {
          video_url: candidateUrl,
          exercise_name: exercise?.exercise_name || (exercise as any)?.exerciseName,
          workout_id: exercise?.workoutVideoId || exercise?.exercise_id,
        },
        preferredRole
      );
      if (isMatch) return candidateUrl;
    }

    return null;
  }, [exercise, preferredRole]);

  // If exercise object lacked video_url or it did not match gender, dynamically resolve it from workout_videos in Supabase
  useEffect(() => {
    if (!visible || !exercise) {
      setDynamicVideo(null);
      setIsResolvingVideo(false);
      return;
    }

    if (rawVideo) {
      setDynamicVideo(null);
      setIsResolvingVideo(false);
      return;
    }

    let isCancelled = false;
    setIsResolvingVideo(true);

    (async () => {
      try {
        const exName = exercise.exercise_name || (exercise as any)?.exerciseName || '';
        const muscle = (exercise.muscle_group as MuscleValue) || 'CHEST';
        const rpcAliases = (MUSCLE_RPC_ALIASES && MUSCLE_RPC_ALIASES[muscle]) || [muscle];
        const workoutTypeKey = (MUSCLE_TO_WORKOUT_TYPES[muscle] || ['chest'])[0];
        const knownWorkoutIds = preferredRole === 'female'
          ? (FEMALE_WORKOUT_IDS[workoutTypeKey] || Object.values(FEMALE_WORKOUT_IDS).flat())
          : (MALE_WORKOUT_IDS[workoutTypeKey] || Object.values(MALE_WORKOUT_IDS).flat());

        // 1. First try direct lookup by exercise name in workout_videos filtered by preferred gender workout IDs
        try {
          const { data: directVids } = await supabase
            .from('workout_videos')
            .select('workoutVideoId, videoUrl, exerciseName, workoutId')
            .ilike('exerciseName', `%${exName}%`)
            .in('workoutId', knownWorkoutIds)
            .eq('is_deleted', false)
            .limit(5);

          if (!isCancelled && directVids && directVids.length > 0) {
            const match = directVids.find(v => isExerciseVideoMatchingGender(v, preferredRole));
            if (match?.videoUrl) {
              setDynamicVideo(match.videoUrl);
              return;
            }
          }
        } catch (directErr) {
          console.warn('[ExercisePreviewModal] Direct gender video lookup error:', directErr);
        }

        // 2. Query get_custom_workout_videos RPC for this muscle group
        const { data: rpcVids, error: rpcErr } = await supabase.rpc('get_custom_workout_videos', {
          p_muscles: rpcAliases,
          p_equipment: [],
          p_limit: 40,
          p_exclude: [],
        });

        if (!isCancelled && rpcVids && rpcVids.length > 0) {
          // Strictly filter rpcVids by gender
          const genderVids = rpcVids.filter((v: any) => isExerciseVideoMatchingGender(v, preferredRole));

          const lowerExName = exName.toLowerCase().trim();

          // Match by name similarity
          const nameMatch = genderVids.find((v: any) => {
            const vName = (v.exercise_name || v.exerciseName || '').toLowerCase().trim();
            return vName && (lowerExName.includes(vName) || vName.includes(lowerExName));
          });
          if (nameMatch?.video_url || nameMatch?.videoUrl) {
            setDynamicVideo(nameMatch.video_url || nameMatch.videoUrl);
            return;
          }

          // Match by keywords
          const keywords = lowerExName
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .filter((w: string) => w.length > 2 && !['and', 'the', 'for', 'with'].includes(w));
          if (keywords.length > 0) {
            const lastWord = keywords[keywords.length - 1];
            const kwMatch = genderVids.find((v: any) => {
              const vName = (v.exercise_name || v.exerciseName || '').toLowerCase();
              return vName.includes(lastWord);
            });
            if (kwMatch?.video_url || kwMatch?.videoUrl) {
              setDynamicVideo(kwMatch.video_url || kwMatch.videoUrl);
              return;
            }
          }

          // Fallback to any non-stretching video of matching gender in this muscle
          const nonStretch = genderVids.find(
            (v: any) => (v.video_url || v.videoUrl) && !(v.exercise_name || '').toLowerCase().startsWith('stretching')
          );
          if (nonStretch?.video_url || nonStretch?.videoUrl) {
            setDynamicVideo(nonStretch.video_url || nonStretch.videoUrl);
            return;
          }

          // Any video in this muscle of matching gender
          const anyVid = genderVids.find((v: any) => v.video_url || v.videoUrl);
          if (anyVid?.video_url || anyVid?.videoUrl) {
            setDynamicVideo(anyVid.video_url || anyVid.videoUrl);
            return;
          }
        }

        // 3. Fallback: Any video from known gender workout IDs
        try {
          const { data: anyGenderVid } = await supabase
            .from('workout_videos')
            .select('videoUrl')
            .in('workoutId', knownWorkoutIds)
            .limit(1);

          if (!isCancelled && anyGenderVid && anyGenderVid.length > 0 && anyGenderVid[0]?.videoUrl) {
            setDynamicVideo(anyGenderVid[0].videoUrl);
            return;
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn('[ExercisePreviewModal] Video dynamic resolution error:', err);
      } finally {
        if (!isCancelled) setIsResolvingVideo(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [visible, exercise, rawVideo, preferredRole]);

  const effectiveRawVideo = rawVideo || dynamicVideo;

  const videoUri = useMemo(() => {
    if (!effectiveRawVideo) return null;
    const url = String(effectiveRawVideo).trim();
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('file://') ||
      url.startsWith('data:')
    ) {
      return url;
    }
    return supabase.storage.from('workout-videos').getPublicUrl(url).data.publicUrl;
  }, [effectiveRawVideo]);

  const title = exercise?.exercise_name || (exercise as any)?.exerciseName || 'Exercise';
  const muscleName =
    (exercise?.muscle_group && MUSCLE_LABELS[exercise.muscle_group as MuscleValue]) ??
    exercise?.muscle_group ??
    'Full Body';
  const sets = exercise?.default_sets || 3;
  const reps = exercise?.default_reps || '10';
  const difficulty = exercise?.difficulty ? exercise.difficulty.toUpperCase() : 'INTERMEDIATE';
  const category = exercise?.category || 'Strength';

  const muscleThumbnailSource = useMemo(() => {
    try {
      const customImg = exercise?.image_url || (exercise as any)?.image;
      if (typeof customImg === 'string' && customImg.trim().length > 0 && !customImg.includes('1571019614242')) {
        const trimmed = customImg.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          return { uri: trimmed };
        }
        return { uri: supabase.storage.from('workout-images').getPublicUrl(trimmed).data.publicUrl };
      }
      if (customImg && typeof customImg === 'object' && (customImg as any).uri) {
        return customImg;
      }
      return getMuscleThumbnailImage(exercise?.muscle_group, title);
    } catch {
      return getMuscleThumbnailImage(exercise?.muscle_group, title);
    }
  }, [exercise, title]);

  // Reset playing & loading state whenever modal visibility or exercise changes
  useEffect(() => {
    if (!visible) {
      setIsPlaying(false);
      setIsFirstFrameReady(false);
    }
  }, [visible]);

  useEffect(() => {
    setIsPlaying(false);
    setIsFirstFrameReady(false);
  }, [exercise?.exercise_id]);

  if (!visible || !exercise) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/75 justify-end">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="bg-[#121214] border-t border-[#27272A] rounded-t-3xl max-h-[85%] overflow-hidden">
          {/* Top Sheet Handle */}
          <View className="w-10 h-1 bg-[#2E2E32] rounded-full self-center mt-3 mb-2" />

          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-2">
            <View className="flex-1 mr-3">
              <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                {title}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <View className="bg-[#1A2000] px-2 py-0.5 rounded-md border border-[#C4EF00]/30">
                  <Text className="text-[#C4EF00] text-[11px] font-semibold tracking-wide">
                    {muscleName}
                  </Text>
                </View>
                <Text className="text-[#71717A] text-xs">
                  {category}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              hitSlop={12}
              className="w-8 h-8 rounded-full bg-[#1C1C1F] items-center justify-center border border-[#27272A]"
            >
              <X size={18} color="#A1A1AA" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }}
          >
            {/* Video Player / Thumbnail with Play Button */}
            <View className="w-full aspect-video bg-[#000] rounded-2xl overflow-hidden mb-4 border border-[#27272A] items-center justify-center relative">
              {!isPlaying ? (
                /* Static Thumbnail with Prominent Play Button */
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setIsPlaying(true);
                  }}
                  className="w-full h-full relative items-center justify-center active:opacity-90"
                >
                  <Image
                    source={muscleThumbnailSource}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/40 items-center justify-center">
                    <View className="w-14 h-14 rounded-full bg-black/80 border-2 border-[#C4EF00] items-center justify-center shadow-lg">
                      <Play size={24} color="#C4EF00" weight="fill" style={{ marginLeft: 2 }} />
                    </View>
                    <Text className="text-white text-xs font-semibold mt-2.5 tracking-wider uppercase">
                      Tap to Play Video
                    </Text>
                  </View>
                </Pressable>
              ) : videoUri ? (
                /* Active Video Player when User Manually Plays */
                <>
                  <Video
                    source={{ uri: videoUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.CONTAIN}
                    surfaceType="textureView"
                    useNativeControls={false}
                    shouldPlay={isPlaying}
                    isLooping={true}
                    onFirstFrameRender={() => setIsFirstFrameReady(true)}
                    onError={() => setIsPlaying(false)}
                  />

                  {/* Keep Thumbnail visible with spinner until first frame renders to eliminate black flashes */}
                  {!isFirstFrameReady && (
                    <View className="absolute inset-0">
                      <Image
                        source={muscleThumbnailSource}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      <View className="absolute inset-0 bg-black/45 items-center justify-center">
                        <ActivityIndicator size="small" color="#C4EF00" />
                        <Text className="text-white text-xs mt-2 font-medium">
                          Starting video...
                        </Text>
                      </View>
                    </View>
                  )}

                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setIsPlaying(false);
                    }}
                    hitSlop={8}
                    className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/70 items-center justify-center border border-white/20 active:opacity-75"
                  >
                    <Pause size={18} color="#FFF" weight="fill" />
                  </Pressable>
                </>
              ) : isResolvingVideo ? (
                /* Dynamic lookup in progress */
                <View className="w-full h-full relative items-center justify-center">
                  <Image
                    source={muscleThumbnailSource}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/55 items-center justify-center">
                    <ActivityIndicator size="small" color="#C4EF00" />
                    <Text className="text-[#C4EF00] text-xs mt-2 font-medium">
                      Loading video demonstration...
                    </Text>
                  </View>
                </View>
              ) : (
                /* Video not found fallback */
                <View className="w-full h-full relative items-center justify-center">
                  <Image
                    source={muscleThumbnailSource}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/60 items-center justify-center p-4">
                    <Barbell size={36} color="#C4EF00" weight="fill" />
                    <Text className="text-white text-xs mt-2 font-medium text-center">
                      Video demonstration coming soon
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Metrics Cards */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-[#1A1A1D] border border-[#27272A] p-3 rounded-2xl items-center">
                <Text className="text-[#71717A] text-[10px] font-semibold uppercase tracking-wider mb-1">
                  SETS
                </Text>
                <Text className="text-[#C4EF00] text-xl font-black">
                  {sets}
                </Text>
              </View>

              <View className="flex-1 bg-[#1A1A1D] border border-[#27272A] p-3 rounded-2xl items-center">
                <Text className="text-[#71717A] text-[10px] font-semibold uppercase tracking-wider mb-1">
                  REPS
                </Text>
                <Text className="text-white text-xl font-semibold">
                  {reps}
                </Text>
              </View>

              <View className="flex-1 bg-[#1A1A1D] border border-[#27272A] p-3 rounded-2xl items-center">
                <Text className="text-[#71717A] text-[10px] font-semibold uppercase tracking-wider mb-1">
                  LEVEL
                </Text>
                <Text className="text-[#A1A1AA] text-xs font-semibold mt-1">
                  {difficulty}
                </Text>
              </View>
            </View>

            {/* Instructions / Tips Card */}
            <View className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-6 h-6 rounded-lg bg-[#C4EF00]/15 items-center justify-center">
                  <Lightbulb size={14} color="#C4EF00" weight="fill" />
                </View>
                <Text className="text-white text-sm font-semibold">
                  Technique & Form Tips
                </Text>
              </View>

              <Text className="text-[#A1A1AA] text-xs leading-5">
                {exercise.description ||
                  `Maintain a tight, stabilized core throughout the full range of motion. Focus on mind-muscle connection during the contraction and control the eccentric (lowering) phase for 2-3 seconds.`}
              </Text>
            </View>

            {/* Actions: Shuffle alternative */}
            {onShuffle && (
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  onShuffle(exercise);
                }}
                disabled={isShuffling}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1F1F23] border border-[#2E2E33] flex-row items-center justify-center gap-2 active:opacity-80"
              >
                <ArrowsClockwise size={18} color="#C4EF00" weight="bold" />
                <Text className="text-white text-sm font-semibold">
                  {isShuffling ? 'Finding Alternative...' : 'Swap for Alternative Exercise'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
