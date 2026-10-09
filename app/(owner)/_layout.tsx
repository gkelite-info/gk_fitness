import { Tabs } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function OwnerLayout() {
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
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trainers"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="payment-details"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="payment-details/add-payment-method"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="payment-details/payment-verification"
        options={{
          href: null,
        }}
      />
      </Tabs>
  );
}
