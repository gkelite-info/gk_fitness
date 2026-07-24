import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useUser } from '@/context/UserContext';

export default function Index() {
  const { role, loading } = useUser();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  if (role) {
    console.log('[Index] Active user session found via context. Role:', role);
    if (role === 'superadmin') {
      return <Redirect href="/(superadmin)/dashboard" />;
    } else if (role === 'admin') {
      return <Redirect href="/(admin)/dashboard" />;
    } else if (role === 'doctor') {
      return <Redirect href="/(doctor)/patients" />;
    } else {
      return <Redirect href="/(customer)/home" />;
    }
  }

  return <Redirect href="/auth/otp-auth" />;
}
