import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ClockCounterClockwise, PencilSimple, CaretLeft } from 'phosphor-react-native';

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

export default function BodyMeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { data: progressData, isLoading } = useProgressData(userId || null);

  if (isLoading || !progressData) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator color="#D4FF00" size="large" />
      </View>
    );
  }

  const { measurementHistory } = progressData;
  const currentMeasurements = measurementHistory[0] || {};
  const previousMeasurements = measurementHistory[1] || {};

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-4">
          <View className="flex-row justify-between items-start mb-1">
            <View className="flex-row items-center">
              <Pressable 
                className="mr-3 p-1 -ml-1 active:opacity-70 mt-1"
                onPress={() => router.back()}
              >
                <CaretLeft size={28} color="#FFFFFF" weight="bold" />
              </Pressable>
              <Text className="text-white text-[32px] font-bold tracking-tight">Body Measurements</Text>
            </View>
            <Pressable 
              className="mt-2 active:opacity-70"
              onPress={() => router.push('/(customer)/progress/measurements-history')}
            >
              <ClockCounterClockwise size={26} color="#D4FF00" weight="regular" />
            </Pressable>
          </View>
          <Text className="text-[#8E8E93] text-[15px] mb-8 ml-10">
            Track your progress over time.
          </Text>

          {/* Table Headers */}
          <View className="flex-row px-4 mb-4">
            <Text className="flex-1 text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] uppercase">Part</Text>
            <Text className="w-20 text-center text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] uppercase">Prev</Text>
            <Text className="w-20 text-right text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] uppercase">Current</Text>
          </View>

          {/* Measurements List */}
          <View className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-[#2A2A2D]/50 mb-8">
            {MEASUREMENT_PARTS.map((item, index) => {
              const currentVal = (currentMeasurements as any)[item.key] || 0;
              const prevVal = (previousMeasurements as any)[item.key] || 0;
              const diff = currentVal - prevVal;
              const isReduction = diff < 0;
              const isSame = diff === 0;
              
              const diffText = isSame ? `0.0 ${item.unit}` : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${item.unit}`;
              const diffColor = isReduction ? 'text-[#D4FF00]' : 'text-[#8E8E93]';
              const currentValueColor = isReduction ? 'text-[#D4FF00]' : 'text-white';
              
              const isLast = index === MEASUREMENT_PARTS.length - 1;

              return (
                <View 
                  key={item.key}
                  className={`flex-row items-center px-5 py-4 ${!isLast ? 'border-b border-[#2A2A2D]/50' : ''}`}
                >
                  <View className="flex-1 justify-center">
                    <Text className="text-white text-[17px] mb-1">{item.label}</Text>
                    <Text className={`${diffColor} text-[11px] font-bold tracking-wider`}>{diffText}</Text>
                  </View>
                  
                  <View className="w-20 items-center justify-center">
                    <Text className="text-[#8E8E93] text-[15px]">{prevVal.toFixed(1)}</Text>
                  </View>
                  
                  <View className="w-20 items-end justify-center">
                    <Text className={`${currentValueColor} text-[17px] font-medium`}>{currentVal.toFixed(1)}</Text>
                  </View>
                </View>
              );
            })}
          </View>

        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute left-0 right-0 px-5 pt-4 pb-4 bg-transparent" 
        style={{ bottom: 75 + insets.bottom + 10 }}
      >
        <Pressable 
          className="bg-[#D4FF00] rounded-full py-4 flex-row items-center justify-center active:opacity-80 shadow-lg"
          onPress={() => router.push('/(customer)/progress/update-measurements')}
        >
          <PencilSimple size={20} weight="bold" color="#09090B" />
          <Text className="text-[#09090B] text-[17px] font-bold ml-2">Update Measurements</Text>
        </Pressable>
      </View>
    </View>
  );
}
