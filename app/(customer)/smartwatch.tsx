import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
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
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useWatchSession } from '@/hooks/watch/useWatchSession';
import { useWatchDevices, useWatchStats } from '@/hooks/watch/useWatchDevices';
import { pushTodayWorkoutToWatch, pushDailyWaterToWatch } from '@/hooks/watch/useWatchSync';
import { toast } from '@/lib/toast';

export default function SmartwatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const { connectionStatus, isWatchConnected, checkConnection, pingWatch } = useWatchSession();
  const { data: devices, refetch: refetchDevices } = useWatchDevices(userId);
  const { data: stats, refetch: refetchStats } = useWatchStats(userId);

  const [isPinging, setIsPinging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
        <Pressable onPress={() => router.back()} className="mr-3 p-1 active:opacity-70">
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

