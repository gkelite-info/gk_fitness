import { Stack } from 'expo-router';

export default function UserDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="personal-details" />
      <Stack.Screen name="attendance-history" />
      <Stack.Screen name="assigned-trainer" />
      <Stack.Screen name="change-trainer" />
      <Stack.Screen name="membership-payments" />
      <Stack.Screen name="payment-details" />
    </Stack>
  );
}
