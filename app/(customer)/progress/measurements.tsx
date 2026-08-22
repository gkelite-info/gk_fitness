import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ClockCounterClockwise, PencilSimple, CaretLeft } from 'phosphor-react-native';

const MEASUREMENTS = [
  { part: 'Chest', prev: 102.5, current: 101.3, unit: 'cm' },
  { part: 'Waist', prev: 88.2, current: 87.7, unit: 'cm' },
  { part: 'Hips', prev: 94.0, current: 94.0, unit: 'cm' },
  { part: 'Biceps', prev: 36.1, current: 36.3, unit: 'cm' },
  { part: 'Forearms', prev: 28.5, current: 28.5, unit: 'cm' },
  { part: 'Thighs', prev: 61.2, current: 60.4, unit: 'cm' },
  { part: 'Calves', prev: 38.2, current: 38.3, unit: 'cm' },
  { part: 'Body Fat %', prev: 18.6, current: 18.2, unit: '%' },
];

export default function BodyMeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
            {MEASUREMENTS.map((item, index) => {
              const diff = item.current - item.prev;
              const isReduction = diff < 0;
              const isIncrease = diff > 0;
              const isSame = diff === 0;
              
              const diffText = isSame ? `0.0 ${item.unit}` : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${item.unit}`;
              const diffColor = isReduction ? 'text-[#D4FF00]' : 'text-[#8E8E93]';
              const currentValueColor = isReduction ? 'text-[#D4FF00]' : 'text-white';
              
              const isLast = index === MEASUREMENTS.length - 1;

              return (
                <View 
                  key={item.part}
                  className={`flex-row items-center px-5 py-4 ${!isLast ? 'border-b border-[#2A2A2D]/50' : ''}`}
                >
                  <View className="flex-1 justify-center">
                    <Text className="text-white text-[17px] mb-1">{item.part}</Text>
                    <Text className={`${diffColor} text-[11px] font-bold tracking-wider`}>{diffText}</Text>
                  </View>
                  
                  <View className="w-20 items-center justify-center">
                    <Text className="text-[#8E8E93] text-[15px]">{item.prev.toFixed(1)}</Text>
                  </View>
                  
                  <View className="w-20 items-end justify-center">
                    <Text className={`${currentValueColor} text-[17px] font-medium`}>{item.current.toFixed(1)}</Text>
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
