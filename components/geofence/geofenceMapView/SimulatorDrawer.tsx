import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { X } from 'phosphor-react-native';
import { triggerSelectionHaptic } from '@/lib/haptics';

interface SimulatorDrawerProps {
  isSimulated: boolean;
  isNavigating?: boolean;
  onResetSimulation: () => void;
  onSimulatePosition: (position: 'inside' | 'nearby' | 'outside') => void;
  onClose?: () => void;
}

export function SimulatorDrawer({
  isSimulated,
  isNavigating = false,
  onResetSimulation,
  onSimulatePosition,
  onClose,
}: SimulatorDrawerProps) {
  return (
    <View
      style={{
        top: isNavigating ? 168 : 64,
        left: 16,
        right: 68,
      }}
      className="absolute bg-[#141519] border border-[#2B2D33] rounded-2xl p-3.5 z-50 shadow-2xl"
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white text-xs font-semibold uppercase tracking-wider" numberOfLines={1}>
          🧪 Geofence Test Simulator
        </Text>
        <View className="flex-row items-center gap-1.5">
          {isSimulated && (
            <Pressable onPress={onResetSimulation} className="bg-[#2B2D33] px-2 py-0.5 rounded-md">
              <Text className="text-[#CCFF00] text-[10px] font-semibold" numberOfLines={1}>Reset GPS</Text>
            </Pressable>
          )}
          {onClose && (
            <Pressable
              onPress={onClose}
              className="w-5 h-5 rounded-full bg-[#2B2D33] items-center justify-center active:opacity-70"
            >
              <X size={12} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>
      <Text className="text-[#8E929A] text-[11px] mb-2.5">
        Simulate your position to test enter/exit algorithm triggers:
      </Text>
      <View className="flex-row gap-1.5">
        <Pressable
          onPress={() => {
            triggerSelectionHaptic();
            onSimulatePosition('inside');
          }}
          className="flex-1 bg-[#1E2D12] border border-[#CCFF00] py-2 px-1 rounded-xl items-center justify-center active:opacity-70"
        >
          <Text className="text-[#CCFF00] text-[11px] font-semibold" numberOfLines={1} adjustsFontSizeToFit>Inside (25m)</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerSelectionHaptic();
            onSimulatePosition('nearby');
          }}
          className="flex-1 bg-[#2D2A12] border border-amber-400 py-2 px-1 rounded-xl items-center justify-center active:opacity-70"
        >
          <Text className="text-amber-400 text-[11px] font-semibold" numberOfLines={1} adjustsFontSizeToFit>Near (180m)</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerSelectionHaptic();
            onSimulatePosition('outside');
          }}
          className="flex-1 bg-[#2D1616] border border-red-500 py-2 px-1 rounded-xl items-center justify-center active:opacity-70"
        >
          <Text className="text-red-400 text-[11px] font-semibold" numberOfLines={1} adjustsFontSizeToFit>Far (650m)</Text>
        </Pressable>
      </View>
    </View>
  );
}
