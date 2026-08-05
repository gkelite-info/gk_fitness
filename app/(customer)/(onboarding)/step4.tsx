import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { Leaf, Egg, Fish, Plus, Minus } from 'phosphor-react-native';
import { cn } from '@/lib/cn';
import { useOnboarding } from './_OnboardingContext';
import { saveCustomerOnboarding } from '@/helpers/onboardingHelper';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';

const DIETS = [
  { id: 'vegetarian', title: 'Vegetarian', icon: Leaf },
  { id: 'eggetarian', title: 'Eggetarian', icon: Egg },
  { id: 'nonvegetarian', title: 'Non-Vegetarian', icon: Fish },
  { id: 'vegan', title: 'Vegan', icon: Leaf },
];

const MEALS = [3, 4, 5];

const ALLERGIES = ['Nuts', 'Dairy', 'Gluten', 'Soy', 'Shellfish'];

export default function Step4() {
  const { data, updateData } = useOnboarding();
  const { userId } = useUser();
  const [customAllergy, setCustomAllergy] = useState('');
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!userId) {
      toast.error('Session expired. Please log in again.');
      return;
    }
    
    setSaving(true);
    try {
      await saveCustomerOnboarding(userId, data, customAllergy);
      router.push('/(customer)/(onboarding)/step5');
    } catch (err: any) {
      toast.error('Could not save your preferences. Try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleAllergy = (a: string) => {
    if (data.foodAllergies.includes(a)) {
      updateData({ foodAllergies: data.foodAllergies.filter(x => x !== a) });
    } else {
      updateData({ foodAllergies: [...data.foodAllergies, a] });
    }
  };

  const isFormValid = data.dietType !== '' && data.mealsPerDay !== null && !saving;

  const Title = (
    <Text className="text-white text-3xl font-bold mb-2">
      Let's personalize{'\n'}your <Text className="text-neon">nutrition</Text>
    </Text>
  );

  return (
    <OnboardingLayout
      currentStep={4}
      title={Title}
      description="Tell us about your eating preferences so we can plan your meals better."
      onContinue={handleContinue}
      isContinueDisabled={!isFormValid}
    >
      <View className="mb-8">
        <Text className="text-white font-bold mb-2">1. Diet Type <Text className="text-red-500">*</Text></Text>
        <Text className="text-gray-500 text-sm mb-4">Choose the diet you follow</Text>
        <View className="flex-row gap-2">
          {DIETS.map((d) => (
            <SelectableCard
              key={d.id}
              className="flex-1 items-center py-4 px-1"
              selected={data.dietType === d.id}
              onPress={() => updateData({ dietType: d.id })}
              checkPosition="none"
            >
              <View className="mb-3">
                <d.icon color={data.dietType === d.id ? '#d4ff00' : '#888'} size={28} />
              </View>
              <Text className={cn('font-bold text-xs text-center', data.dietType === d.id ? 'text-neon' : 'text-gray-400')}>{d.title}</Text>
            </SelectableCard>
          ))}
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-white font-bold mb-2">2. Meals Per Day <Text className="text-red-500">*</Text></Text>
        <Text className="text-gray-500 text-sm mb-4">How many meals do you usually prefer?</Text>
        <View className="flex-row gap-3">
          {MEALS.map((m) => (
            <SelectableCard
              key={m}
              className="flex-1 items-center justify-center py-6"
              selected={data.mealsPerDay === m}
              onPress={() => updateData({ mealsPerDay: m })}
              checkPosition="top-right"
            >
              <Text className="text-white font-bold text-2xl">{m}</Text>
              <Text className="text-gray-400 text-xs mt-1">Meals</Text>
            </SelectableCard>
          ))}
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-white font-bold mb-2">3. Food Allergies (Optional)</Text>
        <Text className="text-gray-500 text-sm mb-4">Select or add any ingredients you're allergic to</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {ALLERGIES.map(a => (
            <Pressable
              key={a}
              onPress={() => toggleAllergy(a)}
              className={cn(
                'px-4 py-2 rounded-full border mr-2',
                data.foodAllergies.includes(a) ? 'border-neon bg-neon/10' : 'border-gray-800 bg-[#111]'
              )}
            >
              <Text className={data.foodAllergies.includes(a) ? 'text-neon' : 'text-gray-400'}>{a}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="border border-gray-800 rounded-xl p-4 bg-[#111] flex-row items-center">
          <Plus color="#888" size={20} />
          <TextInput
            className="flex-1 ml-3 text-white"
            placeholder="Add custom allergy"
            placeholderTextColor="#666"
            value={customAllergy}
            onChangeText={setCustomAllergy}
          />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-white font-bold mb-2">4. Daily Water Goal <Text className="text-red-500">*</Text></Text>
        <Text className="text-gray-500 text-sm mb-4">Set your daily water intake goal</Text>
        
        <View className="border border-gray-800 rounded-2xl p-6 bg-[#111] items-center">
          <View className="flex-row items-center justify-between w-full px-4 mb-4">
            <Pressable
              onPress={() => updateData({ dailyWaterGoal: Math.max(1, data.dailyWaterGoal - 0.5) })}
              className="w-12 h-12 rounded-full border border-gray-700 items-center justify-center bg-[#1a1a1a]"
            >
              <Minus color="#d4ff00" size={24} />
            </Pressable>
            
            <Text className="text-white text-3xl font-bold">{data.dailyWaterGoal.toFixed(1)} L</Text>
            
            <Pressable
              onPress={() => updateData({ dailyWaterGoal: data.dailyWaterGoal + 0.5 })}
              className="w-12 h-12 rounded-full border border-neon items-center justify-center bg-[#1a1a1a]"
            >
              <Plus color="#d4ff00" size={24} />
            </Pressable>
          </View>
          <Text className="text-gray-500 text-xs">Recommended based on your profile.</Text>
        </View>
      </View>
    </OnboardingLayout>
  );
}

