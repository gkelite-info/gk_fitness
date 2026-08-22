import React, { useState, useMemo, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, Dimensions, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, GridFour, VideoCamera } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCommunityFeed } from '@/hooks/community/useCommunityFeed';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { supabase } from '@/lib/supabase';
import { FlashList } from '@shopify/flash-list';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = width / 3;

export default function UserProfileScreen() {
  const { userId: routeUserId } = useLocalSearchParams();
  const targetUserId = Array.isArray(routeUserId) ? routeUserId[0] : routeUserId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, userId: currentUserId } = useUser();
  const isMyProfile = targetUserId === currentUserId;

  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<'Grid' | 'Reels'>('Grid');

  const { data, isLoading: loadingFeed } = useCommunityFeed(gymId ?? null, currentUserId ?? null);

  useEffect(() => {
    async function loadProfile() {
      if (!targetUserId) return;
      try {
        const { data: userRecord } = await supabase
          .from('users')
          .select('userId, name, profilePhoto, role')
          .eq('userId', targetUserId)
          .maybeSingle();
        setProfile(userRecord);
      } catch (error) {
        console.error("Failed to load user profile", error);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, [targetUserId]);

  // Filter posts to only show those authored by the target user
  const userPosts = useMemo(() => {
    const allPosts = data?.pages.flatMap(page => page) || [];
    return allPosts.filter(post => post.createdBy === targetUserId);
  }, [data, targetUserId]);

  if (loadingProfile) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <Text className="text-white text-lg">User not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 p-2 bg-white/10 rounded">
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderHeader = () => (
    <View className="bg-[#0A0A0A]">
      {/* Top Nav */}
      <View className="flex-row items-center justify-between px-4 pb-2" style={{ paddingTop: insets.top || 20 }}>
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center active:opacity-70">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-bold text-white tracking-wide">{profile.name}</Text>
        <View className="w-10" />
      </View>

      {/* Profile Info Section (Instagram Style) */}
      <View className="px-5 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <StaticAvatar 
            uri={profile.profilePhoto} 
            name={profile.name} 
            size={86} 
            className="w-[86px] h-[86px] rounded-full border border-[#333]" 
          />
          <View className="flex-1 flex-row justify-around ml-4">
            <View className="items-center">
              <Text className="text-white font-bold text-lg">{userPosts.length}</Text>
              <Text className="text-white/60 text-xs mt-0.5">Posts</Text>
            </View>
            <View className="items-center">
              <Text className="text-white font-bold text-lg">1.2K</Text>
              <Text className="text-white/60 text-xs mt-0.5">Followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-white font-bold text-lg">342</Text>
              <Text className="text-white/60 text-xs mt-0.5">Following</Text>
            </View>
          </View>
        </View>

        <Text className="text-white font-semibold text-[15px] mt-4">{profile.name}</Text>
        <Text className="text-white/80 text-[14px] mt-1">{profile.role === 'trainer' ? 'Fitness Trainer 💪' : 'Gym Member 🏋️'}</Text>
        
        {/* Actions */}
        <View className="flex-row items-center gap-2 mt-5">
          {isMyProfile ? (
            <Pressable 
              onPress={() => router.push('/community/settings')} 
              className="flex-1 bg-[#1C1C1E] rounded-lg py-2 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">Edit Profile</Text>
            </Pressable>
          ) : (
            <>
              <Pressable className="flex-1 bg-blue-600 rounded-lg py-2 items-center active:opacity-80">
                <Text className="text-white font-semibold text-sm">Follow</Text>
              </Pressable>
              <Pressable className="flex-1 bg-[#1C1C1E] rounded-lg py-2 items-center active:opacity-80">
                <Text className="text-white font-semibold text-sm">Message</Text>
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
    // If the post has an image, render it. Otherwise render a text preview.
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
          ListEmptyComponent={
            <View className="py-20 items-center justify-center">
              <Text className="text-white/50 text-lg">No posts yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
