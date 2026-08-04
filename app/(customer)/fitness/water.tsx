import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { ArrowLeft, Drop, Plus, Trash } from 'phosphor-react-native';
import { ProgressRing } from '@/components/fitness/ProgressRing';
import { useUser } from '@/context/UserContext';
import { useFitnessStats } from '@/hooks/useFitnessStats';
import { useWaterTracking } from '@/hooks/useWaterTracking';

const QUICK_ADD_AMOUNTS = [250, 500, 750];

export default function WaterScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const today = new Date().toISOString().split('T')[0];
  
  const { data: stats, isLoading: isStatsLoading } = useFitnessStats(userId, today);
  const { logs, logWater, isLogging, isLoadingLogs } = useWaterTracking(userId, today);

  const goal = stats?.waterGoalML || 2500;
  const currentTotal = stats?.totalWaterML || 0;
  const progress = currentTotal / goal;

  const handleQuickAdd = async (amount: number) => {
    try {
      await logWater(amount);
    } catch (e) {
      console.error('Failed to log water', e);
    }
  };

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
        
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-6 mb-4 items-center justify-center">
          <ProgressRing progress={progress} size={220} strokeWidth={18} color="#00DBE7">
            <View className="items-center">
              <View className="w-12 h-12 rounded-full bg-[#00DBE7]/10 items-center justify-center mb-2">
                <Drop size={28} color="#00DBE7" weight="fill" />
              </View>
              <Text className="text-white text-4xl font-bold">{(currentTotal / 1000).toFixed(1)}</Text>
              <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider mt-1">/ {(goal / 1000).toFixed(1)} L</Text>
            </View>
          </ProgressRing>
          
          <Text className="text-[#8E8E93] text-sm mt-8 text-center px-4">
            {progress >= 1 
              ? "Great job! You've reached your daily hydration goal." 
              : `You need ${((goal - currentTotal) / 1000).toFixed(1)}L more to reach your goal.`}
          </Text>
        </View>

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

        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4 min-h-[200px]">
          <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider mb-5">
            TODAY'S LOG
          </Text>
          
          {isLoadingLogs ? (
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
          )}
        </View>

      </ScrollView>
    </View>
  );
}
