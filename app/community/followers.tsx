import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { useFollowersList, useFollowingList, useFollowUser, useUnfollowUser, useIsFollowing } from '@/hooks/community/useProfile';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { FollowersShimmer } from '@/components/shimmers/CommunityShimmers';

export default function FollowersScreen() {
  const { userId: routeUserId, tab } = useLocalSearchParams();
  const targetUserId = Array.isArray(routeUserId) ? routeUserId[0] : routeUserId;
  const initialTab = Array.isArray(tab) ? tab[0] : tab;
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: currentUserId } = useUser();
  
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    initialTab === 'following' ? 'following' : 'followers'
  );
  
  const [refreshing, setRefreshing] = useState(false);

  const { data: followers, isLoading: loadingFollowers, refetch: refetchFollowers } = useFollowersList(targetUserId, currentUserId ?? '');
  const { data: following, isLoading: loadingFollowing, refetch: refetchFollowing } = useFollowingList(targetUserId, currentUserId ?? '');

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'followers') {
      await refetchFollowers();
    } else {
      await refetchFollowing();
    }
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View className="bg-[#0A0A0A] border-b border-[#1C1C1E]">
      {/* Top Nav */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center active:opacity-70">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-bold text-white tracking-wide">
          {activeTab === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View className="w-10" />
      </View>

      {/* Tabs */}
      <View className="flex-row">
        <Pressable 
          onPress={() => setActiveTab('followers')}
          className={`flex-1 py-3 items-center justify-center border-b-2 ${activeTab === 'followers' ? 'border-white' : 'border-transparent'}`}
        >
          <Text className={`font-semibold ${activeTab === 'followers' ? 'text-white' : 'text-white/50'}`}>Followers</Text>
        </Pressable>
        <Pressable 
          onPress={() => setActiveTab('following')}
          className={`flex-1 py-3 items-center justify-center border-b-2 ${activeTab === 'following' ? 'border-white' : 'border-transparent'}`}
        >
          <Text className={`font-semibold ${activeTab === 'following' ? 'text-white' : 'text-white/50'}`}>Following</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    // For followers list, the user we care about is the followerId
    // For following list, the user we care about is the followingId
    const isFollowersTab = activeTab === 'followers';
    const rowUserId = isFollowersTab ? item.followerId : item.followingId;
    const userData = item.users;
    
    // We would normally use the useIsFollowing hook for each row, 
    // but doing so in a list can cause too many hook calls if not careful.
    // For simplicity, we just navigate to their profile where they can follow/unfollow.
    
    return (
      <Pressable 
        onPress={() => router.push(`/community/profile/${rowUserId}`)}
        className="flex-row items-center justify-between px-4 py-3 border-b border-[#1C1C1E]"
      >
        <View className="flex-row items-center flex-1">
          <StaticAvatar 
            uri={userData?.profilePhoto} 
            name={userData?.name || 'User'} 
            size={48} 
            className="w-12 h-12 rounded-full bg-[#1C1C1E]" 
          />
          <View className="ml-3 flex-1">
            <Text className="text-white font-semibold text-base">{userData?.name}</Text>
            {item.gym_community_profiles?.username && (
              <Text className="text-white/60 text-sm mt-0.5">@{item.gym_community_profiles.username}</Text>
            )}
          </View>
        </View>
        <View className="bg-[#1C1C1E] px-4 py-1.5 rounded">
          <Text className="text-white text-sm font-semibold">View</Text>
        </View>
      </Pressable>
    );
  };

  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing;
  const listData = activeTab === 'followers' ? followers : following;

  if (isLoading && !listData) {
    return <FollowersShimmer />;
  }

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {renderHeader()}
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${activeTab}-${index}`}
        contentContainerStyle={{ paddingBottom: insets.bottom || 20 }}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="py-20 items-center justify-center">
              <Text className="text-white/50 text-lg">
                {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
