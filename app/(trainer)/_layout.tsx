import { Tabs } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TrainerLayout() {
  return (
    <Tabs
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
          headerShown: false,
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
        name="nutrition/swap-meal"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="nutrition/meal-detail"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="nutrition/generating-plan"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="nutrition/food-preferences"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="nutrition/my-nutrition-plan"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="nutrition/nutrition-preferences"
        options={{
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="nutrition/alternative-meal-detail"
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
    </Tabs>
  );
}
