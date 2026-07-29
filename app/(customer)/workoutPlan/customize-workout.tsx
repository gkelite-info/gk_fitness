import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, Image, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Plus, Check, MagnifyingGlass } from 'phosphor-react-native';
import { useWorkoutPlan, ExerciseItem } from './_layout';

// Dynamic exercise database mapping
const PRESET_EXERCISES: { [key: string]: { name: string; category: string; reps: string; isRecommended: boolean }[] } = {
  Chest: [
    { name: "Bench Press", category: "Compound", reps: "8-10 reps", isRecommended: true },
    { name: "Incline Dumbbell Press", category: "Compound", reps: "8-12 reps", isRecommended: true },
    { name: "Chest Press Machine", category: "Compound", reps: "10-12 reps", isRecommended: true },
    { name: "Cable Fly", category: "Isolation", reps: "12-15 reps", isRecommended: true },
    { name: "Push-ups", category: "Bodyweight", reps: "12-15 reps", isRecommended: true },
    { name: "Pec Deck", category: "Isolation", reps: "12-15 reps", isRecommended: false },
    { name: "Dips", category: "Compound", reps: "10-12 reps", isRecommended: false }
  ],
  Back: [
    { name: "Deadlift", category: "Compound", reps: "6-8 reps", isRecommended: true },
    { name: "Lat Pulldown", category: "Compound", reps: "10-12 reps", isRecommended: true },
    { name: "Seated Row", category: "Compound", reps: "8-12 reps", isRecommended: true },
    { name: "Single-Arm Row", category: "Isolation", reps: "10-12 reps", isRecommended: true },
    { name: "Pull-ups", category: "Bodyweight", reps: "8-10 reps", isRecommended: true },
    { name: "T-Bar Row", category: "Compound", reps: "8-10 reps", isRecommended: false },
    { name: "Hyper-extensions", category: "Bodyweight", reps: "12-15 reps", isRecommended: false }
  ],
  Legs: [
    { name: "Squats", category: "Compound", reps: "8-10 reps", isRecommended: true },
    { name: "Leg Press", category: "Compound", reps: "10-12 reps", isRecommended: true },
    { name: "Romanian Deadlift", category: "Compound", reps: "8-12 reps", isRecommended: true },
    { name: "Leg Extension", category: "Isolation", reps: "12-15 reps", isRecommended: true },
    { name: "Calf Raises", category: "Isolation", reps: "15-20 reps", isRecommended: true },
    { name: "Lunges", category: "Compound", reps: "10-12 reps", isRecommended: false },
    { name: "Hamstring Curls", category: "Isolation", reps: "12-15 reps", isRecommended: false }
  ],
  Arms: [
    { name: "Bicep Curls", category: "Isolation", reps: "10-12 reps", isRecommended: true },
    { name: "Hammer Curls", category: "Isolation", reps: "10-12 reps", isRecommended: true },
    { name: "Tricep Pushdown", category: "Isolation", reps: "12-15 reps", isRecommended: true },
    { name: "Overhead Extension", category: "Isolation", reps: "10-12 reps", isRecommended: true },
    { name: "Chin-ups", category: "Bodyweight", reps: "8-10 reps", isRecommended: true },
    { name: "Skull Crushers", category: "Compound", reps: "10-12 reps", isRecommended: false },
    { name: "Preacher Curls", category: "Isolation", reps: "10-12 reps", isRecommended: false }
  ],
  Shoulders: [
    { name: "Overhead Press", category: "Compound", reps: "8-10 reps", isRecommended: true },
    { name: "Lateral Raises", category: "Isolation", reps: "12-15 reps", isRecommended: true },
    { name: "Front Raises", category: "Isolation", reps: "10-12 reps", isRecommended: true },
    { name: "Reverse Pec Deck", category: "Isolation", reps: "12-15 reps", isRecommended: true },
    { name: "Shrugs", category: "Isolation", reps: "10-12 reps", isRecommended: true },
    { name: "Arnold Press", category: "Compound", reps: "10-12 reps", isRecommended: false },
    { name: "Face Pulls", category: "Isolation", reps: "12-15 reps", isRecommended: false }
  ],
  Core: [
    { name: "Plank", category: "Bodyweight", reps: "60s hold", isRecommended: true },
    { name: "Crunches", category: "Bodyweight", reps: "15-20 reps", isRecommended: true },
    { name: "Leg Raises", category: "Bodyweight", reps: "12-15 reps", isRecommended: true },
    { name: "Russian Twists", category: "Bodyweight", reps: "20 reps", isRecommended: true },
    { name: "Hanging Knee Raise", category: "Bodyweight", reps: "12-15 reps", isRecommended: true },
    { name: "Cable Woodchoppers", category: "Isolation", reps: "12 reps", isRecommended: false },
    { name: "Bicycle Crunches", category: "Bodyweight", reps: "20 reps", isRecommended: false }
  ],
  Cardio: [
    { name: "Treadmill Run", category: "Cardio", reps: "20 mins", isRecommended: true },
    { name: "Stationary Bike", category: "Cardio", reps: "15 mins", isRecommended: true },
    { name: "Rowing Machine", category: "Cardio", reps: "10 mins", isRecommended: true },
    { name: "Jump Rope", category: "Cardio", reps: "3x 2 mins", isRecommended: true },
    { name: "Elliptical", category: "Cardio", reps: "20 mins", isRecommended: true },
    { name: "Stair Climber", category: "Cardio", reps: "15 mins", isRecommended: false },
    { name: "HIIT Circuits", category: "Cardio", reps: "15 mins", isRecommended: false }
  ],
  Yoga: [
    { name: "Downward Dog Pose", category: "Flexibility", reps: "60s hold", isRecommended: true },
    { name: "Warrior Pose", category: "Flexibility", reps: "45s each", isRecommended: true },
    { name: "Cobra Pose", category: "Flexibility", reps: "30s hold", isRecommended: true },
    { name: "Child Pose", category: "Flexibility", reps: "90s hold", isRecommended: true },
    { name: "Tree Pose", category: "Balance", reps: "45s each", isRecommended: true },
    { name: "Bridge Pose", category: "Flexibility", reps: "60s hold", isRecommended: false },
    { name: "Cat Cow Pose", category: "Mobility", reps: "10 flows", isRecommended: false }
  ]
};

// Match muscle group image placeholders
const IMAGE_MAP: { [key: string]: any } = {
  Chest: require('../../../assets/chest-stood.png'),
  Back: require('../../../assets/back-stood.png'),
  Shoulders: require('../../../assets/shoulders-stood.png'),
  Legs: require('../../../assets/workout.png'),
  default: require('../../../assets/barbell.png'),
};

export default function CustomizeWorkout() {
  const { day, muscleGroup } = useLocalSearchParams<{ day: string; muscleGroup: string }>();
  const { planDays, setPlanDays } = useWorkoutPlan();

  const currentPlan = planDays[day || ''];

  // Set initial state from existing exercises, or defaults
  const [selectedExercises, setSelectedExercises] = useState<ExerciseItem[]>(() => {
    if (currentPlan && currentPlan.exercises && currentPlan.exercises.length > 0) {
      return currentPlan.exercises;
    }
    // Default to recommended items from preset list
    const presets = PRESET_EXERCISES[muscleGroup || ''] || [];
    return presets
      .filter(ex => ex.isRecommended)
      .map((ex, idx) => ({
        exerciseName: ex.name,
        category: ex.category,
        reps: ex.reps,
        order: idx
      }));
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Group preset exercises into "Recommended" and "Others"
  const allPresets = PRESET_EXERCISES[muscleGroup || ''] || [];

  const recommendedPresets = useMemo(() => {
    return allPresets.filter(p => p.isRecommended);
  }, [allPresets]);

  const otherPresets = useMemo(() => {
    const others = allPresets.filter(p => !p.isRecommended);
    if (!searchQuery) return others;
    return others.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allPresets, searchQuery]);

  const isChecked = (name: string) => {
    return selectedExercises.some(ex => ex.exerciseName === name);
  };

  const handleToggleRecommended = (name: string, category: string, reps: string) => {
    if (isChecked(name)) {
      setSelectedExercises(selectedExercises.filter(ex => ex.exerciseName !== name));
    } else {
      setSelectedExercises([
        ...selectedExercises,
        { exerciseName: name, category, reps, order: selectedExercises.length }
      ]);
    }
  };

  const handleAddOther = (name: string, category: string, reps: string) => {
    if (!isChecked(name)) {
      setSelectedExercises([
        ...selectedExercises,
        { exerciseName: name, category, reps, order: selectedExercises.length }
      ]);
    }
  };

  const handleSaveWorkout = () => {
    if (!day) return;

    setPlanDays(prev => ({
      ...prev,
      [day]: {
        dayOfWeek: day,
        workoutType: muscleGroup as any,
        exercises: selectedExercises,
        // Set standard 45-minute duration, or dynamic based on exercise count
        durationMinutes: selectedExercises.length * 8 + 5
      }
    }));

    router.push('/(customer)/workoutPlan/assign-days');
  };

  const exerciseImage = IMAGE_MAP[muscleGroup || ''] || IMAGE_MAP.default;

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-12 pb-28 justify-between">
      {/* Header */}
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
        {/* Title */}
        <Text className="text-white text-2xl font-semibold mb-1">Customize {day} -</Text>
        <Text className="text-[#C4EF00] text-2xl font-extrabold mb-2">{muscleGroup} Workout</Text>
        <Text className="text-[#8E8E8E] text-sm mb-6 leading-5">
          Select and arrange exercises for your workout.
        </Text>

        {/* Highlight Card */}
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
            <Text className="text-[#C4EF00] font-black text-xs">{selectedExercises.length} Selected</Text>
          </View>
        </View>

        {/* Recommended List */}
        <Text className="text-[#8E8E8E] text-xs font-semibold mb-4 tracking-wider">RECOMMENDED ({recommendedPresets.length})</Text>

        <View className="gap-3 mb-8">
          {recommendedPresets.map((ex) => {
            const selected = isChecked(ex.name);
            return (
              <Pressable
                key={ex.name}
                onPress={() => handleToggleRecommended(ex.name, ex.category, ex.reps)}
                className={`flex-row items-center border p-3.5 rounded-2xl justify-between ${selected ? 'border-[#C4EF00]/30 bg-[#161616]' : 'border-[#27272A] bg-[#111111]'
                  }`}
              >
                <View className="flex-row items-center flex-1">
                  {/* Exercise Image Thumbnail */}
                  <Image
                    source={exerciseImage}
                    className="w-14 h-14 rounded-xl mr-4 border border-[#242424]"
                    resizeMode="cover"
                  />
                  <View className="flex-1 pr-2">
                    <Text className="text-white font-semibold text-base">{ex.name}</Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <View className="bg-[#27272A] px-2 py-0.5 rounded-md">
                        <Text className="text-[#8E8E8E] text-[10px] font-semibold">{ex.category}</Text>
                      </View>
                      <Text className="text-[#8E8E8E] text-xs">• {ex.reps}</Text>
                    </View>
                  </View>
                </View>

                {/* Custom Checkbox */}
                <View className={`w-6 h-6 rounded-full border items-center justify-center ${selected
                  ? 'border-[#C4EF00] bg-[#C4EF00]'
                  : 'border-[#27272A]'
                  }`}>
                  {selected && <Check size={12} color="#000" weight="bold" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Search header / title */}
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

        {/* Search Input field */}
        {showSearchInput && (
          <View className="bg-[#111111] border border-[#27272A] rounded-2xl flex-row items-center px-4 py-3 mb-4 w-full">
            <MagnifyingGlass size={18} color="#8E8E8E" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search other exercises..."
              placeholderTextColor="#8E8E8E"
              className="flex-1 text-white ml-2 text-sm"
              keyboardAppearance="dark"
            />
          </View>
        )}

        {/* Other Exercises List */}
        <View className="gap-3">
          {otherPresets.map((ex) => {
            const added = isChecked(ex.name);
            return (
              <View
                key={ex.name}
                className={`flex-row items-center border p-3.5 rounded-2xl justify-between ${added ? 'border-[#C4EF00]/20 bg-[#161616]/50' : 'border-[#27272A] bg-[#111111]'
                  }`}
              >
                <View className="flex-row items-center flex-1">
                  <Image
                    source={IMAGE_MAP.default}
                    className="w-14 h-14 rounded-xl mr-4 border border-[#242424] opacity-70"
                    resizeMode="cover"
                  />
                  <View className="flex-1 pr-2">
                    <Text className="text-white font-semibold text-base">{ex.name}</Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <View className="bg-[#27272A] px-2 py-0.5 rounded-md">
                        <Text className="text-[#8E8E8E] text-[10px] font-semibold">{ex.category}</Text>
                      </View>
                      <Text className="text-[#8E8E8E] text-xs">• {ex.reps}</Text>
                    </View>
                  </View>
                </View>

                {/* Add button */}
                <Pressable
                  onPress={() => handleAddOther(ex.name, ex.category, ex.reps)}
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
            );
          })}
        </View>

        <Pressable
          onPress={handleSaveWorkout}
          className="w-full py-4 bg-[#C4EF00] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90 mt-4"
        >
          <Text className="text-black text-base font-semibold">Save Workout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
