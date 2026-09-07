import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
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

// Removed static TIMEFRAMES

export default function Step2() {
  const { data, updateData } = useOnboarding();
  const [timeValue, setTimeValue] = useState(data.goalTimeframe ? data.goalTimeframe.split(' ')[0] : '');
  const [timeUnit, setTimeUnit] = useState<'weeks' | 'months'>(data.goalTimeframe && data.goalTimeframe.includes('month') ? 'months' : 'weeks');

  const handleTimeValueChange = (val: string) => {
    setTimeValue(val);
    if (val) {
      updateData({ goalTimeframe: `${val} ${timeUnit}` });
    } else {
      updateData({ goalTimeframe: '' });
    }
  };

  const handleTimeUnitChange = (unit: 'weeks' | 'months') => {
    setTimeUnit(unit);
    if (timeValue) {
      updateData({ goalTimeframe: `${timeValue} ${unit}` });
    }
  };

  const handleContinue = () => {
    router.push('/(customer)/(onboarding)/step3');
  };

  const isValidOptionalNumber = (val: string) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  };

  const isFormValid = data.primaryGoal !== '' && data.goalTimeframe !== '' && isValidOptionalNumber(data.targetWeight);

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

      <View className="mb-10">
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

      <View className="mb-16">
        <Text className="text-white font-semibold mb-2">Timeframe <Text className="text-red-500">*</Text></Text>
        <Text className="text-gray-500 text-xs mb-4 font-sans">When do you want to achieve this goal?</Text>
        <View className="flex-row items-center gap-3">
          <View className={`flex-1 h-[60px] border rounded-xl px-4 bg-[#111] flex-row items-center justify-center ${data.goalTimeframe === '' && timeValue === '' ? 'border-gray-800' : (isValidOptionalNumber(timeValue) ? 'border-[#C4EF00]' : 'border-red-500')}`}>
            <TextInput
              className="text-white flex-1 font-sans text-center text-lg"
              placeholder="e.g. 12"
              placeholderTextColor="#666"
              value={timeValue}
              onChangeText={handleTimeValueChange}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
          
          <View className="flex-[1.5] flex-row bg-[#111] border border-gray-800 rounded-xl p-1 h-[60px]">
            <Pressable 
              onPress={() => handleTimeUnitChange('weeks')}
              className={`flex-1 items-center justify-center rounded-lg ${timeUnit === 'weeks' ? 'bg-[#C4EF00]' : 'bg-transparent'}`}
            >
              <Text className={`font-semibold ${timeUnit === 'weeks' ? 'text-black' : 'text-gray-400'}`}>Weeks</Text>
            </Pressable>
            <Pressable 
              onPress={() => handleTimeUnitChange('months')}
              className={`flex-1 items-center justify-center rounded-lg ${timeUnit === 'months' ? 'bg-[#C4EF00]' : 'bg-transparent'}`}
            >
              <Text className={`font-semibold ${timeUnit === 'months' ? 'text-black' : 'text-gray-400'}`}>Months</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </OnboardingLayout>
  );
}

