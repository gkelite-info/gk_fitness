import React from 'react';
import { View, TouchableOpacity, TouchableWithoutFeedback, Dimensions, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import {
  House, User, Headphones, Barbell, ChartLineUp, Users, Calendar, ChatCircle, Gear, Buildings, ClipboardText, CurrencyDollar, Binoculars
} from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function SharedTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { role } = useUser();
  const bottomInset = insets.bottom || 0;

  // Don't show on full screen modals or screens with bottom inputs
  if (
    pathname.includes('story-viewer') || 
    pathname.includes('create-story') || 
    pathname.includes('/post/') || 
    pathname.includes('/comments')
  ) {
    return null;
  }

  let tabs: any[] = [];
  if (role === 'customer') {
    tabs = [
      { name: 'workout', label: 'Workout', icon: Barbell, path: '/(customer)/workout' },
      { name: 'progress', label: 'Progress', icon: ChartLineUp, path: '/(customer)/progress' },
      { name: 'home', label: 'Home', icon: House, path: '/(customer)/home', isCenter: true },
      { name: 'explore', label: 'Explore', icon: Binoculars, path: '/(customer)/explore' },
      { name: 'profile', label: 'Profile', icon: User, path: '/(customer)/profile' }
    ];
  } else if (role === 'owner') {
    tabs = [
      { name: 'users', label: 'Users', icon: Users, path: '/(owner)/users' },
      { name: 'finance', label: 'Finance', icon: CurrencyDollar, path: '/(owner)/finance' },
      { name: 'dashboard', label: 'Dashboard', icon: House, path: '/(owner)/dashboard', isCenter: true },
      { name: 'explore', label: 'Explore', icon: Binoculars, path: '/(owner)/explore' },
      { name: 'profile', label: 'Profile', icon: User, path: '/(owner)/profile' }
    ];
  } else if (role === 'doctor') {
    tabs = [
      { name: 'patients', label: 'Patients', icon: ClipboardText, path: '/(doctor)/patients' },
      { name: 'messages', label: 'Messages', icon: ChatCircle, path: '/(doctor)/messages' },
      { name: 'dashboard', label: 'Dashboard', icon: House, path: '/(doctor)/dashboard', isCenter: true },
      { name: 'explore', label: 'Explore', icon: Binoculars, path: '/(doctor)/explore' },
      { name: 'profile', label: 'Profile', icon: User, path: '/(doctor)/profile' }
    ];
  } else if (role === 'superadmin') {
    tabs = [
      { name: 'gyms', label: 'Gyms', icon: Buildings, path: '/(superadmin)/dashboard' },
      { name: 'finance', label: 'Finance', icon: CurrencyDollar, path: '/(superadmin)/dashboard' },
      { name: 'dashboard', label: 'Dashboard', icon: House, path: '/(superadmin)/dashboard', isCenter: true },
      { name: 'support', label: 'Support', icon: Headphones, path: '/(superadmin)/dashboard' },
      { name: 'profile', label: 'Profile', icon: User, path: '/(superadmin)/dashboard' }
    ];
  } else if (role === 'trainer') {
    tabs = [
      { name: 'clients', label: 'Clients', icon: Users, path: '/(trainer)/clients' },
      { name: 'schedule', label: 'Schedule', icon: Calendar, path: '/(trainer)/schedule' },
      { name: 'dashboard', label: 'Dashboard', icon: House, path: '/(trainer)/dashboard', isCenter: true },
      { name: 'explore', label: 'Explore', icon: Binoculars, path: '/(trainer)/explore' },
      { name: 'profile', label: 'Profile', icon: User, path: '/(trainer)/profile' }
    ];
  } else {
    return null;
  }

  return (
    <View
      className="absolute bottom-0 bg-transparent"
      style={{ width: SCREEN_WIDTH, height: 75 + bottomInset }}
    >
      <View
        className="absolute bottom-0 left-0 right-0 bg-[#121214] border-t border-[#27272A] rounded-t-[20px]"
        style={{ height: 58 + bottomInset }}
      />
      <View
        className="flex-row absolute left-0 right-0 items-center justify-between"
        style={{ height: 58, bottom: bottomInset }}
      >
        {tabs.map((tab, index) => {
          const isFocused = false; // Community is active, none of these are focused

          const onPress = () => {
            router.push(tab.path);
          };

          const activeColor = '#C4EF00';
          const inactiveColor = '#71717A';
          const iconColor = isFocused ? activeColor : inactiveColor;
          const iconSize = 22;

          if (tab.isCenter) {
            return (
              <View key={tab.name} className="flex-1 items-center justify-center">
                <TouchableWithoutFeedback onPress={onPress}>
                  <View
                    className="absolute -top-[60px] w-[65px] h-[65px] rounded-full bg-[#C4EF00] items-center justify-center border-[4px] border-[#09090B]"
                    style={{
                      shadowColor: '#C4EF00',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.45,
                      shadowRadius: 6,
                      elevation: 8,
                    }}
                  >
                    <House size={26} color="#000000" weight="fill" />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            );
          }

          const IconComponent = tab.icon;

          return (
            <View key={tab.name} className="flex-1 items-center justify-center pt-2">
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                className="items-center justify-center h-full w-full"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View className="items-center justify-center h-7 mb-0.5">
                  <IconComponent size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />
                </View>
                <Text
                  className="text-[10px] font-medium tracking-wide mt-0.5"
                  style={{ color: iconColor }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}
