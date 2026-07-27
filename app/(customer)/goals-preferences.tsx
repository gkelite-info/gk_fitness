import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, Info, Target, Barbell, Heart, Lightning, Moon, Sun, SunHorizon, Person, Check, Heartbeat, PersonArmsSpread
} from 'phosphor-react-native';
import { mockProfileData } from '@/constants/mockProfileData';

export default function GoalsPreferencesScreen() {
  return <GoalsPreferencesView data={mockProfileData} />;
}

function GoalsPreferencesView({ data }: { data: typeof mockProfileData }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [selectedGoal, setSelectedGoal] = useState(data.preferences.fitnessGoal);
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>(data.preferences.preferredWorkouts);
  const [weeklyTarget, setWeeklyTarget] = useState(data.preferences.weeklyTarget);
  const [workoutTime, setWorkoutTime] = useState(data.preferences.workoutTime);

  const toggleWorkout = (workout: string) => {
    if (selectedWorkouts.includes(workout)) {
      setSelectedWorkouts(selectedWorkouts.filter(w => w !== workout));
    } else {
      setSelectedWorkouts([...selectedWorkouts, workout]);
    }
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={() => router.back()} className="p-2">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-bold">Goals & Preferences</Text>
        <Pressable className="p-2">
          <Info size={24} color="#D4FF00" weight="regular" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[#A1A1AA] text-sm text-center mt-6 mb-8 px-4 leading-relaxed">
          Update your goals and preferences to get a more personalized experience.
        </Text>

        <Text className="text-white text-lg font-bold mb-4">Fitness Goal</Text>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          <GoalCard 
            icon={<Target size={28} color={selectedGoal === 'weight_loss' ? '#D4FF00' : '#8E8E93'} weight={selectedGoal === 'weight_loss' ? 'bold' : 'regular'} />}
            title="Weight Loss"
            subtitle="Lose weight and burn fat"
            isSelected={selectedGoal === 'weight_loss'}
            onPress={() => setSelectedGoal('weight_loss')}
          />
          <GoalCard 
            icon={<Barbell size={28} color={selectedGoal === 'muscle_gain' ? '#D4FF00' : '#8E8E93'} weight={selectedGoal === 'muscle_gain' ? 'bold' : 'regular'} />}
            title="Muscle Gain"
            subtitle="Build muscle and get stronger"
            isSelected={selectedGoal === 'muscle_gain'}
            onPress={() => setSelectedGoal('muscle_gain')}
          />
          <GoalCard 
            icon={<Heartbeat size={28} color={selectedGoal === 'maintain' ? '#D4FF00' : '#8E8E93'} weight={selectedGoal === 'maintain' ? 'bold' : 'regular'} />}
            title="Maintain Fitness"
            subtitle="Stay fit and maintain health"
            isSelected={selectedGoal === 'maintain'}
            onPress={() => setSelectedGoal('maintain')}
          />
          <GoalCard 
            icon={<Heart size={28} color={selectedGoal === 'endurance' ? '#D4FF00' : '#8E8E93'} weight={selectedGoal === 'endurance' ? 'bold' : 'regular'} />}
            title="Improve Endurance"
            subtitle="Boost stamina and endurance"
            isSelected={selectedGoal === 'endurance'}
            onPress={() => setSelectedGoal('endurance')}
          />
        </View>

        <View className="flex-row justify-between items-end mt-8 mb-4">
          <Text className="text-white text-lg font-bold">Preferred Workouts</Text>
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
            icon={<Lightning size={16} color={selectedWorkouts.includes('hiit') ? '#D4FF00' : '#8E8E93'} weight="bold" />}
            title="HIIT"
            isSelected={selectedWorkouts.includes('hiit')}
            onPress={() => toggleWorkout('hiit')}
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
          <Text className="text-white text-lg font-bold">Weekly Target</Text>
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
                <Text className={`text-base font-bold ${weeklyTarget === day ? 'text-black' : 'text-[#8E8E93]'}`}>{day}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text className="text-[#D4FF00] text-xs font-bold text-center mt-2 mb-8">{weeklyTarget} Days Per Week</Text>

        <Text className="text-white text-lg font-bold mb-4">Workout Time</Text>
        <View className="flex-row gap-3">
          <TimeCard 
            icon={<Sun size={24} color={workoutTime === 'morning' ? '#D4FF00' : '#8E8E93'} weight={workoutTime === 'morning' ? 'fill' : 'regular'} />}
            title="Morning"
            subtitle="5AM-12PM"
            isSelected={workoutTime === 'morning'}
            onPress={() => setWorkoutTime('morning')}
          />
          <TimeCard 
            icon={<SunHorizon size={24} color={workoutTime === 'afternoon' ? '#D4FF00' : '#8E8E93'} weight={workoutTime === 'afternoon' ? 'fill' : 'regular'} />}
            title="Afternoon"
            subtitle="12PM-5PM"
            isSelected={workoutTime === 'afternoon'}
            onPress={() => setWorkoutTime('afternoon')}
          />
          <TimeCard 
            icon={<Moon size={24} color={workoutTime === 'evening' ? '#D4FF00' : '#8E8E93'} weight={workoutTime === 'evening' ? 'fill' : 'regular'} />}
            title="Evening"
            subtitle="Selected"
            isSelected={workoutTime === 'evening'}
            onPress={() => setWorkoutTime('evening')}
            hideSubtitle={true}
          />
        </View>

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
      <Text className={`text-sm font-bold mb-1 text-center ${isSelected ? 'text-[#D4FF00]' : 'text-white'}`}>{title}</Text>
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
      <Text className={`text-sm font-bold ${isSelected ? 'text-[#D4FF00]' : 'text-[#8E8E93]'}`}>{title}</Text>
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
