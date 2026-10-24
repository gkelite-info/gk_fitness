import React, { useState, useMemo } from 'react';
import { View, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { X, Barbell, Lightbulb, Play, Pause, ArrowsClockwise } from 'phosphor-react-native';
import { Video, ResizeMode } from '@/components/ui/Video';
import { supabase } from '@/lib/supabase';
import { GeneratedExercise, MuscleValue } from '@/hooks/customWorkout/useCustomWorkoutBuilder';
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

  const videoUri = useMemo(() => {
    if (!rawVideo) return null;
    const url = String(rawVideo).trim();
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('file://') ||
      url.startsWith('data:')
    ) {
      return url;
    }
    return supabase.storage.from('workout-videos').getPublicUrl(url).data.publicUrl;
  }, [rawVideo]);

  if (!exercise) return null;

  const title = exercise.exercise_name || (exercise as any)?.exerciseName || 'Exercise';
  const muscleName = MUSCLE_LABELS[exercise.muscle_group as MuscleValue] ?? exercise.muscle_group ?? 'Full Body';
  const sets = exercise.default_sets || 3;
  const reps = exercise.default_reps || '10-12';
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
              <Text className="text-white text-lg font-bold" numberOfLines={1}>
                {title}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <View className="bg-[#1A2000] px-2 py-0.5 rounded-md border border-[#C4EF00]/30">
                  <Text className="text-[#C4EF00] text-[11px] font-bold tracking-wide">
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
                <Text className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1">
                  SETS
                </Text>
                <Text className="text-[#C4EF00] text-xl font-black">
                  {sets}
                </Text>
              </View>

              <View className="flex-1 bg-[#1A1A1D] border border-[#27272A] p-3 rounded-2xl items-center">
                <Text className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1">
                  REPS
                </Text>
                <Text className="text-white text-xl font-black">
                  {reps}
                </Text>
              </View>

              <View className="flex-1 bg-[#1A1A1D] border border-[#27272A] p-3 rounded-2xl items-center">
                <Text className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1">
                  LEVEL
                </Text>
                <Text className="text-[#A1A1AA] text-xs font-bold mt-1">
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
                <Text className="text-white text-sm font-bold">
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
