import React, { useState, useCallback, useMemo } from 'react';
import { View, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  ArrowsClockwise,
  Trash,
  CaretUp,
  CaretDown,
  Barbell,
  PlayCircle,
} from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { GeneratedExercise, EquipmentValue, MuscleValue } from '@/hooks/customWorkout/useCustomWorkoutBuilder';
import { shuffleCustomExercise } from '@/helpers/customWorkout/customWorkoutHelper';
import { getMuscleThumbnailImage } from '@/lib/workoutMuscleImage';
import { MUSCLE_LABELS } from './MuscleBodyMap';
import { triggerLightHaptic } from '@/lib/haptics';
import { ExercisePreviewModal } from './ExercisePreviewModal';

interface GeneratedExerciseListProps {
  exercises: GeneratedExercise[];
  selectedEquipment: EquipmentValue[];
  selectedMuscles: MuscleValue[];
  isLoading: boolean;
  error: string | null;
  onReorder: (exercises: GeneratedExercise[]) => void;
  onRemove: (exerciseId: string) => void;
  onExerciseUpdated: (updatedExercise: GeneratedExercise, oldId: string) => void;
  userGender?: string;
}

function resolveExerciseThumbnailSource(item: GeneratedExercise): any {
  try {
    const rawImage = item?.image_url || (item as any)?.image;
    if (typeof rawImage === 'string' && rawImage.trim().length > 0 && !rawImage.includes('1571019614242')) {
      const trimmed = rawImage.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return { uri: trimmed };
      }
      return { uri: supabase.storage.from('workout-images').getPublicUrl(trimmed).data.publicUrl };
    }
    if (rawImage && typeof rawImage === 'object' && (rawImage as any).uri) {
      return rawImage;
    }
    const exName = item?.exercise_name || (item as any)?.exerciseName || '';
    return getMuscleThumbnailImage(item?.muscle_group, exName);
  } catch {
    return getMuscleThumbnailImage(item?.muscle_group);
  }
}

export function GeneratedExerciseList({
  exercises,
  selectedEquipment,
  selectedMuscles,
  isLoading,
  error,
  onReorder,
  onRemove,
  onExerciseUpdated,
  userGender,
}: GeneratedExerciseListProps) {
  const [shufflingId, setShufflingId] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<GeneratedExercise | null>(null);

  const allExerciseIds = useMemo(
    () => (exercises || []).map((e) => e?.exercise_id).filter(Boolean) as string[],
    [exercises]
  );

  const handleExerciseUpdated = useCallback(
    async (updated: GeneratedExercise, oldId: string) => {
      setShufflingId(oldId);
      try {
        await onExerciseUpdated(updated, oldId);
        // If preview modal is open for this exercise, update it too
        if (previewExercise?.exercise_id === oldId) {
          setPreviewExercise(updated);
        }
      } finally {
        setShufflingId(null);
      }
    },
    [onExerciseUpdated, previewExercise]
  );

  const handleShuffleExercise = useCallback(
    async (item: GeneratedExercise) => {
      triggerLightHaptic();
      setShufflingId(item.exercise_id);
      try {
        const replacement = await shuffleCustomExercise({
          exercise: item,
          selectedEquipment,
          allExerciseIds,
          gender: userGender,
        });
        if (replacement) {
          handleExerciseUpdated(
            { ...replacement, sort_order: item.sort_order, muscle_group: item.muscle_group },
            item.exercise_id
          );
        } else {
          Alert.alert('No alternatives', 'No other exercises found for this muscle group with selected equipment.');
        }
      } catch (e) {
        console.error('Shuffle error:', e);
      } finally {
        setShufflingId(null);
      }
    },
    [selectedEquipment, allExerciseIds, userGender, handleExerciseUpdated]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      triggerLightHaptic();
      const reordered = [...exercises];
      const temp = reordered[index];
      reordered[index] = reordered[index - 1];
      reordered[index - 1] = temp;
      onReorder(reordered.map((item, idx) => ({ ...item, sort_order: idx })));
    },
    [exercises, onReorder]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= exercises.length - 1) return;
      triggerLightHaptic();
      const reordered = [...exercises];
      const temp = reordered[index];
      reordered[index] = reordered[index + 1];
      reordered[index + 1] = temp;
      onReorder(reordered.map((item, idx) => ({ ...item, sort_order: idx })));
    },
    [exercises, onReorder]
  );

  if (isLoading) {
    return (
      <View className="items-center py-12">
        <ActivityIndicator size="large" color="#C4EF00" />
        <Text className="text-[#8E8E8E] text-sm mt-4">Generating your workout...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-[#1A0A0A] border border-red-900 rounded-2xl p-5 items-center">
        <Text className="text-red-400 text-center text-sm">{error}</Text>
      </View>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <View className="bg-[#111111] border border-[#27272A] rounded-2xl p-6 items-center">
        <Barbell size={36} color="#555" weight="fill" />
        <Text className="text-white text-base font-semibold mt-3 mb-1">No Exercises Found</Text>
        <Text className="text-[#8E8E8E] text-sm text-center">
          Try selecting different equipment or muscle groups.
        </Text>
      </View>
    );
  }

  return (
    <View className="w-full">
      <View className="flex-row items-center justify-between mb-3 px-1">
        <Text className="text-[#C4EF00] text-xs font-semibold tracking-wider uppercase">
          {exercises.length} Exercises Generated
        </Text>
        <Text className="text-[#71717A] text-[11px] font-medium">Tap to view video & details</Text>
      </View>

      {/* Fluid Mapped Exercise Cards */}
      <View className="w-full">
        {exercises.filter(Boolean).map((item, index) => {
          const exKey = item.exercise_id || item.workoutVideoId || `ex-${index}`;
          const isShuffling = shufflingId === item.exercise_id;
          const thumbnailSource = resolveExerciseThumbnailSource(item);

          const muscleName =
            (item?.muscle_group && MUSCLE_LABELS[item.muscle_group as MuscleValue]) ??
            item?.muscle_group ??
            'Full Body';

          const exerciseDisplayName = item?.exercise_name || (item as any)?.exerciseName || 'Exercise';

          return (
            <View
              key={exKey}
              className="flex-row items-center bg-[#111111] border border-[#27272A] rounded-2xl p-3 mb-2.5"
            >
              {/* Reorder Buttons (Up / Down) */}
              <View className="flex-col items-center justify-center mr-2">
                <Pressable
                  onPress={() => handleMoveUp(index)}
                  disabled={index === 0}
                  hitSlop={8}
                  className={`p-1 rounded-md ${index === 0 ? 'opacity-20' : 'active:bg-[#222]'}`}
                >
                  <CaretUp size={16} color={index === 0 ? '#444' : '#C4EF00'} weight="bold" />
                </Pressable>
                <Pressable
                  onPress={() => handleMoveDown(index)}
                  disabled={index === exercises.length - 1}
                  hitSlop={8}
                  className={`p-1 rounded-md ${index === exercises.length - 1 ? 'opacity-20' : 'active:bg-[#222]'}`}
                >
                  <CaretDown size={16} color={index === exercises.length - 1 ? '#444' : '#C4EF00'} weight="bold" />
                </Pressable>
              </View>

              {/* Clickable Card Body -> Opens Video & Info Modal */}
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setPreviewExercise(item);
                }}
                className="flex-1 flex-row items-center active:opacity-75"
              >
                {/* Exercise Thumbnail with Play Button Badge */}
                <View className="w-12 h-12 rounded-xl overflow-hidden bg-[#1A1A1D] mr-3 items-center justify-center relative border border-[#27272A]">
                  {thumbnailSource ? (
                    <Image
                      source={thumbnailSource}
                      style={{ width: 48, height: 48 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Barbell size={22} color="#555" weight="fill" />
                  )}

                  {/* Styled Play Badge Overlay */}
                  <View className="absolute inset-0 bg-black/35 items-center justify-center">
                    <PlayCircle size={24} color="#C4EF00" weight="fill" />
                  </View>

                  {isShuffling && (
                    <View className="absolute inset-0 bg-black/75 items-center justify-center">
                      <ActivityIndicator size="small" color="#C4EF00" />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View className="flex-1 mr-2">
                  <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                    {exerciseDisplayName}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <View className="bg-[#1A2000] px-1.5 py-0.5 rounded-md border border-[#C4EF00]/20">
                      <Text className="text-[#C4EF00] text-[10px] font-semibold">{muscleName}</Text>
                    </View>
                    <Text className="text-[#71717A] text-[11px] font-medium">
                      {item?.default_sets || 3} sets · {item?.default_reps || '10'}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Action Buttons: Shuffle & Delete */}
              <View className="flex-row items-center gap-1.5 ml-1">
                <Pressable
                  onPress={() => handleShuffleExercise(item)}
                  disabled={isShuffling}
                  hitSlop={8}
                  className="p-2 rounded-xl bg-[#1A1A1D] border border-[#2A2A2E] active:bg-[#252528]"
                >
                  <ArrowsClockwise
                    size={16}
                    color={isShuffling ? '#555' : '#C4EF00'}
                    weight="bold"
                  />
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    onRemove(item.exercise_id);
                  }}
                  hitSlop={8}
                  className="p-2 rounded-xl bg-[#1A1A1D] border border-[#2A2A2E] active:bg-[#252528]"
                >
                  <Trash size={16} color="#EF4444" weight="bold" />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {/* Exercise Video & Info Modal */}
      {previewExercise && (
        <ExercisePreviewModal
          visible={!!previewExercise}
          onClose={() => setPreviewExercise(null)}
          exercise={previewExercise}
          userGender={userGender}
          onShuffle={(ex) => {
            shuffleCustomExercise({
              exercise: ex,
              selectedEquipment,
              allExerciseIds,
              gender: userGender,
            }).then((replacement) => {
              if (replacement) {
                handleExerciseUpdated(
                  { ...replacement, sort_order: ex.sort_order, muscle_group: ex.muscle_group },
                  ex.exercise_id
                );
              } else {
                Alert.alert('No alternatives', 'No other exercises found with selected equipment.');
              }
            });
          }}
          isShuffling={!!(previewExercise && shufflingId === previewExercise.exercise_id)}
        />
      )}
    </View>
  );
}
