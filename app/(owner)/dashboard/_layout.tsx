import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="add-customer" options={{ animation: 'none' }} />
      <Stack.Screen name="add-trainer" options={{ animation: 'none' }} />
    </Stack>
  );
}
