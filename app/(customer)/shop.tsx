import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tote } from 'phosphor-react-native';

export default function ShopComingSoonScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#09090B] items-center justify-center px-5">
      <View className="w-24 h-24 rounded-full bg-[#2D144A] items-center justify-center mb-6 border-4 border-[#170A24]">
        <Tote size={48} color="#A855F7" weight="duotone" />
      </View>
      <Text className="text-white text-3xl font-bold mb-3 tracking-tight text-center">GK Shop</Text>
      <Text className="text-[#8E8E93] text-center text-base leading-6 px-4">
        We're working hard to bring you the best supplements, gear, and essentials. Stay tuned!
      </Text>
      
      <View className="mt-8 bg-[#A855F7]/10 px-4 py-2 rounded-full border border-[#A855F7]/30">
        <Text className="text-[#A855F7] font-bold text-[13px] uppercase tracking-widest">Coming Soon</Text>
      </View>
    </View>
  );
}
