import { Stack } from 'expo-router';
import { Navbar } from '@/components/Navbar';

export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, header: () => <Navbar /> }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="comments" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="blocklist" />
    </Stack>
  );
}
