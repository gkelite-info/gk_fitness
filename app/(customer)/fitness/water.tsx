import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { ArrowLeft, Drop, Plus } from 'phosphor-react-native';
import { ProgressRing } from '@/components/fitness/ProgressRing';
import { useUser } from '@/context/UserContext';
import { useWaterTracking } from '@/hooks/fitness/useWaterTracking';
import { useFitnessTimelineData } from '@/hooks/fitness/useFitnessTimelineData';
import { FitnessTimelineHeader } from '@/components/fitness/FitnessTimelineHeader';

const QUICK_ADD_AMOUNTS = [250, 500, 750];
const DEFAULT_WATER_GOAL_ML = 2500;

export default function WaterScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const todayStr = new Date().toISOString().split('T')[0];

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
    isLoading: isTimelineLoading,
  } = useFitnessTimelineData(userId, 'water', 'D');

  const { logs, logWater, isLogging, isLoadingLogs } = useWaterTracking(userId, todayStr);

  const displayValueML = timeframe === 'D' ? totalValue : avgValue;
  const currentGoalML = goalValue || DEFAULT_WATER_GOAL_ML;
  const progress = Math.min(displayValueML / currentGoalML, 1);

  const handleQuickAdd = async (amount: number) => {
    try {
      await logWater(amount);
    } catch (e) {
      console.error('Failed to log water', e);
    }
  };

  const maxWater = Math.max(...chartBars.map((b) => b.value), 1000);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 pt-14 pb-4 bg-[#141414] border-b border-[#222222]">
        <Pressable onPress={() => router.navigate('/(customer)/home')} className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A] active:opacity-80">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Hydration Tracker</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <FitnessTimelineHeader
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          offset={offset}
          setOffset={setOffset}
          label={label}
          accentColor="#00DBE7"
        />

        {isTimelineLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#00DBE7" />
          </View>
        ) : (
          <>
            <View className="bg-[#141414] border border-[#222222] rounded-3xl p-6 mb-4 items-center justify-center">
              <ProgressRing progress={progress} size={220} strokeWidth={18} color="#00DBE7">
                <View className="items-center">
                  <View className="w-12 h-12 rounded-full bg-[#00DBE7]/10 items-center justify-center mb-2">
                    <Drop size={28} color="#00DBE7" weight="fill" />
                  </View>
                  <Text className="text-white text-4xl font-bold">{(displayValueML / 1000).toFixed(1)}</Text>
                  <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider mt-1">
                    {timeframe === 'D' ? `/ ${(currentGoalML / 1000).toFixed(1)} L` : `AVG LITERS / DAY`}
                  </Text>
                </View>
              </ProgressRing>

              <Text className="text-[#8E8E93] text-sm mt-8 text-center px-4">
                {progress >= 1
                  ? "Great job! You've reached your daily hydration goal."
                  : `You need ${Math.max(0, (currentGoalML - displayValueML) / 1000).toFixed(1)}L more to reach your goal.`}
              </Text>
            </View>

            {timeframe === 'D' && offset === 0 && (
              <View className="mb-6">
                <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider mb-3 px-1">
                  QUICK ADD
                </Text>
                <View className="flex-row gap-3">
                  {QUICK_ADD_AMOUNTS.map((amount) => (
                    <Pressable
                      key={amount}
                      onPress={() => handleQuickAdd(amount)}
                      disabled={isLogging}
                      className="flex-1 bg-[#141414] border border-[#222222] rounded-2xl py-4 items-center active:opacity-70 disabled:opacity-50"
                    >
                      <Plus size={20} color="#00DBE7" style={{ marginBottom: 4 }} />
                      <Text className="text-white font-semibold text-lg">{amount}</Text>
                      <Text className="text-[#8E8E93] text-[10px] tracking-wider font-medium">ML</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4 min-h-[200px]">
              <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider mb-5">
                {timeframe === 'D'
                  ? "TODAY'S WATER LOG"
                  : timeframe === 'W'
                  ? 'WEEKLY WATER BREAKDOWN'
                  : timeframe === 'M'
                  ? 'MONTHLY WATER BREAKDOWN'
                  : 'YEARLY WATER BREAKDOWN'}
              </Text>

              {timeframe === 'D' && offset === 0 ? (
                isLoadingLogs ? (
                  <View className="flex-1 items-center justify-center py-10">
                    <ActivityIndicator color="#00DBE7" />
                  </View>
                ) : logs.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-10">
                    <Drop size={32} color="#262626" weight="fill" style={{ marginBottom: 8 }} />
                    <Text className="text-[#8E8E93] text-sm">No water logged yet today.</Text>
                  </View>
                ) : (
                  <View className="gap-4">
                    {logs.slice().reverse().map((log) => {
                      const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <View key={log.id} className="flex-row items-center justify-between bg-[#1A1A1A] p-4 rounded-2xl border border-[#222222]">
                          <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-[#00DBE7]/10 items-center justify-center">
                              <Drop size={20} color="#00DBE7" weight="fill" />
                            </View>
                            <View>
                              <Text className="text-white font-semibold">{log.amountML} ml</Text>
                              <Text className="text-[#8E8E93] text-xs">{time}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )
              ) : (
                <View className="flex-row items-end justify-between h-36 pt-4">
                  {chartBars.map((item, index) => {
                    const heightPct = maxWater > 0 ? (item.value / maxWater) * 100 : 5;
                    const isCurrent = item.isCurrent;

                    return (
                      <View key={index} className="items-center gap-2 flex-1">
                        <View className="w-full max-w-[24px] h-28 bg-[#1E1E1E] rounded-full justify-end overflow-hidden">
                          <View
                            className="w-full rounded-full"
                            style={{
                              height: `${Math.max(heightPct, 5)}%`,
                              backgroundColor: isCurrent ? '#00DBE7' : '#1F3A40',
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
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
