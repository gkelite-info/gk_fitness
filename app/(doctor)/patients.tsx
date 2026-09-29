import React, { useCallback } from 'react';
import { View, BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/components/nativewindui/Text';

export default function Screen() {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="title1">Patients</Text>
    </View>
  );
}
