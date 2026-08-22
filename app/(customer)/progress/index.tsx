import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChartLineUp, Ruler, Camera, ChartBar, CaretRight, Fire } from 'phosphor-react-native';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const MENU_ITEMS = [
    {
      title: 'Weight Tracking',
      subtitle: 'See your weight trend over time',
      icon: ChartLineUp,
      href: '/(customer)/progress/weight',
    },
    {
      title: 'Body Measurements',
      subtitle: 'Track all your body measurements',
      icon: Ruler,
      href: '/(customer)/progress/measurements',
    },
    {
      title: 'Progress Photos',
      subtitle: 'Visualize your transformation',
      icon: Camera,
      href: '/(customer)/progress/photos',
    },
    {
      title: 'Monthly Analysis',
      subtitle: 'Detailed insights and analytics',
      icon: ChartBar,
      href: '/(customer)/progress/monthly-analysis',
    },
  ];

  return (
    <ScrollView 
      className="flex-1 bg-[#09090B]"
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pt-6 pb-4">
        <Text className="text-white text-[32px] font-bold mb-1 tracking-tight">Progress</Text>
        <Text className="text-[#8E8E93] text-[15px] mb-8">
          Track. Analyze. Transform. 💪
        </Text>

        {/* Weight Card */}
        <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-8 border border-[#2A2A2D]/50">
          <View className="flex-row justify-between mb-6">
            <View>
              <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] mb-1.5 uppercase">Current Weight</Text>
              <View className="flex-row items-baseline gap-1.5">
                <Text className="text-white text-[34px] font-bold tracking-tight">72.4</Text>
                <Text className="text-[#8E8E93] text-lg font-medium">kg</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] mb-1.5 uppercase">Goal Weight</Text>
              <View className="flex-row items-baseline gap-1.5">
                <Text className="text-white text-[26px] font-bold tracking-tight">68.0</Text>
                <Text className="text-[#8E8E93] text-sm font-medium">kg</Text>
              </View>
            </View>
          </View>

          <View className="flex-row justify-between items-end mb-6">
            <View>
              <Text className="text-[#D4FF00] text-[13px] font-medium mb-1">↓ 3.6 kg lost</Text>
              <Text className="text-[#8E8E93] text-[13px]">Since Jan 1, 2024</Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Fire size={18} weight="fill" color="#D4FF00" />
                <Text className="text-white text-[15px] font-bold">18</Text>
              </View>
              <Text className="text-[#8E8E93] text-[10px] tracking-wide">Day Streak</Text>
            </View>
          </View>

          <Pressable 
            className="bg-[#D4FF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
            onPress={() => router.push('/(customer)/progress/log-weight')}
          >
            <Text className="text-[#09090B] font-bold text-base mr-2">Update Weight</Text>
            <CaretRight size={18} weight="bold" color="#09090B" />
          </Pressable>
        </View>

        {/* This Month */}
        <Text className="text-[#D4FF00] text-xs font-bold tracking-[2px] uppercase mb-4">This Month</Text>
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-[#1C1C1E] rounded-3xl p-5 items-center justify-center border border-[#2A2A2D]/50">
            <View className="flex-row items-baseline gap-1 mb-2">
              <Text className="text-white text-[28px] font-bold tracking-tight">1.2</Text>
              <Text className="text-[#8E8E93] text-[15px] font-medium">kg</Text>
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1.5px] uppercase">Weight Lost</Text>
          </View>
          <View className="flex-1 bg-[#1C1C1E] rounded-3xl p-5 items-center justify-center border border-[#2A2A2D]/50">
            <Text className="text-white text-[28px] font-bold tracking-tight mb-2">22</Text>
            <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1.5px] uppercase">Active Days</Text>
          </View>
        </View>

        {/* Track Your Progress Menu */}
        <Text className="text-[#D4FF00] text-xs font-bold tracking-[2px] uppercase mb-4">Track Your Progress</Text>
        <View className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-[#2A2A2D]/50 mb-8">
          {MENU_ITEMS.map((item, index) => {
            const isLast = index === MENU_ITEMS.length - 1;
            return (
              <Pressable
                key={item.title}
                className={`flex-row items-center p-4 py-5 bg-[#1C1C1E] active:bg-[#2A2A2D] ${!isLast ? 'border-b border-[#2A2A2D]/50' : ''}`}
                onPress={() => item.href && router.push(item.href as any)}
              >
                <View className="w-12 h-12 rounded-2xl border border-[#2A2A2D] items-center justify-center mr-4">
                  <item.icon size={22} color="#D4FF00" weight="regular" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-[17px] font-semibold mb-1 tracking-tight">{item.title}</Text>
                  <Text className="text-[#8E8E93] text-[13px]">{item.subtitle}</Text>
                </View>
                <CaretRight size={20} color="#48484A" />
              </Pressable>
            );
          })}
        </View>

      </View>
    </ScrollView>
  );
}
