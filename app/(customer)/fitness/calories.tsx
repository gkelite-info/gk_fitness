import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { usePedometer } from '@/hooks/fitness/usePedometer';
import { useRouter } from 'expo-router';
import { ArrowLeft, Flame, Lightning } from 'phosphor-react-native';
import { ProgressRing } from '@/components/fitness/ProgressRing';

const DAILY_CALORIE_GOAL = 500; // Active calories goal

export default function CaloriesScreen() {
  const router = useRouter();
  const { calories } = usePedometer();
  const progress = calories / DAILY_CALORIE_GOAL;
  
  const restingCalories = 1850;
  const totalCalories = calories + restingCalories;

  const activityData = [
    { time: '08:00', value: 45 },
    { time: '12:00', value: 120 },
    { time: '16:00', value: 85 },
    { time: '20:00', value: 250 }, // workout time
  ];

  const maxValue = Math.max(...activityData.map(d => d.value), 100);

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
        
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-6 mb-4 items-center justify-center">
          <ProgressRing progress={progress} size={220} strokeWidth={18} color="#FF453A">
            <View className="items-center">
              <View className="w-12 h-12 rounded-full bg-[#FF453A]/10 items-center justify-center mb-2">
                <Flame size={28} color="#FF453A" weight="fill" />
              </View>
              <Text className="text-white text-4xl font-bold">{calories}</Text>
              <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider mt-1">/ {DAILY_CALORIE_GOAL} KCAL</Text>
            </View>
          </ProgressRing>
          
          <View className="flex-row items-center justify-between w-full px-4 mt-8">
            <View className="items-center">
              <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mb-1">TOTAL</Text>
              <Text className="text-white text-xl font-semibold">{totalCalories}</Text>
            </View>
            
            <View className="w-[1px] h-8 bg-[#262626]" />
            
            <View className="items-center">
              <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mb-1">ACTIVE</Text>
              <Text className="text-[#FF453A] text-xl font-semibold">{calories}</Text>
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
              TODAY'S ACTIVITY
            </Text>
            <Lightning size={16} color="#FF453A" />
          </View>
          
          <View className="flex-row items-end justify-between h-40 pt-4">
            {activityData.map((item, index) => {
              const heightPct = (item.value / maxValue) * 100;
              
              return (
                <View key={index} className="items-center gap-2 flex-1">
                  <View className="w-full max-w-[32px] h-32 bg-[#1E1E1E] rounded-t-xl justify-end overflow-hidden">
                    <View
                      className="w-full rounded-t-xl"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: '#FF453A',
                      }}
                    />
                  </View>
                  <Text className="text-[#8E8E93] text-[10px] font-semibold mt-1">
                    {item.time}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5">
          <Text className="text-white text-sm font-medium leading-relaxed">
            Active energy includes calories burned from walking, running, and all other physical activities. Resting energy is what your body uses just to stay alive.
          </Text>
        </View>
        
      </ScrollView>
    </View>
  );
}
