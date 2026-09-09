import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretLeft, CalendarBlank, CaretDown, CaretRight } from 'phosphor-react-native';

import { useState } from 'react';
import { useProgressData } from '@/hooks/fitness/useProgressData';
import { useUser } from '@/context/UserContext';
import { ActivityIndicator } from 'react-native';

const MEASUREMENT_PARTS = [
  { key: 'chest', label: 'Chest', unit: 'cm' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'hips', label: 'Hips', unit: 'cm' },
  { key: 'biceps', label: 'Biceps', unit: 'cm' },
  { key: 'forearms', label: 'Forearms', unit: 'cm' },
  { key: 'thighs', label: 'Thighs', unit: 'cm' },
  { key: 'calves', label: 'Calves', unit: 'cm' },
  { key: 'bodyFatPercentage', label: 'Body Fat %', unit: '%' },
];

export default function MeasurementHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { data: progressData, isLoading } = useProgressData(userId || null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (isLoading || !progressData) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator color="#D4FF00" size="large" />
      </View>
    );
  }

  const { measurementHistory } = progressData;
  const activeRecord = measurementHistory[selectedIndex];

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
          {activeRecord && (
            <Pressable className="flex-row items-center justify-between bg-[#09090B] rounded-2xl p-4 border border-[#D4FF00] active:opacity-80 mb-8">
              <View className="flex-row items-center gap-3">
                <CalendarBlank size={20} color="#E5E5EA" weight="regular" />
                <Text className="text-[#E5E5EA] text-[15px] font-medium">{new Date(activeRecord.loggedAt).toLocaleDateString()}</Text>
              </View>
              <CaretDown size={18} color="#8E8E93" weight="bold" />
            </Pressable>
          )}

          {/* Recent Records */}
          <Text className="text-white text-[15px] font-bold mb-4">Recent Records</Text>
          <View className="mb-10 pl-2">
            {measurementHistory.map((record, index) => {
              const isLast = index === measurementHistory.length - 1;
              const isActive = index === selectedIndex;
              return (
                <View key={record.customerMeasurementId} className="flex-row items-stretch">
                  {/* Timeline Graphic */}
                  <View className="items-center mr-4">
                    <View className={`w-5 h-5 rounded-full border-[2.5px] items-center justify-center ${isActive ? 'border-[#D4FF00]' : 'border-[#2A2A2D]'}`}>
                      {isActive && <View className="w-1.5 h-1.5 rounded-full bg-[#D4FF00]" />}
                    </View>
                    {!isLast && (
                      <View className="w-[1px] flex-1 bg-[#2A2A2D] my-1" />
                    )}
                  </View>
                  
                  {/* Record Card */}
                  <Pressable 
                    onPress={() => setSelectedIndex(index)}
                    className="flex-1 bg-[#1C1C1E] rounded-xl p-4 mb-4 flex-row items-center justify-between active:opacity-80 border border-[#2A2A2D]/30"
                  >
                    <View className="flex-row items-center gap-3">
                      <Text className="text-[#E5E5EA] text-[15px]">{new Date(record.loggedAt).toLocaleDateString()}</Text>
                      <View className={`px-2 py-0.5 rounded ${isActive ? 'bg-[#D4FF00]' : 'bg-[#D4FF00]/20'}`}>
                        <Text className={`text-[10px] font-bold ${isActive ? 'text-[#09090B]' : 'text-[#D4FF00]'}`}>{index === 0 ? 'Latest' : 'Log'}</Text>
                      </View>
                    </View>
                    <CaretRight size={16} color="#6B6B6B" weight="bold" />
                  </Pressable>
                </View>
              );
            })}
            
            {measurementHistory.length === 0 && (
              <Text className="text-[#8E8E93] text-[15px] italic">No history available.</Text>
            )}
          </View>

          {/* Measurements List */}
          {activeRecord && (
            <>
              <Text className="text-white text-[15px] font-bold mb-4">Measurements</Text>
              <View className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-[#2A2A2D]/50 mb-8">
                {MEASUREMENT_PARTS.map((item, index) => {
                  const val = (activeRecord as any)[item.key];
                  if (val === undefined || val === null) return null;
                  const isLast = index === MEASUREMENT_PARTS.length - 1;
                  return (
                    <View 
                      key={item.key}
                      className={`flex-row items-center justify-between px-5 py-4 ${!isLast ? 'border-b border-[#2A2A2D]/50' : ''}`}
                    >
                      <Text className="text-[#E5E5EA] text-[15px] font-medium">{item.label}</Text>
                      <View className="flex-row items-baseline gap-1">
                        <Text className="text-[#D4FF00] text-[15px] font-bold">{val.toFixed(1)}</Text>
                        <Text className="text-[#D4FF00] text-[11px] font-medium">{item.unit}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
