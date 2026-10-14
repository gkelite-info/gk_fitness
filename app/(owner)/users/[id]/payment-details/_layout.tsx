import { Stack } from 'expo-router';

export default function UserPaymentDetailsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[paymentId]" />
    </Stack>
  );
}
