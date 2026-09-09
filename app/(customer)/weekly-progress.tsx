import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { CaretLeft, CaretDown, CalendarBlank, CaretUp, Info, CheckCircle } from 'phosphor-react-native';
import { useWeeklyStats } from '@/hooks/fitness/useWeeklyStats';
import { useWorkoutStreak } from '@/hooks/customerWorkouts/useWorkoutStreak';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WeeklyProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const { data: stats, isLoading } = useWeeklyStats(userId);
  const { data: streakData } = useWorkoutStreak();

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  const { thisWeek = [], totals, trends } = stats || {};

  // Formatter utilities
  const formatNumber = (num: number) => num.toLocaleString();
  const formatK = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };
  const formatL = (num: number) => (num).toFixed(1);

  // Get date range string
  const getWeekRangeString = () => {
    if (!thisWeek || thisWeek.length === 0) return 'This Week';
    const firstDate = new Date(thisWeek[0].date);
    const lastDate = new Date(thisWeek[thisWeek.length - 1].date);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${firstDate.toLocaleDateString('en-US', options)} - ${lastDate.toLocaleDateString('en-US', options)}`;
  };

  // Helper to render mini vertical bar charts
  const renderBarChart = (
    data: any[],
    getValue: (d: any) => number,
    color: string,
    maxValueLabel: string,
    midValueLabel: string,
    formatValue: (v: number) => string
  ) => {
    const values = data.map(getValue);
    const maxVal = Math.max(...values, 1);
    const chartHeight = 60;

    return (
      <View className="flex-row mt-2">
        {/* Y-axis Labels */}
        <View className="justify-between items-end pr-3 border-r border-[#222222] py-1" style={{ height: chartHeight + 10 }}>
          <Text className="text-[#8E8E93] text-[9px] font-medium">{maxValueLabel}</Text>
          <Text className="text-[#8E8E93] text-[9px] font-medium">{midValueLabel}</Text>
          <Text className="text-[#8E8E93] text-[9px] font-medium">0</Text>
        </View>

        {/* Bars */}
        <View className="flex-1 flex-row justify-between items-end pl-3" style={{ height: chartHeight + 20 }}>
          {data.map((d, index) => {
            const val = getValue(d);
            const height = Math.max((val / maxVal) * chartHeight, 4); // min 4px

            return (
              <View key={index} className="items-center" style={{ width: '13%' }}>
                <Text className="text-white text-[7px] font-medium mb-1.5 opacity-80 text-center w-[200%]">{formatValue(val)}</Text>
                <View 
                  className="w-2.5 rounded-t-full rounded-b-sm mb-1.5" 
                  style={{ height, backgroundColor: color }} 
                />
                <Text className="text-[#8E8E93] text-[9px] font-medium">{d.day}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: Math.max(insets.top + 8, 28) }}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center mb-6 pt-2">
          <Pressable 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-[#141414] border border-[#222222] items-center justify-center active:opacity-80"
          >
            <CaretLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1 items-center pr-10">
            <Text className="text-white text-xl font-bold">Weekly Progress</Text>
            <Text className="text-[#8E8E93] text-xs mt-1">Track your performance for the week</Text>
          </View>
        </View>

        {/* Date Picker Button */}
        <Pressable className="bg-[#141414] border border-[#222222] rounded-full py-3 px-5 flex-row items-center justify-center self-center mb-8 active:opacity-80">
          <CalendarBlank size={16} color="#C4EF00" weight="regular" />
          <Text className="text-[#C4EF00] text-sm font-medium mx-2">{getWeekRangeString()}</Text>
          <CaretDown size={14} color="#C4EF00" />
        </Pressable>

        {/* Calories Card */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4 flex-row">
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-2">Calories (kcal)</Text>
            <Text className="text-[#C4EF00] text-4xl font-bold tracking-tight">{formatNumber(totals?.calories || 0)}</Text>
            <Text className="text-[#8E8E93] text-xs font-medium mt-1">/ {formatNumber(totals?.calorieGoal || 0)} kcal goal</Text>
            
            <View className="flex-row items-center mt-4">
              {(trends?.calories || 0) >= 0 ? (
                <CaretUp size={12} color="#C4EF00" weight="bold" />
              ) : (
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <CaretUp size={12} color="#FF3B30" weight="bold" />
                </View>
              )}
              <Text className={`text-xs font-bold ml-1 ${(trends?.calories || 0) >= 0 ? 'text-[#C4EF00]' : 'text-[#FF3B30]'}`}>
                {Math.abs(trends?.calories || 0)}% <Text className="text-[#8E8E93] font-medium">vs Last Week</Text>
              </Text>
            </View>
          </View>
          
          <View className="w-[160px]">
            {renderBarChart(
              thisWeek, 
              d => d.activeCalories, 
              '#C4EF00', 
              '2.5K', 
              '1.5K', 
              v => v > 0 ? (v / 1000).toFixed(1) + 'k' : '0'
            )}
          </View>
        </View>

        {/* Water Intake Card */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4 flex-row">
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-2">Water Intake (L)</Text>
            <Text className="text-white text-4xl font-bold tracking-tight">{formatL(totals?.water || 0)} L</Text>
            <Text className="text-[#8E8E93] text-xs font-medium mt-1">/ {formatL(totals?.waterGoal || 0)} L goal</Text>
            
            <View className="flex-row items-center mt-4">
              {(trends?.water || 0) >= 0 ? (
                <CaretUp size={12} color="#00DBE7" weight="bold" />
              ) : (
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <CaretUp size={12} color="#FF3B30" weight="bold" />
                </View>
              )}
              <Text className={`text-xs font-bold ml-1 ${(trends?.water || 0) >= 0 ? 'text-[#00DBE7]' : 'text-[#FF3B30]'}`}>
                {Math.abs(trends?.water || 0)}% <Text className="text-[#8E8E93] font-medium">vs Last Week</Text>
              </Text>
            </View>
          </View>
          
          <View className="w-[160px]">
            {renderBarChart(
              thisWeek, 
              d => d.waterIntake, 
              '#00DBE7', 
              '4', 
              '2', 
              v => v > 0 ? v.toFixed(1) : '0'
            )}
          </View>
        </View>

        {/* Day Streak Card */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4 flex-row">
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-2">Workout Streak</Text>
            <View className="flex-row items-baseline">
              <Text className="text-white text-4xl font-bold tracking-tight">{streakData?.currentStreak || 0}</Text>
              <Text className="text-white text-lg font-medium ml-1">days</Text>
            </View>
            <Text className="text-[#8E8E93] text-xs font-medium mt-1">Best: {streakData?.bestStreak || 0} days</Text>
            
            <View className="flex-row items-center mt-4">
              {((streakData?.currentStreak || 0) - (streakData?.bestStreak || 0)) >= 0 ? (
                <CaretUp size={12} color="#FB923C" weight="bold" />
              ) : (
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <CaretUp size={12} color="#FF3B30" weight="bold" />
                </View>
              )}
              <Text className={`text-xs font-bold ml-1 ${((streakData?.currentStreak || 0) - (streakData?.bestStreak || 0)) >= 0 ? 'text-[#FB923C]' : 'text-[#FF3B30]'}`}>
                {Math.abs((streakData?.currentStreak || 0) - (streakData?.bestStreak || 0))} days <Text className="text-[#8E8E93] font-medium">vs Best</Text>
              </Text>
            </View>
          </View>
          
          <View className="w-[160px] justify-end pb-1 pl-3">
            <View className="flex-row justify-between items-center mb-1.5">
              {thisWeek.map((d: any, index: number) => {
                const isActive = (d.steps > 1000 || d.activeCalories > 100 || d.waterIntake > 1);
                return (
                  <View key={index} className="items-center">
                    {isActive ? (
                      <View className="w-[18px] h-[18px] rounded-full border border-[#FB923C] items-center justify-center bg-transparent">
                         <CheckCircle size={14} color="#FB923C" weight="regular" />
                      </View>
                    ) : (
                      <View className="w-[18px] h-[18px] rounded-full border border-[#333333] bg-transparent" />
                    )}
                  </View>
                );
              })}
            </View>
            <View className="flex-row justify-between px-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <Text key={i} className="text-[#8E8E93] text-[9px] font-medium">{day}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Steps Card */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4 flex-row">
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-2">Steps</Text>
            <Text className="text-white text-4xl font-bold tracking-tight">{formatNumber(totals?.steps || 0)}</Text>
            <Text className="text-[#8E8E93] text-xs font-medium mt-1">/ {formatNumber(totals?.stepGoal || 0)} steps goal</Text>
            
            <View className="flex-row items-center mt-4">
              {(trends?.steps || 0) >= 0 ? (
                <CaretUp size={12} color="#C4EF00" weight="bold" />
              ) : (
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <CaretUp size={12} color="#FF3B30" weight="bold" />
                </View>
              )}
              <Text className={`text-xs font-bold ml-1 ${(trends?.steps || 0) >= 0 ? 'text-[#C4EF00]' : 'text-[#FF3B30]'}`}>
                {Math.abs(trends?.steps || 0)}% <Text className="text-[#8E8E93] font-medium">vs Last Week</Text>
              </Text>
            </View>
          </View>
          
          <View className="w-[160px]">
            {renderBarChart(
              thisWeek, 
              d => d.steps, 
              '#C4EF00', 
              '20K', 
              '10K', 
              v => v > 0 ? (v / 1000).toFixed(1) + 'K' : '0'
            )}
          </View>
        </View>

        {/* Workouts Card */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4 flex-row">
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-2">Workouts</Text>
            <View className="flex-row items-baseline">
              <Text className="text-white text-4xl font-bold tracking-tight">{totals?.workouts || 0}</Text>
              <Text className="text-white text-lg font-medium ml-1">workouts</Text>
            </View>
            <Text className="text-[#8E8E93] text-xs font-medium mt-1">/ {totals?.workoutGoal || 6} workouts goal</Text>
            
            <View className="flex-row items-center mt-4">
              {(trends?.workouts || 0) >= 0 ? (
                <CaretUp size={12} color="#A78BFA" weight="bold" />
              ) : (
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <CaretUp size={12} color="#A78BFA" weight="bold" />
                </View>
              )}
              <Text className={`text-xs font-bold ml-1 ${(trends?.workouts || 0) >= 0 ? 'text-[#A78BFA]' : 'text-[#A78BFA]'}`}>
                {Math.abs(trends?.workouts || 0)} workout <Text className="text-[#8E8E93] font-medium">vs Last Week</Text>
              </Text>
            </View>
          </View>
          
          <View className="w-[160px]">
            {renderBarChart(
              thisWeek, 
              d => d.activeMinutes > 0 ? 1 : 0, 
              '#A78BFA', 
              '2', 
              '1', 
              v => v.toString()
            )}
          </View>
        </View>

        {/* Info Box */}
        <View className="bg-[#141414] border border-[#222222] rounded-[20px] p-5 mb-4 flex-row items-center">
          <View className="mr-4">
            <Info size={24} color="#8E8E93" weight="regular" />
          </View>
          <Text className="text-[#8E8E93] text-[13px] flex-1 leading-5">
            All metrics are based on your daily goals. Keep going! Consistency is the key to results.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
