import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, Info } from 'phosphor-react-native';

export default function MembershipPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#1C1C1E]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#FFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-semibold flex-1 text-center mr-8">Gym Payment</Text>
      </View>

      <View className="flex-1 px-5 justify-center items-center">
        <View className="w-16 h-16 rounded-full bg-[#CCFF00]/10 items-center justify-center mb-4">
          <Info size={32} color="#CCFF00" weight="fill" />
        </View>
        <Text className="text-white text-xl font-semibold text-center mb-2">Offline Physical Gym Payment</Text>
        <Text className="text-[#9CA3AF] text-sm text-center leading-5 mb-6 px-4">
          GK Fitness physical gym memberships are purchased and renewed directly at your gym reception desk. Online payment gateway is not available in-app.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-[#CCFF00] rounded-2xl px-8 py-3.5 items-center justify-center active:opacity-80"
        >
          <Text className="text-black text-sm font-semibold">Return to App</Text>
        </Pressable>
      </View>
    </View>
  );
}
