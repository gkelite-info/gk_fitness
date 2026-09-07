import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CaretLeftIcon as CaretLeft, SunIcon as Sun, StarIcon as Star, CheckIcon as Check } from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { fetchGlobalMeals, fetchMealIngredients } from '@/helpers/globalMeals/globalMeals';
import { saveMealPlanDayMeal } from '@/helpers/customerMealPlans/mealPlanDayMeals';
import { useUser } from '@/context/UserContext';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';
import { getEligibleMealsForUser } from '@/lib/mealEngine';

export default function SwapMeal() {
  const router = useRouter();
  const { id, targetCalories } = useLocalSearchParams();
  const { userId } = useUser();
  
  const [currentMeal, setCurrentMeal] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [selectedMealData, setSelectedMealData] = useState<any>(null);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id || !targetCalories) return;
      const targetCals = Number(targetCalories);

      // 1. Fetch current meal
      const { data: mealData } = await supabase
        .from('customer_meal_plan_day_meals')
        .select('*')
        .eq('customerMealPlanDayMealId', id)
        .single();
      
      if (mealData) {
        setCurrentMeal(mealData);

        // 2. Fetch global alternatives for the same type
        let t = mealData.mealType;
        if (t.startsWith('SNACK')) t = 'SNACK';
        
        const allMeals = await fetchGlobalMeals();
        let eligibleMeals = allMeals;

        if (userId) {
          const profile = await fetchCustomerOnboarding(userId);
          if (profile) {
            eligibleMeals = getEligibleMealsForUser(allMeals, profile);
          }
        }

        const typePool = eligibleMeals.filter(m => m.mealType.toUpperCase() === t);

        // Scale them based on targetCalories
        const scaledAlternatives = typePool.map(alt => {
          const baseCals = alt.calories || targetCals;
          let scalar = targetCals / baseCals;
          if (alt.isScalable) {
            scalar = Math.max(alt.minScale || 0.5, Math.min(scalar, alt.maxScale || 2.5));
          } else {
            scalar = 1;
          }
          
          return {
            ...alt,
            scaledCalories: alt.calories ? Math.round(alt.calories * scalar) : Math.round(targetCals),
            scaledProtein: alt.protein ? Math.round(alt.protein * scalar) : Math.round((targetCals * 0.30) / 4),
            scaledCarbs: alt.carbs ? Math.round(alt.carbs * scalar) : Math.round((targetCals * 0.45) / 4),
            scaledFat: alt.fat ? Math.round(alt.fat * scalar) : Math.round((targetCals * 0.25) / 9),
            scalar
          };
        });

        // Sort by closest calories
        scaledAlternatives.sort((a, b) => Math.abs(a.scaledCalories - targetCals) - Math.abs(b.scaledCalories - targetCals));

        setAlternatives(scaledAlternatives);
        if (scaledAlternatives.length > 0) {
          setSelectedMeal(scaledAlternatives[0].globalMealId);
          setSelectedMealData(scaledAlternatives[0]);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [id, targetCalories]);

  const handleConfirmSwap = async () => {
    if (!currentMeal || !selectedMealData) return;
    setSwapping(true);
    
    try {
       // Fetch ingredients for the selected alternative
       const rawIngredients = await fetchMealIngredients(selectedMealData.globalMealId);
       const scaledIngredients = rawIngredients.map(mi => ({
         name: mi.ingredient?.name || 'Unknown',
         unit: mi.ingredient?.unit || 'unit',
         quantity: Math.round(mi.baseQuantity * selectedMealData.scalar * 10) / 10,
       }));

       // Update existing meal record
       await saveMealPlanDayMeal({
         customerMealPlanDayMealId: currentMeal.customerMealPlanDayMealId,
         customerMealPlanDayId: currentMeal.customerMealPlanDayId,
         mealType: currentMeal.mealType, // Keep the same slot
         mealName: selectedMealData.mealName,
         description: selectedMealData.description,
         calories: selectedMealData.scaledCalories,
         protein: selectedMealData.scaledProtein,
         carbs: selectedMealData.scaledCarbs,
         fat: selectedMealData.scaledFat,
         order: currentMeal.order,
         image: selectedMealData.imageUrl,
         globalMealId: selectedMealData.globalMealId,
         ingredientsJson: scaledIngredients,
         recipeInstructions: selectedMealData.recipeInstructions,
         imageUrl: selectedMealData.imageUrl,
         prepTimeMinutes: selectedMealData.prepTimeMinutes,
       });

       setIsSuccessModalVisible(true);
    } catch (e) {
       console.error(e);
       alert("Error swapping meal.");
    } finally {
       setSwapping(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <View className="flex-row items-center px-5 mb-4 mt-4">
        <Pressable onPress={() => router.navigate('/(customer)/nutrition/my-nutrition-plan')} className="p-2 -ml-2">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold flex-1 text-center pr-8">Swap Meal</Text>
      </View>

      <Text className="text-[#8E8E93] text-sm text-center mb-6">
        Replace your {currentMeal?.mealType?.toLowerCase()} with a healthier alternative
      </Text>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-white text-base font-bold mb-4">Current Meal</Text>

        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-8 flex-row">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center mb-1">
              <Sun size={14} color="#C4EF00" weight="fill" style={{ marginRight: 6 }} />
              <Text className="text-[#C4EF00] text-[10px] font-bold tracking-widest">{currentMeal?.mealType?.toUpperCase()}</Text>
            </View>
            <Text className="text-white text-base font-bold mb-2">{currentMeal?.mealName}</Text>
            <Text className="text-[#8E8E93] text-[11px] leading-4 mb-4">
              {currentMeal?.description}
            </Text>

            <View className="flex-row items-center gap-x-4">
              <Text className="text-white text-[11px] font-bold"><Text className="text-[#4ADE80]">P</Text> {currentMeal?.protein}g</Text>
              <View className="w-[1px] h-3 bg-[#333333]" />
              <Text className="text-white text-[11px] font-bold"><Text className="text-[#FBBF24]">C</Text> {currentMeal?.carbs}g</Text>
              <View className="w-[1px] h-3 bg-[#333333]" />
              <Text className="text-white text-[11px] font-bold"><Text className="text-[#A78BFA]">F</Text> {currentMeal?.fat}g</Text>
            </View>
          </View>

          <View className="bg-[#0A0A0A] border border-[#222222] rounded-[16px] w-[50px] h-[50px] items-center justify-center">
            <Text className="text-white text-sm font-bold mb-0.5">{currentMeal?.calories}</Text>
            <Text className="text-[#8E8E93] text-[8px] uppercase tracking-wider">Kcal</Text>
          </View>
        </View>

        <Text className="text-white text-base font-bold mb-4">Choose an alternative</Text>

        <View className="gap-y-4">
          {alternatives.map((alt, index) => {
            const isSelected = selectedMeal === alt.globalMealId;
            const isBestMatch = index === 0;
            return (
              <Pressable
                key={alt.globalMealId}
                onPress={() => {
                   setSelectedMeal(alt.globalMealId);
                   setSelectedMealData(alt);
                }}
                className={`bg-[#141414] border rounded-[24px] p-5 flex-row ${isSelected ? 'border-[#C4EF00]' : 'border-[#222222]'}`}
              >
                <View className="flex-1 pr-4">
                  {isBestMatch && (
                    <View className="bg-[#1A2E00] self-start px-2 py-1 rounded mb-2 flex-row items-center">
                      <Star size={10} color="#C4EF00" weight="fill" style={{ marginRight: 4 }} />
                      <Text className="text-[#C4EF00] text-[9px] font-bold">BEST MATCH</Text>
                    </View>
                  )}
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
                    </View>
                  </View>
                </View>

                <View className="justify-center pl-2">
                  <View className={`border rounded-full px-3 py-1.5 ${isSelected ? 'bg-[#C4EF00] border-[#C4EF00]' : 'border-[#444444] bg-transparent'}`}>
                    <Text className={`text-[11px] font-bold ${isSelected ? 'text-black' : 'text-[#8E8E93]'}`}>Replace</Text>
                  </View>
                </View>
              </Pressable>
            )
          })}
          {alternatives.length === 0 && (
            <Text className="text-[#8E8E93] text-sm text-center mt-4">No alternatives found for this meal type.</Text>
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 120 }}>
        <Pressable
          onPress={handleConfirmSwap}
          disabled={swapping}
          className="bg-[#C4EF00] rounded-[20px] py-4 flex-row items-center justify-center active:opacity-90"
        >
          {swapping ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text className="text-black font-bold text-lg">Confirm Replacement</Text>
          )}
        </Pressable>
      </View>

      <Modal
        visible={isSuccessModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSuccessModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#1C1C1C] rounded-t-[40px] px-6 pt-4 pb-10 items-center">
            <View className="w-12 h-1 bg-[#333333] rounded-full mb-10" />

            <View className="w-24 h-24 rounded-full border-4 border-[#C4EF00] items-center justify-center mb-6">
              <Check size={48} color="#C4EF00" weight="bold" />
            </View>

            <Text className="text-white text-[28px] font-bold mb-3 text-center">
              <Text className="text-[#C4EF00]">{currentMeal?.mealType}</Text> Replaced
            </Text>

            <Text className="text-[#8E8E93] text-[15px] text-center mb-10 leading-6">
              Your nutrition plan has been updated{'\n'}successfully.
            </Text>

            <Pressable
              onPress={() => {
                setIsSuccessModalVisible(false);
                router.replace('/(customer)/nutrition/my-nutrition-plan');
              }}
              className="w-full bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90"
            >
              <Text className="text-black font-bold text-lg">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
