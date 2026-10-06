import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  GearSix, 
  Trash, 
  Checks, 
  Heart, 
  ChatCircle, 
  UserPlus, 
  Megaphone, 
  Bell, 
  Sparkle,
  Drop,
  Barbell
} from 'phosphor-react-native';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { useUser } from '@/context/UserContext';
import { formatDistanceToNow } from 'date-fns';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

type FilterType = 'all' | 'community' | 'gym';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const { data: notifications = [], isLoading, markRead, markAllRead, deleteRead } = useNotifications(userId ?? undefined);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredNotifications = useMemo(() => {
    if (filter === 'community') {
      return notifications.filter(n => n.category === 'COMMUNITY');
    }
    if (filter === 'gym') {
      return notifications.filter(n => n.category !== 'COMMUNITY');
    }
    return notifications;
  }, [notifications, filter]);

  const clearRead = () => {
    deleteRead.mutate();
  };

  const handleNotificationPress = (item: any) => {
    if (!item.is_read) {
      markRead.mutate(item.id);
    }
    if (item.data?.route) {
      router.push(item.data.route as any);
    }
  };

  const renderBadgeIcon = (item: any) => {
    if (item.category === 'COMMUNITY') {
      const type = item.data?.type;
      if (type === 'like') {
        return (
          <View className="absolute -bottom-1 -right-1 bg-[#EF4444] rounded-full p-1 border border-[#1A1A1A]">
            <Heart size={10} color="#FFFFFF" weight="fill" />
          </View>
        );
      }
      if (type === 'comment' || type === 'reply') {
        return (
          <View className="absolute -bottom-1 -right-1 bg-[#0284C7] rounded-full p-1 border border-[#1A1A1A]">
            <ChatCircle size={10} color="#FFFFFF" weight="fill" />
          </View>
        );
      }
      if (type === 'follow') {
        return (
          <View className="absolute -bottom-1 -right-1 bg-[#D4FF00] rounded-full p-1 border border-[#1A1A1A]">
            <UserPlus size={10} color="#000000" weight="fill" />
          </View>
        );
      }
    }

    if (item.category === 'GYM_ANNOUNCEMENT') {
      return (
        <View className="w-10 h-10 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/40 items-center justify-center">
          <Megaphone size={20} color="#60A5FA" weight="fill" />
        </View>
      );
    }

    if (item.category === 'WATER') {
      return (
        <View className="w-10 h-10 rounded-full bg-[#06B6D4]/20 border border-[#06B6D4]/40 items-center justify-center">
          <Drop size={20} color="#22D3EE" weight="fill" />
        </View>
      );
    }

    if (item.category === 'WORKOUT') {
      return (
        <View className="w-10 h-10 rounded-full bg-[#D4FF00]/20 border border-[#D4FF00]/40 items-center justify-center">
          <Barbell size={20} color="#D4FF00" weight="fill" />
        </View>
      );
    }

    return (
      <View className="w-10 h-10 rounded-full bg-[#27272A] items-center justify-center">
        <Bell size={20} color="#A1A1AA" weight="fill" />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Activity</Text>
        <Pressable 
          onPress={() => router.push('/(customer)/notifications/preferences' as any)} 
          className="w-10 h-10 items-end justify-center"
        >
          <GearSix size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-4 py-3 gap-x-2 border-b border-white/5">
        {(['all', 'community', 'gym'] as FilterType[]).map((tab) => {
          const isActive = filter === tab;
          const label = tab === 'all' ? 'All' : tab === 'community' ? 'Community' : 'Gym & Health';
          return (
            <Pressable
              key={tab}
              onPress={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full ${isActive ? 'bg-[#D4FF00]' : 'bg-[#1C1C1E]'}`}
            >
              <Text className={`text-xs font-bold ${isActive ? 'text-black' : 'text-gray-400'}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mt-3 mb-4">
          <Text className="text-white text-base font-bold">
            {filter === 'all' ? 'All Activity' : filter === 'community' ? 'Community Interactions' : 'Gym Notifications'}
          </Text>
          {notifications.some(n => !n.is_read) && (
            <Pressable onPress={() => markAllRead.mutate()} className="flex-row items-center">
              <Checks size={15} color="#D4FF00" />
              <Text className="text-[#D4FF00] text-xs font-semibold ml-1">Mark all read</Text>
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#D4FF00" className="mt-10" />
        ) : filteredNotifications.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <View className="w-16 h-16 rounded-full bg-[#1C1C1E] items-center justify-center mb-4">
              <Sparkle size={32} color="#555555" />
            </View>
            <Text className="text-white font-bold text-base mb-1">No Activity Yet</Text>
            <Text className="text-[#8E8E93] text-sm text-center px-8">
              When people like your posts, comment, or follow you, you'll see it here.
            </Text>
          </View>
        ) : (
          filteredNotifications.map((item) => {
            const isCommunity = item.category === 'COMMUNITY';
            const actorPhoto = item.data?.actorPhoto;
            const actorName = item.data?.actorHandle || item.data?.actorName || 'Someone';
            const postImage = item.data?.postImage;
            const isFollow = item.data?.type === 'follow';

            return (
              <Pressable 
                key={item.id} 
                className={`flex-row items-center p-3.5 mb-2.5 rounded-2xl border transition-all ${
                  item.is_read 
                    ? 'bg-[#141414] border-white/5' 
                    : 'bg-[#1C1C1E] border-[#D4FF00]/30 shadow-sm'
                }`}
                onPress={() => handleNotificationPress(item)}
              >
                {/* Avatar with Badge */}
                <View className="relative mr-3.5">
                  {isCommunity ? (
                    <>
                      <StaticAvatar 
                        uri={actorPhoto} 
                        name={actorName}
                        size={44}
                        className="w-11 h-11 rounded-full" 
                      />
                      {renderBadgeIcon(item)}
                    </>
                  ) : (
                    renderBadgeIcon(item)
                  )}
                </View>

                {/* Content */}
                <View className="flex-1 justify-center">
                  <Text className="text-white text-sm leading-5">
                    {isCommunity ? (
                      <>
                        <Text className="font-bold text-white">{actorName} </Text>
                        <Text className="text-[#D1D5DB]">{item.body.replace(actorName, '').trim()}</Text>
                      </>
                    ) : (
                      <>
                        <Text className="font-bold text-white">{item.title}: </Text>
                        <Text className="text-[#D1D5DB]">{item.body}</Text>
                      </>
                    )}
                  </Text>
                  <Text className="text-[#71717A] text-[11px] mt-1 font-medium">
                    {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ''}
                  </Text>
                </View>

                {/* Right Side Accessory */}
                {postImage ? (
                  <Image 
                    source={{ uri: postImage }} 
                    className="w-11 h-11 rounded-lg ml-2 bg-[#27272A]" 
                    resizeMode="cover" 
                  />
                ) : isFollow ? (
                  <Pressable 
                    onPress={() => handleNotificationPress(item)}
                    className="bg-[#27272A] border border-white/10 px-3 py-1.5 rounded-full ml-2 active:opacity-70"
                  >
                    <Text className="text-[#D4FF00] text-xs font-bold">Profile</Text>
                  </Pressable>
                ) : !item.is_read ? (
                  <View className="w-2 h-2 rounded-full bg-[#D4FF00] ml-2" />
                ) : null}
              </Pressable>
            );
          })
        )}

        {filteredNotifications.length > 0 && (
          <Pressable 
            onPress={clearRead}
            className="flex-row items-center justify-center border border-white/10 rounded-xl py-3 mt-4 mb-6 active:opacity-70"
          >
            <Trash size={16} color="#A1A1AA" weight="regular" />
            <Text className="text-[#A1A1AA] font-bold text-sm ml-2">Clear Read</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
