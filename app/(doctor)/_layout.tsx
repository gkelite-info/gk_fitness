import { Tabs } from 'expo-router';
import { Navbar } from '@/components/Navbar';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function DoctorLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} centerRouteName="patients" />}
      screenOptions={{
        header: () => <Navbar />,
      }}>
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
        }}
      />
      <Tabs.Screen
        name="consultations"
        options={{
          title: 'Consultations',
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
