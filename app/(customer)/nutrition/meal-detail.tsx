import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon as ArrowLeft, StarIcon as Star, CaretDownIcon as CaretDown } from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';

export default function MealDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [meal, setMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMeal() {
      if (!id) return;
      const { data, error } = await supabase
        .from('customer_meal_plan_day_meals')
        .select('*')
        .eq('customerMealPlanDayMealId', id)
        .single();
      
      if (data) {
        setMeal(data);
      }
      setLoading(false);
    }
    loadMeal();
  }, [id]);

  if (loading || !meal) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  const ingredients = Array.isArray(meal.ingredientsJson) ? meal.ingredientsJson : [];
  const steps = Array.isArray(meal.recipeInstructions) ? meal.recipeInstructions : [];

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={{ uri: meal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop' }}
          className="w-full h-80 justify-between pb-4"
          resizeMode="cover"
        >
          <View className="flex-row p-5 pt-5">
            <Pressable onPress={() => router.navigate('/(customer)/nutrition/my-nutrition-plan')} className="w-10 h-10 items-center justify-center rounded-full bg-black/40">
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
          <Text className="text-white text-2xl font-bold mb-3">{meal.mealName}</Text>

          <View className="bg-[#1A2E00] self-start px-2 py-1 rounded mb-4">
            <Text className="text-[#C4EF00] text-[10px] font-bold uppercase">{meal.mealType}</Text>
          </View>

          <Text className="text-[#8E8E93] text-sm leading-5 mb-6">
            {meal.description || 'No description available'}
          </Text>

          <View className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row justify-between mb-8">
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{meal.calories}</Text>
              <Text className="text-[#8E8E93] text-[10px]">kcal</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{meal.protein}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Protein</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{meal.carbs}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Carbs</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{meal.fat}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Fat</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{meal.prepTimeMinutes || 30}</Text>
              <Text className="text-[#8E8E93] text-[10px]">mins</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Ingredients</Text>
            <Pressable className="flex-row items-center bg-[#1A1A1A] border border-[#222222] px-3 py-1.5 rounded-lg">
              <Text className="text-[#C4EF00] text-xs font-semibold mr-2">1 Serving</Text>
              <CaretDown size={12} color="#8E8E93" />
            </Pressable>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[20px] p-4 flex-row mb-8">
            <View className="flex-1 pr-2 justify-center gap-y-3">
              {ingredients.map((ing: any, idx: number) => (
                <View key={idx} className="flex-row items-start">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#C4EF00] mt-1.5 mr-3" />
                  <Text className="text-white text-[11px] font-bold w-12 mr-2">{ing.quantity} {ing.unit}</Text>
                  <Text className="text-[#8E8E93] text-[11px] flex-1">{ing.name}</Text>
                </View>
              ))}
              {ingredients.length === 0 && (
                <Text className="text-[#8E8E93] text-[11px]">No ingredients mapped for this meal.</Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-lg font-bold">Cooking Steps</Text>
          </View>

          <View className="mb-8">
            {steps.map((step: any, idx: number) => {
              const isLast = idx === steps.length - 1;
              const text = typeof step === 'string' ? step : (step.text || JSON.stringify(step));
              return (
                <View key={idx} className="flex-row items-start relative mb-6">
                  {!isLast && (
                    <View className="absolute left-3 top-8 bottom-[-24px] w-[1px] bg-[#333333]" />
                  )}
                  <View className={`w-6 h-6 rounded-full items-center justify-center mr-4 z-10 ${idx === 0 ? 'bg-[#C4EF00]' : 'bg-[#0A0A0A] border border-[#C4EF00]'}`}>
                    <Text className={`text-[10px] font-bold ${idx === 0 ? 'text-black' : 'text-[#C4EF00]'}`}>{idx + 1}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-xs leading-5 flex-1 pr-4">{text}</Text>
                </View>
              )
            })}
            {steps.length === 0 && (
              <Text className="text-[#8E8E93] text-[11px]">No cooking steps available.</Text>
            )}
          </View>

        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 120 }}>
        <Pressable 
          onPress={() => router.push({ pathname: '/(customer)/nutrition/swap-meal', params: { id: meal.customerMealPlanDayMealId, targetCalories: meal.calories } })}
          className="bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90">
          <Text className="text-black font-bold text-lg">Swap Meal</Text>
        </Pressable>
      </View>
    </View>
  );
}
