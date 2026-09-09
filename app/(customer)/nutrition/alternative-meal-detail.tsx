import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ImageBackground, ActivityIndicator, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon as ArrowLeft, StarIcon as Star, CaretDownIcon as CaretDown, CheckIcon as Check } from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { fetchGlobalMeals, fetchMealIngredients } from '@/helpers/globalMeals/globalMeals';
import { saveMealPlanDayMeal } from '@/helpers/customerMealPlans/mealPlanDayMeals';

export default function AlternativeMealDetail() {
  const router = useRouter();
  const { globalMealId, slotId, targetCalories } = useLocalSearchParams();
  const [altMeal, setAltMeal] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [originalSlot, setOriginalSlot] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      if (!globalMealId || !slotId || !targetCalories) return;
      setLoading(true);
      setAltMeal(null);
      setIngredients([]);
      setOriginalSlot(null);

      // Fetch original slot to get mealType and order
      const { data: slotData } = await supabase
        .from('customer_meal_plan_day_meals')
        .select('*')
        .eq('customerMealPlanDayMealId', slotId)
        .single();
      
      if (slotData) setOriginalSlot(slotData);

      // Fetch alternative meal details
      const allMeals = await fetchGlobalMeals();
      const mealData = allMeals.find(m => m.globalMealId === globalMealId);
      
      if (mealData) {
        const targetCals = Number(targetCalories);
        const baseCals = mealData.calories || targetCals;
        let scalar = targetCals / baseCals;
        if (mealData.isScalable) {
          scalar = Math.max(mealData.minScale || 0.5, Math.min(scalar, mealData.maxScale || 2.5));
        } else {
          scalar = 1;
        }

        const scaledProtein = mealData.protein ? Math.round(mealData.protein * scalar) : Math.round((targetCals * 0.30) / 4);
        const scaledCarbs = mealData.carbs ? Math.round(mealData.carbs * scalar) : Math.round((targetCals * 0.45) / 4);
        const scaledFat = mealData.fat ? Math.round(mealData.fat * scalar) : Math.round((targetCals * 0.25) / 9);
        const scaledFiber = mealData.fiber ? Math.round(mealData.fiber * scalar) : Math.round(scaledCarbs * 0.15);

        const scaledMeal = {
          ...mealData,
          scaledCalories: mealData.calories ? Math.round(mealData.calories * scalar) : Math.round(targetCals),
          scaledProtein,
          scaledCarbs,
          scaledFat,
          scaledFiber,
          scalar
        };
        setAltMeal(scaledMeal);

        const rawIngredients = await fetchMealIngredients(globalMealId as string);
        let totalWeight = 0;
        const scaledIngredients = rawIngredients.map(mi => {
          const qty = Math.round(mi.baseQuantity * scalar * 10) / 10;
          totalWeight += qty;
          return {
            name: mi.ingredient?.name || 'Unknown',
            unit: mi.ingredient?.unit || 'unit',
            quantity: qty,
          };
        });
        setIngredients(scaledIngredients);
        setAltMeal((prev: any) => ({...prev, calculatedWeight: Math.round(totalWeight)}));
      }
      setLoading(false);
    }
    loadData();
  }, [globalMealId, slotId, targetCalories]);

  const handleConfirmSwap = async () => {
    if (!originalSlot || !altMeal) return;
    setSwapping(true);
    
    try {
       await saveMealPlanDayMeal({
         customerMealPlanDayMealId: originalSlot.customerMealPlanDayMealId,
         customerMealPlanDayId: originalSlot.customerMealPlanDayId,
         mealType: originalSlot.mealType,
         mealName: altMeal.mealName,
         description: altMeal.description,
         calories: altMeal.scaledCalories,
         protein: altMeal.scaledProtein,
         carbs: altMeal.scaledCarbs,
         fat: altMeal.scaledFat,
         order: originalSlot.order,
         image: altMeal.imageUrl,
         globalMealId: altMeal.globalMealId,
         ingredientsJson: ingredients,
         recipeInstructions: altMeal.recipeInstructions,
         imageUrl: altMeal.imageUrl,
         prepTimeMinutes: altMeal.prepTimeMinutes,
       });

       setIsSuccessModalVisible(true);
    } catch (e) {
       console.error(e);
       alert("Error swapping meal.");
    } finally {
       setSwapping(false);
    }
  };

  if (loading || !altMeal) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={{ uri: altMeal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop' }}
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
          <Text className="text-white text-2xl font-bold mb-3">{altMeal.mealName}</Text>

          <View className="bg-[#1A2E00] self-start px-2 py-1 rounded mb-4">
            <Text className="text-[#C4EF00] text-[10px] font-bold uppercase">{originalSlot?.mealType || altMeal.mealType}</Text>
          </View>

          <Text className="text-[#8E8E93] text-sm leading-5 mb-6">
            {altMeal.description || 'No description available'}
          </Text>

          <View className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row justify-between mb-8">
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{altMeal.scaledCalories}</Text>
              <Text className="text-[#8E8E93] text-[10px]">kcal</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{altMeal.scaledProtein}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Protein</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{altMeal.scaledCarbs}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Carbs</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{altMeal.scaledFat}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Fat</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{altMeal.scaledFiber || 0}g</Text>
              <Text className="text-[#8E8E93] text-[10px]">Fiber</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold mb-1">{altMeal.weight || altMeal.calculatedWeight || 0}g</Text>
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

        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 120 }}>
        <Pressable 
          onPress={handleConfirmSwap}
          className="bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90">
          <Text className="text-black font-bold text-lg">Swap Meal</Text>
        </Pressable>
      </View>

      {/* Success Modal */}
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
              <Text className="text-[#C4EF00]">{originalSlot?.mealType}</Text> Swapped
            </Text>
            <Text className="text-[#8E8E93] text-[15px] text-center mb-10 leading-6">
              Your meal has been successfully replaced with {altMeal.mealName}.
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

      {swapping && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <ActivityIndicator size="large" color="#C4EF00" />
        </View>
      )}
    </View>
  );
}
