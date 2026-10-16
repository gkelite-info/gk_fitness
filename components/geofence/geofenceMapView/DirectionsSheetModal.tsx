import React from 'react';
import { View, Modal, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  X,
  NavigationArrow,
  MapPin,
  ArrowSquareOut,
} from 'phosphor-react-native';
import { GymMapTarget, POINTER_COLOR } from './types';

interface DirectionsSheetModalProps {
  visible: boolean;
  insetsBottom: number;
  activeGym: GymMapTarget;
  isCalculatingRoute: boolean;
  onClose: () => void;
  onStartInAppNavigation: () => void;
  onOpenDefaultExternalMaps: () => void;
}

export function DirectionsSheetModal({
  visible,
  insetsBottom,
  activeGym,
  isCalculatingRoute,
  onClose,
  onStartInAppNavigation,
  onOpenDefaultExternalMaps,
}: DirectionsSheetModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/80 justify-end"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ paddingBottom: Math.max(insetsBottom, 24), backgroundColor: '#121316' }}
          className="border-t border-[#222328] rounded-t-3xl px-5 pt-5"
        >
          <View className="w-10 h-1 bg-[#2B2D33] rounded-full self-center mb-4" />

          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-white text-base font-semibold">Directions to Gym</Text>
              <Text className="text-[#8E929A] text-xs">
                Choose In-App route or open in your device's installed apps
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#1A1C20] items-center justify-center"
            >
              <X size={15} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="bg-[#18191E] border border-[#0075DC]/40 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl bg-[#0075DC]/20 items-center justify-center">
                  <NavigationArrow size={16} color={POINTER_COLOR} weight="fill" />
                </View>
                <View>
                  <Text className="text-white text-sm font-semibold">In-App Live Navigation</Text>
                  <Text className="text-[#0075DC] text-[10px] font-semibold">
                    Shortest Path Route
                  </Text>
                </View>
              </View>
              <View className="bg-[#CCFF00]/15 border border-[#CCFF00] px-2 py-0.5 rounded-full">
                <Text className="text-[#CCFF00] text-[10px] font-semibold">RECOMMENDED</Text>
              </View>
            </View>

            <Text className="text-[#8E929A] text-[11px] mb-3">
              Calculates the shortest optimal route directly to {activeGym.gymName} with live guidance on this map.
            </Text>

            <Pressable
              onPress={onStartInAppNavigation}
              disabled={isCalculatingRoute}
              className="bg-[#CCFF00] py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:opacity-85"
            >
              {isCalculatingRoute ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <NavigationArrow size={16} color="#000000" weight="fill" />
                  <Text className="text-black text-xs font-semibold">
                    Start In-App Route
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View className="bg-[#18191E] border border-[#2B2D33] rounded-2xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-8 h-8 rounded-xl bg-[#2B2D33] items-center justify-center">
                <MapPin size={16} color="#CCFF00" weight="fill" />
              </View>
              <View>
                <Text className="text-white text-sm font-semibold">External Maps</Text>
                <Text className="text-[#8E929A] text-[10px]">
                  Choose from your phone's installed map apps
                </Text>
              </View>
            </View>

            <Text className="text-[#8E929A] text-[11px] mb-3">
              Opens your device's native app chooser to pick Google Maps, Apple Maps, Uber, or any other installed navigation app.
            </Text>

            <Pressable
              onPress={onOpenDefaultExternalMaps}
              className="bg-[#1A1C20] border border-[#2B2D33] py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:opacity-75"
            >
              <ArrowSquareOut size={16} color="#FFFFFF" weight="bold" />
              <Text className="text-white text-xs font-semibold">
                Open in Installed Maps App
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
