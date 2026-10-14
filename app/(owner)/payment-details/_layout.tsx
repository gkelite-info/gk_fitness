import { Stack } from 'expo-router';

export default function PaymentDetailsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-payment-method" />
      <Stack.Screen name="payment-verification" />
      <Stack.Screen name="[paymentId]" />
    </Stack>
  );
}
