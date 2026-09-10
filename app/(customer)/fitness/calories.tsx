import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Flame, Lightning } from 'phosphor-react-native';
import { ProgressRing } from '@/components/fitness/ProgressRing';
import { useFitnessTimelineData } from '@/hooks/fitness/useFitnessTimelineData';
import { FitnessTimelineHeader } from '@/components/fitness/FitnessTimelineHeader';

const DEFAULT_CALORIE_GOAL = 500;

export default function CaloriesScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const {
    timeframe,
    setTimeframe,
    offset,
    setOffset,
    label,
    totalValue,
    avgValue,
    goalValue,
    chartBars,
    isLoading,
  } = useFitnessTimelineData(userId, 'calories', 'D');

  const displayValue = timeframe === 'D' ? totalValue : avgValue;
  const progress = Math.min(displayValue / (goalValue || DEFAULT_CALORIE_GOAL), 1);
  const restingCalories = timeframe === 'D' ? 1850 : 1850;
  const grandTotalCalories = displayValue + restingCalories;

  const maxValue = Math.max(...chartBars.map((b) => b.value), 50);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 pt-14 pb-4 bg-[#141414] border-b border-[#222222]">
        <Pressable onPress={() => router.navigate('/(customer)/home')} className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A] active:opacity-80">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Active Energy</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <FitnessTimelineHeader
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          offset={offset}
          setOffset={setOffset}
          label={label}
          accentColor="#FF453A"
        />

        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#FF453A" />
          </View>
        ) : (
          <>
            <View className="bg-[#141414] border border-[#222222] rounded-3xl p-6 mb-4 items-center justify-center">
              <ProgressRing progress={progress} size={220} strokeWidth={18} color="#FF453A">
                <View className="items-center">
                  <View className="w-12 h-12 rounded-full bg-[#FF453A]/10 items-center justify-center mb-2">
                    <Flame size={28} color="#FF453A" weight="fill" />
                  </View>
                  <Text className="text-white text-4xl font-bold">{displayValue}</Text>
                  <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider mt-1">
                    {timeframe === 'D' ? `/ ${goalValue} KCAL` : `AVG KCAL / DAY`}
                  </Text>
                </View>
              </ProgressRing>

              <View className="flex-row items-center justify-between w-full px-4 mt-8">
                <View className="items-center">
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mb-1">TOTAL</Text>
                  <Text className="text-white text-xl font-semibold">{grandTotalCalories}</Text>
                </View>

                <View className="w-[1px] h-8 bg-[#262626]" />

                <View className="items-center">
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mb-1">ACTIVE</Text>
                  <Text className="text-[#FF453A] text-xl font-semibold">{displayValue}</Text>
                </View>

                <View className="w-[1px] h-8 bg-[#262626]" />

                <View className="items-center">
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mb-1">RESTING</Text>
                  <Text className="text-white text-xl font-semibold">{restingCalories}</Text>
                </View>
              </View>
            </View>

            <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-[#FF453A] text-[11px] font-semibold tracking-wider">
                  {timeframe === 'D'
                    ? "TODAY'S ACTIVITY"
                    : timeframe === 'W'
                    ? 'WEEKLY BREAKDOWN'
                    : timeframe === 'M'
                    ? 'MONTHLY BREAKDOWN'
                    : 'YEARLY BREAKDOWN'}
                </Text>
                <Lightning size={16} color="#FF453A" />
              </View>

              <View className="flex-row items-end justify-between h-40 pt-4">
                {chartBars.map((item, index) => {
                  const heightPct = maxValue > 0 ? (item.value / maxValue) * 100 : 5;

                  return (
                    <View key={index} className="items-center gap-2 flex-1">
                      <View className="w-full max-w-[28px] h-32 bg-[#1E1E1E] rounded-t-xl justify-end overflow-hidden">
                        <View
                          className="w-full rounded-t-xl"
                          style={{
                            height: `${Math.max(heightPct, 4)}%`,
                            backgroundColor: '#FF453A',
                          }}
                        />
                      </View>
                      <Text className="text-[#8E8E93] text-[10px] font-semibold mt-1">
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5">
          <Text className="text-white text-sm font-medium leading-relaxed">
            Active energy includes calories burned from walking, running, and all active workouts. Use D, W, M, Y tabs and navigation controls to inspect past data across timelines.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
