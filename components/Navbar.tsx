import { View, Pressable, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { useState } from 'react';
import { useRealtimeAnnouncements } from '@/hooks/gymAnnouncements/useRealtimeAnnouncements';
import { AnnouncementsModal } from '@/components/AnnouncementsModal';
import { BellRingingIcon, UsersThree, CaretLeft } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { Image } from 'react-native';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { name, userId, role, profilePhoto, gymId } = useUser();
  const topPadding = insets.top;

  const { announcements, loading, hasNew, clearHasNew } = useRealtimeAnnouncements(gymId);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Hide navbar on dynamic profile pages (e.g. /community/profile/abc123) but NOT on /community/profile (saved posts)
  const isProfilePage = pathname === '/community/profile' ? false : pathname.includes('/profile');
  if (isProfilePage) {
    return null;
  }

  return (
    <View
      style={{ paddingTop: topPadding }}
      className="border-b border-border pb-3 bg-[#0D0D0D]">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-4 pt-3">
        <View className="flex-row items-center">
          {pathname === '/community' && router.canGoBack() && (
            <Pressable
              onPress={() => router.back()}
              className="mr-3 active:opacity-70"
            >
              <CaretLeft size={24} color="#FFFFFF" />
            </Pressable>
          )}
          <Pressable
            className="flex-row items-center gap-3 active:opacity-70"
            onPress={() => {
              if (pathname.includes('community')) {
                router.push(`/community/profile/${userId}`);
              } else if (role === 'customer') {
                router.push('/(customer)/profile');
              } else if (role === 'trainer') {
                router.push('/(trainer)/profile' as any);
              } else if (role === 'doctor') {
                router.push('/(doctor)/profile');
              } else {
                router.push('/(owner)/profile');
              }
            }}
          >
            <StaticAvatar 
              uri={profilePhoto} 
              name={name || 'User'}
              size={40}
              className="h-10 w-10 rounded-full"
            />
            <Text className="font-semibold text-white">
              {name ? `Welcome, ${name}` : 'Welcome Back'}
            </Text>
          </Pressable>
        </View>

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
            <UsersThree
              size={24}
              weight={pathname.includes('community') ? 'fill' : 'regular'}
              color={pathname.includes('community') ? '#C4EF00' : '#ffffff'}
            />
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
