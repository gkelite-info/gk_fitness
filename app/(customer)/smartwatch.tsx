import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Watch,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  Heartbeat,
  Barbell,
  Lightning,
  ShieldCheck,
  Check,
  BluetoothConnected,
  CaretRight,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useWatchSession } from '@/hooks/watch/useWatchSession';
import { useWatchDevices, useWatchStats } from '@/hooks/watch/useWatchDevices';
import { pushTodayWorkoutToWatch, pushDailyWaterToWatch } from '@/hooks/watch/useWatchSync';
import { usePedometer } from '@/hooks/fitness/usePedometer';
import { useWeeklyStats } from '@/hooks/fitness/useWeeklyStats';
import { AppleActivityRings, RING_COLORS } from '@/components/fitness/AppleActivityRings';
import { getLocalDateString } from '@/lib/dateUtils';
import { toast } from '@/lib/toast';

export default function SmartwatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const { connectionStatus, isWatchConnected, checkConnection, pingWatch } = useWatchSession();
  const { data: devices, refetch: refetchDevices } = useWatchDevices(userId);
  const { data: stats, refetch: refetchStats } = useWatchStats(userId);
  const { steps: liveSteps, calories: liveCalories } = usePedometer();
  const { data: weeklyStats } = useWeeklyStats(userId);

  const [isPinging, setIsPinging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      router.navigate('/(customer)/profile');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  const todaySummary = useMemo(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const record = weeklyStats?.thisWeek?.find((s) => s.date === todayStr);
    const cal = Math.max(record?.activeCalories || 0, liveCalories, Math.round(liveSteps * 0.04));
    const calGoal = record?.calorieGoal || 1000;
    const min = record?.activeMinutes || 0;
    const minGoal = 30;
    const steps = Math.max(record?.steps || 0, liveSteps);
    const stepGoal = record?.stepGoal || 10000;
    return {
      move: cal,
      moveGoal: calGoal,
      exercise: min,
      exerciseGoal: minGoal,
      stand: Math.min(Math.round((steps / 1000) * 1.2), 12),
      standGoal: 12,
    };
  }, [weeklyStats, liveCalories, liveSteps]);

  const primaryDevice = devices && devices.length > 0 ? devices[0] : null;
  const deviceName =
    connectionStatus.deviceName ||
    primaryDevice?.deviceName ||
    (connectionStatus.isPaired ? 'Connected Smartwatch' : 'No Watch Detected');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([checkConnection(), refetchDevices(), refetchStats()]);
      toast.success('Connection status updated');
    } catch {
      toast.error('Failed to refresh status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePing = async () => {
    setIsPinging(true);
    try {
      const ok = await pingWatch();
      if (ok) {
        toast.success('Heartbeat ping sent to smartwatch!');
      } else {
        toast.info('Watch is unreachable. Ensure Bluetooth is on and app is open.');
      }
    } catch {
      toast.error('Failed to communicate with watch.');
    } finally {
      setIsPinging(false);
    }
  };

  const handleManualSync = async () => {
    if (!userId) return;
    setIsSyncing(true);
    try {
      const [workoutOk, waterOk] = await Promise.all([
        pushTodayWorkoutToWatch(userId),
        pushDailyWaterToWatch(userId),
      ]);
      if (workoutOk || waterOk) {
        toast.success("Today's workout & hydration synced to watch!");
      } else {
        toast.info('Sync sent. If rest day or no exercises, workout won\'t populate.');
      }
    } catch {
      toast.error('Failed to sync data to watch.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-4" style={{ paddingTop: Math.max(insets.top, 16) }}>
      {/* Header */}
      <View className="flex-row items-center mb-5">
        <Pressable onPress={() => router.navigate('/(customer)/profile')} className="mr-3 p-1 active:opacity-70">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Smartwatch & Wearables</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Connection Status Card */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-2xl bg-[#1C1C1E] border border-[#2A2A2A] items-center justify-center">
                <Watch size={26} color="#D7FF00" weight="fill" />
              </View>
              <View>
                <Text className="text-white text-base font-semibold">{deviceName}</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">
                  Platform: {connectionStatus.platform === 'wearos' ? 'Wear OS (Android)' : connectionStatus.platform === 'watchos' ? 'Apple Watch (watchOS)' : 'Wear OS / watchOS'}
                </Text>
              </View>
            </View>

            {/* Status Pill */}
            <View
              className={`px-2.5 py-1 rounded-full flex-row items-center gap-1.5 ${
                isWatchConnected
                  ? 'bg-[#182810] border border-[#D7FF00]/40'
                  : connectionStatus.isPaired
                  ? 'bg-[#282210] border border-[#F59E0B]/40'
                  : 'bg-[#1F1F1F] border border-[#333333]'
              }`}
            >
              <View
                className={`w-2 h-2 rounded-full ${
                  isWatchConnected
                    ? 'bg-[#D7FF00]'
                    : connectionStatus.isPaired
                    ? 'bg-[#F59E0B]'
                    : 'bg-[#666666]'
                }`}
              />
              <Text
                className={`text-[11px] font-semibold ${
                  isWatchConnected
                    ? 'text-[#D7FF00]'
                    : connectionStatus.isPaired
                    ? 'text-[#F59E0B]'
                    : 'text-[#8E8E93]'
                }`}
              >
                {isWatchConnected ? 'Connected' : connectionStatus.isPaired ? 'Paired' : 'Offline'}
              </Text>
            </View>
          </View>

          {/* Native Bridge Unavailable Warning Banner */}
          {connectionStatus.isNativeModuleAvailable === false && (
            <View className="bg-[#2A1D07] border border-[#F59E0B]/40 rounded-xl p-3.5 mb-3">
              <Text className="text-[#FBBF24] text-xs font-semibold">⚠️ Development APK Update Needed</Text>
              <Text className="text-[#D1D5DB] text-[11px] mt-1 leading-4">
                Your phone is running an older development APK compiled before native <Text className="font-mono text-[#D7FF00]">WatchBridgeModule</Text> was added. Please update your phone to the newly built APK (<Text className="text-white font-mono">app-debug.apk</Text>) to enable watch sync.
              </Text>
            </View>
          )}

          {/* Node & Registry Info */}
          {connectionStatus.nodeId && (
            <View className="bg-[#1A1A1A] rounded-xl px-3 py-2 mb-4 border border-[#27272A]">
              <Text className="text-[#8E8E93] text-[11px]">
                Node ID: <Text className="text-white font-mono text-[10px]">{connectionStatus.nodeId.substring(0, 16)}...</Text>
              </Text>
            </View>
          )}

          {/* Actions */}
          <View className="flex-row items-center gap-2.5 mb-2.5">
            <Pressable
              onPress={handlePing}
              disabled={isPinging}
              className="flex-1 bg-[#D7FF00] py-3 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
            >
              {isPinging ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Lightning size={16} color="#000000" weight="fill" />
                  <Text className="text-black font-semibold text-xs">Test Ping</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleRefresh}
              disabled={isRefreshing}
              className="bg-[#1C1C1E] border border-[#2A2A2A] px-4 py-3 rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-80"
            >
              <ArrowClockwise size={16} color="#FFFFFF" />
              <Text className="text-white font-semibold text-xs">Refresh</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleManualSync}
            disabled={isSyncing}
            className="w-full bg-[#1C1C1E] border border-[#2A2A2A] py-3 rounded-xl flex-row items-center justify-center gap-2 active:opacity-80"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#D7FF00" />
            ) : (
              <>
                <ArrowClockwise size={16} color="#D7FF00" />
                <Text className="text-white font-semibold text-xs">Sync Today's Workout & Water to Watch</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Apple Activity Rings Glance Card */}
        <Pressable
          onPress={() => router.push('/(customer)/fitness/activity')}
          className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4 active:opacity-90"
        >
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-white text-base font-bold">Activity Rings</Text>
              <Text className="text-[#8E8E93] text-xs">Today's Move, Exercise & Stand</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-[#1C1C1E] px-3 py-1.5 rounded-full border border-[#2A2A2A]">
              <Text className="text-[#D7FF00] text-xs font-semibold">View Graphs</Text>
              <CaretRight size={12} color="#D7FF00" weight="bold" />
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="items-center justify-center">
              <AppleActivityRings
                move={{ current: todaySummary.move, goal: todaySummary.moveGoal }}
                exercise={{ current: todaySummary.exercise, goal: todaySummary.exerciseGoal }}
                stand={{ current: todaySummary.stand, goal: todaySummary.standGoal }}
                size={130}
                strokeWidth={14}
                spacing={3}
              />
            </View>

            <View className="flex-1 ml-5 justify-around gap-2.5">
              <View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RING_COLORS.move.stroke }} />
                  <Text className="text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider">Move</Text>
                </View>
                <Text className="text-white text-base font-bold pl-4">
                  {todaySummary.move}
                  <Text className="text-[#8E8E93] text-xs font-normal"> / {todaySummary.moveGoal} KCAL</Text>
                </Text>
              </View>

              <View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RING_COLORS.exercise.stroke }} />
                  <Text className="text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider">Exercise</Text>
                </View>
                <Text className="text-white text-base font-bold pl-4">
                  {todaySummary.exercise}
                  <Text className="text-[#8E8E93] text-xs font-normal"> / {todaySummary.exerciseGoal} MIN</Text>
                </Text>
              </View>

              <View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RING_COLORS.stand.stroke }} />
                  <Text className="text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider">Stand</Text>
                </View>
                <Text className="text-white text-base font-bold pl-4">
                  {todaySummary.stand}
                  <Text className="text-[#8E8E93] text-xs font-normal"> / {todaySummary.standGoal} HRS</Text>
                </Text>
              </View>
            </View>
          </View>
        </Pressable>

        {/* Database Sync Stats Card */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
          <Text className="text-white text-base font-semibold mb-3">Sync & Health Metrics</Text>
          <View className="flex-row items-center justify-between">
            {/* Sets logged */}
            <View className="flex-1 items-center bg-[#1A1A1A] rounded-2xl p-3 border border-[#27272A] mr-2">
              <Barbell size={20} color="#D7FF00" weight="fill" />
              <Text className="text-white text-xl font-semibold mt-1">{stats?.totalWearSets || 0}</Text>
              <Text className="text-[#8E8E93] text-[10px] mt-0.5 tracking-wider uppercase">Sets Synced</Text>
            </View>

            {/* Workouts completed */}
            <View className="flex-1 items-center bg-[#1A1A1A] rounded-2xl p-3 border border-[#27272A] mr-2">
              <CheckCircle size={20} color="#D7FF00" weight="fill" />
              <Text className="text-white text-xl font-semibold mt-1">{stats?.totalWearWorkouts || 0}</Text>
              <Text className="text-[#8E8E93] text-[10px] mt-0.5 tracking-wider uppercase">Workouts</Text>
            </View>

            {/* Latest Heart Rate */}
            <View className="flex-1 items-center bg-[#1A1A1A] rounded-2xl p-3 border border-[#27272A]">
              <Heartbeat size={20} color="#FF3B30" weight="fill" />
              <Text className="text-white text-xl font-semibold mt-1">
                {stats?.lastHeartRate ? `${stats.lastHeartRate}` : '--'}
              </Text>
              <Text className="text-[#8E8E93] text-[10px] mt-0.5 tracking-wider uppercase">Last BPM</Text>
            </View>
          </View>
        </View>

        {/* Real-time Features Checklist */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
          <Text className="text-white text-base font-semibold mb-3">Integrated Companion Features</Text>

          <View className="gap-3">
            <View className="flex-row items-start gap-2.5">
              <View className="w-5 h-5 rounded-full bg-[#D7FF00]/20 items-center justify-center mt-0.5">
                <Check size={12} color="#D7FF00" weight="bold" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold">Real-time Set Logging</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5 leading-4">
                  Log reps, weights, and set completion on wrist with automatic source tagging (`wearos`).
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2.5">
              <View className="w-5 h-5 rounded-full bg-[#D7FF00]/20 items-center justify-center mt-0.5">
                <Check size={12} color="#D7FF00" weight="bold" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold">Automatic Rest Timer</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5 leading-4">
                  Wrist haptic alert triggers when your configured rest interval finishes.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2.5">
              <View className="w-5 h-5 rounded-full bg-[#D7FF00]/20 items-center justify-center mt-0.5">
                <Check size={12} color="#D7FF00" weight="bold" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold">Continuous PPG Heart Rate</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5 leading-4">
                  Live sensor data streams directly into your workout heart rate history.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2.5">
              <View className="w-5 h-5 rounded-full bg-[#D7FF00]/20 items-center justify-center mt-0.5">
                <Check size={12} color="#D7FF00" weight="bold" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold">Offline Workout Queue</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5 leading-4">
                  Sets logged out-of-range are buffered in SQLite and sync immediately upon reconnection.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pairing Instructions */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5">
          <Text className="text-white text-base font-semibold mb-2">How to Connect</Text>
          <Text className="text-[#8E8E93] text-xs leading-5">
            1. Keep Bluetooth turned on and ensure your watch is connected via Galaxy Wearable or Google Pixel Watch app.{'\n'}
            2. Launch GK Gymlife on your smartwatch.{'\n'}
            3. Start any workout on your phone — the session will automatically appear on your wrist!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

