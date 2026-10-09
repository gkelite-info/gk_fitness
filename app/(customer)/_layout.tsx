import { Tabs } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';
import { PedometerProvider } from '@/hooks/fitness/usePedometer';

export default function CustomerLayout() {
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
          name="nutrition"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </PedometerProvider>
  );
}