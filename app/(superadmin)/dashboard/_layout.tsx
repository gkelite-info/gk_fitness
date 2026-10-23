import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="globalTrainers/index" />
      <Stack.Screen name="globalTrainers/register" />
    </Stack>
  );
}
