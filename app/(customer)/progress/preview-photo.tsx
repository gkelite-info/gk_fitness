import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { X, CalendarBlank, CaretRight, CheckCircle } from 'phosphor-react-native';

const PROGRESS_DAYS = [1, 30, 40, 60, 90];

export default function PreviewProgressPhotoModal() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(40);

  return (
    <View className="flex-1 bg-[#09090B] pt-8 px-5">
      
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        {/* Placeholder for centering */}
        <View className="w-8 h-8" />
        <Text className="text-white text-xl font-bold tracking-tight">Preview Progress Photo</Text>
        <Pressable 
          className="w-8 h-8 rounded-full bg-[#1C1C1E] items-center justify-center active:opacity-70"
          onPress={() => router.back()}
        >
          <X size={16} color="#8E8E93" weight="bold" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* Image Preview */}
        <View className="w-full h-64 bg-[#1C1C1E] rounded-3xl overflow-hidden mb-6 border border-[#2A2A2D]/50">
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop' }} 
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>

        {/* Date Selector */}
        <Pressable className="bg-[#1C1C1E] rounded-2xl p-5 flex-row items-center justify-between mb-8 border border-[#2A2A2D]/50 active:opacity-80">
          <View className="flex-row items-center gap-4">
            <CalendarBlank size={20} color="#8E8E93" weight="regular" />
            <Text className="text-white text-[15px]">Date</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-[#8E8E93] text-[15px]">May 14, 2025</Text>
            <CaretRight size={16} color="#6B6B6B" weight="bold" />
          </View>
        </Pressable>

        {/* Progress Day Selection */}
        <Text className="text-white text-[17px] font-bold mb-1">Progress Day</Text>
        <Text className="text-[#8E8E93] text-[13px] mb-4">Track your journey by selecting the day number.</Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="mb-10"
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {PROGRESS_DAYS.map((day) => {
            const isSelected = day === selectedDay;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                className={`w-[72px] h-[80px] rounded-2xl items-center justify-center relative ${
                  isSelected ? 'bg-[#1C1C1E] border border-[#D4FF00]' : 'bg-[#1C1C1E] border border-[#2A2A2D]/50'
                }`}
              >
                {isSelected && (
                  <View className="absolute -top-2 -right-2 bg-[#09090B] rounded-full">
                    <CheckCircle size={18} weight="fill" color="#D4FF00" />
                  </View>
                )}
                <Text className={`${isSelected ? 'text-white' : 'text-white'} text-[15px] mb-0.5`}>Day</Text>
                <Text className={`${isSelected ? 'text-[#D4FF00]' : 'text-white'} text-[17px] font-bold`}>{day}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Action Buttons */}
        <View className="gap-3">
          <Pressable 
            className="bg-[#D4FF00] rounded-2xl py-4 items-center justify-center active:opacity-80 shadow-lg"
            onPress={() => router.back()}
          >
            <Text className="text-[#09090B] text-[17px] font-bold">Save Progress Photo</Text>
          </Pressable>
          <Pressable 
            className="bg-[#1C1C1E] rounded-2xl py-4 items-center justify-center active:opacity-80 border border-[#2A2A2D]/50"
            onPress={() => router.back()}
          >
            <Text className="text-white text-[17px] font-bold">Cancel</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
