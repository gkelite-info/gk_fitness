import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  CaretLeft,
  Leaf,
  Sun,
  Globe,
  XCircle,
  CheckCircle,
  MagnifyingGlass,
  X,
  Plus,
  CaretDown,
  CaretRight,
  Plant,
  Egg,
  FishSimple
} from 'phosphor-react-native';

export default function FoodPreferences() {
  const router = useRouter();

  const handleBack = () => {
    //@ts-ignore
    router.push('/(customer)/nutrition');
  };

  const [selectedDiet, setSelectedDiet] = useState('Non-Vegetarian');
  const [selectedMeals, setSelectedMeals] = useState('4 Meals');
  const [allergies, setAllergies] = useState([
    { id: '1', name: 'Milk', emoji: '🥛' },
    { id: '2', name: 'Peanuts', emoji: '🥜' },
    { id: '3', name: 'Soy', emoji: '🌿' },
    { id: '4', name: 'Seafood', emoji: '🦞' },
  ]);

  const diets = [
    { name: 'Vegetarian', icon: Leaf },
    { name: 'Vegan', icon: Plant },
    { name: 'Eggetarian', icon: Egg },
    { name: 'Non-Vegetarian', icon: FishSimple },
  ];

  const mealOptions = ['3 Meals', '4 Meals', '5 Meals', '6 Meals'];

  const removeAllergy = (id: string) => {
    setAllergies(allergies.filter(a => a.id !== id));
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={handleBack} className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222222] items-center justify-center mb-6 active:opacity-80">
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>

        <Text className="text-white text-[40px] leading-[44px] font-semibold tracking-tight">Your Food</Text>
        <Text className="text-[#C4EF00] text-[40px] leading-[44px] font-semibold tracking-tight mb-4">Preferences</Text>

        <Text className="text-[#8E8E93] text-[13px] leading-5 mb-8">
          Help us personalize your meal plan based on your choices.
        </Text>

        {/* Diet Preference */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4">
          <View className="flex-row items-center gap-4 mb-5">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <Leaf size={20} color="#C4EF00" weight="fill" />
            </View>
            <View>
              <Text className="text-white text-base font-semibold mb-0.5">Diet Preference</Text>
              <Text className="text-[#8E8E93] text-xs">Choose your diet type</Text>
            </View>
          </View>

          <View className="flex-row justify-between">
            {diets.map((diet, index) => {
              const Icon = diet.icon;
              const isSelected = selectedDiet === diet.name;
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedDiet(diet.name)}
                  className={`w-[23%] aspect-[3/4] rounded-2xl items-center justify-center border ${isSelected ? 'border-[#C4EF00] bg-[#1A2E00]' : 'border-[#2A2A2A] bg-transparent'} relative`}
                >
                  <Icon size={24} color={isSelected ? "#C4EF00" : "#8E8E93"} weight={isSelected ? "fill" : "regular"} style={{ marginBottom: 8 }} />
                  <Text className={`text-[10px] text-center font-medium ${isSelected ? 'text-[#C4EF00]' : 'text-[#8E8E93]'}`}>
                    {diet.name.replace('-', '-\n')}
                  </Text>
                  {isSelected && (
                    <View className="absolute -top-2 -right-2 bg-black rounded-full">
                      <CheckCircle size={18} color="#C4EF00" weight="fill" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Meals Per Day */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4">
          <View className="flex-row items-center gap-4 mb-5">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <Sun size={20} color="#C4EF00" weight="fill" />
            </View>
            <View>
              <Text className="text-white text-base font-semibold mb-0.5">Meals Per Day</Text>
              <Text className="text-[#8E8E93] text-xs">How many meals do you prefer?</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {mealOptions.map((meal, index) => {
              const isSelected = selectedMeals === meal;
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedMeals(meal)}
                  className={`py-3 px-5 rounded-[14px] border ${isSelected ? 'border-[#C4EF00] bg-[#1A2E00]' : 'border-[#2A2A2A] bg-[#1A1A1A]'} relative`}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#8E8E93]'}`}>
                    {meal}
                  </Text>
                  {isSelected && (
                    <View className="absolute -top-2 -right-2 bg-black rounded-full">
                      <CheckCircle size={18} color="#C4EF00" weight="fill" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preferred Cuisine */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4 flex-1 pr-2">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <Globe size={20} color="#C4EF00" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold mb-0.5">Preferred Cuisine</Text>
              <Text className="text-[#8E8E93] text-xs leading-4">Select the cuisine you enjoy most</Text>
            </View>
          </View>
          <View className="bg-[#222222] rounded-xl py-2.5 px-4 flex-row items-center justify-between min-w-[100px]">
            <Text className="text-white text-sm mr-4 font-medium">Indian</Text>
            <CaretDown size={14} color="#8E8E93" />
          </View>
        </View>

        {/* Food Allergies */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4">
          <View className="flex-row items-center gap-4 mb-5">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <XCircle size={20} color="#C4EF00" weight="fill" />
            </View>
            <View>
              <Text className="text-white text-base font-semibold mb-0.5">Food Allergies</Text>
              <Text className="text-[#8E8E93] text-xs">Select any allergies you have</Text>
            </View>
          </View>

          <View className="bg-[#1E1E1E] rounded-[16px] px-4 py-3.5 mb-4 flex-row items-center">
            <MagnifyingGlass size={18} color="#8E8E93" style={{ marginRight: 12 }} />
            <TextInput
              placeholder="Search allergies..."
              placeholderTextColor="#8E8E93"
              className="flex-1 text-white text-sm"
            />
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            {allergies.map(allergy => (
              <View key={allergy.id} className="bg-[#2A2A2A] rounded-full py-2 px-3 flex-row items-center">
                <Text className="mr-1.5 text-[12px]">{allergy.emoji}</Text>
                <Text className="text-white text-[11px] font-medium mr-2">{allergy.name}</Text>
                <Pressable onPress={() => removeAllergy(allergy.id)} className="w-4 h-4 items-center justify-center">
                  <X size={10} color="#8E8E93" />
                </Pressable>
              </View>
            ))}
            <Pressable className="rounded-full py-2 px-4 flex-row items-center border border-dashed border-[#C4EF00]/50 bg-[#C4EF00]/10">
              <Plus size={12} color="#C4EF00" weight="bold" style={{ marginRight: 6 }} />
              <Text className="text-[#C4EF00] text-[11px] font-semibold">Add More</Text>
            </Pressable>
          </View>
        </View>

        <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 110 }}>
          <Pressable
            onPress={() => router.push('/(customer)/nutrition/generating-plan')}
            className="bg-[#C4EF00] rounded-[20px] py-4 flex-row items-center justify-center active:opacity-90">
            <Text className="text-black font-semibold text-lg mr-2">Continue</Text>
            <CaretRight size={18} color="#000000" weight="bold" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
