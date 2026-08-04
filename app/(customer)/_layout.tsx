import { Tabs } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';
import { PedometerProvider } from '@/hooks/usePedometer';

export default function CustomerLayout() {
  return (
    <PedometerProvider>
      <Tabs
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
        name="community"
        options={{
          title: 'Community',
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
        name="book-trainer"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="trainer/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="trainer-request"
        options={{
          href: null,
          headerShown: false,
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
        name="fitness/steps"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="fitness/calories"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="fitness/water"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      </Tabs>
    </PedometerProvider>
  );
}
