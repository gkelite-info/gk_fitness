import React, { useState, useMemo } from 'react';
import { View, Pressable, ActivityIndicator, Dimensions, Image, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, GridFour, VideoCamera } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCommunityFeed } from '@/hooks/community/useCommunityFeed';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { FlashList } from '@shopify/flash-list';
import { useCommunityProfile, useIsFollowing, useFollowUser, useUnfollowUser } from '@/hooks/community/useProfile';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { ProfileShimmer } from '@/components/shimmers/CommunityShimmers';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = width / 3;

export default function UserProfileScreen() {
  const { userId: routeUserId } = useLocalSearchParams();
  const targetUserId = Array.isArray(routeUserId) ? routeUserId[0] : routeUserId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, userId: currentUserId } = useUser();
  const isMyProfile = targetUserId === currentUserId;

  const [activeTab, setActiveTab] = useState<'Grid' | 'Reels'>('Grid');
  const [isUnfollowModalVisible, setIsUnfollowModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: profileData, isLoading: loadingProfile, refetch: refetchProfile } = useCommunityProfile(targetUserId);
  const { data: isFollowing, refetch: refetchFollowing } = useIsFollowing(currentUserId ?? '', targetUserId);
  
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const { data, isLoading: loadingFeed, refetch: refetchFeed } = useCommunityFeed(gymId ?? null, currentUserId ?? null);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchFollowing(),
      refetchFeed()
    ]);
    setRefreshing(false);
  };

  // Filter posts to only show those authored by the target user
  const userPosts = useMemo(() => {
    const allPosts = data?.pages.flatMap(page => page) || [];
    return allPosts.filter(post => post.createdBy === targetUserId);
  }, [data, targetUserId]);

  if (loadingProfile && !profileData) {
    return <ProfileShimmer />;
  }

  if (!profileData) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <Text className="text-white text-lg">User not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 p-2 bg-white/10 rounded">
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (profileData.gymCommunityProfileId.startsWith('fallback-')) {
    if (isMyProfile) {
      return (
        <View className="flex-1 bg-[#0A0A0A] items-center justify-center px-6">
          <Text className="text-white text-xl font-bold mb-2 text-center">Join the Community</Text>
          <Text className="text-white/60 text-center mb-6">Set up your username and profile to start interacting with the gym community.</Text>
          <Pressable 
            onPress={() => router.push('/community/edit-profile' as any)} 
            className="bg-blue-600 px-6 py-3 rounded-lg active:opacity-80"
          >
            <Text className="text-white font-bold text-base">Set Username</Text>
          </Pressable>
        </View>
      );
    } else {
      return (
        <View className="flex-1 bg-[#0A0A0A]">
          <View className="flex-row items-center px-4 pb-2 border-b border-[#1C1C1E]" style={{ paddingTop: insets.top || 16 }}>
            <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
              <CaretLeft size={24} color="#FFFFFF" />
            </Pressable>
            <Text className="text-lg font-bold text-white">{profileData.users?.name || 'User'}</Text>
          </View>
          <View className="flex-1 items-center justify-center px-6 pb-20">
            <StaticAvatar uri={profileData.users?.profilePhoto} name={profileData.users?.name || 'User'} size={86} className="w-[86px] h-[86px] rounded-full border border-[#333] mb-4" />
            <Text className="text-white text-lg font-bold text-center mb-2">{profileData.users?.name || 'User'}</Text>
            <Text className="text-white/50 text-center">This user hasn't set up their community profile yet.</Text>
          </View>
        </View>
      );
    }
  }

  const handleFollowToggle = () => {
    if (!currentUserId) return;
    
    if (isFollowing) {
      setIsUnfollowModalVisible(true);
    } else {
      followMutation.mutate({ followerId: currentUserId, followingId: targetUserId });
    }
  };

  const renderHeader = () => (
    <View className="bg-[#0A0A0A]">
      {/* Top Nav */}
      <View className="flex-row items-center justify-between px-4 pb-2" style={{ paddingTop: insets.top || 16 }}>
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center active:opacity-70">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-bold text-white tracking-wide">@{profileData.username}</Text>
        <View className="w-10" />
      </View>

      {/* Profile Info Section (Instagram Style) */}
      <View className="px-5 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <StaticAvatar 
            uri={profileData.users?.profilePhoto} 
            name={profileData.users?.name || profileData.username} 
            size={86} 
            className="w-[86px] h-[86px] rounded-full border border-[#333]" 
          />
          <View className="flex-1 flex-row justify-around ml-4">
            <View className="items-center">
              <Text className="text-white font-bold text-lg">{profileData.postsCount}</Text>
              <Text className="text-white/60 text-xs mt-0.5">Posts</Text>
            </View>
            <Pressable onPress={() => router.push(`/community/followers?userId=${targetUserId}&tab=followers` as any)} className="items-center">
              <Text className="text-white font-bold text-lg">{profileData.followersCount}</Text>
              <Text className="text-white/60 text-xs mt-0.5">Followers</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/community/followers?userId=${targetUserId}&tab=following` as any)} className="items-center">
              <Text className="text-white font-bold text-lg">{profileData.followingCount}</Text>
              <Text className="text-white/60 text-xs mt-0.5">Following</Text>
            </Pressable>
          </View>
        </View>

        <Text className="text-white font-semibold text-[15px] mt-4">{profileData.users?.name}</Text>
        {profileData.bio ? (
          <Text className="text-white/80 text-[14px] mt-1">{profileData.bio}</Text>
        ) : null}
        {profileData.website ? (
          <Text className="text-blue-400 text-[14px] mt-1">{profileData.website}</Text>
        ) : null}
        
        {/* Actions */}
        <View className="flex-row items-center gap-2 mt-5">
          {isMyProfile ? (
            <Pressable 
              onPress={() => router.push('/community/edit-profile' as any)} 
              className="flex-1 bg-[#1C1C1E] rounded-lg py-2 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">Edit Profile</Text>
            </Pressable>
          ) : (
            <>
              <Pressable 
                onPress={handleFollowToggle}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className={`flex-1 rounded-lg py-1.5 items-center justify-center active:opacity-80 ${isFollowing ? 'bg-[#262626]' : 'bg-[#0095F6]'}`}
              >
                <Text className={`font-semibold text-sm text-white`}>{isFollowing ? 'Following' : 'Follow'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Grid Tabs */}
      <View className="flex-row border-t border-[#1C1C1E]">
        <Pressable 
          onPress={() => setActiveTab('Grid')}
          className={`flex-1 py-3 items-center justify-center border-b-2 ${activeTab === 'Grid' ? 'border-white' : 'border-transparent'}`}
        >
          <GridFour size={24} color={activeTab === 'Grid' ? '#FFFFFF' : '#666'} weight={activeTab === 'Grid' ? 'fill' : 'regular'} />
        </Pressable>
        <Pressable 
          onPress={() => setActiveTab('Reels')}
          className={`flex-1 py-3 items-center justify-center border-b-2 ${activeTab === 'Reels' ? 'border-white' : 'border-transparent'}`}
        >
          <VideoCamera size={26} color={activeTab === 'Reels' ? '#FFFFFF' : '#666'} weight={activeTab === 'Reels' ? 'fill' : 'regular'} />
        </Pressable>
      </View>
    </View>
  );

  const renderPostThumbnail = ({ item }: { item: any }) => {
    return (
      <Pressable 
        onPress={() => router.push(`/community/post/${item.gymCommunityPostId}`)}
        className="border border-[#0A0A0A]"
        style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
      >
        {item.imagePath ? (
          <Image 
            source={{ uri: item.imagePath }} 
            className="w-full h-full"
            resizeMode="cover" 
          />
        ) : (
          <View className="w-full h-full bg-[#1C1C1E] p-2 justify-center">
            <Text className="text-white/80 text-xs" numberOfLines={4}>
              {item.caption}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {loadingFeed && userPosts.length === 0 ? (
        <View className="flex-1">
          {renderHeader()}
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" color="#666" />
          </View>
        </View>
      ) : (
        <FlashList
          data={userPosts}
          renderItem={renderPostThumbnail}
          keyExtractor={(item) => item.gymCommunityPostId}
          numColumns={3}
          // @ts-ignore
          estimatedItemSize={THUMBNAIL_SIZE}
          ListHeaderComponent={renderHeader()}
          showsVerticalScrollIndicator={false}
          refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="py-20 items-center justify-center">
              <Text className="text-white/50 text-lg">No posts yet.</Text>
            </View>
          }
        />
      )}

      {/* Unfollow Confirmation Modal */}
      <Modal
        visible={isUnfollowModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsUnfollowModalVisible(false)}
      >
        <Pressable 
          className="flex-1 bg-black/70 justify-center items-center" 
          onPress={() => setIsUnfollowModalVisible(false)}
        >
          <View className="bg-[#1C1C1E] w-[80%] max-w-[320px] rounded-2xl overflow-hidden" onStartShouldSetResponder={() => true}>
            <View className="items-center p-6 border-b border-[#2C2C2E]">
              <StaticAvatar uri={profileData.users?.profilePhoto} name={profileData.users?.name || profileData.username} size={72} className="w-[72px] h-[72px] rounded-full mb-4" />
              <Text className="text-white text-base text-center">
                Unfollow @{profileData.username}?
              </Text>
            </View>
            <Pressable 
              className="py-4 border-b border-[#2C2C2E] items-center active:bg-[#2C2C2E]"
              onPress={() => {
                if (currentUserId) {
                  unfollowMutation.mutate({ followerId: currentUserId, followingId: targetUserId });
                }
                setIsUnfollowModalVisible(false);
              }}
            >
              <Text className="text-[#FF3B30] font-bold text-base">Unfollow</Text>
            </Pressable>
            <Pressable 
              className="py-4 items-center active:bg-[#2C2C2E]"
              onPress={() => setIsUnfollowModalVisible(false)}
            >
              <Text className="text-white text-base">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
