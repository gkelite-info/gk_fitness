import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  VideoCamera,
  CheckCircle,
  Check,
} from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getOrCreateWorkoutByType } from '@/helpers/workouts/workoutHelper';
import {
  uploadWorkoutVideoFile,
  saveWorkoutVideo,
  fetchWorkoutVideoById,
} from '@/helpers/workoutVideos/workoutVideoHelper';
import {
  EquipmentValue,
  MuscleValue,
} from '@/hooks/customWorkout/useCustomWorkoutBuilder';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'abs', label: 'Abs' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'legs', label: 'Legs' },
  { id: 'calves', label: 'Calves' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'hips', label: 'Hips' },
  { id: 'trapezius', label: 'Trapezius' },
];

const WORKOUT_TYPE_TO_PRIMARY_MUSCLE: Record<string, MuscleValue> = {
  chest: 'CHEST',
  back: 'BACK',
  shoulder: 'SHOULDERS',
  biceps: 'BICEPS',
  triceps: 'TRICEPS',
  forearms: 'FOREARMS',
  abs: 'ABDOMINALS',
  legs: 'QUADRICEPS',
  calves: 'CALVES',
  hips: 'GLUTES',
  trapezius: 'TRAPS',
};

const TARGET_MUSCLE_OPTIONS: { id: MuscleValue; label: string }[] = [
  { id: 'CHEST', label: 'Chest' },
  { id: 'BACK', label: 'Back' },
  { id: 'SHOULDERS', label: 'Shoulders' },
  { id: 'BICEPS', label: 'Biceps' },
  { id: 'TRICEPS', label: 'Triceps' },
  { id: 'FOREARMS', label: 'Forearms' },
  { id: 'ABDOMINALS', label: 'Abdominals' },
  { id: 'OBLIQUES', label: 'Obliques' },
  { id: 'QUADRICEPS', label: 'Quadriceps' },
  { id: 'HAMSTRINGS', label: 'Hamstrings' },
  { id: 'GLUTES', label: 'Glutes' },
  { id: 'CALVES', label: 'Calves' },
  { id: 'TRAPS', label: 'Traps' },
];

const EQUIPMENT_OPTIONS: { id: EquipmentValue; label: string }[] = [
  { id: 'BODY_ONLY', label: 'Bodyweight' },
  { id: 'DUMBBELL', label: 'Dumbbell' },
  { id: 'BARBELL', label: 'Barbell' },
  { id: 'CABLE', label: 'Cable Machine' },
  { id: 'MACHINE', label: 'Gym Machine' },
  { id: 'BENCH', label: 'Bench' },
  { id: 'PULLUP_BAR', label: 'Pull-up Bar' },
  { id: 'KETTLEBELLS', label: 'Kettlebell' },
  { id: 'BANDS', label: 'Resistance Band' },
  { id: 'WEIGHT_PLATE', label: 'Weight Plate' },
];

const DIFFICULTY_OPTIONS: { id: 'beginner' | 'intermediate' | 'advanced'; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const QUICK_SETS = [2, 3, 4, 5];
const QUICK_REPS = ['6-8', '8-10', '10-12', '12-15', '15-20'];

export default function AddWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const isEditMode = !!params.id;

  // Basic workout fields
  const [selectedGroup, setSelectedGroup] = useState<string | null>((params.workoutType as string) || null);
  const [selectedRole, setSelectedRole] = useState<'male' | 'female' | null>((params.role as any) || null);
  const [isStretching, setIsStretching] = useState<boolean>(params.isStretching === 'true');
  const [exerciseName, setExerciseName] = useState((params.exerciseName as string) || '');
  const [videoUri, setVideoUri] = useState<string | null>((params.videoUrl as string) || null);
  const [videoName, setVideoName] = useState<string | null>((params.videoUrl as string) || null);

  // Custom workout extended fields
  const parseJsonParam = (val: any, fallback: any) => {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  };

  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentValue[]>(
    parseJsonParam(params.equipment, ['BODY_ONLY'])
  );
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleValue | null>(
    (params.primaryMuscle as MuscleValue) || (selectedGroup ? WORKOUT_TYPE_TO_PRIMARY_MUSCLE[selectedGroup] : null) || null
  );
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleValue[]>(
    parseJsonParam(params.secondaryMuscles, [])
  );
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    (params.difficulty as any) || 'intermediate'
  );
  const [defaultSets, setDefaultSets] = useState<number>(
    params.defaultSets ? Number(params.defaultSets) : 3
  );
  const [defaultReps, setDefaultReps] = useState<string>(
    (params.defaultReps as string) || '10-12'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Fetch fresh record from DB in edit mode to guarantee full field fidelity
  useEffect(() => {
    if (isEditMode && params.id) {
      (async () => {
        try {
          const videoData = await fetchWorkoutVideoById(params.id as string);
          if (videoData) {
            if (videoData.exerciseName) setExerciseName(videoData.exerciseName);
            if (videoData.videoUrl) {
              setVideoUri(videoData.videoUrl);
              setVideoName(videoData.videoUrl);
            }
            if (Array.isArray(videoData.equipment) && videoData.equipment.length > 0) {
              setSelectedEquipment(videoData.equipment as EquipmentValue[]);
            }
            if (videoData.primaryMuscle) {
              setPrimaryMuscle(videoData.primaryMuscle as MuscleValue);
            }
            if (Array.isArray(videoData.secondaryMuscles)) {
              setSecondaryMuscles(videoData.secondaryMuscles as MuscleValue[]);
            }
            if (videoData.difficulty) {
              setDifficulty(videoData.difficulty as any);
            }
            if (videoData.defaultSets !== undefined && videoData.defaultSets !== null) {
              setDefaultSets(Number(videoData.defaultSets));
            }
            if (videoData.defaultReps) {
              setDefaultReps(videoData.defaultReps);
            }
          }
        } catch (err) {
          console.warn('[AddWorkout] Failed to load fresh video details by ID:', err);
        }
      })();
    }
  }, [isEditMode, params.id]);

  const handleBack = () => {
    triggerLightHaptic();
    router.push('/(superadmin)/dashboard/workouts');
  };

  const handleSelectGroup = (groupId: string) => {
    triggerLightHaptic();
    setSelectedGroup(groupId);
    // Auto-prefill primary muscle if not manually customized yet
    if (!primaryMuscle || !isEditMode) {
      const defaultTarget = WORKOUT_TYPE_TO_PRIMARY_MUSCLE[groupId];
      if (defaultTarget) {
        setPrimaryMuscle(defaultTarget);
      }
    }
  };

  const toggleEquipment = (eq: EquipmentValue) => {
    triggerLightHaptic();
    setSelectedEquipment((prev) => {
      if (prev.includes(eq)) {
        if (prev.length === 1) return prev; // Keep at least one equipment selected
        return prev.filter((item) => item !== eq);
      }
      return [...prev, eq];
    });
  };

  const toggleSecondaryMuscle = (muscle: MuscleValue) => {
    triggerLightHaptic();
    setSecondaryMuscles((prev) => {
      if (prev.includes(muscle)) {
        return prev.filter((m) => m !== muscle);
      }
      return [...prev, muscle];
    });
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
      toast.error('Please select a muscle category.');
      return;
    }

    if (!selectedRole) {
      triggerErrorHaptic();
      toast.error('Please select Male or Female.');
      return;
    }

    if (!exerciseName.trim()) {
      triggerErrorHaptic();
      toast.error('Please enter an exercise name.');
      return;
    }

    if (selectedEquipment.length === 0) {
      triggerErrorHaptic();
      toast.error('Please select at least one equipment type.');
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
      const workout = await getOrCreateWorkoutByType(workoutTypeKey, selectedRole, isStretching);

      if (!workout || !workout.workoutId) {
        throw new Error('Failed to resolve workout ID.');
      }

      let finalVideoUrl = videoUri;

      const isLocalUri =
        videoUri.startsWith('file://') ||
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
      const resolvedPrimaryMuscle = primaryMuscle || WORKOUT_TYPE_TO_PRIMARY_MUSCLE[selectedGroup] || 'CHEST';
      const resolvedSecondary = secondaryMuscles.filter((m) => m !== resolvedPrimaryMuscle);

      await saveWorkoutVideo({
        workoutVideoId: (params.id as string) || undefined,
        workoutId: workout.workoutId,
        videoUrl: finalVideoUrl,
        exerciseName: exerciseName.trim(),
        equipment: selectedEquipment,
        primaryMuscle: resolvedPrimaryMuscle,
        secondaryMuscles: resolvedSecondary,
        difficulty,
        defaultSets: Number(defaultSets) || 3,
        defaultReps: defaultReps.trim() || '10-12',
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
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-4 pt-0 border-b border-[#111827]">
        <Pressable
          onPress={handleBack}
          className="p-2 rounded-full bg-[#111622] border border-[#1F293D] active:opacity-75">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">
          {isEditMode ? 'Edit Workout Video' : 'Add Workout Video'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}>
        {/* 1. Category / Muscle Group */}
        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          1. Workout Category <Text className="text-red-500">*</Text>
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {MUSCLE_GROUPS.map((group) => {
            const isSelected = selectedGroup === group.id;
            return (
              <Pressable
                key={group.id}
                onPress={() => handleSelectGroup(group.id)}
                className={`px-4 py-2.5 rounded-xl border ${
                  isSelected
                    ? 'bg-[#BEF227] border-[#BEF227]'
                    : 'bg-[#111622] border-[#1F293D]'
                }`}>
                <Text className={`text-xs font-semibold ${isSelected ? 'text-black' : 'text-white'}`}>
                  {group.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 2. Target Role */}
        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          2. Target Gender / Role <Text className="text-red-500">*</Text>
        </Text>
        <View className="flex-row gap-3 mb-6">
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setSelectedRole('male');
            }}
            className={`flex-1 py-3 rounded-xl border flex-row items-center justify-center ${
              selectedRole === 'male'
                ? 'bg-[#1D2507] border-[#BEF227]'
                : 'bg-[#111622] border-[#1F293D]'
            }`}>
            <Text className={`font-semibold ${selectedRole === 'male' ? 'text-[#BEF227]' : 'text-white'}`}>
              Male
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setSelectedRole('female');
            }}
            className={`flex-1 py-3 rounded-xl border flex-row items-center justify-center ${
              selectedRole === 'female'
                ? 'bg-[#1D2507] border-[#BEF227]'
                : 'bg-[#111622] border-[#1F293D]'
            }`}>
            <Text className={`font-semibold ${selectedRole === 'female' ? 'text-[#BEF227]' : 'text-white'}`}>
              Female
            </Text>
          </Pressable>
        </View>

        {/* 3. Exercise Name */}
        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          3. Exercise Name <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          placeholder="e.g. Incline Dumbbell Bench Press"
          placeholderTextColor="#555555"
          value={exerciseName}
          onChangeText={setExerciseName}
          className="w-full bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 text-white text-base mb-6 font-sans"
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="words"
        />

        {/* 4. Equipment Required (Multi-Select) */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider">
            4. Equipment Required <Text className="text-red-500">*</Text>
          </Text>
          <Text className="text-xs text-[#BEF227] font-medium">
            {selectedEquipment.length} selected
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {EQUIPMENT_OPTIONS.map((item) => {
            const isSelected = selectedEquipment.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleEquipment(item.id)}
                className={`flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl border ${
                  isSelected
                    ? 'bg-[#1D2507] border-[#BEF227]'
                    : 'bg-[#111622] border-[#1F293D]'
                }`}>
                <View
                  className={`w-4 h-4 rounded items-center justify-center ${
                    isSelected ? 'bg-[#BEF227]' : 'border border-[#555555]'
                  }`}>
                  {isSelected && <Check size={12} color="#000000" weight="bold" />}
                </View>
                <Text className={`text-xs font-semibold ${isSelected ? 'text-[#BEF227]' : 'text-white'}`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 5. Primary Target Muscle */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider">
            5. Primary Muscle <Text className="text-red-500">*</Text>
          </Text>
          {primaryMuscle && (
            <View className="px-2 py-0.5 rounded bg-[#1D2507] border border-[#BEF227]">
              <Text className="text-[10px] font-bold text-[#BEF227]">{primaryMuscle}</Text>
            </View>
          )}
        </View>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {TARGET_MUSCLE_OPTIONS.map((m) => {
            const isSelected = primaryMuscle === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  triggerLightHaptic();
                  setPrimaryMuscle(m.id);
                }}
                className={`px-3 py-2 rounded-xl border ${
                  isSelected
                    ? 'bg-[#BEF227] border-[#BEF227]'
                    : 'bg-[#111622] border-[#1F293D]'
                }`}>
                <Text className={`text-xs font-semibold ${isSelected ? 'text-black' : 'text-white'}`}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 6. Secondary Muscles (Multi-select) */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider">
            6. Secondary Muscles (Optional)
          </Text>
          <Text className="text-xs text-[#888888]">
            {secondaryMuscles.length} selected
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {TARGET_MUSCLE_OPTIONS.filter((m) => m.id !== primaryMuscle).map((m) => {
            const isSelected = secondaryMuscles.includes(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => toggleSecondaryMuscle(m.id)}
                className={`px-3 py-2 rounded-xl border ${
                  isSelected
                    ? 'bg-[#1D2507] border-[#BEF227]'
                    : 'bg-[#111622] border-[#1F293D]'
                }`}>
                <Text className={`text-xs font-semibold ${isSelected ? 'text-[#BEF227]' : 'text-[#888888]'}`}>
                  {isSelected ? `✓ ${m.label}` : m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 7. Difficulty */}
        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          7. Difficulty Level
        </Text>
        <View className="flex-row bg-[#111622] border border-[#1F293D] rounded-xl overflow-hidden h-[46px] mb-6">
          {DIFFICULTY_OPTIONS.map((diff, index) => {
            const isSelected = difficulty === diff.id;
            return (
              <React.Fragment key={diff.id}>
                {index > 0 && <View className="w-[1px] bg-[#1F293D]" />}
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setDifficulty(diff.id);
                  }}
                  className={`flex-1 items-center justify-center ${
                    isSelected ? 'bg-[#BEF227]' : ''
                  }`}>
                  <Text
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isSelected ? 'text-black' : 'text-[#888888]'
                    }`}>
                    {diff.label}
                  </Text>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* 8. Default Sets & Reps */}
        <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-6">
          <Text className="text-sm font-semibold text-white mb-3">
            8. Default Sets & Reps
          </Text>

          {/* Sets */}
          <Text className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
            Target Sets
          </Text>
          <View className="flex-row items-center gap-2 mb-4">
            {QUICK_SETS.map((s) => {
              const isSelected = defaultSets === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    triggerLightHaptic();
                    setDefaultSets(s);
                  }}
                  className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                    isSelected
                      ? 'bg-[#BEF227] border-[#BEF227]'
                      : 'bg-[#111622] border-[#1F293D]'
                  }`}>
                  <Text className={`text-xs font-bold ${isSelected ? 'text-black' : 'text-white'}`}>
                    {s} Sets
                  </Text>
                </Pressable>
              );
            })}
            <TextInput
              keyboardType="number-pad"
              value={String(defaultSets || '')}
              onChangeText={(text) => setDefaultSets(parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)}
              className="w-16 bg-[#111622] border border-[#1F293D] rounded-xl py-2 px-2 text-center text-white text-xs font-bold"
              placeholder="Qty"
              placeholderTextColor="#555555"
            />
          </View>

          {/* Reps */}
          <Text className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
            Target Reps Range
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {QUICK_REPS.map((r) => {
              const isSelected = defaultReps === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    triggerLightHaptic();
                    setDefaultReps(r);
                  }}
                  className={`px-3 py-2 rounded-xl border ${
                    isSelected
                      ? 'bg-[#1D2507] border-[#BEF227]'
                      : 'bg-[#111622] border-[#1F293D]'
                  }`}>
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-[#BEF227]' : 'text-white'}`}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            placeholder="Custom reps (e.g. 10-12, 15, to failure)"
            placeholderTextColor="#555555"
            value={defaultReps}
            onChangeText={setDefaultReps}
            className="w-full bg-[#111622] border border-[#1F293D] rounded-xl p-3 text-white text-xs font-sans"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* 9. Is Stretching Toggle */}
        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          9. Stretching / Warmup
        </Text>
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setIsStretching(!isStretching);
          }}
          className={`mb-6 py-3.5 px-4 rounded-xl border flex-row items-center justify-between ${
            isStretching
              ? 'bg-[#1D2507] border-[#BEF227]'
              : 'bg-[#111622] border-[#1F293D]'
          }`}>
          <View>
            <Text className={`font-semibold ${isStretching ? 'text-[#BEF227]' : 'text-white'}`}>
              Stretching Exercise
            </Text>
            <Text className="text-xs text-[#888888] mt-0.5">
              Mark if used for mobility, warmups, or cooldowns
            </Text>
          </View>
          <View
            className={`w-6 h-6 rounded-full border items-center justify-center ${
              isStretching ? 'border-[#BEF227] bg-[#BEF227]' : 'border-[#888888]'
            }`}>
            {isStretching && <CheckCircle size={16} color="#000000" weight="fill" />}
          </View>
        </Pressable>

        {/* 10. Video / GIF Media Uploader */}
        <Text className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
          10. Upload Video / GIF <Text className="text-red-500">*</Text>
        </Text>

        {videoUri ? (
          <View className="bg-[#111622] border border-[#1F293D] rounded-2xl p-5 items-center mb-8">
            <View className="mb-2">
              <CheckCircle size={36} color="#BEF227" weight="fill" />
            </View>
            <Text className="text-white text-sm font-semibold text-center mb-1">
              Video File Selected
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

        {/* 11. Submit Button */}
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
            disabled={!selectedRole || isSubmitting}
            className={`py-4 rounded-2xl items-center justify-center active:opacity-90 ${
              !selectedRole || isSubmitting ? 'bg-[#BEF227]/50' : 'bg-[#BEF227]'
            }`}>
            <Text className="text-sm font-bold text-black">
              {isEditMode ? 'Update Workout' : 'Save Workout Video / GIF'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
