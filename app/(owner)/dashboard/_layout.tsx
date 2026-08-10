import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="add-customer" />
      <Stack.Screen name="add-trainer" />
      <Stack.Screen name="manage-inventory" />
      <Stack.Screen name="add-equipment" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="renewals" />
      <Stack.Screen name="announcements/index" />
      <Stack.Screen name="announcements/create" options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack>
  );
}
