import React from 'react';
import { View, ScrollView, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { CaretLeft } from 'phosphor-react-native';
import { useProgressData } from '@/hooks/fitness/useProgressData';
import { useUser } from '@/context/UserContext';
import { ActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

export default function WeightTrackingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { data: progressData, isLoading } = useProgressData(userId || null);

  // Chart dimensions
  const chartWidth = width - 40 - 48; // screenWidth - padding - cardPadding
  const chartHeight = 120;

  // Simple rising bezier curve mock path
  const curvePath = `M 0 ${chartHeight * 0.8} Q ${chartWidth * 0.3} ${chartHeight * 0.7} ${chartWidth * 0.6} ${chartHeight * 0.5} T ${chartWidth} ${chartHeight * 0.3}`;
  
  // Fill path extends the curve down to the bottom
  const fillPath = `${curvePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  if (isLoading || !progressData) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator color="#D4FF00" size="large" />
      </View>
    );
  }

  const { summary, measurementHistory } = progressData;
  const recentWeights = measurementHistory.filter(m => m.weight !== undefined && m.weight !== null);
  
  let diffFromLastWeek = 0;
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekLog = recentWeights.find(w => new Date(w.loggedAt) <= lastWeekDate);
  if (lastWeekLog && lastWeekLog.weight) {
    diffFromLastWeek = summary.currentWeight - lastWeekLog.weight;
  } else if (recentWeights.length > 1) {
    // just use previous log if we don't have exactly one week ago
    diffFromLastWeek = summary.currentWeight - (recentWeights[1].weight || 0);
  }

  const isReduction = diffFromLastWeek < 0;
  const diffString = `${isReduction ? '↓' : diffFromLastWeek > 0 ? '↑' : ''} ${Math.abs(diffFromLastWeek).toFixed(1)} kg from previous`;

  const totalDiffGoal = Math.abs(summary.startingWeight - summary.targetWeight);
  const remaining = Math.max(0, Math.abs(summary.currentWeight - summary.targetWeight));
  const progressPercent = totalDiffGoal > 0 ? Math.min(100, Math.max(0, ((totalDiffGoal - remaining) / totalDiffGoal) * 100)) : 0;

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
              <Text className="text-white text-[40px] font-bold tracking-tight">{summary.currentWeight.toFixed(1)}</Text>
              <Text className="text-[#8E8E93] text-xl font-medium">kg</Text>
            </View>
            <Text className={`${isReduction ? 'text-[#D4FF00]' : 'text-[#8E8E93]'} text-[13px] font-medium`}>
              {diffFromLastWeek === 0 ? 'No change' : diffString}
            </Text>
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
                  <Text className="text-white text-2xl font-bold">{summary.startingWeight.toFixed(1)}</Text>
                  <Text className="text-[#8E8E93] text-xs font-medium">kg</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-[#8E8E93] text-[10px] font-bold tracking-widest mb-1 uppercase">Goal</Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-white text-2xl font-bold">{summary.targetWeight.toFixed(1)}</Text>
                  <Text className="text-[#8E8E93] text-xs font-medium">kg</Text>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-[#2A2A2D] rounded-full mb-4 overflow-hidden">
              <View className="h-full bg-[#D4FF00] rounded-full" style={{ width: `${progressPercent}%` }} />
            </View>

            <View className="flex-row justify-between">
              <Text className="text-[#D4FF00] text-[13px] font-medium">{summary.weightChange.toFixed(1)} kg {summary.goalType === 'gain' ? 'gained' : 'lost'}</Text>
              <Text className="text-[#8E8E93] text-[13px] font-medium">{remaining.toFixed(1)} kg remaining</Text>
            </View>
          </View>

          {/* Recent Logs */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-8 border border-[#2A2A2D]/50">
            <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] mb-4 uppercase">Recent Logs</Text>
            
            {recentWeights.slice(0, 5).map((log, i) => (
              <View key={log.customerMeasurementId || i} className={`flex-row justify-between py-4 ${i !== 4 ? 'border-b border-[#2A2A2D]/50' : 'pt-4'}`}>
                <Text className={i === 0 ? 'text-[#E5E5EA] text-[15px]' : 'text-[#8E8E93] text-[15px]'}>
                  {new Date(log.loggedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                </Text>
                <Text className={i === 0 ? 'text-white text-[17px] font-bold tracking-tight' : 'text-[#E5E5EA] text-[17px] font-bold tracking-tight'}>
                  {log.weight?.toFixed(1)} kg
                </Text>
              </View>
            ))}
            
            {recentWeights.length === 0 && (
              <Text className="text-[#8E8E93] text-[15px] italic">No weight logs yet.</Text>
            )}
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
