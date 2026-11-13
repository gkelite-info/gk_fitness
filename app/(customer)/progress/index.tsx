import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChartLineUp, Ruler, Camera, ChartBar, CaretRight, Fire, Lightning, PencilSimple, Barbell, ArrowsClockwise } from 'phosphor-react-native';
import { useProgressData } from '@/hooks/fitness/useProgressData';
import { useUpdateTargetWeight } from '@/hooks/fitness/useUpdateProgress';
import { useUser } from '@/context/UserContext';
import { useActiveDays } from '@/hooks/fitness/useActiveDays';
import { useWorkoutStreak } from '@/hooks/customerWorkouts/useWorkoutStreak';
import { useQueryClient } from '@tanstack/react-query';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerLightHaptic } from '@/lib/haptics';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: progressData, isLoading: loading, isError, error, refetch: refetchProgress } = useProgressData(userId || null);
  const { data: activeDaysData, refetch: refetchActiveDays } = useActiveDays(userId || null);
  const { data: streakData, refetch: refetchStreak } = useWorkoutStreak();

  const onRefresh = useCallback(async () => {
    triggerLightHaptic();
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProgress(),
        refetchActiveDays(),
        refetchStreak(),
        queryClient.invalidateQueries({ queryKey: ['progressData', userId] }),
        queryClient.invalidateQueries({ queryKey: ['activeDays', userId] }),
        queryClient.invalidateQueries({ queryKey: ['workoutStreak'] }),
      ]);
    } catch (err) {
      console.error('[Progress] Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProgress, refetchActiveDays, refetchStreak, queryClient, userId]);

  const { mutateAsync: updateTargetWeight, isPending: isUpdatingGoal } = useUpdateTargetWeight();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editTargetWeight, setEditTargetWeight] = useState('');

  const handleSaveTargetWeight = async () => {
    if (editTargetWeight && !isNaN(Number(editTargetWeight))) {
      try {
        await updateTargetWeight({
          userId: userId!,
          onboardingId: progressData?.onboarding?.onboardingId,
          targetWeight: editTargetWeight
        });
        setEditModalVisible(false);
      } catch (err: any) {
        import('react-native').then(({ Alert }) => Alert.alert("Error", "Failed to update target weight: " + err.message));
      }
    }
  };

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
    {
      title: 'Strength Analytics',
      subtitle: 'Track your lifting volume and maxes',
      icon: Barbell,
      href: '/(customer)/progress/strength',
    },
    {
      title: 'Weekly Progress',
      subtitle: 'Track your weekly goals and adherence',
      icon: Fire,
      href: '/(customer)/progress/weekly-progress',
    },
  ];

  if (loading && !progressData) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator color="#D4FF00" size="large" />
      </View>
    );
  }

  if (!progressData || !progressData.summary) {
    return (
      <ScrollView
        className="flex-1 bg-[#09090B]"
        contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-white text-lg font-semibold mb-2">Unable to load progress</Text>
        <Text className="text-[#8E8E93] text-sm text-center mb-6">
          Pull down to refresh or tap retry below.
        </Text>
        <Pressable
          className="bg-[#D4FF00] px-6 py-3 rounded-2xl flex-row items-center gap-2 active:opacity-80"
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#09090B" />
          ) : (
            <>
              <ArrowsClockwise size={18} color="#09090B" weight="bold" />
              <Text className="text-[#09090B] font-semibold text-sm">Retry</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  const { summary, onboarding } = progressData;
  const { goalType, weightChange, isGoalReached, targetWeight, currentWeight } = summary;

  return (
    <ScrollView
      className="flex-1 bg-[#09090B]"
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="px-5 pt-4 pb-4">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white text-[32px] font-semibold tracking-tight">Progress</Text>
          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-[#2A2A2D] items-center justify-center active:opacity-70"
            accessibilityLabel="Refresh progress data"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#D4FF00" />
            ) : (
              <ArrowsClockwise size={18} color="#D4FF00" weight="bold" />
            )}
          </Pressable>
        </View>
        <Text className="text-[#8E8E93] text-[15px] mb-8">
          Track. Analyze. Transform. 💪
        </Text>

        <View className="bg-[#1C1C1E] rounded-3xl p-6 mb-8 border border-[#2A2A2D]/50">
          <View className="flex-row justify-between mb-6">
            <View>
              <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-[1.5px] mb-1.5 uppercase">Current Weight</Text>
              <View className="flex-row items-baseline gap-1.5">
                <Text className="text-white text-[34px] font-semibold tracking-tight">{summary.currentWeight.toFixed(1)}</Text>
                <Text className="text-[#8E8E93] text-lg font-medium">kg</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-[1.5px] mb-1.5 uppercase">Goal Weight</Text>
              <Pressable
                className="flex-row items-baseline gap-1.5 active:opacity-70"
                onPress={() => {
                  setEditTargetWeight(summary.targetWeight.toString());
                  setEditModalVisible(true);
                }}
              >
                <Text className="text-white text-[26px] font-semibold tracking-tight">{summary.targetWeight.toFixed(1)}</Text>
                <Text className="text-[#8E8E93] text-sm font-medium">kg</Text>
                <PencilSimple size={16} color="#D4FF00" weight="bold" style={{ marginLeft: 2 }} />
              </Pressable>
            </View>
          </View>

          <View className="flex-row justify-between items-end mb-6">
            <View>
              {isGoalReached ? (
                <Text className="text-[#D4FF00] text-[13px] font-medium mb-1">🎉 Goal Reached!</Text>
              ) : (
                <Text className={`${weightChange !== 0 ? 'text-[#D4FF00]' : 'text-white'} text-[13px] font-medium mb-1`}>
                  {weightChange > 0
                    ? `${goalType === 'loss' ? '↓' : '↑'} ${Math.abs(weightChange).toFixed(1)} kg ${goalType === 'loss' ? 'lost' : 'gained'} `
                    : weightChange < 0
                      ? `${goalType === 'loss' ? '↑' : '↓'} ${Math.abs(weightChange).toFixed(1)} kg ${goalType === 'loss' ? 'gained' : 'lost'} `
                      : 'Getting started '}
                  {targetWeight > 0 && goalType === 'loss' && currentWeight > targetWeight && `• ${(currentWeight - targetWeight).toFixed(1)} kg to go`}
                  {targetWeight > 0 && goalType === 'gain' && currentWeight < targetWeight && `• ${(targetWeight - currentWeight).toFixed(1)} kg to go`}
                </Text>
              )}
              <Text className="text-[#8E8E93] text-[13px]">Since {new Date(onboarding?.createdAt || new Date()).toLocaleDateString()}</Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Fire size={18} weight="fill" color="#D4FF00" />
                <Text className="text-white text-[15px] font-semibold">{streakData?.currentStreak ?? 0}</Text>
              </View>
              <Text className="text-[#8E8E93] text-[10px] tracking-wide">Day Streak</Text>
            </View>
          </View>

          <Pressable
            className="bg-[#D4FF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
            onPress={() => router.push('/(customer)/progress/log-weight')}
          >
            <Text className="text-[#09090B] font-semibold text-base mr-2">Update Weight</Text>
            <CaretRight size={18} weight="bold" color="#09090B" />
          </Pressable>
        </View>

        <Text className="text-[#D4FF00] text-xs font-semibold tracking-[2px] uppercase mb-4">
          This Month{activeDaysData?.monthName ? ` (${activeDaysData.monthName})` : ''}
        </Text>
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-[#1C1C1E] rounded-3xl p-5 items-center justify-center border border-[#2A2A2D]/50">
            <View className="flex-row items-baseline gap-1 mb-1">
              <Text className="text-white text-[28px] font-semibold tracking-tight">
                {summary.thisMonth?.weightChange !== undefined && summary.thisMonth.weightChange !== 0
                  ? summary.thisMonth.weightChange.toFixed(1)
                  : '0'}
              </Text>
              <Text className="text-[#8E8E93] text-[15px] font-medium">kg</Text>
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-[1.5px] uppercase">
              {summary.thisMonth?.goalLabel || (goalType === 'gain' ? 'Total Gained' : 'Total Lost')}
            </Text>
            <Text className="text-[#8E8E93] text-[11px] font-normal mt-1">
              {summary.thisMonth?.diff !== undefined && summary.thisMonth.diff > 0
                ? '↑ Gained'
                : summary.thisMonth?.diff !== undefined && summary.thisMonth.diff < 0
                  ? '↓ Lost'
                  : 'Maintained'}
            </Text>
          </View>
          <View className="flex-1 bg-[#1C1C1E] rounded-3xl p-5 items-center justify-center border border-[#2A2A2D]/50">
            <View className="flex-row items-baseline gap-1 mb-1">
              <Text className="text-white text-[28px] font-semibold tracking-tight">
                {activeDaysData?.activeDaysCount ?? 1}
              </Text>
              <Text className="text-[#8E8E93] text-[14px] font-medium">
                / {activeDaysData?.totalDaysInMonth ?? 31}
              </Text>
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-[1.5px] uppercase">Active Days</Text>
            <Text className="text-[#D4FF00] text-[11px] font-medium mt-1">
              {activeDaysData?.daysLeft ?? 0} days left
            </Text>
          </View>
        </View>

        <Text className="text-[#D4FF00] text-xs font-semibold tracking-[2px] uppercase mb-4">Track Your Progress</Text>
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

      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="fade"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-black/80 justify-center items-center px-5"
        >
          <View className="w-full bg-[#1C1C1E] rounded-3xl p-6 border border-[#2A2A2D]/50">
            <Text className="text-white text-xl font-semibold mb-2">Update Goal Weight</Text>
            <Text className="text-[#8E8E93] text-sm mb-6">Enter your new target weight in kg.</Text>

            <View className="bg-[#09090B] rounded-2xl px-4 py-3 mb-6 border border-[#2A2A2D]/50">
              <TextInput
                className="text-white text-2xl font-semibold"
                keyboardType="numeric"
                value={editTargetWeight}
                onChangeText={setEditTargetWeight}
                autoFocus
                selectionColor="#D4FF00"
              />
            </View>

            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 bg-[#2A2A2D] rounded-xl py-3 items-center justify-center active:opacity-70"
                onPress={() => setEditModalVisible(false)}
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-[#D4FF00] rounded-xl py-3 items-center justify-center active:opacity-70"
                onPress={handleSaveTargetWeight}
                disabled={isUpdatingGoal}
              >
                {isUpdatingGoal ? (
                  <ActivityIndicator color="#09090B" size="small" />
                ) : (
                  <Text className="text-[#09090B] font-semibold">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
