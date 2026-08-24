import { Tabs } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function SuperAdminLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} centerRouteName="dashboard" />}
      screenOptions={{
        header: () => <Navbar />,
      }}>
      <Tabs.Screen
        name="gyms/index"
        options={{
          title: 'Gyms',
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

      <Tabs.Screen name="dashboard/gym/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="customers/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="trainers/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="leads/gym-owners" options={{ href: null }} />
    </Tabs>
  );
}
