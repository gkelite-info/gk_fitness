import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { usePedometer } from '@/hooks/fitness/usePedometer';
import { useRouter } from 'expo-router';
import { ArrowLeft, Flame, Footprints, Clock, Trophy } from 'phosphor-react-native';
import { ProgressRing } from '@/components/fitness/ProgressRing';

const DAILY_STEP_GOAL = 10000;

export default function StepsScreen() {
  const router = useRouter();
  const { steps, calories, isAvailable, debugInfo } = usePedometer();
  const progress = steps / DAILY_STEP_GOAL;

  const weeklyData = [
    { day: 'Mon', steps: 6540 },
    { day: 'Tue', steps: 8200 },
    { day: 'Wed', steps: 11050 },
    { day: 'Thu', steps: 9400 },
    { day: 'Fri', steps: 7845 },
    { day: 'Sat', steps: 0 },
    { day: 'Sun', steps: 0 },
  ];

  const maxSteps = Math.max(...weeklyData.map(d => d.steps), DAILY_STEP_GOAL);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 pt-14 pb-4 bg-[#141414] border-b border-[#222222]">
        <Pressable onPress={() => router.navigate('/(customer)/home')} className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A] active:opacity-80">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Steps & Calories</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-6 mb-4 items-center justify-center">
          <ProgressRing progress={progress} size={220} strokeWidth={18} color="#C3F400">
            <View className="items-center">
              <View className="w-12 h-12 rounded-full bg-[#C3F400]/10 items-center justify-center mb-2">
                <Footprints size={28} color="#C3F400" weight="fill" />
              </View>
              <Text className="text-white text-4xl font-bold">{steps.toLocaleString()}</Text>
              <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider mt-1">/ {DAILY_STEP_GOAL.toLocaleString()}</Text>
            </View>
          </ProgressRing>
          
          <View className="flex-row items-center gap-6 mt-8">
            <View className="items-center">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Flame size={16} color="#FF453A" weight="fill" />
                <Text className="text-white text-xl font-semibold">{calories}</Text>
              </View>
              <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider">KCAL</Text>
            </View>
            
            <View className="w-[1px] h-8 bg-[#262626]" />
            
            <View className="items-center">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Clock size={16} color="#0A84FF" weight="fill" />
                <Text className="text-white text-xl font-semibold">{Math.round(steps * 0.008)}</Text>
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
            THIS WEEK
          </Text>
          
          <View className="flex-row items-end justify-between h-32">
            {weeklyData.map((item, index) => {
              const heightPct = (item.steps / maxSteps) * 100;
              const isToday = index === 4; // Mock today as Friday
              
              return (
                <View key={index} className="items-center gap-2 flex-1">
                  <View className="w-full max-w-[24px] h-24 bg-[#1E1E1E] rounded-full justify-end overflow-hidden">
                    <View
                      className="w-full rounded-full"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isToday ? '#C4EF00' : '#2A2A2A',
                      }}
                    />
                  </View>
                  <Text className={`text-[10px] font-semibold ${isToday ? 'text-white' : 'text-[#8E8E93]'}`}>
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        
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
