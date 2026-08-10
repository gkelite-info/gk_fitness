import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Clock, PencilSimple, User, ArrowsLeftRight, Hourglass } from 'phosphor-react-native';

const TIMINGS = [
  { day: 'Monday', time: '6:00 AM – 10:00 PM' },
  { day: 'Tuesday', time: '6:00 AM – 10:00 PM' },
  { day: 'Wednesday', time: '6:00 AM – 10:00 PM' },
  { day: 'Thursday', time: '6:00 AM – 10:00 PM' },
  { day: 'Friday', time: '6:00 AM – 10:00 PM' },
  { day: 'Saturday', time: '7:00 AM – 9:00 PM' },
  { day: 'Sunday', time: '7:00 AM – 1:00 PM' },
];

export default function GymAccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center mr-2 active:opacity-70 -ml-2"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide mr-3">Gym Access</Text>
        <View className="bg-green-900/40 border border-green-700/50 rounded flex-row items-center px-1.5 py-0.5">
          <View className="w-1 h-1 rounded-full bg-[#C4EF00] mr-1.5" />
          <Text className="text-[#C4EF00] text-[10px] font-semibold">Active</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[#A1A1AA] text-[13px] leading-5 mb-6">
          Manage gym timings and customer check-in rules.
        </Text>
        <View className="bg-[#161616] rounded-3xl p-5 mb-6 border border-[#1F1F22]">
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-row flex-1 pr-4">
              <View className="w-10 h-10 rounded-full bg-[#1E2015] items-center justify-center mr-4">
                <Clock size={20} color="#C4EF00" weight="regular" />
              </View>
              <View className="flex-1 pt-1">
                <Text className="text-white text-base font-bold mb-1">Gym Timings</Text>
                <Text className="text-[#A1A1AA] text-xs">Set the days and time your gym is open.</Text>
              </View>
            </View>
            <Pressable 
              className="w-8 h-8 rounded-full border border-[#C4EF00] items-center justify-center active:opacity-70"
              onPress={() => router.push('/(owner)/profile/gym-access/settings')}
            >
              <PencilSimple size={14} color="#C4EF00" weight="bold" />
            </Pressable>
          </View>

          <View className="gap-y-6">
            {TIMINGS.map((item, index) => (
              <View key={index} className="flex-row justify-between items-center">
                <Text className="text-white text-[13px]">{item.day}</Text>
                <Text className="text-[#D4D4D8] text-[13px]">{item.time}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="bg-[#161616] rounded-3xl p-5 border border-[#1F1F22]">
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-row flex-1 pr-4">
              <View className="w-10 h-10 rounded-full bg-[#1E2015] items-center justify-center mr-4">
                <User size={20} color="#C4EF00" weight="fill" />
              </View>
              <View className="flex-1 pt-1">
                <Text className="text-white text-base font-bold mb-1">Customer Check-in Rules</Text>
                <Text className="text-[#A1A1AA] text-xs leading-4">Set how many times a customer can enter per day.</Text>
              </View>
            </View>
            <Pressable 
              className="w-8 h-8 rounded-full border border-[#C4EF00] items-center justify-center active:opacity-70 mt-1"
              onPress={() => router.push('/(owner)/profile/gym-access/check-in-rules')}
            >
              <PencilSimple size={14} color="#C4EF00" weight="bold" />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row flex-1 items-center pr-4">
              <View className="w-9 h-9 rounded-full bg-[#1E2015] items-center justify-center mr-3">
                <ArrowsLeftRight size={16} color="#C4EF00" weight="bold" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-[13px] font-medium mb-1">Daily Check-in Limit</Text>
                <Text className="text-[#71717A] text-[10px] leading-3">Maximum entries per customer per day</Text>
              </View>
            </View>
            <Text className="text-white text-[13px] font-bold">2 times</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row flex-1 items-center pr-4">
              <View className="w-9 h-9 rounded-full bg-[#1E2015] items-center justify-center mr-3">
                <Hourglass size={16} color="#C4EF00" weight="fill" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-[13px] font-medium mb-1">Minimum Gap Between Check-ins</Text>
                <Text className="text-[#71717A] text-[10px] leading-3">Time required between two check-ins</Text>
              </View>
            </View>
            <Text className="text-white text-[13px] font-bold">2 Hours</Text>
          </View>

        </View>

      </ScrollView>
    </View>
  );
}
