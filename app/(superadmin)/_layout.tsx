import { Tabs } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function SuperAdminLayout() {
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
      </Tabs>
  );
}
