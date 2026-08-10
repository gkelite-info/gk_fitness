import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Clock, CaretDown, CheckSquare, Square } from 'phosphor-react-native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DaySettingRow = ({ day, isLast }: { day: string, isLast: boolean }) => {
  const [isClosed, setIsClosed] = useState(false);
  const defaultOpen = (day === 'Saturday' || day === 'Sunday') ? '07:00 AM' : '06:00 AM';
  const defaultClose = day === 'Saturday' ? '09:00 PM' : (day === 'Sunday' ? '01:00 PM' : '10:00 PM');

  return (
    <View className={`py-6 ${!isLast ? 'border-b border-[#1F1F22]' : ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="w-[85px]">
          <Text className="text-white text-[13px] font-medium mb-3">{day}</Text>
          <Pressable 
            className="flex-row items-center active:opacity-70"
            onPress={() => setIsClosed(!isClosed)}
          >
            {isClosed ? (
              <CheckSquare size={16} color="#71717A" weight="fill" style={{ marginRight: 6 }} />
            ) : (
              <Square size={16} color="#3F3F46" weight="regular" style={{ marginRight: 6 }} />
            )}
            <Text className="text-[#A1A1AA] text-xs">Closed</Text>
          </Pressable>
        </View>

        <View className={`flex-1 flex-row justify-between ${isClosed ? 'opacity-30' : ''}`}>
          <View className="flex-1 mr-3">
            <Text className="text-[#71717A] text-[10px] mb-2">Opens at</Text>
            <Pressable 
              className="flex-row items-center justify-between border border-[#1F1F22] rounded-lg bg-[#0A0A0A] px-3 h-10 active:opacity-70"
              disabled={isClosed}
            >
              <Text className="text-white text-xs font-semibold">{defaultOpen}</Text>
              <CaretDown size={14} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>

          <View className="flex-1">
            <Text className="text-[#71717A] text-[10px] mb-2">Closes at</Text>
            <Pressable 
              className="flex-row items-center justify-between border border-[#1F1F22] rounded-lg bg-[#0A0A0A] px-3 h-10 active:opacity-70"
              disabled={isClosed}
            >
              <Text className="text-white text-xs font-semibold">{defaultClose}</Text>
              <CaretDown size={14} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function GymAccessSettingsScreen() {
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
        <Text className="text-xl font-bold text-white tracking-wide">Gym Access Settings</Text>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[#A1A1AA] text-[13px] leading-5 mb-6">
          Set gym timings and customer check-in rules.
        </Text>

        <View className="bg-[#161616] border border-[#1F1F22] rounded-3xl p-5 mb-6">
          <View className="flex-row items-start mb-2">
            <Clock size={20} color="#C4EF00" weight="regular" style={{ marginRight: 12, marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-white text-[15px] font-bold mb-1">Gym Timings</Text>
              <Text className="text-[#A1A1AA] text-xs">Set opening and closing time for each day.</Text>
            </View>
          </View>

          <View className="mt-2">
            {DAYS.map((day, index) => (
              <DaySettingRow key={day} day={day} isLast={index === DAYS.length - 1} />
            ))}
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
