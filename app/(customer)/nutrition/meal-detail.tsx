import React from 'react';
import { View, ScrollView, Pressable, Image, ImageBackground } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { ArrowLeftIcon as ArrowLeft, StarIcon as Star, CaretDownIcon as CaretDown } from 'phosphor-react-native';

export default function MealDetail() {
  const router = useRouter();

  const ingredients = [
    { qty: '200 g', name: 'Chicken Breast' },
    { qty: '1/2 cup', name: 'Brown Rice (cooked)' },
    { qty: '1/2 cup', name: 'Chickpeas (boiled)' },
    { qty: '1 cup', name: 'Broccoli (steamed)' },
    { qty: '1/2 cup', name: 'Cherry Tomatoes (halved)' },
    { qty: '1/4', name: 'Avocado (diced)' },
    { qty: '1 tsp', name: 'Olive Oil' },
    { qty: 'To taste', name: 'Salt, Black Pepper, Herbs' }
  ];

  const steps = [
    {
      id: 1,
      text: 'Season the chicken breast with salt, pepper and herbs.',
      image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 2,
      text: 'Heat olive oil in a pan and grill the chicken for 6-7 minutes on each side until fully cooked.',
      image: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8dd?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 3,
      text: 'Cook brown rice as per instructions and steam the broccoli.',
      image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 4,
      text: 'In a bowl, add rice, chickpeas, broccoli, cherry tomatoes and avocado.',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 5,
      text: 'Top with sliced chicken and enjoy your high protein bowl!',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop'
    }
  ];

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop' }}
          className="w-full h-80 justify-between pb-4"
          resizeMode="cover"
        >
          <View className="flex-row p-5 pt-5">
            <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-black/40">
              <ArrowLeft size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="px-5">
            <View className="flex-row items-center bg-black/70 self-start px-2 py-1 rounded-md">
              <Star size={12} color="#FBBF24" weight="fill" style={{ marginRight: 4 }} />
              <Text className="text-white text-[10px] font-bold">4.8 (320)</Text>
            </View>
          </View>
        </ImageBackground>

        <View className="px-5 pt-5">
          <Text className="text-white text-2xl font-bold mb-3">High Protein Chicken Bowl</Text>
          
          <View className="bg-[#1A2E00] self-start px-2 py-1 rounded mb-4">
            <Text className="text-[#C4EF00] text-[10px] font-bold">HIGH PROTEIN</Text>
          </View>

          <Text className="text-[#8E8E93] text-sm leading-5 mb-6">
            A balanced and delicious bowl packed with protein, fiber and healthy carbs.
          </Text>

          <View className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row justify-between mb-8">
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">520</Text>
              <Text className="text-[#8E8E93] text-[10px]">kcal</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">38g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Protein</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">25g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Carbs</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">18g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Fat</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">35</Text>
              <Text className="text-[#8E8E93] text-[10px]">mins</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Ingredients</Text>
            <Pressable className="flex-row items-center bg-[#1A1A1A] border border-[#222222] px-3 py-1.5 rounded-lg">
              <Text className="text-[#C4EF00] text-xs font-semibold mr-2">2 Servings</Text>
              <CaretDown size={12} color="#8E8E93" />
            </Pressable>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[20px] p-4 flex-row mb-8">
            <View className="flex-1 pr-2 justify-center gap-y-3">
              {ingredients.map((ing, idx) => (
                <View key={idx} className="flex-row items-start">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#C4EF00] mt-1.5 mr-3" />
                  <Text className="text-white text-[11px] font-bold w-12 mr-2">{ing.qty}</Text>
                  <Text className="text-[#8E8E93] text-[11px] flex-1">{ing.name}</Text>
                </View>
              ))}
            </View>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop' }} 
              className="w-[100px] h-[150px] rounded-[16px]"
              resizeMode="cover"
            />
          </View>

          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-lg font-bold">Cooking Steps</Text>
            <Text className="text-[#C4EF00] text-xs font-bold">Step 1 of 5</Text>
          </View>

          <View className="mb-8">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              return (
                <View key={step.id} className="flex-row items-start relative mb-6">
                  {!isLast && (
                    <View className="absolute left-3 top-8 bottom-[-24px] w-[1px] bg-[#333333]" />
                  )}
                  <View className={`w-6 h-6 rounded-full items-center justify-center mr-4 z-10 ${step.id === 1 ? 'bg-[#C4EF00]' : 'bg-[#0A0A0A] border border-[#C4EF00]'}`}>
                    <Text className={`text-[10px] font-bold ${step.id === 1 ? 'text-black' : 'text-[#C4EF00]'}`}>{step.id}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-xs leading-5 flex-1 pr-4">{step.text}</Text>
                  <Image 
                    source={{ uri: step.image }} 
                    className="w-16 h-12 rounded-lg"
                    resizeMode="cover"
                  />
                </View>
              )
            })}
          </View>

          <Text className="text-white text-lg font-bold mb-4">Nutrition Information (per serving)</Text>
          
          <View className="flex-row justify-between">
            <View className="bg-[#141414] border border-[#222222] rounded-[16px] w-[22%] py-3 items-center">
              <Text className="text-[#C4EF00] text-sm font-bold mb-1">520</Text>
              <Text className="text-[#8E8E93] text-[9px]">Calories</Text>
            </View>
            <View className="bg-[#141414] border border-[#222222] rounded-[16px] w-[22%] py-3 items-center">
              <Text className="text-[#C4EF00] text-sm font-bold mb-1">38g</Text>
              <Text className="text-[#8E8E93] text-[9px]">Protein</Text>
            </View>
            <View className="bg-[#141414] border border-[#222222] rounded-[16px] w-[22%] py-3 items-center">
              <Text className="text-[#C4EF00] text-sm font-bold mb-1">25g</Text>
              <Text className="text-[#8E8E93] text-[9px]">Carbs</Text>
            </View>
            <View className="bg-[#141414] border border-[#222222] rounded-[16px] w-[22%] py-3 items-center">
              <Text className="text-[#C4EF00] text-sm font-bold mb-1">18g</Text>
              <Text className="text-[#8E8E93] text-[9px]">Fat</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 120 }}>
        <Pressable className="bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90">
          <Text className="text-black font-bold text-lg">Add to Meal Plan</Text>
        </Pressable>
      </View>
    </View>
  );
}
