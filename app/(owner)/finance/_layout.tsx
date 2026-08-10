import { Stack } from 'expo-router';

export default function FinanceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#09090B' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="revenue" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="membership-plan/[id]" />
    </Stack>
  );
}
