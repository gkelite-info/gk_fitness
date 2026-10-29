import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';
import { useUser } from '@/context/UserContext';

export default function SuperAdminLayout() {
  const { role, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const normalizedRole = (role || '').trim().toLowerCase().replace(/[\s_-]/g, '');
      if (normalizedRole !== 'superadmin') {
        router.replace('/auth/account-type');
      }
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  const normalizedRole = (role || '').trim().toLowerCase().replace(/[\s_-]/g, '');
  if (normalizedRole !== 'superadmin') {
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
        name="gyms"
        options={{
          title: 'Gyms',
          href: '/(superadmin)/gyms',
        }}
      />
      <Tabs.Screen
        name="owners"
        options={{
          title: 'Owners',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          href: null,
          tabBarItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
