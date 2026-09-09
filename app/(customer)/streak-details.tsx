import React from 'react';
import { View, ScrollView, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lightning, Brain, Target, Trophy, ChartLineUp } from 'phosphor-react-native';
import { useWorkoutStreak } from '@/hooks/customerWorkouts/useWorkoutStreak';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function StreakDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: streakData } = useWorkoutStreak();
  
  const currentStreak = streakData?.currentStreak || 0;
  const bestStreak = streakData?.bestStreak || 0;

  const habitGoal = 21;
  const habitProgress = Math.min((currentStreak / habitGoal) * 100, 100);

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: Math.max(insets.top + 8, 28) }}>
      <View className="flex-row items-center justify-between px-4 mb-4 bg-transparent">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#18181B] active:bg-[#262626]"
        >
          <ArrowLeft size={20} color="#FFF" />
        </Pressable>
        <Text className="text-white text-base font-semibold tracking-widest uppercase">
          Consistency Profile
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        
        <View className="items-center justify-center mb-8 mt-2">
          <View className="relative items-center justify-center">
            <View 
              style={{ width: width * 0.65, height: width * 0.65 }} 
              className="rounded-full border-[12px] border-[#262626] items-center justify-center bg-[#141414] shadow-2xl"
            >
              <View className="mb-2">
                <Lightning size={32} color="#FB923C" weight="fill" />
              </View>
              <Text className="text-white text-7xl font-bold tracking-tighter">
                {currentStreak}
              </Text>
              <Text className="text-[#8E8E8E] text-sm font-semibold tracking-widest uppercase mt-1">
                Day Streak
              </Text>
            </View>

            <View 
              style={{ width: width * 0.65, height: width * 0.65 }} 
              className="absolute rounded-full border-[12px] border-[#FB923C]/20" 
              pointerEvents="none"
            />
          </View>
          
          <View className="flex-row items-center mt-8 bg-[#18181B] px-6 py-3 rounded-full border border-[#262626]">
            <Trophy size={18} color="#C4EF00" weight="fill" />
            <Text className="text-white font-semibold ml-2 text-sm">All-Time Best: </Text>
            <Text className="text-[#C4EF00] font-bold text-sm">{bestStreak} Days</Text>
          </View>
        </View>

        <View className="bg-[#141414] rounded-3xl p-5 border border-[#222222] mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Brain size={20} color="#00DBE7" weight="fill" />
              <Text className="text-white font-semibold text-lg ml-2">The 21-Day Rule</Text>
            </View>
            <Text className="text-[#00DBE7] font-bold">{Math.round(habitProgress)}%</Text>
          </View>
          
          <Text className="text-[#8E8E8E] text-xs leading-5 mb-4">
            Behavioral psychology dictates it takes exactly 21 consecutive days of action to form a new neurological habit. You are {currentStreak >= 21 ? 'a master of this habit' : `only ${21 - currentStreak} days away from cementing this lifestyle`}.
          </Text>

          <View className="w-full h-2 bg-[#262626] rounded-full overflow-hidden">
            <View className="h-full bg-[#00DBE7] rounded-full" style={{ width: `${habitProgress}%` }} />
          </View>
        </View>

        <Text className="text-white text-lg font-bold mb-4 mt-4 px-1">Scientific Insights</Text>

        <View className="bg-[#141414] rounded-3xl p-5 border border-[#222222] mb-4 flex-row">
          <View className="w-12 h-12 rounded-full bg-[#C4EF00]/10 items-center justify-center mr-4">
            <Target size={24} color="#C4EF00" weight="fill" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base mb-1">The Top 10% Club</Text>
            <Text className="text-[#8E8E8E] text-xs leading-5">
              Working out consistently 3 or more days a week places you in the top 10% of the active adult population globally.
            </Text>
          </View>
        </View>

        <View className="bg-[#141414] rounded-3xl p-5 border border-[#222222] mb-4 flex-row">
          <View className="w-12 h-12 rounded-full bg-[#FB923C]/10 items-center justify-center mr-4">
            <ChartLineUp size={24} color="#FB923C" weight="fill" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base mb-1">Consistency &gt; Intensity</Text>
            <Text className="text-[#8E8E8E] text-xs leading-5">
              Clinical studies prove that moderate, consistent workouts yield 300% better long-term health and metabolic outcomes than sporadic, high-intensity burnout sessions.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

