import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeftIcon as CaretLeft, CaretRightIcon as CaretRight, GearIcon as Gear, SunIcon as Sun, CoffeeIcon as Coffee, MoonIcon as Moon, ArrowsLeftRightIcon as ArrowsLeftRight, FireIcon as Fire, LeafIcon as Leaf } from 'phosphor-react-native';

export default function MyNutritionPlan() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(15);

  const days = [
    { day: 'MON', date: 15 },
    { day: 'TUE', date: 16 },
    { day: 'WED', date: 17 },
    { day: 'THU', date: 18 },
    { day: 'FRI', date: 19 },
    { day: 'SAT', date: 20 },
    { day: 'SUN', date: 21 },
  ];

  const meals = [
    {
      id: '1',
      type: 'BREAKFAST',
      icon: Sun,
      name: 'Oats Bowl with Berries & Chia Seeds',
      desc: 'High in fiber & protein to keep you full for longer',
      kcal: 350,
      p: 18,
      c: 45,
      f: 12
    },
    {
      id: '2',
      type: 'LUNCH',
      icon: Coffee,
      name: 'Grilled Chicken with Quinoa & Veggies',
      desc: 'Balanced meal with lean protein and complex carbs',
      kcal: 520,
      p: 32,
      c: 55,
      f: 15
    },
    {
      id: '3',
      type: 'SNACK',
      icon: Coffee,
      name: 'Berry Smoothie',
      desc: 'Refreshing & antioxidant-rich to curb cravings',
      kcal: 180,
      p: 15,
      c: 25,
      f: 5
    },
    {
      id: '4',
      type: 'DINNER',
      icon: Moon,
      name: 'Paneer Tikka with Salad',
      desc: 'High protein dinner to support fat loss & recovery',
      kcal: 450,
      p: 28,
      c: 35,
      f: 14
    }
  ];

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
          <Pressable onPress={() => router.push('/(customer)/nutrition/nutrition-preferences')}>
            <Gear size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-center mb-6 gap-x-4">
          <Pressable className="w-8 h-8 rounded-full bg-[#1A1A1A] items-center justify-center">
            <CaretLeft size={16} color="#FFFFFF" />
          </Pressable>
          <View className="flex-row items-center">
            <View className="w-4 h-4 border border-white rounded-sm items-center justify-center mr-2">
              <View className="w-3 h-[1px] bg-white absolute top-1" />
            </View>
            <Text className="text-white font-semibold">15 Jul – 21 Jul, 2024</Text>
          </View>
          <Pressable className="w-8 h-8 rounded-full bg-[#1A1A1A] items-center justify-center">
            <CaretRight size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-5 px-5">
          {days.map((item) => {
            const isSelected = selectedDay === item.date;
            return (
              <Pressable
                key={item.date}
                onPress={() => setSelectedDay(item.date)}
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
          <Text className="text-white text-lg font-bold">Monday, 15 July</Text>
        </View>

        <View className="gap-y-4 mb-6">
          {meals.map((meal) => {
            const Icon = meal.icon;
            return (
              <Pressable
                key={meal.id}
                onPress={() => router.push('/(customer)/nutrition/meal-detail')}
                className="bg-[#141414] border border-[#222222] rounded-[24px] p-4 flex-row"
              >
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center mb-1">
                    <Icon size={16} color="#C4EF00" weight="regular" style={{ marginRight: 6 }} />
                    <Text className="text-[#C4EF00] text-[10px] font-bold tracking-widest">{meal.type}</Text>
                  </View>
                  <Text className="text-white text-base font-bold mb-2 leading-5 pr-2">{meal.name}</Text>
                  <View className="flex-row items-start">
                    <Leaf size={12} color="#4ADE80" weight="fill" style={{ marginRight: 4, marginTop: 2 }} />
                    <Text className="text-[#8E8E93] text-[11px] leading-4 flex-1 pr-4">{meal.desc}</Text>
                  </View>
                </View>

                <View className="items-end justify-between w-[60px]">
                  <Pressable 
                    onPress={() => router.push('/(customer)/nutrition/swap-meal')}
                    className="bg-[#C4EF00] rounded-md px-2 py-1 flex-row items-center mb-2"
                  >
                    <ArrowsLeftRight size={10} color="#000" weight="bold" style={{ marginRight: 4 }} />
                    <Text className="text-black text-[10px] font-bold">Swap</Text>
                  </Pressable>

                  <View className="items-center mb-2">
                    <Text className="text-white text-lg font-bold leading-5">{meal.kcal}</Text>
                    <Text className="text-[#8E8E93] text-[9px]">kcal</Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-[#4ADE80] text-[10px] font-bold mb-0.5">P {meal.p}g</Text>
                    <Text className="text-[#FBBF24] text-[10px] font-bold mb-0.5">C {meal.c}g</Text>
                    <Text className="text-[#A78BFA] text-[10px] font-bold">F {meal.f}g</Text>
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
        <Pressable className="bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90">
          <Text className="text-black font-bold text-lg">Regenerate Day</Text>
        </Pressable>
      </View>
    </View>
  );
}
