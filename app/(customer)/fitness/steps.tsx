import React from 'react';
import { View, ScrollView, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { usePedometer } from '@/hooks/fitness/usePedometer';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Flame, Footprints, Clock, Trophy } from 'phosphor-react-native';
import { ProgressRing } from '@/components/fitness/ProgressRing';
import { useFitnessTimelineData } from '@/hooks/fitness/useFitnessTimelineData';
import { FitnessTimelineHeader } from '@/components/fitness/FitnessTimelineHeader';

const DEFAULT_STEP_GOAL = 10000;

export default function StepsScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const { isAvailable } = usePedometer();

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
  } = useFitnessTimelineData(userId, 'steps', 'D');

  const displayValue = timeframe === 'D' ? totalValue : avgValue;
  const progress = Math.min(displayValue / (goalValue || DEFAULT_STEP_GOAL), 1);
  const activeCalories = Math.round(displayValue * 0.04);
  const activeMinutes = Math.round(displayValue * 0.008);

  const maxSteps = Math.max(...chartBars.map((b) => b.value), 1000);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 pt-14 pb-4 bg-[#141414] border-b border-[#222222]">
        <Pressable onPress={() => router.navigate('/(customer)/home')} className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A] active:opacity-80">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Steps & Movement</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <FitnessTimelineHeader
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          offset={offset}
          setOffset={setOffset}
          label={label}
          accentColor="#C3F400"
        />

        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#C3F400" />
          </View>
        ) : (
          <>
            <View className="bg-[#141414] border border-[#222222] rounded-3xl p-6 mb-4 items-center justify-center">
              <ProgressRing progress={progress} size={220} strokeWidth={18} color="#C3F400">
                <View className="items-center">
                  <View className="w-12 h-12 rounded-full bg-[#C3F400]/10 items-center justify-center mb-2">
                    <Footprints size={28} color="#C3F400" weight="fill" />
                  </View>
                  <Text className="text-white text-4xl font-bold">{displayValue.toLocaleString()}</Text>
                  <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider mt-1">
                    {timeframe === 'D' ? `/ ${goalValue.toLocaleString()} STEPS` : `AVG STEPS / DAY`}
                  </Text>
                </View>
              </ProgressRing>

              <View className="flex-row items-center gap-6 mt-8">
                <View className="items-center">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Flame size={16} color="#FF453A" weight="fill" />
                    <Text className="text-white text-xl font-semibold">{activeCalories}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider">KCAL</Text>
                </View>

                <View className="w-[1px] h-8 bg-[#262626]" />

                <View className="items-center">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Clock size={16} color="#0A84FF" weight="fill" />
                    <Text className="text-white text-xl font-semibold">{activeMinutes}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider">MINUTES</Text>
                </View>

                <View className="w-[1px] h-8 bg-[#262626]" />

                <View className="items-center">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Trophy size={16} color="#FFD60A" weight="fill" />
                    <Text className="text-white text-xl font-semibold">12</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider">STREAK</Text>
                </View>
              </View>
            </View>

            <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
              <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider mb-5">
                {timeframe === 'D'
                  ? "TODAY'S HOURLY STEPS"
                  : timeframe === 'W'
                  ? 'WEEKLY BREAKDOWN'
                  : timeframe === 'M'
                  ? 'MONTHLY BREAKDOWN'
                  : 'YEARLY BREAKDOWN'}
              </Text>

              <View className="flex-row items-end justify-between h-32">
                {chartBars.map((item, index) => {
                  const heightPct = maxSteps > 0 ? (item.value / maxSteps) * 100 : 5;
                  const isCurrent = item.isCurrent;

                  return (
                    <View key={index} className="items-center gap-2 flex-1">
                      <View className="w-full max-w-[24px] h-24 bg-[#1E1E1E] rounded-full justify-end overflow-hidden">
                        <View
                          className="w-full rounded-full"
                          style={{
                            height: `${Math.max(heightPct, 5)}%`,
                            backgroundColor: isCurrent ? '#C4EF00' : '#2A2A2A',
                          }}
                        />
                      </View>
                      <Text className={`text-[10px] font-semibold ${isCurrent ? 'text-white' : 'text-[#8E8E93]'}`}>
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {!isAvailable && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mt-2">
            <Text className="text-red-400 text-sm text-center">
              Pedometer sensor is not available on this device.
            </Text>
            <Pressable
              onPress={() => Linking.openSettings()}
              className="mt-4 bg-red-500/20 py-3 rounded-xl border border-red-500/30 active:opacity-70"
            >
              <Text className="text-red-400 font-bold text-center">Open Device Settings</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
