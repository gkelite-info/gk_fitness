import React from 'react';
import { View, ScrollView, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretLeft, CaretDown, Barbell, CalendarBlank, UploadSimple } from 'phosphor-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

const WORKOUT_DISTRIBUTION = [
  { name: 'Chest', percentage: 92 },
  { name: 'Back', percentage: 81 },
  { name: 'Legs', percentage: 100 },
  { name: 'Shoulders', percentage: 72 },
  { name: 'Core', percentage: 55 },
];

// Mocking 35 days for a 5x7 grid (Mo-Su)
const ACTIVITY_GRID = Array.from({ length: 35 }).map((_, i) => ({
  id: i,
  isActive: Math.random() > 0.4 // Randomly active
}));

export default function MonthlyAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Chart dimensions
  const chartWidth = width - 40 - 48; // padding and card padding
  const chartHeight = 100;

  // Manually plotted bezier for weight trend with 6 points
  const p1 = { x: 0, y: 10 };
  const p2 = { x: chartWidth * 0.2, y: 30 };
  const p3 = { x: chartWidth * 0.4, y: 45 };
  const p4 = { x: chartWidth * 0.6, y: 35 };
  const p5 = { x: chartWidth * 0.8, y: 70 };
  const p6 = { x: chartWidth, y: 90 };

  const curvePath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${p5.x} ${p5.y} L ${p6.x} ${p6.y}`;
  const fillPath = `${curvePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-4">
          
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <Pressable 
              className="w-10 h-10 rounded-xl bg-[#1C1C1E] border border-[#2A2A2D]/50 items-center justify-center active:opacity-70"
              onPress={() => router.back()}
            >
              <CaretLeft size={20} color="#E5E5EA" weight="bold" />
            </Pressable>
            <View className="items-center">
              <Text className="text-white text-[17px] font-bold mb-1">Monthly Performance</Text>
              <Pressable className="flex-row items-center bg-[#2E3113] border border-[#D4FF00]/30 px-3 py-1 rounded-full">
                <Text className="text-[#D4FF00] text-xs font-bold mr-1">July 2025</Text>
                <CaretDown size={12} color="#D4FF00" weight="bold" />
              </Pressable>
            </View>
            <View className="w-10" />
          </View>

          {/* Overview Section */}
          <Text className="text-white text-[11px] font-bold tracking-[1.5px] uppercase mb-3 px-1">Overview</Text>
          <View className="bg-[#1C1C1E] rounded-3xl p-6 flex-row items-center border border-[#2A2A2D]/50 mb-6">
            <View className="flex-1 items-center border-r border-[#2A2A2D]">
              <View className="mb-2">
                <Barbell size={24} color="#D4FF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-xs mb-1">Weight loss</Text>
              <View className="flex-row items-baseline mb-1">
                <Text className="text-[#D4FF00] text-[22px] font-bold">-1.8</Text>
                <Text className="text-[#D4FF00] text-[10px] font-bold ml-0.5">kg</Text>
              </View>
              <Text className="text-[#6B6B6B] text-[10px]">vs Jun 2025</Text>
            </View>
            <View className="flex-1 items-center">
              <View className="mb-2">
                <CalendarBlank size={24} color="#D4FF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-xs mb-1">Workout Days</Text>
              <View className="flex-row items-baseline mb-1 gap-0.5">
                <Text className="text-[#D4FF00] text-[22px] font-bold">22</Text>
                <Text className="text-[#8E8E93] text-[15px] font-medium">/31</Text>
              </View>
              <Text className="text-[#6B6B6B] text-[10px]">71% of days</Text>
            </View>
          </View>

          {/* Weight Trend Chart */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-6 border border-[#2A2A2D]/50">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-[11px] font-bold tracking-[1.5px] uppercase">Weight Trend</Text>
              <View className="bg-[#2A2A2D] px-2 py-1 rounded">
                <Text className="text-[#8E8E93] text-[10px] font-bold uppercase">kg</Text>
              </View>
            </View>
            
            <View className="flex-row">
              {/* Y Axis Labels */}
              <View className="justify-between items-end pr-4 h-[100px]">
                <Text className="text-[#8E8E93] text-[10px]">75</Text>
                <Text className="text-[#8E8E93] text-[10px]">74</Text>
                <Text className="text-[#8E8E93] text-[10px]">73</Text>
                <Text className="text-[#8E8E93] text-[10px]">72</Text>
                <Text className="text-[#8E8E93] text-[10px]">71</Text>
              </View>

              <View className="flex-1 h-[100px]">
                {/* Horizontal Grid Lines */}
                <View className="absolute inset-0 justify-between">
                  {[...Array(5)].map((_, i) => (
                    <View key={i} className="w-full h-[1px] border-b border-dashed border-[#2A2A2D]" />
                  ))}
                </View>

                {/* Chart SVG */}
                <Svg width="100%" height="100%" className="mt-1">
                  <Defs>
                    <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#D4FF00" stopOpacity="0.3" />
                      <Stop offset="1" stopColor="#D4FF00" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Path d={fillPath} fill="url(#chartGrad)" />
                  <Path d={curvePath} fill="none" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Data Points */}
                  <Circle cx={p1.x} cy={p1.y} r="3" fill="#D4FF00" />
                  <Circle cx={p2.x} cy={p2.y} r="3" fill="#D4FF00" />
                  <Circle cx={p3.x} cy={p3.y} r="3" fill="#D4FF00" />
                  <Circle cx={p4.x} cy={p4.y} r="3" fill="#D4FF00" />
                  <Circle cx={p5.x} cy={p5.y} r="3" fill="#D4FF00" />
                  <Circle cx={p6.x} cy={p6.y} r="3" fill="#D4FF00" />
                </Svg>
              </View>
            </View>
            
            {/* X Axis Labels */}
            <View className="flex-row justify-between mt-4 pl-[30px]">
              <Text className="text-[#8E8E93] text-[10px]">Jul 1</Text>
              <Text className="text-[#8E8E93] text-[10px]">Jul 8</Text>
              <Text className="text-[#8E8E93] text-[10px]">Jul 15</Text>
              <Text className="text-[#8E8E93] text-[10px]">Jul 22</Text>
              <Text className="text-[#8E8E93] text-[10px]">Jul 30</Text>
            </View>
          </View>

          {/* Workout Distribution */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-6 border border-[#2A2A2D]/50">
            <Text className="text-white text-[11px] font-bold tracking-[1.5px] uppercase mb-6">Workout Distribution</Text>
            
            {WORKOUT_DISTRIBUTION.map((item, index) => (
              <View key={item.name} className={`flex-row items-center ${index !== WORKOUT_DISTRIBUTION.length - 1 ? 'mb-5' : ''}`}>
                <Text className="text-[#E5E5EA] text-[13px] w-20">{item.name}</Text>
                <View className="flex-1 h-2.5 bg-[#2A2A2D] rounded-full mx-3 overflow-hidden">
                  <View className="h-full bg-[#D4FF00] rounded-full" style={{ width: `${item.percentage}%` }} />
                </View>
                <Text className="text-[#8E8E93] text-[13px] w-10 text-right">{item.percentage}%</Text>
              </View>
            ))}
          </View>

          {/* Workout Activity Heatmap */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-8 border border-[#2A2A2D]/50">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-[11px] font-bold tracking-[1.5px] uppercase">Workout Activity</Text>
              <View className="flex-row gap-3">
                <View className="flex-row items-center gap-1">
                  <View className="w-2.5 h-2.5 bg-[#2A2A2D] rounded-sm" />
                  <Text className="text-[#8E8E93] text-[8px]">No Workout</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-2.5 h-2.5 bg-[#D4FF00] rounded-sm" />
                  <Text className="text-[#8E8E93] text-[8px]">Workout</Text>
                </View>
              </View>
            </View>

            {/* Days Row */}
            <View className="flex-row justify-between mb-3 px-1">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                <Text key={day} className="text-[#8E8E93] text-[10px] w-[30px] text-center">{day}</Text>
              ))}
            </View>

            {/* Heatmap Grid */}
            <View className="flex-row flex-wrap gap-y-2 justify-between px-1">
              {ACTIVITY_GRID.map((cell) => (
                <View 
                  key={cell.id} 
                  className={`w-[30px] h-[30px] rounded-[6px] ${cell.isActive ? 'bg-[#D4FF00]' : 'bg-[#2A2A2D]'}`} 
                />
              ))}
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
          className="bg-[#D4FF00] rounded-full py-4 flex-row items-center justify-center active:opacity-80 shadow-lg"
          onPress={() => {}}
        >
          <UploadSimple size={20} weight="bold" color="#09090B" />
          <Text className="text-[#09090B] text-[17px] font-bold ml-2">Share Monthly Report</Text>
        </Pressable>
      </View>
    </View>
  );
}
