import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, User, Clock, CaretDown, Info, CalendarBlank, Plus, Minus } from 'phosphor-react-native';

export default function CheckInRulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [limit, setLimit] = useState(2);

  const increment = () => {
    if (limit < 10) setLimit(limit + 1);
  };

  const decrement = () => {
    if (limit > 1) setLimit(limit - 1);
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center mr-2 active:opacity-70 -ml-2"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-white tracking-wide">Edit Check-in Rules</Text>
          <Text className="text-[#A1A1AA] text-xs mt-0.5 leading-4 pr-4">
            Set how many times a customer can check in and the minimum gap.
          </Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#161616] border border-[#1F1F22] rounded-2xl p-5 mb-5 mt-2">
          <View className="flex-row items-start mb-6">
            <View className="w-10 h-10 rounded-full bg-[#1E2015] items-center justify-center mr-4">
              <User size={20} color="#C4EF00" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-[15px] font-bold mb-1">Daily Check-in Limit</Text>
              <Text className="text-[#A1A1AA] text-xs leading-4">How many times can a customer check in per day?</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between border border-[#1F1F22] rounded-xl bg-[#0A0A0A] p-2">
            <Pressable 
              onPress={decrement}
              className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#121214] items-center justify-center active:opacity-70"
            >
              <Minus size={16} color="#FFFFFF" weight="bold" />
            </Pressable>
            
            <Text className="text-white text-[15px] font-semibold">{limit} times</Text>

            <Pressable 
              onPress={increment}
              className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#121214] items-center justify-center active:opacity-70"
            >
              <Plus size={16} color="#C4EF00" weight="bold" />
            </Pressable>
          </View>
        </View>
        <View className="bg-[#161616] border border-[#1F1F22] rounded-2xl p-5 mb-5">
          <View className="flex-row items-start mb-6">
            <View className="w-10 h-10 rounded-full bg-[#1E2015] items-center justify-center mr-4">
              <Clock size={20} color="#C4EF00" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-[15px] font-bold mb-1">Minimum Gap Between Check-ins</Text>
              <Text className="text-[#A1A1AA] text-xs leading-4 mt-1">Set the minimum time gap required between two check-ins.</Text>
            </View>
          </View>

          <Pressable className="flex-row items-center justify-between border border-[#1F1F22] rounded-xl bg-[#0A0A0A] px-4 h-12 mb-5 active:opacity-70">
            <Text className="text-white text-[15px] font-medium">2 Hours</Text>
            <CaretDown size={16} color="#FFFFFF" weight="bold" />
          </Pressable>

          <View className="bg-[#121214] border border-[#1F1F22] rounded-xl p-4 flex-row">
            <Info size={18} color="#C4EF00" weight="regular" style={{ marginRight: 10, marginTop: 2 }} />
            <Text className="text-[#A1A1AA] text-xs leading-5 flex-1">
              Customers can check in up to <Text className="text-[#C4EF00] font-semibold">{limit} times</Text> per day, with at least <Text className="text-[#C4EF00] font-semibold">2 hours</Text> between each check-in.
            </Text>
          </View>
        </View>
        <View className="bg-[#161616] border border-[#1F1F22] rounded-xl p-5 flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-[#1E2015] items-center justify-center mr-4">
            <CalendarBlank size={20} color="#C4EF00" weight="regular" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-[15px] font-bold mb-1">Rule Applies To</Text>
            <Text className="text-[#71717A] text-[10px]">These rules will be applied to all active members.</Text>
          </View>
        </View>

      </ScrollView>
      <View 
        className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#1F1F22] px-5 pt-4 pb-6 flex-row gap-4"
        style={{ paddingBottom: Math.max(insets.bottom + 65, 85) }}
      >
        <Pressable 
          className="flex-1 border border-[#27272A] bg-[#121214] py-4 rounded-xl items-center justify-center active:opacity-70"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold text-[15px]">Cancel</Text>
        </Pressable>
        <Pressable 
          className="flex-1 bg-[#C4EF00] py-4 rounded-xl items-center justify-center active:opacity-80"
          onPress={() => router.back()}
        >
          <Text className="text-[#000000] font-bold text-[15px]">Save Changes</Text>
        </Pressable>
      </View>
    </View>
  );
}
