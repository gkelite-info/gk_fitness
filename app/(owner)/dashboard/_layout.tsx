import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="add-customer" />
      <Stack.Screen name="add-trainer" />
    </Stack>
  );
}
