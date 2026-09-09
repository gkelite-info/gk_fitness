import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeftIcon as CaretLeft, CaretRightIcon as CaretRight, GearIcon as Gear, SunIcon as Sun, CoffeeIcon as Coffee, MoonIcon as Moon, FireIcon as Fire, LeafIcon as Leaf, PencilSimpleIcon as PencilSimple, CheckIcon as Check } from 'phosphor-react-native';
import { useCustomerMealPlan } from '@/hooks/customerMealPlans/useCustomerMealPlan';
import { useUser } from '@/context/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import { saveMealPlanDayMeal } from '@/helpers/customerMealPlans/mealPlanDayMeals';

export default function MyNutritionPlan() {
  const router = useRouter();
  const { userId } = useUser();
  const queryClient = useQueryClient();
  const { data: fullPlan, isLoading } = useCustomerMealPlan(userId as any);

  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
  const scrollViewRef = React.useRef<ScrollView>(null);
  
  React.useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: Math.max(0, selectedDayIndex * 72 - 60), animated: true });
    }
  }, [selectedDayIndex]);
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const [editCalories, setEditCalories] = useState('');
  const [isSavingCalories, setIsSavingCalories] = useState(false);

  const getDaysOfMonth = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    // Calculate start of week (Sunday)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDay);
    
    const days = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const fullNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dayOfWeek = d.getDay();
      days.push({
        day: dayNames[dayOfWeek],
        date: d.getDate(),
        id: fullNames[dayOfWeek],
        index: i,
        fullDate: d
      });
    }
    return days;
  };

  const daysOfMonth = getDaysOfMonth();

  // Helper to format "15 Jul – 13 Aug, 2024"
  const formatWeekRange = () => {
    const first = daysOfMonth[0].fullDate;
    const last = daysOfMonth[daysOfMonth.length - 1].fullDate;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${first.getDate()} ${monthNames[first.getMonth()]} – ${last.getDate()} ${monthNames[last.getMonth()]}, ${last.getFullYear()}`;
  };

  // Helper to format "Monday, 15 July"
  const formatSelectedDate = () => {
    const selected = daysOfMonth[selectedDayIndex].fullDate;
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${fullDayNames[selected.getDay()]}, ${selected.getDate()} ${monthNames[selected.getMonth()]}`;
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

  const selectedDayData = fullPlan?.days?.find(d => d.dayOfWeek.toLowerCase() === daysOfMonth[selectedDayIndex].id);
  const meals = selectedDayData?.meals || [];

  const handleSaveCalories = async () => {
    if (!editingMeal) return;
    setIsSavingCalories(true);
    
    const newCalories = parseInt(editCalories, 10);
    if (!newCalories || isNaN(newCalories)) {
      setIsSavingCalories(false);
      setEditingMeal(null);
      return;
    }

    const currentCalories = editingMeal.calories || 1; 
    const scalar = newCalories / currentCalories;

    const scaledIngredients = (editingMeal.ingredientsJson || []).map((mi: any) => ({
      ...mi,
      quantity: Math.round(mi.quantity * scalar * 10) / 10,
    }));

    try {
      await saveMealPlanDayMeal({
        customerMealPlanDayMealId: editingMeal.customerMealPlanDayMealId,
        customerMealPlanDayId: editingMeal.customerMealPlanDayId,
        mealType: editingMeal.mealType,
        mealName: editingMeal.mealName,
        calories: newCalories,
        protein: Math.round((editingMeal.protein || 0) * scalar),
        carbs: Math.round((editingMeal.carbs || 0) * scalar),
        fat: Math.round((editingMeal.fat || 0) * scalar),
        ingredientsJson: scaledIngredients,
      });

      queryClient.invalidateQueries({ queryKey: ['customerMealPlan', userId] });
    } catch (e) {
      console.error(e);
      alert('Failed to update calories');
    } finally {
      setIsSavingCalories(false);
      setEditingMeal(null);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-6 border-b border-[#222222]">
          <Pressable className="mr-6 border-b-2 border-[#C4EF00] pb-2">
            <Text className="text-white text-[18px] font-bold">My nutrition plan</Text>
          </Pressable>
          <Pressable className="pb-2">
            <Text className="text-[#8E8E93] text-[18px] font-bold">Trainer nutrition plan</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-x-4">
            <Pressable onPress={() => setSelectedDayIndex(prev => prev > 0 ? prev - 1 : daysOfMonth.length - 1)} className="w-8 h-8 rounded-full bg-[#1A1A1A] items-center justify-center">
              <CaretLeft size={16} color="#FFFFFF" />
            </Pressable>
            <View className="flex-row items-center">
              <View className="w-4 h-4 border border-white rounded-sm items-center justify-center mr-2">
                <View className="w-3 h-[1px] bg-white absolute top-1" />
              </View>
              <Text className="text-white font-semibold">{formatWeekRange()}</Text>
            </View>
            <Pressable onPress={() => setSelectedDayIndex(prev => prev < daysOfMonth.length - 1 ? prev + 1 : 0)} className="w-8 h-8 rounded-full bg-[#1A1A1A] items-center justify-center">
              <CaretRight size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          <Pressable onPress={() => router.push('/(customer)/nutrition/food-preferences')}>
            <Gear size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-5 px-5">
          {daysOfMonth.map((item, i) => {
            const isSelected = selectedDayIndex === item.index;
            return (
              <Pressable
                key={`${item.id}-${i}`}
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
                className="bg-[#141414] border border-[#222222] rounded-[24px] p-4 flex-col"
              >
                <View className="flex-row justify-between items-start mb-3">
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

                  <View className="items-end">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-white text-[24px] font-bold leading-7 mr-1">{meal.calories || 0}</Text>
                      <Pressable 
                        onPress={() => {
                          setEditingMeal(meal);
                          setEditCalories(meal.calories?.toString() || '');
                        }}
                        className="p-1 -mr-1"
                      >
                        <PencilSimple size={16} color="#8E8E93" weight="bold" />
                      </Pressable>
                    </View>
                    <Text className="text-[#8E8E93] text-[9px] mr-5">kcal</Text>
                  </View>
                </View>

                {/* Macros at bottom line */}
                <View className="flex-row items-center gap-x-3 pt-2 border-t border-[#222222]">
                  <Text className="text-[#4ADE80] text-[11px] font-bold">P {meal.protein || 0}g</Text>
                  <Text className="text-[#FBBF24] text-[11px] font-bold">C {meal.carbs || 0}g</Text>
                  <Text className="text-[#A78BFA] text-[11px] font-bold">F {meal.fat || 0}g</Text>
                  <Text className="text-white text-[11px] font-bold">Fi {meal.fiber || 0}g</Text>
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

      {/* Edit Calories Modal */}
      <Modal
        visible={!!editingMeal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingCalories && setEditingMeal(null)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View className="bg-[#141414] border border-[#222222] rounded-[24px] w-full p-6 items-center relative">
            <Text className="text-white text-lg font-bold mb-2">Edit Calories</Text>
            <Text className="text-[#8E8E93] text-xs text-center mb-6 leading-5">
              Enter a new calorie target for {editingMeal?.mealName}. Protein, carbs, fat, and ingredients will be scaled automatically.
            </Text>

            <View className="flex-row items-center justify-center bg-[#0A0A0A] border border-[#333333] rounded-2xl w-full px-4 mb-8">
              <TextInput
                value={editCalories}
                onChangeText={setEditCalories}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#444444"
                className="text-white text-[32px] font-bold text-center flex-1 h-[80px]"
                autoFocus
              />
              <Text className="text-[#8E8E93] font-bold absolute right-6">kcal</Text>
            </View>

            <View className="flex-row w-full gap-x-4">
              <Pressable
                onPress={() => setEditingMeal(null)}
                disabled={isSavingCalories}
                className="flex-1 bg-[#222222] py-4 rounded-[16px] items-center justify-center"
              >
                <Text className="text-white font-bold">Cancel</Text>
              </Pressable>
              
              <Pressable
                onPress={handleSaveCalories}
                disabled={isSavingCalories}
                className="flex-1 bg-[#C4EF00] py-4 rounded-[16px] items-center justify-center"
              >
                {isSavingCalories ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text className="text-black font-bold">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
