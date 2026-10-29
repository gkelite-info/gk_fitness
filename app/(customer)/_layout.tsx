import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';
import { PedometerProvider } from '@/hooks/fitness/usePedometer';
import { useUser } from '@/context/UserContext';
import { getSelectedGym, verifyUserGymMembership, clearSelectedGym } from '@/helpers/tenantHelper';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export default function CustomerLayout() {
  const { userId, email, role, gymId: userGymId, loading: userLoading } = useUser();
  const router = useRouter();
  const [tenantValidating, setTenantValidating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkTenantBoundary() {
      if (userLoading) return;

      if (!userId || (role && role !== 'customer')) {
        if (isMounted) setTenantValidating(false);
        return;
      }

      try {
        const selectedGym = await getSelectedGym();
        if (selectedGym?.gymId && userId) {
          const authResult = await verifyUserGymMembership(userId, email, selectedGym.gymId);
          if (!authResult.isAuthorized) {
            console.warn(`[CustomerLayout] Mismatch detected: user ${email} is not authorized for gym ${selectedGym.gymId}`);
            await supabase.auth.signOut();
            await clearSelectedGym();
            toast.error('This account belongs to another gym. Please select your registered gym to sign in.');
            router.replace('/auth/account-type');
            return;
          }
        }
      } catch (err) {
        console.error('[CustomerLayout] Tenant validation error:', err);
      } finally {
        if (isMounted) {
          setTenantValidating(false);
        }
      }
    }

    checkTenantBoundary();

    return () => {
      isMounted = false;
    };
  }, [userId, email, role, userGymId, userLoading, router]);

  if (userLoading || tenantValidating) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  return (
    <PedometerProvider>
      <Tabs
        initialRouteName="home"
        backBehavior="initialRoute"
        tabBar={(props) => <CustomTabBar {...props} centerRouteName="home" />}
        screenOptions={{
          header: () => <Navbar />,
        }}>
        <Tabs.Screen
          name="workout"
          options={{
            title: 'Workout',
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
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
          name="edit-profile"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="goals-preferences"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="my-trainer"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="workoutPlan"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="weeklyWorkoutPlan"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="workout-countdown"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="workout-session"
          options={{
            href: null,
            headerShown: true,
          }}
        />
        <Tabs.Screen
          name="exercise-detail"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="(onboarding)"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="privacy-policy"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="help-support"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="streak-details"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="explore-gyms"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="delete-account"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="manage-account"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="change-password"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="memberships"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="trainer"
          options={{
            href: null,
            headerShown: true,
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </PedometerProvider>
  );
}