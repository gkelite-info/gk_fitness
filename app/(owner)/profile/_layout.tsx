import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="member-app-access/index" />
      <Stack.Screen name="member-app-access/custom-days" />
      <Stack.Screen name="gym-access/index" />
      <Stack.Screen name="gym-access/settings" />
      <Stack.Screen name="gym-access/check-in-rules" />
    </Stack>
  );
}
