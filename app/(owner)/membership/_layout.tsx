import { Stack } from 'expo-router';
import { MembershipProvider } from '@/context/MembershipContext';

export default function MembershipLayout() {
  return (
    <MembershipProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="review" />
      </Stack>
    </MembershipProvider>
  );
}
