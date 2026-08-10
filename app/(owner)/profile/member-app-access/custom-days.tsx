import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, CalendarBlank, Plus, Minus, Eye, ClockCounterClockwise } from 'phosphor-react-native';

export default function CustomDaysScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState('25');

  const increment = () => {
    let d = parseInt(days) || 0;
    if (d < 180) setDays((d + 1).toString());
  };

  const decrement = () => {
    let d = parseInt(days) || 0;
    if (d > 1) setDays((d - 1).toString());
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
        <Text className="text-xl font-bold text-white tracking-wide">Member App Access</Text>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[#A1A1AA] text-[13px] leading-5 mb-6">
          Set a custom number of days members can continue using the app after their membership expires.
        </Text>
        <View className="bg-[#161616] border border-[#1F1F22] rounded-2xl p-5 mb-6">
          <Text className="text-white text-[15px] font-semibold mb-1">Number of Days</Text>
          <Text className="text-[#A1A1AA] text-xs mb-5">Enter the number of days you want to allow access.</Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-1 border border-[#C4EF00] rounded-xl px-4 h-16 flex-row items-center justify-between mr-4 bg-[#121214]">
              <CalendarBlank size={20} color="#C4EF00" weight="regular" />
              <View className="flex-row items-end">
                <TextInput
                  className="text-white text-3xl font-bold p-0 m-0 text-right min-w-[50px]"
                  value={days}
                  onChangeText={setDays}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectionColor="#C4EF00"
                />
                <Text className="text-[#A1A1AA] text-xs font-medium ml-2 mb-1.5">Days</Text>
              </View>
            </View>

            <View className="justify-between h-20 gap-2">
              <Pressable 
                onPress={increment}
                className="w-10 h-10 rounded-full border border-[#27272A] bg-[#121214] items-center justify-center active:opacity-70"
              >
                <Plus size={16} color="#FFFFFF" weight="bold" />
              </Pressable>
              <Pressable 
                onPress={decrement}
                className="w-10 h-10 rounded-full border border-[#27272A] bg-[#121214] items-center justify-center active:opacity-70"
              >
                <Minus size={16} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>
          </View>

          <Text className="text-[#71717A] text-[11px] mt-4">Minimum 1 day • Maximum 180 days</Text>
        </View>
        <View className="bg-[#161616] border border-[#1F1F22] rounded-2xl p-5">
          <View className="flex-row items-center mb-5">
            <Eye size={18} color="#C4EF00" weight="regular" style={{ marginRight: 8 }} />
            <Text className="text-white text-[15px] font-semibold">Preview</Text>
          </View>
          <Text className="text-[#A1A1AA] text-[13px] mb-6">How this will apply to members</Text>

          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-1">
              <Text className="text-[#A1A1AA] text-[10px] mb-2">Membership expires on</Text>
              <View className="bg-[#0A0A0A] border border-[#1F1F22] rounded-lg px-3 h-10 flex-row items-center">
                <CalendarBlank size={14} color="#C4EF00" weight="regular" style={{ marginRight: 6 }} />
                <Text className="text-white text-[12px] font-semibold">10 Aug 2026</Text>
              </View>
            </View>

            <View className="px-2 pt-6 items-center">
              <View className="bg-[#C4EF00] rounded-full px-2 py-0.5 mb-1 z-10">
                <Text className="text-[#000000] text-[8px] font-bold">{days || '0'} Days</Text>
              </View>
              <View className="h-[1px] w-12 bg-[#3F3F46] -mt-1.5" />
            </View>

            <View className="flex-1">
              <Text className="text-[#A1A1AA] text-[10px] mb-2">Access ends on</Text>
              <View className="bg-[#0A0A0A] border border-[#1F1F22] rounded-lg px-3 h-10 flex-row items-center">
                <CalendarBlank size={14} color="#C4EF00" weight="regular" style={{ marginRight: 6 }} />
                <Text className="text-white text-[12px] font-semibold">04 Sep 2026</Text>
              </View>
            </View>
          </View>

          <View className="bg-[#0A0A0A] border border-[#1F1F22] rounded-xl p-4 flex-row">
            <ClockCounterClockwise size={18} color="#C4EF00" weight="regular" style={{ marginRight: 10, marginTop: 2 }} />
            <Text className="text-[#A1A1AA] text-[11px] leading-4 flex-1">
              Members can continue using the app with limited features for <Text className="text-[#C4EF00]">{days || '0'} days</Text> after expiry.
            </Text>
          </View>
        </View>

      </ScrollView>
      <View 
        className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#1F1F22] px-5 pt-4 pb-6"
        style={{ paddingBottom: Math.max(insets.bottom + 65, 85) }}
      >
        <Pressable 
          className="w-full bg-[#C4EF00] py-4 rounded-xl items-center justify-center active:opacity-80 mb-3"
          onPress={() => router.back()}
        >
          <Text className="text-[#000000] font-bold text-[15px]">Save & Apply</Text>
        </Pressable>
        <Pressable 
          className="w-full border border-[#27272A] bg-[#121214] py-4 rounded-xl items-center justify-center active:opacity-70"
          onPress={() => router.back()}
        >
          <Text className="text-[#C4EF00] font-bold text-[15px]">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
