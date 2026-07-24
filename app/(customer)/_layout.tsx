import { Tabs } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function CustomerLayout() {
  return (
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
        }}
      />
    </Tabs>
  );
}
