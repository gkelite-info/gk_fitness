import { Stack } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { SharedTabBar } from '@/components/SharedTabBar';
import { View } from 'react-native';

export default function CommunityLayout() {
  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: true, header: () => <Navbar /> }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="create-story" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="story-viewer" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="comments" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="post" options={{ headerShown: false }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="blocklist" />
      </Stack>
      <SharedTabBar />
    </View>
  );
}
