import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  CaretLeft,
  CaretRight,
  Sun,
  Coffee,
  AppleLogo,
  ForkKnife,
  CalendarBlank,
  Plus,
  PencilSimple,
  Trash,
  Copy,
  FloppyDisk,
  Check
} from 'phosphor-react-native';

export default function WeeklyMealPlanner() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState('MON');
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-8">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-xl border border-[#222222] bg-[#141414] items-center justify-center active:opacity-80">
            <CaretLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1 items-center mr-10">
            <Text className="text-white text-lg font-semibold tracking-tight">Weekly Meal Planner</Text>
            <Text className="text-[#8E8E93] text-xs mt-0.5">Plan your meals for the week</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-5 px-5">
          {days.map((day) => {
            const isSelected = selectedDay === day;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                className={`w-16 h-20 rounded-2xl items-center justify-center mr-3 ${isSelected ? 'bg-[#CCFF00]' : 'bg-[#1A1A1A]'} ${!isSelected ? 'border border-[#222222]' : ''}`}
              >
                <Text className={`font-semibold text-xs ${isSelected ? 'text-black' : 'text-[#8E8E93]'}`}>{day}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View className="flex-row items-center mb-4">
          <CalendarBlank size={16} color="#CCFF00" style={{ marginRight: 8 }} />
          <Text className="text-[#8E8E93] text-sm">Plan your meals for <Text className="text-[#CCFF00] font-semibold">Monday</Text></Text>
        </View>

        {/* Breakfast */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-4 mb-4 flex-row items-center">
          <View className="items-center mr-3 w-[50px]">
            <View className="w-10 h-10 rounded-full border border-[#222222] bg-[#1A1A1A] items-center justify-center mb-1.5">
              <Sun size={18} color="#CCFF00" />
            </View>
            <Text className="text-white text-[10px] font-medium">Breakfast</Text>
          </View>

          <View className="w-[60px] h-[60px] rounded-2xl border border-dashed border-[#333333] items-center justify-center mr-3">
            <Plus size={20} color="#555555" />
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="text-white font-semibold mb-0.5 text-sm">No recipe selected</Text>
                <Text className="text-[#555555] text-[11px]">Add a recipe for your breakfast</Text>
              </View>
              <CaretRight size={16} color="#555555" />
            </View>
            <Pressable className="border border-[#CCFF00] rounded-full py-1.5 px-3 flex-row items-center self-start">
              <Plus size={12} color="#CCFF00" weight="bold" style={{ marginRight: 4 }} />
              <Text className="text-[#CCFF00] text-[10px] font-semibold">Choose Recipe</Text>
            </Pressable>
          </View>
        </View>

        {/* Lunch */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-4 mb-4 flex-row">
          <View className="items-center mr-3 w-[50px]">
            <View className="w-10 h-10 rounded-full border border-[#222222] bg-[#1A1A1A] items-center justify-center mb-1.5">
              <Coffee size={18} color="#CCFF00" />
            </View>
            <Text className="text-white text-[10px] font-medium">Lunch</Text>
          </View>

          <Image source={require('../../../assets/grilled_chicken_bowl.png')} className="w-[60px] h-[60px] rounded-2xl mr-3" />

          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-white font-semibold mb-0.5 text-sm">Grilled Chicken Bowl</Text>
                <Text className="text-[#8E8E93] text-[11px] mb-1">520 kcal • 38g Protein</Text>
                <View className="flex-row items-center mb-3">
                  <Check size={10} color="#CCFF00" weight="bold" style={{ marginRight: 4 }} />
                  <Text className="text-[#CCFF00] text-[10px] font-medium">High Protein</Text>
                </View>
              </View>
              <CaretRight size={16} color="#555555" />
            </View>
            <View className="flex-row items-center">
              <Pressable className="border border-[#CCFF00] rounded-full py-1.5 px-4 flex-row items-center mr-2">
                <PencilSimple size={12} color="#CCFF00" style={{ marginRight: 6 }} />
                <Text className="text-[#CCFF00] text-[10px] font-semibold">Change</Text>
              </Pressable>
              <Pressable className="border border-[#333333] rounded-full py-1.5 px-4 flex-row items-center">
                <Trash size={12} color="#F87171" style={{ marginRight: 6 }} />
                <Text className="text-[#F87171] text-[10px] font-semibold">Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Snack */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-4 mb-4 flex-row">
          <View className="items-center mr-3 w-[50px]">
            <View className="w-10 h-10 rounded-full border border-[#222222] bg-[#1A1A1A] items-center justify-center mb-1.5">
              <AppleLogo size={18} color="#CCFF00" />
            </View>
            <Text className="text-white text-[10px] font-medium">Snack</Text>
          </View>

          <Image source={require('../../../assets/protein_smoothie.png')} className="w-[60px] h-[60px] rounded-2xl mr-3" />

          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-white font-semibold mb-0.5 text-sm">Protein Smoothie</Text>
                <Text className="text-[#8E8E93] text-[11px] mb-1">220 kcal • 18g Protein</Text>
                <View className="flex-row items-center mb-3">
                  <Check size={10} color="#CCFF00" weight="bold" style={{ marginRight: 4 }} />
                  <Text className="text-[#CCFF00] text-[10px] font-medium">High Protein</Text>
                </View>
              </View>
              <CaretRight size={16} color="#555555" />
            </View>
            <View className="flex-row items-center">
              <Pressable className="border border-[#CCFF00] rounded-full py-1.5 px-4 flex-row items-center mr-2">
                <PencilSimple size={12} color="#CCFF00" style={{ marginRight: 6 }} />
                <Text className="text-[#CCFF00] text-[10px] font-semibold">Change</Text>
              </Pressable>
              <Pressable className="border border-[#333333] rounded-full py-1.5 px-4 flex-row items-center">
                <Trash size={12} color="#F87171" style={{ marginRight: 6 }} />
                <Text className="text-[#F87171] text-[10px] font-semibold">Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Dinner */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-4 mb-4 flex-row">
          <View className="items-center mr-3 w-[50px]">
            <View className="w-10 h-10 rounded-full border border-[#222222] bg-[#1A1A1A] items-center justify-center mb-1.5">
              <ForkKnife size={18} color="#CCFF00" />
            </View>
            <Text className="text-white text-[10px] font-medium">Dinner</Text>
          </View>

          <Image source={require('../../../assets/paneer_wrap.png')} className="w-[60px] h-[60px] rounded-2xl mr-3" />

          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-white font-semibold mb-0.5 text-sm">Paneer Wrap</Text>
                <Text className="text-[#8E8E93] text-[11px] mb-1">480 kcal • 24g Protein</Text>
                <View className="flex-row items-center mb-3">
                  <Check size={10} color="#CCFF00" weight="bold" style={{ marginRight: 4 }} />
                  <Text className="text-[#CCFF00] text-[10px] font-medium">Vegetarian</Text>
                </View>
              </View>
              <CaretRight size={16} color="#555555" />
            </View>
            <View className="flex-row items-center">
              <Pressable className="border border-[#CCFF00] rounded-full py-1.5 px-4 flex-row items-center mr-2">
                <PencilSimple size={12} color="#CCFF00" style={{ marginRight: 6 }} />
                <Text className="text-[#CCFF00] text-[10px] font-semibold">Change</Text>
              </Pressable>
              <Pressable className="border border-[#333333] rounded-full py-1.5 px-4 flex-row items-center">
                <Trash size={12} color="#F87171" style={{ marginRight: 6 }} />
                <Text className="text-[#F87171] text-[10px] font-semibold">Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Copy Monday's Plan */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-8 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#222222] items-center justify-center mr-4">
              <Copy size={18} color="#CCFF00" />
            </View>
            <View>
              <Text className="text-white font-semibold text-sm mb-0.5">Copy Monday's plan</Text>
              <Text className="text-[#8E8E93] text-[11px]">Apply the same meals to other days</Text>
            </View>
          </View>
          <Pressable className="border border-[#CCFF00] rounded-full py-2 px-4">
            <Text className="text-[#CCFF00] text-[11px] font-semibold">Copy Day</Text>
          </Pressable>
        </View>

        <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 40 }}>
          <Pressable
            className="bg-[#CCFF00] rounded-[20px] py-4 flex-row items-center justify-center active:opacity-90">
            <FloppyDisk size={18} color="#000000" weight="bold" style={{ marginRight: 8 }} />
            <Text className="text-black font-semibold text-lg">Save Weekly Plan</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
