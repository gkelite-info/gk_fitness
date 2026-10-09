import { Stack } from 'expo-router';

export default function MembershipsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="details" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="review" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
