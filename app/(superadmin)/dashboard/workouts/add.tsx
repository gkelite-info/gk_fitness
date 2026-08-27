import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, VideoCamera, CheckCircle, Barbell } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getOrCreateWorkoutByType } from '@/helpers/workouts/workoutHelper';
import { uploadWorkoutVideoFile, saveWorkoutVideo } from '@/helpers/workoutVideos/workoutVideoHelper';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase'; const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'abs', label: 'Abs' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'legs', label: 'Legs' },
];

export default function AddWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const isEditMode = !!params.id;

  const [selectedGroup, setSelectedGroup] = useState<string | null>((params.workoutType as string) || null);
  const [exerciseName, setExerciseName] = useState((params.exerciseName as string) || '');
  const [videoUri, setVideoUri] = useState<string | null>((params.videoUrl as string) || null);
  const [videoName, setVideoName] = useState<string | null>((params.videoUrl as string) || null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleBack = () => {
    triggerLightHaptic();
    router.push('/(superadmin)/dashboard/workouts');
  };

  const handlePickVideo = async () => {
    triggerLightHaptic();
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      toast.error('Access to your media library is required to select a workout video or GIF.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      setVideoUri(selectedAsset.uri);

      const filename = selectedAsset.fileName || selectedAsset.uri.split('/').pop() || 'workout_video.mp4';
      setVideoName(filename);
    }
  };

  const handleSave = async () => {
    if (!selectedGroup) {
      triggerErrorHaptic();
      toast.error('Please select a muscle group.');
      return;
    }

    if (!exerciseName.trim()) {
      triggerErrorHaptic();
      toast.error('Please enter an exercise name.');
      return;
    }

    if (!videoUri) {
      triggerErrorHaptic();
      toast.error('Please select a workout video or GIF.');
      return;
    }

    setIsSubmitting(true);
    try {
      setUploadProgress('Resolving workout group...');
      const workoutTypeKey = selectedGroup as any;
      const workout = await getOrCreateWorkoutByType(workoutTypeKey);

      if (!workout || !workout.workoutId) {
        throw new Error('Failed to resolve workout ID.');
      }

      let finalVideoUrl = videoUri;

      const isLocalUri = videoUri.startsWith('file://') ||
        videoUri.startsWith('content://') ||
        videoUri.startsWith('ph://') ||
        videoUri.startsWith('blob:') ||
        videoUri.includes('var/mobile/Containers');

      if (isLocalUri) {
        setUploadProgress('Uploading video to storage...');
        const fileExt = videoName?.split('.').pop() || 'mp4';
        const uploadedFilename = await uploadWorkoutVideoFile(videoUri, fileExt);

        if (!uploadedFilename) {
          throw new Error('Failed to upload video.');
        }

        if (isEditMode && params.videoUrl) {
          const oldFilename = params.videoUrl as string;
          try {
            await supabase.storage.from('workout-videos').remove([oldFilename]);
          } catch (deleteError) {
            console.error('[AddWorkout] Failed to delete old video:', deleteError);
          }
        }

        finalVideoUrl = uploadedFilename;
      }

      setUploadProgress('Saving workout details...');
      await saveWorkoutVideo({
        workoutVideoId: (params.id as string) || undefined,
        workoutId: workout.workoutId,
        videoUrl: finalVideoUrl,
        exerciseName: exerciseName.trim(),
      });

      triggerSuccessHaptic();
      toast.success(isEditMode ? 'Workout video updated successfully!' : 'Workout video added successfully!');
      router.replace('/(superadmin)/dashboard/workouts' as any);
    } catch (error: any) {
      triggerErrorHaptic();
      console.error('[AddWorkout] Error in handleSave catch block:', error);
      toast.error(error.message || 'Failed to save workout video. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 py-4 pt-0 border-b border-[#111827]">
        <Pressable onPress={handleBack} className="p-2 rounded-full bg-[#111622] border border-[#1F293D] active:opacity-75">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">{isEditMode ? 'Edit Workout Video' : 'Add Workout Video'}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          1. Select Muscle Group <Text className="text-red-500">*</Text>
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {MUSCLE_GROUPS.map((group) => {
            const isSelected = selectedGroup === group.id;
            return (
              <Pressable
                key={group.id}
                onPress={() => {
                  triggerLightHaptic();
                  setSelectedGroup(group.id);
                }}
                className={`px-4 py-2.5 rounded-xl border ${isSelected
                  ? 'bg-[#BEF227] border-[#BEF227]'
                  : 'bg-[#111622] border-[#1F293D]'
                  }`}>
                <Text
                  className={`text-xs font-semibold ${isSelected ? 'text-black' : 'text-white'
                    }`}>
                  {group.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          2. Enter Exercise Name <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          placeholder="e.g. Incline Dumbbell Press"
          placeholderTextColor="#555555"
          value={exerciseName}
          onChangeText={setExerciseName}
          className="w-full bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 text-white text-base mb-6 font-sans"
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="words"
        />

        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          3. Upload Video <Text className="text-red-500">*</Text>
        </Text>

        {videoUri ? (
          <View className="bg-[#111622] border border-[#1F293D] rounded-2xl p-4 items-center mb-8">
            <View className="mb-2">
              <CheckCircle size={36} color="#BEF227" weight="fill" />
            </View>
            <Text className="text-white text-sm font-semibold text-center mb-1">
              Video Selected
            </Text>
            <Text className="text-xs text-[#888888] text-center mb-4 px-4" numberOfLines={2}>
              {videoName}
            </Text>
            <Pressable
              onPress={handlePickVideo}
              className="px-4 py-2 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] active:opacity-75">
              <Text className="text-xs font-semibold text-white">Change Video</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handlePickVideo}
            className="border-2 border-dashed border-[#1F293D] rounded-2xl p-8 items-center justify-center bg-[#0F0F0F] mb-8 active:opacity-75">
            <View className="mb-3">
              <VideoCamera size={36} color="#888888" />
            </View>
            <Text className="text-white text-sm font-semibold">Select Workout Video or GIF</Text>
            <Text className="text-xs text-[#555555] mt-1">MP4, MOV, GIF formats supported</Text>
          </Pressable>
        )}

        {isSubmitting ? (
          <View className="bg-[#BEF227] py-4 rounded-2xl items-center justify-center flex-row gap-2 opacity-80">
            <ActivityIndicator size="small" color="#000000" />
            <Text className="text-sm font-semibold text-black">
              {uploadProgress || 'Saving...'}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleSave}
            className="bg-[#BEF227] py-4 rounded-2xl items-center justify-center active:opacity-90">
            <Text className="text-sm font-semibold text-black">{isEditMode ? 'Update Workout' : 'Save Workout Video/GIF'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
