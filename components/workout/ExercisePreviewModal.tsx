import React, { useState, useMemo, useEffect } from 'react';
import { View, Pressable, Modal, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { X, Barbell, Lightbulb, Play, Pause, ArrowsClockwise } from 'phosphor-react-native';
import { Video, ResizeMode } from '@/components/ui/Video';
import { supabase } from '@/lib/supabase';
import { GeneratedExercise, MuscleValue } from '@/hooks/customWorkout/useCustomWorkoutBuilder';
import { MUSCLE_TO_WORKOUT_TYPES } from '@/helpers/customWorkout/customWorkoutHelper';
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [dynamicVideo, setDynamicVideo] = useState<string | null>(null);
  const [isResolvingVideo, setIsResolvingVideo] = useState(false);

  const rawVideo = useMemo(() => {
    if (exercise?.video_url || (exercise as any)?.videoUrl) {
      return exercise?.video_url || (exercise as any)?.videoUrl;
    }
    if ((exercise as any)?.workout_videos) {
      const wvList = (exercise as any).workout_videos;
      if (Array.isArray(wvList)) {
        const preferredRole = (userGender || 'male').toLowerCase().trim().includes('female') ? 'female' : 'male';
        const match = wvList.find((v: any) => v.gender?.toLowerCase() === preferredRole || v.workouts?.role?.toLowerCase() === preferredRole);
        if (match?.videoUrl) return match.videoUrl;
        const neutral = wvList.find((v: any) => !v.gender || v.gender === 'all');
        if (neutral?.videoUrl) return neutral.videoUrl;
        return wvList[0]?.videoUrl;
      } else if (wvList?.videoUrl) {
        return wvList.videoUrl;
      }
    }
    return null;
  }, [exercise, userGender]);

  // If exercise object lacked video_url, dynamically resolve it from workout_videos in Supabase
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
        const preferredRole = (userGender || 'male').toLowerCase().trim().includes('female') ? 'female' : 'male';
        const exName = exercise.exercise_name || (exercise as any)?.exerciseName || '';
        const muscle = (exercise.muscle_group as MuscleValue) || 'CHEST';
        const targetTypes = MUSCLE_TO_WORKOUT_TYPES[muscle] || [];

        // 1. Try finding by workoutVideoId if valid
        const vidId = exercise.workoutVideoId || (exercise as any)?.workout_video_id;
        if (vidId && !vidId.startsWith('fallback-')) {
          const { data: byId } = await supabase
            .from('workout_videos')
            .select('videoUrl')
            .eq('workoutVideoId', vidId)
            .maybeSingle();

          if (!isCancelled && byId?.videoUrl) {
            setDynamicVideo(byId.videoUrl);
            return;
          }
        }

        // 2. Try finding by exerciseName keywords
        const keywords = exName
          .replace(/[^\w\s]/g, '')
          .split(' ')
          .filter((w: string) => w.length > 2 && !['and', 'the', 'for', 'with'].includes(w.toLowerCase()));

        if (keywords.length > 0) {
          const lastWord = keywords[keywords.length - 1];
          let { data: byName } = await supabase
            .from('workout_videos')
            .select('videoUrl, workouts:workoutId(role, workoutType)')
            .ilike('exerciseName', `%${lastWord}%`)
            .not('videoUrl', 'is', null)
            .neq('videoUrl', '')
            .or('is_deleted.eq.false,is_deleted.is.null')
            .limit(10);

          if (!isCancelled && byName && byName.length > 0) {
            const match =
              byName.find((v: any) => v.workouts?.role?.toLowerCase() === preferredRole) ||
              byName.find((v: any) => !v.workouts?.role || v.workouts?.role?.toLowerCase() === 'all') ||
              byName[0];
            if (match?.videoUrl) {
              setDynamicVideo(match.videoUrl);
              return;
            }
          }
        }

        // 3. Fallback to ANY video matching this muscle category from DB
        if (targetTypes.length > 0) {
          const { data: matchedWorkouts } = await supabase
            .from('workouts')
            .select('workoutId')
            .in('workoutType', targetTypes)
            .or('is_deleted.eq.false,is_deleted.is.null');

          const wIds = matchedWorkouts?.map((w: any) => w.workoutId) || [];
          if (wIds.length > 0) {
            const { data: byType } = await supabase
              .from('workout_videos')
              .select('videoUrl, workouts:workoutId(role)')
              .in('workoutId', wIds)
              .not('videoUrl', 'is', null)
              .neq('videoUrl', '')
              .or('is_deleted.eq.false,is_deleted.is.null')
              .limit(10);

            if (!isCancelled && byType && byType.length > 0) {
              const match =
                byType.find((v: any) => v.workouts?.role?.toLowerCase() === preferredRole) ||
                byType.find((v: any) => !v.workouts?.role || v.workouts?.role?.toLowerCase() === 'all') ||
                byType[0];
              if (match?.videoUrl) {
                setDynamicVideo(match.videoUrl);
                return;
              }
            }
          }
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
  }, [visible, exercise, rawVideo, userGender]);

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

  if (!exercise) return null;

  const title = exercise.exercise_name || (exercise as any)?.exerciseName || 'Exercise';
  const muscleName = MUSCLE_LABELS[exercise.muscle_group as MuscleValue] ?? exercise.muscle_group ?? 'Full Body';
  const sets = exercise.default_sets || 3;
  const reps = exercise.default_reps || '10';
  const difficulty = exercise.difficulty ? exercise.difficulty.toUpperCase() : 'INTERMEDIATE';
  const category = exercise.category || 'Strength';

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
            {/* Video Player */}
            <View className="w-full aspect-video bg-[#000] rounded-2xl overflow-hidden mb-4 border border-[#27272A] items-center justify-center relative">
              {videoUri ? (
                <>
                  <Video
                    source={{ uri: videoUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isPlaying}
                    isLooping
                  />
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setIsPlaying((prev) => !prev);
                    }}
                    className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/60 items-center justify-center border border-white/20"
                  >
                    {isPlaying ? (
                      <Pause size={18} color="#FFF" weight="fill" />
                    ) : (
                      <Play size={18} color="#C4EF00" weight="fill" />
                    )}
                  </Pressable>
                </>
              ) : isResolvingVideo ? (
                <View className="items-center justify-center p-6">
                  <ActivityIndicator size="small" color="#C4EF00" />
                  <Text className="text-[#A1A1AA] text-xs mt-2 font-medium">
                    Loading video demonstration...
                  </Text>
                </View>
              ) : (
                <View className="items-center justify-center p-6">
                  <Barbell size={40} color="#3F3F46" weight="fill" />
                  <Text className="text-[#71717A] text-xs mt-2 font-medium">
                    Video demonstration coming soon
                  </Text>
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
                <Text className="text-white text-xl font-black">
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
