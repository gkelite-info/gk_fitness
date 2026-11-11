import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';
import { useUser } from '@/context/UserContext';

export default function TrainerLayout() {
  const { role, userId, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase().replace(/[\s_-]/g, '') : '';
      const isTrainerRole = normalizedRole === 'trainer' || normalizedRole === 'gymtrainer' || normalizedRole === 'globaltrainer';
      if (!userId || !isTrainerRole) {
        console.warn(`[TrainerLayout] Unauthorized role '${role}' attempted to access trainer portal, redirecting`);
        if (normalizedRole === 'customer' || normalizedRole === 'individual') {
          router.replace('/(customer)/home');
        } else if (normalizedRole === 'owner') {
          router.replace('/(owner)/dashboard');
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
  const isTrainerRole = normalizedRole === 'trainer' || normalizedRole === 'gymtrainer' || normalizedRole === 'globaltrainer';
  if (!userId || !isTrainerRole) {
    return null;
  }

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} centerRouteName="home" />}
      screenOptions={{
        header: () => <Navbar />,
      }}>
      <Tabs.Screen
        name="customer"
        options={{
          title: 'Customer',
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
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
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="pt-customers"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="session-history"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="new-assignments"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="create-workout-plan"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="workoutPlan"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="weeklyWorkoutPlan"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="create-diet-plan"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="pt-sessions"
        options={{
          href: null,
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
