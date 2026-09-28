import React, { useState, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretLeft, CaretRight, Barbell, CalendarBlank, UploadSimple } from 'phosphor-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useProgressData } from '@/hooks/fitness/useProgressData';
import { useMonthlyAnalysis } from '@/hooks/fitness/useMonthlyAnalysis';
import { useUser } from '@/context/UserContext';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

function buildChartPath(points: {date: string, weight: number}[], chartW: number, chartH: number) {
  if (points.length < 2) return { linePath: '', fillPath: '', dots: [], yLabels: [], xLabels: [] };

  const weights = points.map(p => p.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const pMaxW = maxW + range * 0.1;
  const pMinW = Math.max(0, minW - range * 0.1);
  const pRange = pMaxW - pMinW;

  const svgPoints = points.map((p, i) => ({
    x: (i / (points.length - 1)) * chartW,
    y: chartH - ((p.weight - pMinW) / pRange) * (chartH - 10) - 5,
    weight: p.weight,
    date: p.date
  }));

  const pathD = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillD = `${pathD} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  const yLabels = Array.from({length: 5}, (_, i) => (pMaxW - (pRange / 4) * i).toFixed(1));
  const xLabels = [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]];

  return { linePath: pathD, fillPath: fillD, dots: svgPoints, yLabels, xLabels };
}

function buildHeatmapGrid(month: Date, loggedDatesSet: Set<string>) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  let firstDayOfWeek = new Date(year, m, 1).getDay(); // 0=Sun, 1=Mon
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0=Mon, 6=Sun
  
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ id: `pad-${i}`, day: null, isActive: false, isPadding: true });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    cells.push({ id: dateStr, day, isActive: loggedDatesSet.has(dateStr), isPadding: false });
  }
  return cells;
}

export default function MonthlyAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const viewShotRef = useRef<any>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const { data: progressData, isLoading: isProgressLoading } = useProgressData(userId || null);
  const { data: analysisData, isLoading: isAnalysisLoading } = useMonthlyAnalysis(userId, selectedMonth);

  const goToPrevMonth = () => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  
  const captureAndShare = async () => {
    try {
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share my GK Fitness Monthly Progress!',
            UTI: 'public.png'
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report. Please try again.');
    }
  };

  const now = new Date();
  const isCurrentMonth = selectedMonth.getMonth() === now.getMonth() && selectedMonth.getFullYear() === now.getFullYear();

  const isLoading = isProgressLoading || isAnalysisLoading;

  const chartWidth = width - 40 - 48; // padding and card padding
  const chartHeight = 100;

  const chartData = useMemo(() => {
    if (!analysisData?.weightPoints) return { linePath: '', fillPath: '', dots: [], yLabels: [], xLabels: [] };
    return buildChartPath(analysisData.weightPoints, chartWidth, chartHeight);
  }, [analysisData?.weightPoints, chartWidth, chartHeight]);

  const heatmapGrid = useMemo(() => {
    if (!analysisData?.workoutLogDates) return [];
    return buildHeatmapGrid(selectedMonth, new Set(analysisData.workoutLogDates));
  }, [selectedMonth, analysisData?.workoutLogDates]);

  if (isLoading || !progressData || !analysisData) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator color="#D4FF00" size="large" />
      </View>
    );
  }

  const { summary } = progressData;
  const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  const workoutPercent = Math.round((analysisData.workoutDaysCount / daysInMonth) * 100);

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={{ backgroundColor: '#09090B' }}>
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
                <View className="flex-row items-center bg-[#2E3113] border border-[#D4FF00]/30 px-3 py-1 rounded-full">
                  <Pressable onPress={goToPrevMonth} hitSlop={15} className="px-2 py-1">
                    <CaretLeft size={14} color="#D4FF00" weight="bold" />
                  </Pressable>
                  <Text className="text-[#D4FF00] text-xs font-bold mx-2 min-w-[60px] text-center">
                    {selectedMonth.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                  </Text>
                  <Pressable onPress={goToNextMonth} disabled={isCurrentMonth} hitSlop={15} className={`px-2 py-1 ${isCurrentMonth ? 'opacity-50' : ''}`}>
                    <CaretRight size={14} color="#D4FF00" weight="bold" />
                  </Pressable>
                </View>
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
                <Text className="text-[#8E8E93] text-xs mb-1">
                  {summary.weightChange > 0 
                    ? (summary.goalType === 'loss' ? 'Weight lost' : 'Weight gained') 
                    : summary.weightChange < 0 
                    ? (summary.goalType === 'loss' ? 'Weight gained' : 'Weight lost')
                    : 'Weight unchanged'}
                </Text>
                <View className="flex-row items-baseline mb-1">
                  <Text className="text-[#D4FF00] text-[22px] font-bold">
                    {summary.weightChange !== 0 ? `${summary.weightChange > 0 ? '+' : '-'}${Math.abs(summary.weightChange).toFixed(1)}` : '0.0'}
                  </Text>
                  <Text className="text-[#D4FF00] text-[10px] font-bold ml-0.5">kg</Text>
                </View>
                <Text className="text-[#6B6B6B] text-[10px]">Since {new Date(progressData.onboarding?.createdAt || new Date()).toLocaleDateString('default', { month: 'short', year: 'numeric' })}</Text>
              </View>
              <View className="flex-1 items-center">
                <View className="mb-2">
                  <CalendarBlank size={24} color="#D4FF00" weight="regular" />
                </View>
                <Text className="text-[#8E8E93] text-xs mb-1">Workout Days</Text>
                <View className="flex-row items-baseline mb-1 gap-0.5">
                  <Text className="text-[#D4FF00] text-[22px] font-bold">{analysisData.workoutDaysCount}</Text>
                  <Text className="text-[#8E8E93] text-[15px] font-medium">/{daysInMonth}</Text>
                </View>
                <Text className="text-[#6B6B6B] text-[10px]">{workoutPercent}% of days</Text>
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
              
              {chartData.dots.length < 2 ? (
                <View className="h-[140px] items-center justify-center">
                  <Text className="text-[#8E8E93] text-sm text-center px-8">Log your weight regularly this month to see your trend here.</Text>
                </View>
              ) : (
                <>
                  <View className="flex-row">
                    {/* Y Axis Labels */}
                    <View className="justify-between items-end pr-4 h-[100px]">
                      {chartData.yLabels.map((lbl, i) => (
                        <Text key={i} className="text-[#8E8E93] text-[10px]">{lbl}</Text>
                      ))}
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
                        <Path d={chartData.fillPath} fill="url(#chartGrad)" />
                        <Path d={chartData.linePath} fill="none" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Data Points */}
                        {chartData.dots.map((dot, i) => (
                          <Circle key={i} cx={dot.x} cy={dot.y} r="3" fill="#D4FF00" />
                        ))}
                      </Svg>
                    </View>
                  </View>
                  
                  {/* X Axis Labels */}
                  <View className="flex-row justify-between mt-4 pl-[30px]">
                    {chartData.xLabels.map((xlbl, i) => {
                      const d = new Date(xlbl.date);
                      return (
                        <Text key={i} className="text-[#8E8E93] text-[10px] w-10 text-center">
                          {d.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                        </Text>
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            {/* Workout Distribution */}
            <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-6 border border-[#2A2A2D]/50">
              <Text className="text-white text-[11px] font-bold tracking-[1.5px] uppercase mb-6">Workout Distribution</Text>
              
              {analysisData.categoryDistribution.length > 0 ? analysisData.categoryDistribution.map((item, index) => (
                <View key={item.name} className={`flex-row items-center ${index !== analysisData.categoryDistribution.length - 1 ? 'mb-5' : ''}`}>
                  <Text className="text-[#E5E5EA] text-[13px] w-20" numberOfLines={1}>{item.name}</Text>
                  <View className="flex-1 h-2.5 bg-[#2A2A2D] rounded-full mx-3 overflow-hidden">
                    <View className="h-full bg-[#D4FF00] rounded-full" style={{ width: `${item.percentage}%` }} />
                  </View>
                  <Text className="text-[#8E8E93] text-[13px] w-10 text-right">{item.percentage}%</Text>
                </View>
              )) : (
                <Text className="text-[#8E8E93] text-sm text-center">No workout data for this month</Text>
              )}
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
                {heatmapGrid.map((cell) => (
                  <View 
                    key={cell.id} 
                    className={`w-[30px] h-[30px] rounded-[6px] ${cell.isPadding ? 'opacity-0' : (cell.isActive ? 'bg-[#D4FF00]' : 'bg-[#2A2A2D]')}`} 
                  />
                ))}
              </View>
            </View>

          </View>
        </ViewShot>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute left-0 right-0 px-5 pt-4 pb-4 bg-transparent" 
        style={{ bottom: 75 + insets.bottom + 10 }}
      >
        <Pressable 
          className="bg-[#D4FF00] rounded-full py-4 flex-row items-center justify-center active:opacity-80 shadow-lg"
          onPress={captureAndShare}
        >
          <UploadSimple size={20} weight="bold" color="#09090B" />
          <Text className="text-[#09090B] text-[17px] font-bold ml-2">Share Monthly Report</Text>
        </Pressable>
      </View>
    </View>
  );
}
