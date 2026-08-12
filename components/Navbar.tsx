import { View, Pressable, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { BellRingingIcon, UsersThree } from 'phosphor-react-native';
import { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useRealtimeAnnouncements } from '@/hooks/gymAnnouncements/useRealtimeAnnouncements';
import { AnnouncementsModal } from '@/components/AnnouncementsModal';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const topPadding = insets.top;

  const { gymId } = useUser();
  const { announcements, loading, hasNew, clearHasNew } = useRealtimeAnnouncements(gymId);
  const [isModalVisible, setIsModalVisible] = useState(false);

  if (pathname.includes('/profile')) {
    return null;
  }

  return (
    <View
      style={{ paddingTop: topPadding }}
      className="border-b border-border pb-3 bg-[#0D0D0D]">
      <RNStatusBar barStyle="dark-content" backgroundColor="white" translucent={false} />
      <View className="flex-row items-center justify-between px-4 pt-3">
        <Pressable 
          className="flex-row items-center gap-3 active:opacity-70"
          onPress={() => {
            if (pathname.includes('community')) {
              router.push('/community/profile');
            } else {
              router.push('/(owner)/profile');
            }
          }}
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon name="person.fill" size={20} color='#C4C9AC' className="text-muted-foreground text-white" />
          </View>
          <Text className="font-semibold text-white">
            Welcome Back
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-5">
          <Pressable 
            className="opacity-80 active:opacity-50"
            onPress={() => {
              if (pathname.includes('community')) {
                router.push('/(owner)/dashboard');
              } else {
                router.push('/community');
              }
            }}
          >
            <UsersThree size={24} weight="regular" color='#ffffff' />
          </Pressable>
          <Pressable 
            className="opacity-80 active:opacity-50 relative"
            onPress={() => {
              setIsModalVisible(true);
              clearHasNew();
            }}
          >
            <BellRingingIcon size={24} color='#ffffff' />
            {hasNew && (
              <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0D0D0D]" />
            )}
          </Pressable>
        </View>
      </View>
      <AnnouncementsModal 
        visible={isModalVisible} 
        onClose={() => setIsModalVisible(false)} 
        announcements={announcements} 
        isLoading={loading} 
      />
    </View>
  );
}
