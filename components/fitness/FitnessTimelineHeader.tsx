import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { triggerLightHaptic } from '@/lib/haptics';
import { TimeframeMode } from '@/hooks/fitness/useFitnessTimelineData';

interface FitnessTimelineHeaderProps {
  timeframe: TimeframeMode;
  setTimeframe: (mode: TimeframeMode) => void;
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  label: string;
  accentColor: string;
}

export function FitnessTimelineHeader({
  timeframe,
  setTimeframe,
  offset,
  setOffset,
  label,
  accentColor,
}: FitnessTimelineHeaderProps) {
  const modes: { key: TimeframeMode; label: string }[] = [
    { key: 'D', label: 'Day' },
    { key: 'W', label: 'Week' },
    { key: 'M', label: 'Month' },
    { key: 'Y', label: 'Year' },
  ];

  const handlePrev = () => {
    triggerLightHaptic();
    setOffset((prev) => prev - 1);
  };

  const handleNext = () => {
    if (offset >= 0) return;
    triggerLightHaptic();
    setOffset((prev) => prev + 1);
  };

  const handleSelectMode = (mode: TimeframeMode) => {
    triggerLightHaptic();
    setTimeframe(mode);
  };

  return (
    <View className="mb-4">
      {/* Timeframe Mode Segment Selector */}
      <View className="bg-[#141414] border border-[#222222] rounded-2xl p-1 flex-row mb-3">
        {modes.map((m) => {
          const isActive = timeframe === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => handleSelectMode(m.key)}
              className="flex-1 py-2.5 rounded-xl items-center justify-center active:opacity-80"
              style={{
                backgroundColor: isActive ? '#262626' : 'transparent',
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{
                  color: isActive ? accentColor : '#8E8E93',
                }}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Date Navigation Bar */}
      <View className="bg-[#141414] border border-[#222222] rounded-2xl px-4 py-3 flex-row items-center justify-between">
        <Pressable
          onPress={handlePrev}
          className="w-8 h-8 rounded-full bg-[#1F1F1F] items-center justify-center active:opacity-70 border border-[#2A2A2A]"
        >
          <CaretLeft size={16} color="#FFFFFF" weight="bold" />
        </Pressable>

        <Text className="text-white text-sm font-semibold tracking-wide text-center flex-1 mx-2">
          {label}
        </Text>

        <Pressable
          onPress={handleNext}
          disabled={offset >= 0}
          className={`w-8 h-8 rounded-full bg-[#1F1F1F] items-center justify-center border border-[#2A2A2A] active:opacity-70 ${offset >= 0 ? 'opacity-30' : 'opacity-100'}`}
        >
          <CaretRight size={16} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}
