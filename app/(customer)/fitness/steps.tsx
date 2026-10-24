import React, { useState } from 'react';
import { View, ScrollView, Pressable, Linking, ActivityIndicator, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { usePedometer } from '@/hooks/fitness/usePedometer';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Flame,
  Footprints,
  Clock,
  Trophy,
  PencilSimple,
  Minus,
  Plus,
  X,
  Target,
  Sparkle,
} from 'phosphor-react-native';
import { ProgressRing } from '@/components/fitness/ProgressRing';
import { useFitnessTimelineData } from '@/hooks/fitness/useFitnessTimelineData';
import { FitnessTimelineHeader } from '@/components/fitness/FitnessTimelineHeader';
import { useStepGoal, STEP_GOAL_PRESETS, DEFAULT_STEP_GOAL, MIN_STEP_GOAL, MAX_STEP_GOAL } from '@/hooks/fitness/useStepGoal';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/haptics';

interface StepSliderProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function StepSlider({ value, onChange, min = MIN_STEP_GOAL, max = MAX_STEP_GOAL, step = 100 }: StepSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const calculateValueFromX = (x: number) => {
    if (trackWidth <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    const rawVal = min + ratio * (max - min);
    let steppedVal: number;
    if (rawVal < 1000) {
      steppedVal = Math.round(rawVal / 100) * 100;
    } else {
      steppedVal = Math.round(rawVal / 500) * 500;
    }
    const clampedVal = Math.max(min, Math.min(max, steppedVal));
    if (clampedVal !== value) {
      triggerLightHaptic();
      onChange(clampedVal);
    }
  };

  const progressPct = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;

  return (
    <View className="w-full my-2">
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => calculateValueFromX(e.nativeEvent.locationX)}
        onResponderMove={(e) => calculateValueFromX(e.nativeEvent.locationX)}
        className="h-10 justify-center"
      >
        {/* Background Track */}
        <View className="h-2.5 w-full bg-[#242424] rounded-full overflow-hidden">
          <View
            className="h-full bg-[#C3F400] rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </View>

        {/* Thumb Knob */}
        <View
          style={{
            position: 'absolute',
            left: `${progressPct}%`,
            marginLeft: -14,
          }}
          className="w-7 h-7 rounded-full bg-[#C3F400] border-4 border-[#141414] shadow-md items-center justify-center pointer-events-none"
        />
      </View>

      {/* Min & Max Labels */}
      <View className="flex-row justify-between items-center px-1 -mt-1">
        <Text className="text-[#666666] text-[11px] font-semibold">{min.toLocaleString()} min</Text>
        <Text className="text-[#666666] text-[11px] font-semibold">{max.toLocaleString()} max</Text>
      </View>
    </View>
  );
}

export default function StepsScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const { isAvailable } = usePedometer();

  const {
    timeframe,
    setTimeframe,
    offset,
    setOffset,
    label,
    totalValue,
    avgValue,
    goalValue,
    chartBars,
    isLoading,
  } = useFitnessTimelineData(userId, 'steps', 'D');

  const { stepGoal: userStepGoal, updateStepGoal, isUpdating: isUpdatingGoal } = useStepGoal(userId);
  const effectiveGoal = userStepGoal || goalValue || DEFAULT_STEP_GOAL;

  const [isEditGoalVisible, setIsEditGoalVisible] = useState(false);
  const [tempGoal, setTempGoal] = useState<number>(effectiveGoal || DEFAULT_STEP_GOAL);

  const displayValue = timeframe === 'D' ? totalValue : avgValue;
  const progress = Math.min(displayValue / effectiveGoal, 1);
  const activeCalories = Math.round(displayValue * 0.04);
  const activeMinutes = Math.round(displayValue * 0.008);

  const maxSteps = Math.max(...chartBars.map((b) => b.value), 1000);

  const openEditGoalModal = () => {
    triggerLightHaptic();
    setTempGoal(effectiveGoal);
    setIsEditGoalVisible(true);
  };

  const handleSaveGoal = async () => {
    try {
      triggerSuccessHaptic();
      await updateStepGoal(tempGoal);
      setIsEditGoalVisible(false);
    } catch (err) {
      console.error('Failed to update step goal:', err);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3.5 bg-[#141414] border-b border-[#222222]">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.navigate('/(customer)/home'))}
          className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A] active:opacity-80"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Steps & Movement</Text>
        <Pressable
          onPress={openEditGoalModal}
          className="flex-row items-center gap-1.5 py-1.5 px-3 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] active:opacity-75"
        >
          <PencilSimple size={13} color="#C3F400" weight="bold" />
          <Text className="text-[#C3F400] text-xs font-semibold">Goal</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <FitnessTimelineHeader
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          offset={offset}
          setOffset={setOffset}
          label={label}
          accentColor="#C3F400"
        />

        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#C3F400" />
          </View>
        ) : (
          <>
            {/* Main Progress Ring Card */}
            <View className="bg-[#141414] border border-[#222222] rounded-3xl p-6 mb-4 items-center justify-center">
              <ProgressRing progress={progress} size={220} strokeWidth={18} color="#C3F400">
                <View className="items-center">
                  <View className="w-12 h-12 rounded-full bg-[#C3F400]/10 items-center justify-center mb-2">
                    <Footprints size={28} color="#C3F400" weight="fill" />
                  </View>
                  <Text className="text-white text-4xl font-bold">{displayValue.toLocaleString()}</Text>
                  <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider mt-1">
                    {timeframe === 'D' ? `/ ${effectiveGoal.toLocaleString()} STEPS` : `AVG STEPS / DAY`}
                  </Text>
                </View>
              </ProgressRing>

              {/* Goal Target Pill Button */}
              <Pressable
                onPress={openEditGoalModal}
                className="flex-row items-center gap-2 mt-5 px-4 py-1.5 rounded-full bg-[#1C1C1E] border border-[#2A2A2A] active:scale-95"
              >
                <View className="w-2 h-2 rounded-full bg-[#C3F400]" />
                <Text className="text-[#8E8E93] text-xs font-medium">Daily Target:</Text>
                <Text className="text-white text-xs font-bold">{effectiveGoal.toLocaleString()} steps</Text>
                <PencilSimple size={12} color="#C3F400" weight="bold" />
              </Pressable>

              {/* Bottom Quick Metric Stats */}
              <View className="flex-row items-center gap-6 mt-6 pt-5 border-t border-[#222222]/80 w-full justify-center">
                <View className="items-center">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Flame size={16} color="#FF453A" weight="fill" />
                    <Text className="text-white text-xl font-semibold">{activeCalories}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider">KCAL</Text>
                </View>

                <View className="w-[1px] h-8 bg-[#262626]" />

                <View className="items-center">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Clock size={16} color="#0A84FF" weight="fill" />
                    <Text className="text-white text-xl font-semibold">{activeMinutes}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider">MINUTES</Text>
                </View>

                <View className="w-[1px] h-8 bg-[#262626]" />

                <View className="items-center">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Trophy size={16} color="#FFD60A" weight="fill" />
                    <Text className="text-white text-xl font-semibold">12</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider">STREAK</Text>
                </View>
              </View>
            </View>

            {/* Breakdown Chart Card */}
            <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
              <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider mb-5">
                {timeframe === 'D'
                  ? "TODAY'S HOURLY STEPS"
                  : timeframe === 'W'
                  ? 'WEEKLY BREAKDOWN'
                  : timeframe === 'M'
                  ? 'MONTHLY BREAKDOWN'
                  : 'YEARLY BREAKDOWN'}
              </Text>

              <View className="flex-row items-end justify-between h-32">
                {chartBars.map((item, index) => {
                  const heightPct = maxSteps > 0 ? (item.value / maxSteps) * 100 : 5;
                  const isCurrent = item.isCurrent;

                  return (
                    <View key={index} className="items-center gap-2 flex-1">
                      <View className="w-full max-w-[24px] h-24 bg-[#1E1E1E] rounded-full justify-end overflow-hidden">
                        <View
                          className="w-full rounded-full"
                          style={{
                            height: `${Math.max(heightPct, 5)}%`,
                            backgroundColor: isCurrent ? '#C4EF00' : '#2A2A2A',
                          }}
                        />
                      </View>
                      <Text className={`text-[10px] font-semibold ${isCurrent ? 'text-white' : 'text-[#8E8E93]'}`}>
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {!isAvailable && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mt-2">
            <Text className="text-red-400 text-sm text-center font-medium">
              Motion & Fitness sensor or permission is not enabled on this device.
            </Text>
            <Text className="text-[#8E8E93] text-xs text-center mt-1">
              Enable Motion & Fitness permission in your device settings to automatically track daily steps.
            </Text>
            <Pressable
              onPress={() => Linking.openSettings()}
              className="mt-4 bg-red-500/20 py-3 rounded-xl border border-red-500/30 active:opacity-70"
            >
              <Text className="text-red-400 font-bold text-center">Open Device Settings</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ============================================================
          MODAL: EDIT DAILY STEPS GOAL
      ============================================================ */}
      <Modal
        visible={isEditGoalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditGoalVisible(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <Pressable className="flex-1" onPress={() => setIsEditGoalVisible(false)} />

          <View className="bg-[#141414] border-t border-[#2A2A2A] rounded-t-3xl p-6 pb-10">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-5">
              <View>
                <Text className="text-white text-xl font-bold">Daily Steps Target</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">Customize your daily movement goal</Text>
              </View>
              <Pressable
                onPress={() => setIsEditGoalVisible(false)}
                className="w-8 h-8 rounded-full bg-[#222222] items-center justify-center active:opacity-70"
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Stepper Card */}
            <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-5 items-center mb-5">
              <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mb-2">TARGET STEPS</Text>

              <View className="flex-row items-center justify-between w-full px-2 my-1">
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setTempGoal((prev: number) => {
                      const step = prev <= 1000 ? 100 : 500;
                      return Math.max(MIN_STEP_GOAL, prev - step);
                    });
                  }}
                  className="w-12 h-12 rounded-full bg-[#242424] items-center justify-center border border-[#333333] active:opacity-70"
                >
                  <Minus size={20} color="#FFFFFF" weight="bold" />
                </Pressable>

                <View className="items-center">
                  <Text className="text-white text-4xl font-black tracking-tight">
                    {tempGoal.toLocaleString()}
                  </Text>
                  <Text className="text-[#C3F400] text-xs font-bold tracking-widest mt-0.5">STEPS / DAY</Text>
                </View>

                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setTempGoal((prev: number) => {
                      const step = prev < 1000 ? 100 : 500;
                      return Math.min(MAX_STEP_GOAL, prev + step);
                    });
                  }}
                  className="w-12 h-12 rounded-full bg-[#242424] items-center justify-center border border-[#333333] active:opacity-70"
                >
                  <Plus size={20} color="#FFFFFF" weight="bold" />
                </Pressable>
              </View>

              {/* Interactive Touch Slider */}
              <StepSlider
                value={tempGoal}
                onChange={setTempGoal}
                min={MIN_STEP_GOAL}
                max={25000}
                step={100}
              />
            </View>

            {/* Quick Activity Presets */}
            <Text className="text-[#8E8E93] text-xs font-semibold mb-2.5">QUICK PRESETS</Text>
            <View className="flex-row gap-2 mb-5">
              {STEP_GOAL_PRESETS.map((preset) => {
                const isSelected = tempGoal === preset.steps;
                return (
                  <Pressable
                    key={preset.steps}
                    onPress={() => {
                      triggerLightHaptic();
                      setTempGoal(preset.steps);
                    }}
                    className={`flex-1 py-2.5 px-1 rounded-2xl items-center border ${
                      isSelected
                        ? 'bg-[#C3F400]/15 border-[#C3F400]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] active:bg-[#222222]'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${isSelected ? 'text-[#C3F400]' : 'text-white'}`}>
                      {preset.steps >= 1000 ? `${preset.steps / 1000}k` : preset.steps}
                    </Text>
                    <Text className={`text-[9px] mt-0.5 ${isSelected ? 'text-[#C3F400]' : 'text-[#777777]'}`}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Estimated Health Impact Card */}
            <View className="bg-[#1C1C1E] border border-[#2A2A2A] rounded-2xl p-4 mb-6">
              <View className="flex-row items-center gap-1.5 mb-2.5">
                <Sparkle size={15} color="#C3F400" weight="fill" />
                <Text className="text-white text-xs font-semibold">Estimated Daily Impact</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="items-center flex-1">
                  <Text className="text-white font-bold text-base">~{(tempGoal * 0.00075).toFixed(1)} km</Text>
                  <Text className="text-[#8E8E93] text-[10px] mt-0.5">Est. Distance</Text>
                </View>
                <View className="w-[1px] h-6 bg-[#2E2E2E]" />
                <View className="items-center flex-1">
                  <Text className="text-[#FF453A] font-bold text-base">~{Math.round(tempGoal * 0.04)} kcal</Text>
                  <Text className="text-[#8E8E93] text-[10px] mt-0.5">Active Burn</Text>
                </View>
                <View className="w-[1px] h-6 bg-[#2E2E2E]" />
                <View className="items-center flex-1">
                  <Text className="text-[#0A84FF] font-bold text-base">~{Math.round(tempGoal * 0.008)} m</Text>
                  <Text className="text-[#8E8E93] text-[10px] mt-0.5">Active Time</Text>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveGoal}
              disabled={isUpdatingGoal}
              className="w-full bg-[#C3F400] py-4 rounded-2xl items-center justify-center active:opacity-90 disabled:opacity-50"
            >
              {isUpdatingGoal ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text className="text-black font-bold text-base">Save Target Goal</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
