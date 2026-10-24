import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="account-type" options={{ headerShown: false }} />
      <Stack.Screen name="otp-auth" options={{ headerShown: false }} />
      <Stack.Screen name="find-organization" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="global-trainer-signup" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="registration-status" options={{ headerShown: false }} />
    </Stack>
  );
}
