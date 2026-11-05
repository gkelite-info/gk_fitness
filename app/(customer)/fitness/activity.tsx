import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppleActivityDashboard } from '@/components/fitness/AppleActivityDashboard';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top }}>
      {/* Dark background matching Apple Activity style */}
      <StatusBar style="light" />
      <AppleActivityDashboard showBack={true} />
    </View>
  );
}
