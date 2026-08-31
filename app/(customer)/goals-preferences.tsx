import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, Info, Target, Barbell, Heart, Lightning, Moon, Sun, SunHorizon, Person, Check, Heartbeat, PersonArmsSpread
} from 'phosphor-react-native';
import { mockProfileData } from '@/constants/mockProfileData';
import { useUser } from '@/context/UserContext';
import { useCustomerGoalPreference, useSaveCustomerGoalPreference } from '@/hooks/customers/useCustomerGoalPreferences';
import { toast } from '@/lib/toast';

export default function GoalsPreferencesScreen() {
  const { userId } = useUser();
  const { data: preferences, isLoading } = useCustomerGoalPreference(userId || undefined);
  const saveMutation = useSaveCustomerGoalPreference();

  if (!userId) {
    return null;
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0F0F0F] justify-center items-center">
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  return (
    <GoalsPreferencesView
      userId={userId}
      preferences={preferences}
      saveMutation={saveMutation}
    />
  );
}

function GoalsPreferencesView({ userId, preferences, saveMutation }: { userId: string, preferences: any, saveMutation: any }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedGoal, setSelectedGoal] = useState<any>(preferences?.fitnessGoal || '');
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>(
    preferences?.preferredWorkouts || []
  );
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(preferences?.weeklyTarget || null);
  const [workoutTime, setWorkoutTime] = useState<string[]>(
    preferences?.workoutTime || []
  );

  const toggleWorkout = (workout: string) => {
    if (selectedWorkouts.includes(workout)) {
      setSelectedWorkouts(selectedWorkouts.filter(w => w !== workout));
    } else {
      setSelectedWorkouts([...selectedWorkouts, workout]);
    }
  };

  const toggleWorkoutTime = (time: string) => {
    if (workoutTime.includes(time)) {
      setWorkoutTime(workoutTime.filter(t => t !== time));
    } else {
      setWorkoutTime([...workoutTime, time]);
    }
  };

  const isDirty =
    selectedGoal !== (preferences?.fitnessGoal || '') ||
    weeklyTarget !== (preferences?.weeklyTarget || null) ||
    selectedWorkouts.length !== (preferences?.preferredWorkouts?.length || 0) ||
    !selectedWorkouts.every(w => (preferences?.preferredWorkouts || []).includes(w)) ||
    workoutTime.length !== (preferences?.workoutTime?.length || 0) ||
    !workoutTime.every(t => (preferences?.workoutTime || []).includes(t));

  const handleSave = () => {

    if (!selectedGoal) {
      toast.error('Please select a fitness goal');
      return;
    }
    if (selectedWorkouts.length === 0) {
      console.warn('[GoalsPreferences] Save aborted: No workouts selected');
      toast.error('Please select at least one preferred workout');
      return;
    }
    if (!weeklyTarget) {
      toast.error('Please select a weekly target');
      return;
    }
    if (workoutTime.length === 0) {
      toast.error('Please select at least one workout time');
      return;
    }

    const payload = {
      customerGoalPreferenceId: preferences?.customerGoalPreferenceId,
      userId,
      fitnessGoal: selectedGoal,
      preferredWorkouts: selectedWorkouts as any,
      weeklyTarget,
      workoutTime: workoutTime as any,
    };

    saveMutation.mutate(payload, {
      onSuccess: (data: any) => {
        toast.success(preferences ? 'Preferences updated successfully!' : 'Preferences saved successfully!');
      },
      onError: (error: any) => {
        console.error('[GoalsPreferences] Save mutation failed:', error);
        toast.error(error.message || 'Failed to save preferences');
      }
    });
  };

  return (
    <View className="flex-1 bg-[#0F0F0F] pb-20" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={() => router.back()} className="p-2">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-semibold">Goals & Preferences</Text>
        <Pressable className="p-2">
          <Info size={24} color="#D4FF00" weight="regular" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[#A1A1AA] text-sm text-center mt-6 mb-8 px-4 leading-relaxed">
          Update your goals and preferences to get a more personalized experience.
        </Text>

        <Text className="text-white text-lg font-semibold mb-4">Fitness Goal</Text>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          <GoalCard
            icon={<Target size={28} color={selectedGoal === 'weightloss' ? '#D4FF00' : '#8E8E93'} weight={selectedGoal === 'weightloss' ? 'bold' : 'regular'} />}
            title="Weight Loss"
            subtitle="Lose weight and burn fat"
            isSelected={selectedGoal === 'weightloss'}
            onPress={() => setSelectedGoal('weightloss')}
          />
          <GoalCard
            icon={<Barbell size={28} color={selectedGoal === 'musclegain' ? '#D4FF00' : '#8E8E93'} weight={selectedGoal === 'musclegain' ? 'bold' : 'regular'} />}
            title="Muscle Gain"
            subtitle="Build muscle and get stronger"
            isSelected={selectedGoal === 'musclegain'}
            onPress={() => setSelectedGoal('musclegain')}
          />
          <GoalCard
            icon={<Heartbeat size={28} color={selectedGoal === 'maintainfitness' ? '#D4FF00' : '#8E8E93'} weight={selectedGoal === 'maintainfitness' ? 'bold' : 'regular'} />}
            title="Maintain Fitness"
            subtitle="Stay fit and maintain health"
            isSelected={selectedGoal === 'maintainfitness'}
            onPress={() => setSelectedGoal('maintainfitness')}
          />
          <GoalCard
            icon={<Heart size={28} color={selectedGoal === 'improveendurance' ? '#D4FF00' : '#8E8E93'} weight={selectedGoal === 'improveendurance' ? 'bold' : 'regular'} />}
            title="Improve Endurance"
            subtitle="Boost stamina and endurance"
            isSelected={selectedGoal === 'improveendurance'}
            onPress={() => setSelectedGoal('improveendurance')}
          />
        </View>

        <View className="flex-row justify-between items-end mt-8 mb-4">
          <Text className="text-white text-lg font-semibold">Preferred Workouts</Text>
          <Text className="text-[#D4FF00] text-xs font-semibold mb-1">Select all that apply</Text>
        </View>
        <View className="flex-row flex-wrap gap-3">
          <WorkoutPill
            icon={<Barbell size={16} color={selectedWorkouts.includes('strength') ? '#D4FF00' : '#8E8E93'} weight="bold" />}
            title="Strength"
            isSelected={selectedWorkouts.includes('strength')}
            onPress={() => toggleWorkout('strength')}
          />
          <WorkoutPill
            icon={<Lightning size={16} color={selectedWorkouts.includes('hit') ? '#D4FF00' : '#8E8E93'} weight="bold" />}
            title="HIIT"
            isSelected={selectedWorkouts.includes('hit')}
            onPress={() => toggleWorkout('hit')}
          />
          <WorkoutPill
            icon={<Heart size={16} color={selectedWorkouts.includes('cardio') ? '#D4FF00' : '#8E8E93'} weight="bold" />}
            title="Cardio"
            isSelected={selectedWorkouts.includes('cardio')}
            onPress={() => toggleWorkout('cardio')}
          />
          <WorkoutPill
            icon={<Barbell size={16} color={selectedWorkouts.includes('crossfit') ? '#D4FF00' : '#8E8E93'} weight="bold" />}
            title="CrossFit"
            isSelected={selectedWorkouts.includes('crossfit')}
            onPress={() => toggleWorkout('crossfit')}
          />
          <WorkoutPill
            icon={<Person size={16} color={selectedWorkouts.includes('yoga') ? '#D4FF00' : '#8E8E93'} weight="bold" />}
            title="Yoga"
            isSelected={selectedWorkouts.includes('yoga')}
            onPress={() => toggleWorkout('yoga')}
          />
          <WorkoutPill
            icon={<PersonArmsSpread size={16} color={selectedWorkouts.includes('pilates') ? '#D4FF00' : '#8E8E93'} weight="bold" />}
            title="Pilates"
            isSelected={selectedWorkouts.includes('pilates')}
            onPress={() => toggleWorkout('pilates')}
          />
        </View>

        <View className="flex-row justify-between items-end mt-8 mb-4">
          <Text className="text-white text-lg font-semibold">Weekly Target</Text>
          <Text className="text-[#8E8E93] text-xs font-semibold mb-1">How many days?</Text>
        </View>
        <View className="bg-[#1A1A1A] rounded-2xl py-5 px-4 mb-3 border border-[#27272A]">
          <View className="flex-row justify-between items-center mb-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <Pressable
                key={day}
                onPress={() => setWeeklyTarget(day)}
                className={`w-10 h-10 rounded-full items-center justify-center ${weeklyTarget === day ? 'bg-[#D4FF00]' : ''}`}
                style={weeklyTarget === day ? { shadowColor: '#D4FF00', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 5 } : {}}
              >
                <Text className={`text-base font-semibold ${weeklyTarget === day ? 'text-black' : 'text-[#8E8E93]'}`}>{day}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text className="text-[#D4FF00] text-xs font-semibold text-center mt-2 mb-8">{weeklyTarget} Days Per Week</Text>

        <Text className="text-white text-lg font-semibold mb-4">Workout Time</Text>
        <View className="flex-row gap-3">
          <TimeCard
            icon={<Sun size={24} color={workoutTime.includes('morning') ? '#D4FF00' : '#8E8E93'} weight={workoutTime.includes('morning') ? 'fill' : 'regular'} />}
            title="Morning"
            subtitle="5AM-12PM"
            isSelected={workoutTime.includes('morning')}
            onPress={() => toggleWorkoutTime('morning')}
          />
          <TimeCard
            icon={<SunHorizon size={24} color={workoutTime.includes('afternoon') ? '#D4FF00' : '#8E8E93'} weight={workoutTime.includes('afternoon') ? 'fill' : 'regular'} />}
            title="Afternoon"
            subtitle="12PM-5PM"
            isSelected={workoutTime.includes('afternoon')}
            onPress={() => toggleWorkoutTime('afternoon')}
          />
          <TimeCard
            icon={<Moon size={24} color={workoutTime.includes('evening') ? '#D4FF00' : '#8E8E93'} weight={workoutTime.includes('evening') ? 'fill' : 'regular'} />}
            title="Evening"
            subtitle="Selected"
            isSelected={workoutTime.includes('evening')}
            onPress={() => toggleWorkoutTime('evening')}
            hideSubtitle={true}
          />
        </View>

        {isDirty && (
          <Pressable
            onPress={handleSave}
            disabled={saveMutation.isPending}
            className={`mt-10 bg-[#D4FF00] py-4 rounded-full items-center flex-row justify-center ${saveMutation.isPending ? 'opacity-70' : 'active:opacity-80'}`}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text className="text-black text-lg font-semibold">{preferences ? 'Update Preferences' : 'Save Preferences'}</Text>
            )}
          </Pressable>
        )}

      </ScrollView>
    </View>
  );
}

function GoalCard({ icon, title, subtitle, isSelected, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: '48%' }}
      className={`bg-[#1A1A1A] rounded-2xl p-5 items-center justify-center border ${isSelected ? 'border-[#D4FF00]' : 'border-[#27272A]'}`}
    >
      <View className="w-14 h-14 rounded-full items-center justify-center bg-[#222222] mb-3 border border-[#27272A]">
        {icon}
      </View>
      <Text className={`text-sm font-semibold mb-1 text-center ${isSelected ? 'text-[#D4FF00]' : 'text-white'}`}>{title}</Text>
      <Text className="text-[#8E8E93] text-[10px] text-center px-1 leading-tight">{subtitle}</Text>
    </Pressable>
  );
}

function WorkoutPill({ icon, title, isSelected, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-full px-4 py-2 border ${isSelected ? 'border-[#D4FF00] bg-transparent' : 'border-[#27272A] bg-[#1A1A1A]'}`}
    >
      <View className="mr-2">
        {icon}
      </View>
      <Text className={`text-sm font-semibold ${isSelected ? 'text-[#D4FF00]' : 'text-[#8E8E93]'}`}>{title}</Text>
      {isSelected && (
        <View className="ml-2">
          <Check size={12} color="#D4FF00" weight="bold" />
        </View>
      )}
    </Pressable>
  );
}

function TimeCard({ icon, title, subtitle, isSelected, onPress, hideSubtitle }: any) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 bg-[#1A1A1A] rounded-2xl p-4 items-center justify-center border ${isSelected ? 'border-[#D4FF00]' : 'border-[#27272A]'}`}
    >
      <View className="mb-2">
        {icon}
      </View>
      <Text className={`text-xs font-medium mb-1 ${isSelected ? 'text-[#D4FF00]' : 'text-[#8E8E93]'}`}>{title}</Text>
      {!hideSubtitle && (
        <Text className="text-[#6C6C70] text-[9px]">{subtitle}</Text>
      )}
    </Pressable>
  );
}
