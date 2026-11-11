import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';
import { useUser } from '@/context/UserContext';

export default function OwnerLayout() {
  const { role, userId, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase().replace(/[\s_-]/g, '') : '';
      if (!userId || normalizedRole !== 'owner') {
        console.warn(`[OwnerLayout] Unauthorized role '${role}' attempted to access owner portal, redirecting`);
        if (normalizedRole === 'customer' || normalizedRole === 'individual') {
          router.replace('/(customer)/home');
        } else if (normalizedRole === 'trainer' || normalizedRole === 'globaltrainer') {
          router.replace('/(trainer)/home');
        } else if (normalizedRole === 'superadmin') {
          router.replace('/(superadmin)/dashboard');
        } else {
          router.replace('/auth/account-type');
        }
      }
    }
  }, [role, userId, loading, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase().replace(/[\s_-]/g, '') : '';
  if (!userId || normalizedRole !== 'owner') {
    return null;
  }

  return (
    <Tabs
      initialRouteName="dashboard"
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} centerRouteName="dashboard" />}
      screenOptions={{
        header: () => <Navbar />,
      }}>
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finance',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true
        }}
      />
      <Tabs.Screen
        name="membership"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="trainers"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="payment-details"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="change-password"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
