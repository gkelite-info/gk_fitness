import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { navigateBasedOnRole } from '@/helpers/otpHelper';

export default function AuthLayout() {
  const { role, loading } = useUser();

  useEffect(() => {
    if (!loading && role) {
      navigateBasedOnRole(role);
    }
  }, [role, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  if (role) {
    return null;
  }

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
