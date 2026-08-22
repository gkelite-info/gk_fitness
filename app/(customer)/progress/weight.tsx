import React from 'react';
import { View, ScrollView, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { CaretLeft } from 'phosphor-react-native';

const { width } = Dimensions.get('window');

export default function WeightTrackingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Chart dimensions
  const chartWidth = width - 40 - 48; // screenWidth - padding - cardPadding
  const chartHeight = 120;

  // Simple rising bezier curve mock path
  const curvePath = `M 0 ${chartHeight * 0.8} Q ${chartWidth * 0.3} ${chartHeight * 0.7} ${chartWidth * 0.6} ${chartHeight * 0.5} T ${chartWidth} ${chartHeight * 0.3}`;
  
  // Fill path extends the curve down to the bottom
  const fillPath = `${curvePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-4">
          <View className="flex-row items-center mb-1">
            <Pressable 
              className="mr-3 p-1 -ml-1 active:opacity-70"
              onPress={() => router.back()}
            >
              <CaretLeft size={28} color="#FFFFFF" weight="bold" />
            </Pressable>
            <Text className="text-white text-[32px] font-bold tracking-tight">Weight Tracking</Text>
          </View>
          <Text className="text-[#8E8E93] text-[15px] mb-8 ml-10">
            Track your progress over time.
          </Text>

          {/* Current Weight Card */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-4 border border-[#2A2A2D]/50 items-center">
            <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] mb-2 uppercase">Current Weight</Text>
            <View className="flex-row items-baseline gap-1.5 mb-3">
              <Text className="text-white text-[40px] font-bold tracking-tight">72.4</Text>
              <Text className="text-[#8E8E93] text-xl font-medium">kg</Text>
            </View>
            <Text className="text-[#D4FF00] text-[13px] font-medium">↓ 0.8 kg from last week</Text>
          </View>

          {/* Weight Trend Chart */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-4 border border-[#2A2A2D]/50">
            <View className="flex-row justify-between mb-8">
              <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] uppercase">Weight Trend</Text>
              <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] uppercase">6 Months</Text>
            </View>
            
            <View className="h-[120px] mb-4">
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#D4FF00" stopOpacity="0.4" />
                    <Stop offset="1" stopColor="#D4FF00" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path d={fillPath} fill="url(#gradient)" />
                <Path d={curvePath} fill="none" stroke="#D4FF00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {/* End dot */}
                <Path d={`M ${chartWidth} ${chartHeight * 0.3} A 4 4 0 1 1 ${chartWidth - 0.01} ${chartHeight * 0.3}`} fill="#D4FF00" />
              </Svg>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1px] uppercase">Jan</Text>
              <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1px] uppercase">Mar</Text>
              <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1px] uppercase">Jun</Text>
            </View>
          </View>

          {/* Goal Progress Card */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-4 border border-[#2A2A2D]/50">
            <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] mb-6 uppercase">Goal Progress</Text>
            
            <View className="flex-row justify-between mb-4">
              <View>
                <Text className="text-[#8E8E93] text-[10px] font-bold tracking-widest mb-1 uppercase">Starting</Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-white text-2xl font-bold">76.0</Text>
                  <Text className="text-[#8E8E93] text-xs font-medium">kg</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-[#8E8E93] text-[10px] font-bold tracking-widest mb-1 uppercase">Goal</Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-white text-2xl font-bold">68.0</Text>
                  <Text className="text-[#8E8E93] text-xs font-medium">kg</Text>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-[#2A2A2D] rounded-full mb-4 overflow-hidden">
              <View className="h-full bg-[#D4FF00] rounded-full" style={{ width: '45%' }} />
            </View>

            <View className="flex-row justify-between">
              <Text className="text-[#D4FF00] text-[13px] font-medium">3.6 kg lost</Text>
              <Text className="text-[#8E8E93] text-[13px] font-medium">4.4 kg remaining</Text>
            </View>
          </View>

          {/* Recent Logs */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-8 border border-[#2A2A2D]/50">
            <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] mb-4 uppercase">Recent Logs</Text>
            
            <View className="flex-row justify-between py-4 border-b border-[#2A2A2D]/50">
              <Text className="text-[#E5E5EA] text-[15px]">Today</Text>
              <Text className="text-white text-[17px] font-bold tracking-tight">72.4 kg</Text>
            </View>
            
            <View className="flex-row justify-between py-4 border-b border-[#2A2A2D]/50">
              <Text className="text-[#8E8E93] text-[15px]">12 Jun</Text>
              <Text className="text-[#E5E5EA] text-[17px] font-bold tracking-tight">72.8 kg</Text>
            </View>

            <View className="flex-row justify-between py-4 border-b border-[#2A2A2D]/50">
              <Text className="text-[#8E8E93] text-[15px]">05 Jun</Text>
              <Text className="text-[#E5E5EA] text-[17px] font-bold tracking-tight">73.1 kg</Text>
            </View>

            <View className="flex-row justify-between py-4 pt-4">
              <Text className="text-[#8E8E93] text-[15px]">29 May</Text>
              <Text className="text-[#E5E5EA] text-[17px] font-bold tracking-tight">73.4 kg</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute left-0 right-0 px-5 pt-4 pb-4 bg-transparent" 
        style={{ bottom: 75 + insets.bottom + 10 }}
      >
        <Pressable 
          className="bg-[#D4FF00] rounded-full py-4 items-center justify-center active:opacity-80 shadow-lg"
          onPress={() => router.push('/(customer)/progress/log-weight')}
        >
          <Text className="text-[#09090B] text-[17px] font-bold">Log Today's Weight</Text>
        </Pressable>
      </View>
    </View>
  );
}
