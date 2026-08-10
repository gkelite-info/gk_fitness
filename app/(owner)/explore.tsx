import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/nativewindui/Text';

export default function ExploreScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-[#09090B]">
      <Text className="text-white text-xl font-bold">Explore</Text>
      <Text className="text-[#8E8E93] mt-2">Coming soon...</Text>
    </View>
  );
}
