import React, { useState, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable, Dimensions, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretLeft, CaretRight, CaretDown, CaretUp, Trophy, TrendUp, Barbell, Info, CalendarBlank } from 'phosphor-react-native';
import { useStrengthExerciseData } from '@/hooks/fitness/useStrengthExerciseData';
import { useUser } from '@/context/UserContext';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

function buildChartPath(points: {value: number, label: string}[], chartW: number, chartH: number) {
  if (!points || points.length === 0) return { linePath: '', fillPath: '', dots: [], yLabels: [], xLabels: [] };
  
  const values = points.map(p => p.value);
  const pMin = Math.min(...values);
  const pMax = Math.max(...values);
  let pRange = pMax - pMin;
  
  if (pRange === 0) pRange = 10;
  
  const pMinW = Math.max(0, pMin - pRange * 0.2);
  const pMaxW = pMax + pRange * 0.2;
  pRange = pMaxW - pMinW;

  const dots = points.map((p, i) => ({
    x: (i / (points.length - 1 || 1)) * chartW,
    y: chartH - ((p.value - pMinW) / pRange) * (chartH - 10) - 5,
    value: p.value,
    label: p.label
  }));

  const pathD = dots.map((d, i) => (i === 0 ? `M ${d.x} ${d.y}` : `L ${d.x} ${d.y}`)).join(' ');
  const fillD = `${pathD} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  const yLabels = [Math.round(pMaxW), Math.round((pMaxW + pMinW)/2), Math.round(pMinW)];
  const xLabels = dots.map(d => d.label);

  return { linePath: pathD, fillPath: fillD, dots, yLabels, xLabels };
}

export default function ExerciseStrengthDetailScreen() {
  const { exercise } = useLocalSearchParams();
  const exerciseName = Array.isArray(exercise) ? exercise[0] : exercise;
  
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const { data, isLoading } = useStrengthExerciseData(userId, exerciseName, selectedMonth);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev);
      const nextMonth = d.getMonth() + 1;
      
      const current = new Date();
      if (d.getFullYear() === current.getFullYear() && d.getMonth() === current.getMonth()) {
        return prev;
      }
      
      d.setMonth(nextMonth);
      return d;
    });
  };

  const isCurrentMonth = 
    selectedMonth.getMonth() === new Date().getMonth() && 
    selectedMonth.getFullYear() === new Date().getFullYear();

  const monthLabel = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Prepare chart data for estimated 1RM over the month
  const chartWidth = width - 40 - 48; // padding and card padding
  const chartHeight = 140;
  
  const rawPoints = (data?.logs || []).map(log => ({
    value: log.e1rm,
    label: log.date.split('-')[2], // get day
  }));
  
  const chartData = useMemo(() => {
    return buildChartPath(rawPoints, chartWidth, chartHeight);
  }, [rawPoints, chartWidth, chartHeight]);

  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  const groupedLogs = useMemo(() => {
    if (!data?.logs) return [];
    const groups: Record<string, any[]> = {};
    
    data.logs.forEach(log => {
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    });

    const sortedGroups = Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        sets: groups[date],
        dayVolume: groups[date].reduce((sum, s) => sum + s.volume, 0),
        best1RM: Math.max(...groups[date].map(s => s.e1rm))
      }));
      
    // Auto-expand the most recent date if nothing is expanded yet
    if (sortedGroups.length > 0 && expandedDates.length === 0) {
      setExpandedDates([sortedGroups[0].date]);
    }
    
    return sortedGroups;
  }, [data?.logs]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  return (
    <ScrollView 
      className="flex-1 bg-[#09090B]"
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pt-4 pb-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <Pressable 
            className="w-10 h-10 rounded-xl bg-[#1C1C1E] border border-[#2A2A2D]/50 items-center justify-center active:opacity-70"
            onPress={() => router.back()}
          >
            <CaretLeft size={20} color="#E5E5EA" weight="bold" />
          </Pressable>
          <Text className="text-white text-[17px] font-bold" numberOfLines={1} style={{ maxWidth: '60%' }}>
            {exerciseName}
          </Text>
          <View className="w-10" />
        </View>

        {/* Month Navigation */}
        <View className="flex-row items-center justify-between bg-[#1C1C1E] rounded-full p-2 mb-8 border border-[#2A2A2D]/50">
          <Pressable 
            onPress={handlePrevMonth}
            className="w-10 h-10 rounded-full bg-[#2A2A2D] items-center justify-center active:opacity-70"
          >
            <CaretLeft size={20} color="#E5E5EA" weight="bold" />
          </Pressable>
          
          <Text className="text-white text-base font-bold flex-1 text-center">
            {monthLabel}
          </Text>
          
          <Pressable 
            onPress={handleNextMonth}
            className={`w-10 h-10 rounded-full items-center justify-center ${isCurrentMonth ? 'opacity-50 bg-transparent' : 'bg-[#2A2A2D] active:opacity-70'}`}
            disabled={isCurrentMonth}
          >
            <CaretRight size={20} color={isCurrentMonth ? "#8E8E93" : "#E5E5EA"} weight="bold" />
          </Pressable>
        </View>

        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator color="#D4FF00" size="large" />
          </View>
        ) : !data || data.logs.length === 0 ? (
          <View className="py-20 mt-4 items-center justify-center bg-[#1C1C1E] rounded-3xl border border-[#2A2A2D]/50">
            <View className="mb-4">
              <Barbell size={48} color="#8E8E93" weight="thin" />
            </View>
            <Text className="text-white text-lg font-bold mb-2">No Records Found</Text>
            <Text className="text-[#8E8E93] text-center px-8">
              You haven't logged any sets for {exerciseName} in {monthLabel}.
            </Text>
          </View>
        ) : (
          <View>
            <Text className="text-white text-xl font-bold mb-4">Monthly Overview</Text>
            
            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between mb-8">
              <View className="w-[48%] bg-[#1C1C1E] border border-[#2A2A2D]/50 rounded-3xl p-4 mb-4">
                <View className="flex-row items-center mb-2 gap-2">
                  <Trophy size={16} color="#D4FF00" weight="fill" />
                  <Text className="text-[#8E8E93] text-xs font-medium uppercase tracking-wider">Max Weight</Text>
                </View>
                <View className="flex-row items-baseline">
                  <Text className="text-white text-2xl font-bold">{data.maxWeight}</Text>
                  <Text className="text-[#8E8E93] text-[10px] ml-1 uppercase">kg</Text>
                </View>
              </View>

              <View className="w-[48%] bg-[#1C1C1E] border border-[#2A2A2D]/50 rounded-3xl p-4 mb-4">
                <View className="flex-row items-center mb-2 gap-2">
                  <TrendUp size={16} color="#D4FF00" weight="bold" />
                  <Text className="text-[#8E8E93] text-xs font-medium uppercase tracking-wider">Volume</Text>
                </View>
                <View className="flex-row items-baseline">
                  <Text className="text-white text-2xl font-bold">{(data.totalVolume / 1000).toFixed(1)}</Text>
                  <Text className="text-[#8E8E93] text-[10px] ml-1 uppercase">tons</Text>
                </View>
              </View>

              <View className="w-[48%] bg-[#1C1C1E] border border-[#2A2A2D]/50 rounded-3xl p-4">
                <View className="flex-row items-center mb-2 gap-2">
                  <Barbell size={16} color="#D4FF00" weight="fill" />
                  <Text className="text-[#8E8E93] text-xs font-medium uppercase tracking-wider">Sets</Text>
                </View>
                <View className="flex-row items-baseline">
                  <Text className="text-white text-2xl font-bold">{data.totalSets}</Text>
                  <Text className="text-[#8E8E93] text-[10px] ml-1 uppercase">sets</Text>
                </View>
              </View>

              <View className="w-[48%] bg-[#1C1C1E] border border-[#2A2A2D]/50 rounded-3xl p-4">
                <View className="flex-row items-center mb-2 gap-2">
                  <Info size={16} color="#D4FF00" weight="fill" />
                  <Text className="text-[#8E8E93] text-xs font-medium uppercase tracking-wider">Est. 1RM</Text>
                </View>
                <View className="flex-row items-baseline">
                  <Text className="text-white text-2xl font-bold">{data.estimated1RM}</Text>
                  <Text className="text-[#8E8E93] text-[10px] ml-1 uppercase">kg</Text>
                </View>
              </View>
            </View>

            {/* Progression Chart */}
            {chartData.dots.length > 1 && (
              <View className="bg-[#1C1C1E] border border-[#2A2A2D]/50 rounded-3xl p-5 mb-8">
                <View className="flex-row items-center mb-6">
                  <Text className="text-white text-base font-bold mr-2">Estimated 1RM Progression</Text>
                  <Pressable 
                    onPress={() => Alert.alert(
                      "Estimated 1 Rep Max (1RM)", 
                      "1RM is the maximum weight you can theoretically lift for a single repetition.\n\nInstead of testing your true max (which can be risky), we use the industry-standard Epley formula to estimate your 1RM based on the weight and reps you log.",
                      [{ text: "Got it", style: "cancel" }]
                    )}
                    className="w-5 h-5 rounded-full bg-[#2A2A2D] items-center justify-center active:opacity-70"
                  >
                    <Text className="text-[#8E8E93] text-[10px] font-bold">i</Text>
                  </Pressable>
                </View>
                <View className="flex-row">
                  <View className="justify-between mr-3 py-1" style={{ height: chartHeight }}>
                    {chartData.yLabels.map((lbl, i) => (
                      <Text key={i} className="text-[#8E8E93] text-[10px]">{lbl}</Text>
                    ))}
                  </View>
                  <View className="flex-1">
                    <Svg width={chartWidth} height={chartHeight}>
                      <Defs>
                        <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#D4FF00" stopOpacity="0.3" />
                          <Stop offset="1" stopColor="#D4FF00" stopOpacity="0" />
                        </LinearGradient>
                      </Defs>
                      <Path d={chartData.fillPath} fill="url(#chartGrad)" />
                      <Path d={chartData.linePath} fill="none" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {chartData.dots.map((dot, i) => (
                        <Circle key={i} cx={dot.x} cy={dot.y} r="4" fill="#09090B" stroke="#D4FF00" strokeWidth="2" />
                      ))}
                    </Svg>
                    <View className="flex-row justify-between mt-2 ml-1 mr-1">
                      {chartData.xLabels.map((xlbl, i) => {
                        // Only show ~5 labels evenly spaced if there are many dots
                        const total = chartData.xLabels.length;
                        if (total > 7 && i !== 0 && i !== total - 1 && i % Math.floor(total/4) !== 0) return <View key={i} className="w-4" />;
                        return <Text key={i} className="text-[#8E8E93] text-[10px]">{xlbl}</Text>;
                      })}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Log History */}
            <Text className="text-white text-xl font-bold mb-4">Set History</Text>
            {groupedLogs.map((group, index) => {
              const isExpanded = expandedDates.includes(group.date);
              
              return (
                <View key={group.date} className="bg-[#1C1C1E] border border-[#2A2A2D]/50 rounded-2xl mb-3 overflow-hidden">
                  <Pressable 
                    onPress={() => toggleDate(group.date)}
                    className="p-4 flex-row justify-between items-center bg-[#1C1C1E] active:opacity-70"
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-[#2A2A2D] items-center justify-center mr-3">
                        <CalendarBlank size={18} color="#D4FF00" weight="fill" />
                      </View>
                      <View>
                        <Text className="text-white text-base font-bold">{group.date}</Text>
                        <Text className="text-[#8E8E93] text-xs font-medium">
                          {group.sets.length} sets • Vol: {group.dayVolume} kg
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <View className="mr-3 items-end">
                        <Text className="text-[#8E8E93] text-[10px] font-medium uppercase tracking-wider mb-0.5">Best 1RM</Text>
                        <Text className="text-[#D4FF00] text-sm font-bold">{Math.round(group.best1RM)} kg</Text>
                      </View>
                      {isExpanded ? (
                        <CaretUp size={20} color="#8E8E93" weight="bold" />
                      ) : (
                        <CaretDown size={20} color="#8E8E93" weight="bold" />
                      )}
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View className="px-4 pb-4 pt-2 border-t border-[#2A2A2D]/30 bg-[#09090B]/50">
                      <View className="flex-row justify-between mb-2 px-2">
                        <Text className="text-[#8E8E93] text-[10px] font-medium uppercase tracking-wider flex-1">Set</Text>
                        <Text className="text-[#8E8E93] text-[10px] font-medium uppercase tracking-wider flex-2 text-center">Weight × Reps</Text>
                        <Text className="text-[#8E8E93] text-[10px] font-medium uppercase tracking-wider flex-1 text-right">Est. 1RM</Text>
                      </View>
                      
                      {group.sets.map((log, i) => (
                        <View key={log.id + '-' + i} className="flex-row justify-between items-center py-2 px-2 border-b border-[#2A2A2D]/30 last:border-b-0">
                          <Text className="text-[#8E8E93] text-sm font-medium flex-1">{i + 1}</Text>
                          <View className="flex-row items-baseline flex-2 justify-center">
                            <Text className="text-white text-base font-bold">{log.weight}</Text>
                            <Text className="text-[#8E8E93] text-[10px] font-medium mx-0.5">kg</Text>
                            <Text className="text-[#8E8E93] text-[10px] font-medium mx-1">×</Text>
                            <Text className="text-white text-base font-bold">{log.reps}</Text>
                          </View>
                          <Text className="text-white text-sm font-bold flex-1 text-right">{Math.round(log.e1rm)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
