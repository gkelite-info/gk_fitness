import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
  Dimensions,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  Drop,
  Plus,
  Trash,
  Clock,
  Heart,
  PencilSimple,
  CaretRight,
  X,
  Minus,
  Check,
  Flame,
  Bell,
  Sparkle,
} from 'phosphor-react-native';
import { ProgressRing } from '@/components/fitness/ProgressRing';
import { useUser } from '@/context/UserContext';
import { useWaterTracking } from '@/hooks/fitness/useWaterTracking';
import { useFitnessStats } from '@/hooks/fitness/useFitnessStats';
import { useWaterStreak } from '@/hooks/fitness/useWaterStreak';
import { useNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/hooks/notifications/useNotificationPreferences';
import { getLocalDateString } from '@/lib/dateUtils';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_WATER_GOAL_ML = 3000;
const QUICK_PRESETS = [
  { amount: 250, label: 'Glass', icon: '🥛' },
  { amount: 500, label: 'Bottle', icon: '🍶' },
  { amount: 750, label: 'Sports', icon: '🥤' },
  { amount: 1000, label: 'Carafe', icon: '🫙' },
];

const GOAL_PRESETS_ML = [2000, 2500, 3000, 3500, 4000];
const REMINDER_INTERVALS = [1, 2, 3, 4];

export default function WaterScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Water tracking data
  const {
    logs,
    logWater,
    isLogging,
    isLoadingLogs,
    deleteWaterLog,
    isDeletingLog,
    updateGoal,
    isUpdatingGoal,
  } = useWaterTracking(userId, todayStr);

  // Daily fitness stats for current goal
  const { data: stats } = useFitnessStats(userId, todayStr);
  const currentGoalML = stats?.waterGoalML || DEFAULT_WATER_GOAL_ML;

  // Streak data
  const { data: streakData } = useWaterStreak(userId);

  // Notification preferences
  const {
    data: preferences,
    isLoading: isLoadingPrefs,
    updatePreference,
  } = useNotificationPreferences(userId ?? undefined);

  const currentPrefs = preferences || DEFAULT_NOTIFICATION_PREFERENCES;
  const isReminderOn = currentPrefs.water_reminders;
  const reminderInterval = currentPrefs.water_interval_hours || 2;
  const reminderStartHour = currentPrefs.water_start_hour ?? 8;
  const reminderEndHour = currentPrefs.water_end_hour ?? 20;

  // Modals state
  const [isEditGoalVisible, setIsEditGoalVisible] = useState(false);
  const [tempGoalML, setTempGoalML] = useState(currentGoalML);

  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [tempReminderOn, setTempReminderOn] = useState(isReminderOn);
  const [tempInterval, setTempInterval] = useState(reminderInterval);
  const [tempStartHour, setTempStartHour] = useState(reminderStartHour);
  const [tempEndHour, setTempEndHour] = useState(reminderEndHour);

  const [isStreakModalVisible, setIsStreakModalVisible] = useState(false);
  const [isAddWaterModalVisible, setIsAddWaterModalVisible] = useState(false);
  const [customAmountText, setCustomAmountText] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Derived metrics
  const totalWaterML = useMemo(() => {
    return logs.reduce((acc, item) => acc + (item.amountML || 0), 0);
  }, [logs]);

  const displayLiters = (totalWaterML / 1000).toFixed(1);
  const goalLiters = (currentGoalML / 1000).toFixed(1);
  const progressRatio = Math.min(totalWaterML / currentGoalML, 1);
  const progressPct = Math.round((totalWaterML / currentGoalML) * 100);

  // Motivational message
  const motivationalMessage = useMemo(() => {
    if (progressPct >= 100) {
      return "Goal achieved! Excellent hydration today! 🎉💙";
    }
    if (progressPct >= 70) {
      return "You're doing great! Keep sipping and stay hydrated. 💙";
    }
    if (progressPct >= 40) {
      return "Halfway there! Keep your water bottle nearby. 💧";
    }
    if (progressPct > 0) {
      return "Good start! Keep sipping throughout the day. 💧";
    }
    return "Start your day with a fresh glass of water! 💧";
  }, [progressPct]);

  // Handle Quick Add
  const handleLogAmount = async (amount: number) => {
    try {
      triggerSuccessHaptic();
      await logWater(amount);
      setIsAddWaterModalVisible(false);
      setCustomAmountText('');
    } catch (e) {
      console.error('Failed to log water', e);
      Alert.alert('Error', 'Failed to log water. Please try again.');
    }
  };

  // Handle Custom Amount Add
  const handleCustomAdd = async () => {
    const val = parseInt(customAmountText.trim(), 10);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in ml.');
      return;
    }
    await handleLogAmount(val);
  };

  // Handle Goal Update
  const handleSaveGoal = async () => {
    try {
      triggerSuccessHaptic();
      await updateGoal(tempGoalML);
      setIsEditGoalVisible(false);
    } catch (e) {
      console.error('Failed to update goal', e);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    }
  };

  // Handle Save Reminder Preferences
  const handleSaveReminderSettings = () => {
    triggerSuccessHaptic();
    updatePreference.mutate({
      water_reminders: tempReminderOn,
      water_mode: 'custom',
      water_interval_hours: tempInterval,
      water_start_hour: tempStartHour,
      water_end_hour: tempEndHour,
    });
    setIsReminderModalVisible(false);
  };

  // Handle Delete Confirmation
  const confirmDeleteLog = (logItem: any) => {
    if (logItem.id.startsWith('temp-')) return;
    Alert.alert(
      'Delete Water Log',
      `Delete this ${logItem.amountML}ml log entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            triggerMediumHaptic();
            setSelectedLog(null);
            await deleteWaterLog({ logId: logItem.id, amountML: logItem.amountML });
          },
        },
      ]
    );
  };

  // Ring dimension dynamic fit
  const ringSize = Math.min(SCREEN_WIDTH * 0.46, 192);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Daily Goal Card */}
        <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-5 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 rounded-full bg-[#00B2FE]/15 items-center justify-center mr-3.5 border border-[#00B2FE]/25">
              <Drop size={24} color="#00B2FE" weight="fill" />
            </View>
            <View>
              <Text className="text-[#8E8E93] text-xs font-medium">Daily Goal</Text>
              <View className="flex-row items-baseline mt-0.5">
                <Text className="text-white text-2xl font-bold tracking-tight">
                  {goalLiters}
                </Text>
                <Text className="text-[#8E8E93] text-xs font-semibold ml-1.5 tracking-wider">
                  LITERS
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setTempGoalML(currentGoalML);
              setIsEditGoalVisible(true);
            }}
            className="flex-row items-center gap-1.5 py-2 px-3 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] active:opacity-75"
          >
            <PencilSimple size={16} color="#00B2FE" weight="bold" />
            <Text className="text-[#00B2FE] text-xs font-semibold">Edit Goal</Text>
          </Pressable>
        </View>

        {/* 2. Three-Column Hero Section: Streak | Ring | Reminder */}
        <View className="flex-row items-center justify-between my-2">
          {/* Left: Best Streak Card */}
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setIsStreakModalVisible(true);
            }}
            className="w-[88px] bg-[#141414] border border-[#222222] rounded-2xl p-3.5 items-center active:scale-95"
          >
            <View className="w-10 h-10 rounded-xl bg-[#241E10] items-center justify-center mb-1.5 border border-[#FACC15]/20">
              <Heart size={20} color="#FACC15" weight="bold" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-medium tracking-tight text-center">
              Best Streak
            </Text>
            <Text className="text-white font-bold text-sm mt-0.5 text-center">
              {streakData?.bestStreak || 0} Days
            </Text>
            <Text className="text-[#D7FF00] text-[10px] font-semibold mt-0.5 text-center">
              {streakData?.niceJobText || 'Nice job!'}
            </Text>
          </Pressable>

          {/* Center: Circular Progress Ring */}
          <View className="items-center justify-center">
            <ProgressRing
              progress={progressRatio}
              size={ringSize}
              strokeWidth={11}
              color="#00B2FE"
              backgroundColor="#142636"
            >
              <View className="items-center justify-center">
                <Drop size={24} color="#00B2FE" weight="fill" />
                <Text className="text-white text-3xl font-black mt-1">
                  {displayLiters}
                  <Text className="text-xl font-bold">L</Text>
                </Text>
                <Text className="text-[#8E8E93] text-xs font-semibold mt-0.5">
                  of {goalLiters} L
                </Text>
                <View className="bg-[#0A2540] border border-[#00B2FE]/30 rounded-full px-3 py-1 mt-2">
                  <Text className="text-[#00B2FE] text-[11px] font-bold">
                    {progressPct}% Completed
                  </Text>
                </View>
              </View>
            </ProgressRing>
          </View>

          {/* Right: Reminder Card */}
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setTempReminderOn(isReminderOn);
              setTempInterval(reminderInterval);
              setTempStartHour(reminderStartHour);
              setTempEndHour(reminderEndHour);
              setIsReminderModalVisible(true);
            }}
            className="w-[88px] bg-[#141414] border border-[#222222] rounded-2xl p-3.5 items-center active:scale-95"
          >
            <View className="w-10 h-10 rounded-xl bg-[#241530] items-center justify-center mb-1.5 border border-[#C084FC]/20">
              <Clock size={20} color="#C084FC" weight="bold" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-medium tracking-tight text-center">
              Reminder
            </Text>
            <Text className="text-white font-bold text-sm mt-0.5 text-center">
              {isReminderOn ? 'On' : 'Off'}
            </Text>
            <Text className="text-[#C084FC] text-[10px] font-semibold mt-0.5 text-center">
              {isReminderOn ? `Every ${reminderInterval} hrs` : 'Disabled'}
            </Text>
          </Pressable>
        </View>

        {/* 3. Motivational Quote */}
        <Text className="text-[#8E8E93] text-xs text-center font-medium my-4 px-3">
          {motivationalMessage}
        </Text>

        {/* 4. Today's Log Section */}
        <View className="mt-2">
          <View className="flex-row items-center justify-between pb-3 border-b border-[#222222]/80">
            <Text className="text-white text-lg font-bold">Today's Log</Text>
            <Text className="text-[#00B2FE] text-lg font-bold">{displayLiters} L</Text>
          </View>

          {isLoadingLogs ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator color="#00B2FE" size="small" />
            </View>
          ) : logs.length === 0 ? (
            <View className="py-12 items-center justify-center bg-[#141414]/40 rounded-2xl border border-[#1E1E1E] mt-3">
              <View className="w-12 h-12 rounded-full bg-[#1A1A1A] items-center justify-center mb-3">
                <Drop size={26} color="#404040" weight="fill" />
              </View>
              <Text className="text-[#8E8E93] text-sm font-medium">No water logged yet today</Text>
              <Text className="text-[#555555] text-xs mt-1 text-center px-6">
                Tap the lime + button below to log your drinks and maintain your streak!
              </Text>
            </View>
          ) : (
            <View className="mt-1">
              {logs
                .slice()
                .reverse()
                .map((log) => {
                  const time = new Date(log.timestamp).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <Pressable
                      key={log.id}
                      onPress={() => confirmDeleteLog(log)}
                      className="flex-row items-center justify-between py-3.5 border-b border-[#1C1C1E] active:bg-[#141414]/60 px-1"
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-9 h-9 rounded-full bg-[#00B2FE]/10 items-center justify-center">
                          <Drop size={20} color="#00B2FE" weight="fill" />
                        </View>
                        <View>
                          <Text className="text-white font-semibold text-sm">{time}</Text>
                          <Text className="text-[#8E8E93] text-xs mt-0.5">{log.amountML} ml</Text>
                        </View>
                      </View>
                      <CaretRight size={16} color="#71717A" />
                    </Pressable>
                  );
                })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 5. Floating Action Button (FAB) */}
      <Pressable
        onPress={() => {
          triggerMediumHaptic();
          setIsAddWaterModalVisible(true);
        }}
        disabled={isLogging}
        className="absolute bottom-24 right-5 w-14 h-14 rounded-full bg-[#D7FF00] items-center justify-center shadow-2xl active:scale-90 z-30"
        style={{
          shadowColor: '#D7FF00',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        {isLogging ? (
          <ActivityIndicator color="#000000" size="small" />
        ) : (
          <Plus size={28} color="#000000" weight="bold" />
        )}
      </Pressable>

      {/* ============================================================
          MODAL 1: ADD WATER (FAB CLICK)
      ============================================================ */}
      <Modal
        visible={isAddWaterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddWaterModalVisible(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setIsAddWaterModalVisible(false)}
          />
          <View className="bg-[#141414] border-t border-[#2A2A2A] rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <View>
                <Text className="text-white text-xl font-bold">Log Water</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">Quick add or enter custom amount</Text>
              </View>
              <Pressable
                onPress={() => setIsAddWaterModalVisible(false)}
                className="w-8 h-8 rounded-full bg-[#222222] items-center justify-center active:opacity-70"
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Quick Presets Grid */}
            <View className="flex-row gap-3 mb-6">
              {QUICK_PRESETS.map((preset) => (
                <Pressable
                  key={preset.amount}
                  onPress={() => handleLogAmount(preset.amount)}
                  disabled={isLogging}
                  className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl py-3.5 items-center active:bg-[#00B2FE]/15 active:border-[#00B2FE]"
                >
                  <Text className="text-xl mb-1">{preset.icon}</Text>
                  <Text className="text-white font-bold text-base">{preset.amount}</Text>
                  <Text className="text-[#8E8E93] text-[10px] uppercase font-semibold">ml</Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Amount Field */}
            <Text className="text-[#8E8E93] text-xs font-semibold mb-2">CUSTOM AMOUNT (ML)</Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-1 flex-row items-center bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-3">
                <TextInput
                  placeholder="e.g. 350"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  value={customAmountText}
                  onChangeText={setCustomAmountText}
                  className="flex-1 text-white text-base font-semibold"
                />
                <Text className="text-[#8E8E93] text-sm font-semibold">ml</Text>
              </View>

              <Pressable
                onPress={handleCustomAdd}
                disabled={isLogging || !customAmountText.trim()}
                className="bg-[#00B2FE] py-3.5 px-6 rounded-2xl active:opacity-80 disabled:opacity-40"
              >
                <Text className="text-black font-bold text-base">Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          MODAL 2: EDIT DAILY GOAL
      ============================================================ */}
      <Modal
        visible={isEditGoalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditGoalVisible(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setIsEditGoalVisible(false)}
          />
          <View className="bg-[#141414] border-t border-[#2A2A2A] rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <View>
                <Text className="text-white text-xl font-bold">Daily Hydration Goal</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">Customize your daily water target</Text>
              </View>
              <Pressable
                onPress={() => setIsEditGoalVisible(false)}
                className="w-8 h-8 rounded-full bg-[#222222] items-center justify-center active:opacity-70"
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Stepper Display */}
            <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-6 items-center mb-6">
              <Text className="text-[#8E8E93] text-xs font-medium mb-1">TARGET INTAKE</Text>
              <View className="flex-row items-center justify-between w-full px-4 my-2">
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setTempGoalML((prev) => Math.max(1000, prev - 250));
                  }}
                  className="w-12 h-12 rounded-full bg-[#242424] items-center justify-center border border-[#333333] active:opacity-70"
                >
                  <Minus size={20} color="#FFFFFF" weight="bold" />
                </Pressable>

                <View className="items-center">
                  <Text className="text-white text-4xl font-black">
                    {(tempGoalML / 1000).toFixed(1)}
                    <Text className="text-2xl text-[#00B2FE] font-bold"> L</Text>
                  </Text>
                  <Text className="text-[#8E8E93] text-xs mt-1">{tempGoalML} ml per day</Text>
                </View>

                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setTempGoalML((prev) => Math.min(6000, prev + 250));
                  }}
                  className="w-12 h-12 rounded-full bg-[#242424] items-center justify-center border border-[#333333] active:opacity-70"
                >
                  <Plus size={20} color="#FFFFFF" weight="bold" />
                </Pressable>
              </View>
            </View>

            {/* Presets Chips */}
            <Text className="text-[#8E8E93] text-xs font-semibold mb-2">QUICK PRESETS</Text>
            <View className="flex-row gap-2 mb-6">
              {GOAL_PRESETS_ML.map((ml) => (
                <Pressable
                  key={ml}
                  onPress={() => {
                    triggerLightHaptic();
                    setTempGoalML(ml);
                  }}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    tempGoalML === ml
                      ? 'bg-[#00B2FE]/20 border-[#00B2FE]'
                      : 'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      tempGoalML === ml ? 'text-[#00B2FE]' : 'text-white'
                    }`}
                  >
                    {(ml / 1000).toFixed(1)}L
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveGoal}
              disabled={isUpdatingGoal}
              className="bg-[#00B2FE] py-4 rounded-2xl items-center active:opacity-80"
            >
              {isUpdatingGoal ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text className="text-black font-bold text-base">Save Daily Goal</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          MODAL 3: REMINDER & NOTIFICATION SETTINGS (GOOD UX)
      ============================================================ */}
      <Modal
        visible={isReminderModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsReminderModalVisible(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setIsReminderModalVisible(false)}
          />
          <View className="bg-[#141414] border-t border-[#2A2A2A] rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <View>
                <Text className="text-white text-xl font-bold">Hydration Reminders</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">Stay on track with gentle notifications</Text>
              </View>
              <Pressable
                onPress={() => setIsReminderModalVisible(false)}
                className="w-8 h-8 rounded-full bg-[#222222] items-center justify-center active:opacity-70"
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Main Toggle Switch */}
            <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 flex-row items-center justify-between mb-5">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-[#241530] items-center justify-center border border-[#C084FC]/25">
                  <Bell size={20} color="#C084FC" weight="bold" />
                </View>
                <View>
                  <Text className="text-white font-semibold text-base">Water Reminders</Text>
                  <Text className="text-[#8E8E93] text-xs">
                    {tempReminderOn ? 'Active on this device' : 'Reminders are paused'}
                  </Text>
                </View>
              </View>

              <Switch
                value={tempReminderOn}
                onValueChange={(val) => {
                  triggerLightHaptic();
                  setTempReminderOn(val);
                }}
                trackColor={{ false: '#333333', true: '#C084FC' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {tempReminderOn && (
              <>
                {/* Interval Selection */}
                <Text className="text-[#8E8E93] text-xs font-semibold mb-2">REMIND FREQUENCY</Text>
                <View className="flex-row gap-2 mb-5">
                  {REMINDER_INTERVALS.map((hrs) => (
                    <Pressable
                      key={hrs}
                      onPress={() => {
                        triggerLightHaptic();
                        setTempInterval(hrs);
                      }}
                      className={`flex-1 py-3 rounded-xl border items-center ${
                        tempInterval === hrs
                          ? 'bg-[#C084FC]/20 border-[#C084FC]'
                          : 'bg-[#1A1A1A] border-[#2A2A2A]'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          tempInterval === hrs ? 'text-[#C084FC]' : 'text-white'
                        }`}
                      >
                        Every {hrs}h
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Active Hours Summary */}
                <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 mb-6">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white text-sm font-semibold">Active Window</Text>
                    <Text className="text-[#C084FC] text-xs font-bold">
                      {tempStartHour}:00 AM - {tempEndHour > 12 ? `${tempEndHour - 12}:00 PM` : `${tempEndHour}:00 AM`}
                    </Text>
                  </View>
                  <Text className="text-[#8E8E93] text-xs mt-1.5 leading-4">
                    Reminders will automatically run between your active waking hours and pause at night so your sleep is not disturbed.
                  </Text>
                </View>
              </>
            )}

            {/* Save Preferences Button */}
            <Pressable
              onPress={handleSaveReminderSettings}
              className="bg-[#C084FC] py-4 rounded-2xl items-center active:opacity-80"
            >
              <Text className="text-black font-bold text-base">Save Notification Settings</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          MODAL 4: HYDRATION STREAK & STATS
      ============================================================ */}
      <Modal
        visible={isStreakModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsStreakModalVisible(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setIsStreakModalVisible(false)}
          />
          <View className="bg-[#141414] border-t border-[#2A2A2A] rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <View>
                <Text className="text-white text-xl font-bold">Hydration Streak</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">Celebrate consistency and stay inspired</Text>
              </View>
              <Pressable
                onPress={() => setIsStreakModalVisible(false)}
                className="w-8 h-8 rounded-full bg-[#222222] items-center justify-center active:opacity-70"
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Streak Badges */}
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 items-center">
                <Flame size={24} color="#FB923C" weight="fill" />
                <Text className="text-white text-2xl font-black mt-1">
                  {streakData?.currentStreak || 0}
                </Text>
                <Text className="text-[#8E8E93] text-xs font-medium">Current Streak</Text>
              </View>

              <View className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 items-center">
                <Heart size={24} color="#FACC15" weight="fill" />
                <Text className="text-white text-2xl font-black mt-1">
                  {streakData?.bestStreak || 0}
                </Text>
                <Text className="text-[#8E8E93] text-xs font-medium">Best Streak</Text>
              </View>
            </View>

            {/* Last 7 Days History */}
            <Text className="text-[#8E8E93] text-xs font-semibold mb-3">LAST 7 DAYS</Text>
            <View className="flex-row justify-between bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 mb-6">
              {(streakData?.weeklyHistory || []).map((day, idx) => (
                <View key={idx} className="items-center gap-1.5 flex-1">
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      day.completed
                        ? 'bg-[#00B2FE]'
                        : 'bg-[#262626] border border-[#333333]'
                    }`}
                  >
                    {day.completed ? (
                      <Check size={16} color="#000000" weight="bold" />
                    ) : (
                      <Drop size={14} color="#666666" />
                    )}
                  </View>
                  <Text className="text-[#8E8E93] text-[11px] font-semibold">{day.dayName}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setIsStreakModalVisible(false)}
              className="bg-[#D7FF00] py-4 rounded-2xl items-center active:opacity-80"
            >
              <Text className="text-black font-bold text-base">Keep Going!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
