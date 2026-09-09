import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon as ArrowLeft, StarIcon as Star, CaretDownIcon as CaretDown, SunIcon as Sun, CheckIcon as Check } from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { fetchGlobalMeals, fetchMealIngredients } from '@/helpers/globalMeals/globalMeals';
import { saveMealPlanDayMeal } from '@/helpers/customerMealPlans/mealPlanDayMeals';
import { useUser } from '@/context/UserContext';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';
import { getEligibleMealsForUser } from '@/lib/mealEngine';
import { Modal } from 'react-native';

export default function MealDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { userId } = useUser();
  const [meal, setMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(5);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      setMeal(null);
      setAlternatives([]);
      
      const { data, error } = await supabase
        .from('customer_meal_plan_day_meals')
        .select('*')
        .eq('customerMealPlanDayMealId', id)
        .single();
      
      if (data) {
        setMeal(data);
        
        // Fetch alternatives
        let t = data.mealType;
        if (t.startsWith('SNACK')) t = 'SNACK';
        
        const allMeals = await fetchGlobalMeals();
        let eligibleMeals = allMeals;

        if (userId) {
          const profile = await fetchCustomerOnboarding(userId);
          if (profile) {
            eligibleMeals = getEligibleMealsForUser(allMeals, profile);
          }
        }

        const typePool = eligibleMeals.filter(m => m.mealType.toUpperCase() === t && m.globalMealId !== data.globalMealId);
        
        // Scale them based on current meal calories
        const targetCals = data.calories || 300;
        const scaledAlternatives = typePool.map(alt => {
          const baseCals = alt.calories || targetCals;
          let scalar = targetCals / baseCals;
          if (alt.isScalable) {
            scalar = Math.max(alt.minScale || 0.5, Math.min(scalar, alt.maxScale || 2.5));
          } else {
            scalar = 1;
          }
          
          const scaledProtein = alt.protein ? Math.round(alt.protein * scalar) : Math.round((targetCals * 0.30) / 4);
          const scaledCarbs = alt.carbs ? Math.round(alt.carbs * scalar) : Math.round((targetCals * 0.45) / 4);
          const scaledFat = alt.fat ? Math.round(alt.fat * scalar) : Math.round((targetCals * 0.25) / 9);
          const scaledFiber = alt.fiber ? Math.round(alt.fiber * scalar) : Math.round(scaledCarbs * 0.15);

          return {
            ...alt,
            scaledCalories: alt.calories ? Math.round(alt.calories * scalar) : Math.round(targetCals),
            scaledProtein,
            scaledCarbs,
            scaledFat,
            scaledFiber,
            scalar
          };
        });

        // Sort by closest calories and take top 20
        scaledAlternatives.sort((a, b) => Math.abs(a.scaledCalories - targetCals) - Math.abs(b.scaledCalories - targetCals));
        setAlternatives(scaledAlternatives.slice(0, 20));
      }
      setLoading(false);
    }
    loadData();
  }, [id, userId]);

  if (loading || !meal) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  const ingredients = Array.isArray(meal.ingredientsJson) ? meal.ingredientsJson : [];
  const steps = Array.isArray(meal.recipeInstructions) ? meal.recipeInstructions : [];
  const totalWeight = Math.round(ingredients.reduce((sum: number, ing: any) => sum + (Number(ing.quantity) || 0), 0));
  const fiberAmount = meal.fiber || Math.round((meal.carbs || 0) * 0.15);

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
              <Text className="text-white text-lg font-bold mb-1">{fiberAmount}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Fiber</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{meal.weight || totalWeight}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Weight</Text>
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
          {/* Alternatives List */}
          <View className="mt-8">
            <Text className="text-white text-lg font-bold mb-4">Swap with other options</Text>
            
            <View className="gap-y-4">
              {alternatives.slice(0, visibleLimit).map((alt) => (
                <Pressable
                  key={alt.globalMealId}
                  onPress={() => router.push({ 
                    pathname: '/(customer)/nutrition/alternative-meal-detail', 
                    params: { 
                      globalMealId: alt.globalMealId, 
                      slotId: meal.customerMealPlanDayMealId, 
                      targetCalories: meal.calories 
                    } 
                  })}
                  className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 flex-row"
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-white text-base font-bold mb-2 mt-1">{alt.mealName}</Text>
                    <Text className="text-[#8E8E93] text-[11px] leading-4 mb-4">
                      {alt.description}
                    </Text>
  
                    <View className="flex-row items-center">
                      <View className="mr-4">
                        <Text className="text-white text-[12px] font-bold mb-0.5">{alt.scaledCalories}</Text>
                        <Text className="text-[#8E8E93] text-[8px] uppercase tracking-wider">Kcal</Text>
                      </View>
                      <View className="w-[1px] h-6 bg-[#333333] mr-4" />
                      <View className="flex-row items-center gap-x-3">
                        <Text className="text-white text-[10px] font-bold"><Text className="text-[#4ADE80]">P</Text> {alt.scaledProtein}g</Text>
                        <Text className="text-white text-[10px] font-bold"><Text className="text-[#FBBF24]">C</Text> {alt.scaledCarbs}g</Text>
                        <Text className="text-white text-[10px] font-bold"><Text className="text-[#A78BFA]">F</Text> {alt.scaledFat}g</Text>
                        <Text className="text-white text-[10px] font-bold"><Text className="text-white">Fi</Text> {alt.scaledFiber}g</Text>
                      </View>
                    </View>
                  </View>
                  <View className="w-24 h-24 rounded-2xl overflow-hidden bg-[#1A1A1A] ml-2">
                    <Image source={{ uri: alt.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop' }} className="w-full h-full" resizeMode="cover" />
                  </View>
                 
                </Pressable>
              ))}
              {visibleLimit < alternatives.length && (
                <Pressable 
                  onPress={() => setVisibleLimit(prev => prev + 5)}
                  className="mt-2 py-3 items-center justify-center border border-[#333333] rounded-full"
                >
                  <Text className="text-[#C4EF00] text-sm font-bold">Load More</Text>
                </Pressable>
              )}
              {alternatives.length === 0 && (
                <Text className="text-[#8E8E93] text-[11px]">No alternative options found.</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
