import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { DaySelector } from '@/components/onboarding/DaySelector';
import { Barbell, House, CalendarBlank, Sun, SunDim, CloudSun, CloudMoon } from 'phosphor-react-native';
import { useOnboarding } from './_OnboardingContext';

const LOCATIONS = [
  { id: 'gym', title: 'Gym', description: 'I prefer training\nat the gym', icon: Barbell },
  { id: 'home', title: 'Home', description: 'I prefer working\nout at home', icon: House },
  { id: 'both', title: 'Both', description: 'I can work out at\nboth', icon: Barbell, icon2: House },
];

const TIMES = [
  { id: 'morning', title: 'Morning', desc: '6 AM - 12 PM', icon: Sun },
  { id: 'afternoon', title: 'Afternoon', desc: '12 PM - 4 PM', icon: SunDim },
  { id: 'evening', title: 'Evening', desc: '4 PM - 9 PM', icon: CloudSun },
  { id: 'flexible', title: 'Flexible', desc: 'Anytime', icon: CloudMoon },
];

export default function Step3() {
  const { data, updateData } = useOnboarding();

  const handleContinue = () => {
    router.push('/(customer)/(onboarding)/step4');
  };

  const isFormValid = data.workoutLocation !== '' && data.workoutDays.length > 0 && data.preferWorkoutTime !== '';

  const Title = (
    <Text className="text-white text-3xl font-semibold mb-2">
      Let's personalize{'\n'}your <Text className="text-neon">workouts</Text>
    </Text>
  );

  return (
    <OnboardingLayout
      currentStep={3}
      title={Title}
      description="Tell us about your workout preferences so we can build a plan that fits you."
      onContinue={handleContinue}
      isContinueDisabled={!isFormValid}
    >
      <View className="mb-8">
        <Text className="text-white font-semibold mb-4">1. Workout Location <Text className="text-red-500">*</Text></Text>
        <View className="flex-row gap-2">
          {LOCATIONS.map((loc) => (
            <SelectableCard
              key={loc.id}
              className="flex-1 items-center justify-center py-4"
              selected={data.workoutLocation === loc.id}
              onPress={() => updateData({ workoutLocation: loc.id })}
              checkPosition="top-right"
            >
              <View className="mb-2 flex-row">
                {loc.icon2 ? (
                  <View className="flex-row items-center gap-1">
                    <loc.icon color={data.workoutLocation === loc.id ? '#d4ff00' : '#888'} size={24} />
                    <Text className="text-gray-500">+</Text>
                    <loc.icon2 color={data.workoutLocation === loc.id ? '#d4ff00' : '#888'} size={24} />
                  </View>
                ) : (
                  <loc.icon color={data.workoutLocation === loc.id ? '#d4ff00' : '#888'} size={32} />
                )}
              </View>
              <Text className={`font-semibold mb-1 ${data.workoutLocation === loc.id ? 'text-neon' : 'text-white'}`}>
                {loc.title}
              </Text>
              <Text className="text-gray-400 text-xs font-sans text-center">{loc.description}</Text>
            </SelectableCard>
          ))}
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-white font-semibold mb-2">2. Workout Days <Text className="text-red-500">*</Text></Text>
        <Text className="text-gray-500 text-xs mb-4 font-sans">Select the days you prefer to work out</Text>
        <DaySelector selectedDays={data.workoutDays} onChange={(days) => updateData({ workoutDays: days })} />
        <View className="bg-[#111] border border-gray-800 p-4 rounded-xl mt-4 flex-row items-center">
          <CalendarBlank color="#d4ff00" size={20} />
          <Text className="text-gray-400 ml-3 font-sans">
            You've selected  <Text className="text-neon font-semibold">{data.workoutDays.length} days</Text>  per week
          </Text>
        </View>
      </View>

      <View className="mb-16">
        <Text className="text-white font-semibold mb-2">3. Preferred Workout Time <Text className="text-red-500">*</Text></Text>
        <Text className="text-gray-500 text-xs mb-4 font-sans">When do you usually prefer to workout?</Text>
        <View className="flex-row gap-2">
          {TIMES.map((time) => (
            <SelectableCard
              key={time.id}
              className="flex-1 items-center py-4 px-1"
              selected={data.preferWorkoutTime === time.id}
              onPress={() => updateData({ preferWorkoutTime: time.id })}
              checkPosition="bottom"
            >
              <View className="mb-3">
                <time.icon color={data.preferWorkoutTime === time.id ? '#d4ff00' : '#888'} size={28} />
              </View>
              <Text className="text-white font-semibold text-xs mb-1 text-center">{time.title}</Text>
              <Text className="text-gray-400 text-[10px] text-center">{time.desc}</Text>
            </SelectableCard>
          ))}
        </View>
      </View>
    </OnboardingLayout>
  );
}

