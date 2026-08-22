import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretLeft, CalendarBlank, CaretDown, CaretRight } from 'phosphor-react-native';

const TIMELINE_RECORDS = [
  { id: 1, date: 'May 14, 2025', day: 'Day 90', isActive: true },
  { id: 2, date: 'Apr 14, 2025', day: 'Day 60', isActive: false },
  { id: 3, date: 'Mar 15, 2025', day: 'Day 30', isActive: false },
  { id: 4, date: 'Feb 13, 2025', day: 'Day 1', isActive: false },
];

const MEASUREMENTS = [
  { part: 'Chest', value: 101.3, unit: 'cm' },
  { part: 'Waist', value: 87.7, unit: 'cm' },
  { part: 'Hips', value: 94.0, unit: 'cm' },
  { part: 'Biceps', value: 36.3, unit: 'cm' },
  { part: 'Forearms', value: 28.5, unit: 'cm' },
  { part: 'Thighs', value: 60.4, unit: 'cm' },
  { part: 'Calves', value: 38.3, unit: 'cm' },
  { part: 'Body Fat %', value: 18.2, unit: '%' },
];

export default function MeasurementHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-4">
          
          {/* Header */}
          <View className="flex-row items-center mb-1">
            <Pressable 
              className="mr-3 p-1 -ml-1 active:opacity-70"
              onPress={() => router.back()}
            >
              <CaretLeft size={24} color="#FFFFFF" weight="bold" />
            </Pressable>
            <Text className="text-white text-xl font-bold tracking-tight">Measurement History</Text>
          </View>
          <Text className="text-[#8E8E93] text-[13px] mb-8 ml-9">
            View your previously saved body measurements.
          </Text>

          {/* Date Selector */}
          <Pressable className="flex-row items-center justify-between bg-[#09090B] rounded-2xl p-4 border border-[#D4FF00] active:opacity-80 mb-8">
            <View className="flex-row items-center gap-3">
              <CalendarBlank size={20} color="#E5E5EA" weight="regular" />
              <Text className="text-[#E5E5EA] text-[15px] font-medium">May 14, 2025</Text>
            </View>
            <CaretDown size={18} color="#8E8E93" weight="bold" />
          </Pressable>

          {/* Recent Records */}
          <Text className="text-white text-[15px] font-bold mb-4">Recent Records</Text>
          <View className="mb-10 pl-2">
            {TIMELINE_RECORDS.map((record, index) => {
              const isLast = index === TIMELINE_RECORDS.length - 1;
              return (
                <View key={record.id} className="flex-row items-stretch">
                  {/* Timeline Graphic */}
                  <View className="items-center mr-4">
                    <View className={`w-5 h-5 rounded-full border-[2.5px] items-center justify-center ${record.isActive ? 'border-[#D4FF00]' : 'border-[#2A2A2D]'}`}>
                      {record.isActive && <View className="w-1.5 h-1.5 rounded-full bg-[#D4FF00]" />}
                    </View>
                    {!isLast && (
                      <View className="w-[1px] flex-1 bg-[#2A2A2D] my-1" />
                    )}
                  </View>
                  
                  {/* Record Card */}
                  <Pressable className="flex-1 bg-[#1C1C1E] rounded-xl p-4 mb-4 flex-row items-center justify-between active:opacity-80 border border-[#2A2A2D]/30">
                    <View className="flex-row items-center gap-3">
                      <Text className="text-[#E5E5EA] text-[15px]">{record.date}</Text>
                      <View className={`px-2 py-0.5 rounded ${record.isActive ? 'bg-[#D4FF00]' : 'bg-[#D4FF00]/20'}`}>
                        <Text className={`text-[10px] font-bold ${record.isActive ? 'text-[#09090B]' : 'text-[#D4FF00]'}`}>{record.day}</Text>
                      </View>
                    </View>
                    <CaretRight size={16} color="#6B6B6B" weight="bold" />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Measurements List */}
          <Text className="text-white text-[15px] font-bold mb-4">Measurements</Text>
          <View className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-[#2A2A2D]/50 mb-8">
            {MEASUREMENTS.map((item, index) => {
              const isLast = index === MEASUREMENTS.length - 1;
              return (
                <View 
                  key={item.part}
                  className={`flex-row items-center justify-between px-5 py-4 ${!isLast ? 'border-b border-[#2A2A2D]/50' : ''}`}
                >
                  <Text className="text-[#E5E5EA] text-[15px] font-medium">{item.part}</Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-[#D4FF00] text-[15px] font-bold">{item.value.toFixed(1)}</Text>
                    <Text className="text-[#D4FF00] text-[11px] font-medium">{item.unit}</Text>
                  </View>
                </View>
              );
            })}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
