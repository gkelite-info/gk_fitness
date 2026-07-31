import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { WifiSlash } from 'phosphor-react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export function OfflineIndicator() {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();
  
  // Show indicator if we have explicitly confirmed offline status
  if (netInfo.isConnected === true || netInfo.isConnected === null) {
    return null;
  }

  return (
    <View className="absolute top-0 left-0 right-0 z-50 items-center pointer-events-none" style={{ paddingTop: Math.max(insets.top, 12) }}>
      <Animated.View 
        entering={FadeIn}
        exiting={FadeOut}
        className="bg-[#E53935] flex-row items-center justify-center px-3 py-1.5 rounded-full shadow-md"
      >
        <WifiSlash size={12} color="white" weight="bold" />
        <Text className="text-white font-semibold ml-1.5 text-[10px] tracking-wider uppercase">
          Offline Mode
        </Text>
      </Animated.View>
    </View>
  );
}
