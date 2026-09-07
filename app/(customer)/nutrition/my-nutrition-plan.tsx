import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeftIcon as CaretLeft, CaretRightIcon as CaretRight, GearIcon as Gear, SunIcon as Sun, CoffeeIcon as Coffee, MoonIcon as Moon, ArrowsLeftRightIcon as ArrowsLeftRight, FireIcon as Fire, LeafIcon as Leaf } from 'phosphor-react-native';
import { useCustomerMealPlan } from '@/hooks/customerMealPlans/useCustomerMealPlan';
import { useUser } from '@/context/UserContext';
import { ActivityIndicator } from 'react-native';

export default function MyNutritionPlan() {
  const router = useRouter();
  const { userId } = useUser();
  const { data: fullPlan, isLoading } = useCustomerMealPlan(userId as any);

  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());

  const getDaysOfWeek = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    // Calculate start of week (Sunday)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDay);
    
    const days = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const fullNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        day: dayNames[i],
        date: d.getDate(),
        id: fullNames[i],
        index: i,
        fullDate: d
      });
    }
    return days;
  };

  const daysOfWeek = getDaysOfWeek();

  // Helper to format "15 Jul – 21 Jul, 2024"
  const formatWeekRange = () => {
    const first = daysOfWeek[0].fullDate;
    const last = daysOfWeek[6].fullDate;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${first.getDate()} ${monthNames[first.getMonth()]} – ${last.getDate()} ${monthNames[last.getMonth()]}, ${last.getFullYear()}`;
  };

  // Helper to format "Monday, 15 July"
  const formatSelectedDate = () => {
    const selected = daysOfWeek[selectedDayIndex].fullDate;
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${fullDayNames[selectedDayIndex]}, ${selected.getDate()} ${monthNames[selected.getMonth()]}`;
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  const getIconForMealType = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'BREAKFAST': return Sun;
      case 'DINNER': return Moon;
      case 'LUNCH':
      case 'SNACK':
      default: return Coffee;
    }
  };

  const selectedDayData = fullPlan?.days?.find(d => d.dayOfWeek.toLowerCase() === daysOfWeek[selectedDayIndex].id);
  const meals = selectedDayData?.meals || [];

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-[28px] font-bold tracking-tight">
            My <Text className="text-[#C4EF00]">Nutrition</Text> Plan <Text className="text-[24px]">🍃</Text>
          </Text>
          <Pressable onPress={() => router.push('/(customer)/nutrition/food-preferences')}>
            <Gear size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-center mb-6 gap-x-4">
          <Pressable onPress={() => setSelectedDayIndex(prev => prev > 0 ? prev - 1 : 6)} className="w-8 h-8 rounded-full bg-[#1A1A1A] items-center justify-center">
            <CaretLeft size={16} color="#FFFFFF" />
          </Pressable>
          <View className="flex-row items-center">
            <View className="w-4 h-4 border border-white rounded-sm items-center justify-center mr-2">
              <View className="w-3 h-[1px] bg-white absolute top-1" />
            </View>
            <Text className="text-white font-semibold">{formatWeekRange()}</Text>
          </View>
          <Pressable onPress={() => setSelectedDayIndex(prev => prev < 6 ? prev + 1 : 0)} className="w-8 h-8 rounded-full bg-[#1A1A1A] items-center justify-center">
            <CaretRight size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-5 px-5">
          {daysOfWeek.map((item) => {
            const isSelected = selectedDayIndex === item.index;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedDayIndex(item.index)}
                className={`w-[60px] h-[75px] rounded-[16px] items-center justify-center mr-3 ${isSelected ? 'bg-[#C4EF00]' : 'bg-transparent border border-[#222222]'}`}
              >
                <Text className={`font-bold text-[11px] mb-1 ${isSelected ? 'text-black' : 'text-[#8E8E93]'}`}>{item.day}</Text>
                <Text className={`font-bold text-[20px] ${isSelected ? 'text-black' : 'text-white'}`}>{item.date}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View className="flex-row items-center mb-6">
          <View className="w-1 h-6 bg-[#C4EF00] rounded-full mr-3" />
          <Text className="text-white text-lg font-bold">{formatSelectedDate()}</Text>
        </View>

        <View className="gap-y-4 mb-6">
          {meals.length === 0 ? (
            <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-8 items-center justify-center">
              <Text className="text-white text-base font-semibold mb-2">No Meals Planned</Text>
              <Text className="text-[#8E8E93] text-sm text-center">There are no meals planned for this day yet.</Text>
            </View>
          ) : meals.map((meal) => {
            const Icon = getIconForMealType(meal.mealType);
            return (
              <Pressable
                key={meal.customerMealPlanDayMealId}
                onPress={() => router.push({ pathname: '/(customer)/nutrition/meal-detail', params: { id: meal.customerMealPlanDayMealId } })}
                className="bg-[#141414] border border-[#222222] rounded-[24px] p-4 flex-row"
              >
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center mb-1">
                    <Icon size={16} color="#C4EF00" weight="regular" style={{ marginRight: 6 }} />
                    <Text className="text-[#C4EF00] text-[10px] font-bold tracking-widest">{meal.mealType?.toUpperCase()}</Text>
                  </View>
                  <Text className="text-white text-base font-bold mb-2 leading-5 pr-2">{meal.mealName}</Text>
                  <View className="flex-row items-start">
                    <Leaf size={12} color="#4ADE80" weight="fill" style={{ marginRight: 4, marginTop: 2 }} />
                    <Text className="text-[#8E8E93] text-[11px] leading-4 flex-1 pr-4">{meal.description || 'No description available'}</Text>
                  </View>
                </View>

                <View className="items-end justify-between w-[60px]">
                  <Pressable
                    onPress={() => router.push({ pathname: '/(customer)/nutrition/swap-meal', params: { id: meal.customerMealPlanDayMealId, targetCalories: meal.calories } })}
                    className="bg-[#C4EF00] rounded-md px-2 py-1 flex-row items-center mb-2"
                  >
                    <ArrowsLeftRight size={10} color="#000" weight="bold" style={{ marginRight: 4 }} />
                    <Text className="text-black text-[10px] font-bold">Swap</Text>
                  </Pressable>

                  <View className="items-center mb-2">
                    <Text className="text-white text-lg font-bold leading-5">{meal.calories || 0}</Text>
                    <Text className="text-[#8E8E93] text-[9px]">kcal</Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-[#4ADE80] text-[10px] font-bold mb-0.5">P {meal.protein || 0}g</Text>
                    <Text className="text-[#FBBF24] text-[10px] font-bold mb-0.5">C {meal.carbs || 0}g</Text>
                    <Text className="text-[#A78BFA] text-[10px] font-bold">F {meal.fat || 0}g</Text>
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>

        <View className="border border-[#222222] rounded-[20px] p-4 flex-row items-center">
          <View className="mr-4">
            <Fire size={24} color="#C4EF00" weight="regular" />
          </View>
          <Text className="text-[#8E8E93] text-xs flex-1 leading-5">
            All meals are curated for your weight loss goal with the right balance of nutrition.
          </Text>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 110 }}>
        <Pressable 
          onPress={() => router.push('/(customer)/nutrition/generating-plan')}
          className="bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90">
          <Text className="text-black font-bold text-lg">Regenerate Day</Text>
        </Pressable>
      </View>
    </View>
  );
}
