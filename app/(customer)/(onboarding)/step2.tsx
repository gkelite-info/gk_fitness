import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { Fire, Barbell, User, TrendUp, ChartBar } from 'phosphor-react-native';
import { useOnboarding } from './_OnboardingContext';

const GOALS = [
  { id: 'loseweight', title: 'Lose Weight', description: 'Burn fat and get leaner', Icon: Fire },
  { id: 'buildmuscle', title: 'Build Muscle', description: 'Gain muscle and get stronger', Icon: Barbell },
  { id: 'stayfit', title: 'Stay Fit', description: 'Maintain fitness and overall health', Icon: User },
  { id: 'gainweight', title: 'Gain Weight', description: 'Healthy weight gain', Icon: TrendUp },
  { id: 'imporoveendurance', title: 'Improve Endurance', description: 'Boost stamina and performance', Icon: ChartBar },
];

export default function Step2() {
  const { data, updateData } = useOnboarding();

  const handleContinue = () => {
    router.push('/(customer)/(onboarding)/step3');
  };

  const isValidOptionalNumber = (val: string) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  };

  const isFormValid = data.primaryGoal !== '' && isValidOptionalNumber(data.targetWeight);

  const Title = (
    <Text className="text-white text-3xl font-semibold mb-2">
      What's your{'\n'}<Text className="text-neon">fitness goal?</Text>
    </Text>
  );

  return (
    <OnboardingLayout
      currentStep={2}
      title={Title}
      description="Choose the goal that matters most to you. We'll personalize your plan around it."
      onContinue={handleContinue}
      isContinueDisabled={!isFormValid}
    >
      <Text className="text-white font-semibold mb-4">Select your primary goal <Text className="text-red-500">*</Text></Text>

      <View className="gap-3 mb-8">
        {GOALS.map((g) => (
          <SelectableCard
            key={g.id}
            selected={data.primaryGoal === g.id}
            onPress={() => updateData({ primaryGoal: g.id })}
            checkPosition="right"
          >
            <View className="flex-row items-center gap-4">
              <View className={`w-12 h-12 rounded-full items-center justify-center bg-[#1a1a1a] ${data.primaryGoal === g.id ? 'bg-neon/10' : ''}`}>
                <g.Icon color={data.primaryGoal === g.id ? '#d4ff00' : '#888'} weight="regular" size={24} />
              </View>
              <View>
                <Text className="text-white font-semibold text-lg mb-1">{g.title}</Text>
                <Text className="text-gray-400 text-sm font-sans">{g.description}</Text>
              </View>
            </View>
          </SelectableCard>
        ))}
      </View>

      <View className="mb-16">
        <Text className="text-white mb-2 font-medium">Target Weight (Optional)</Text>
        <Text className="text-gray-500 text-xs mb-2 font-sans">Set a target weight you want to achieve.</Text>
        <View className={`border rounded-xl p-4 bg-[#111] flex-row items-center justify-between ${data.targetWeight && !isValidOptionalNumber(data.targetWeight) ? 'border-red-500' : 'border-gray-800'}`}>
          <TextInput
            className="text-white flex-1 font-sans"
            placeholder="Enter target weight"
            placeholderTextColor="#666"
            value={data.targetWeight}
            onChangeText={(text) => updateData({ targetWeight: text })}
            keyboardType="numeric"
          />
          <Text className="text-gray-500 font-sans">kg</Text>
        </View>
        {data.targetWeight && !isValidOptionalNumber(data.targetWeight) ? <Text className="text-red-500 text-xs mt-1">Valid target weight required if provided</Text> : null}
      </View>
    </OnboardingLayout>
  );
}

