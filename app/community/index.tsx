import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Image, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MagnifyingGlass,
  Plus,
  DotsThreeVertical,
  Heart,
  ChatCircle,
  ShareNetwork,
  BookmarkSimple,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCommunityFeed, useDeletePost } from '@/hooks/community/useCommunityFeed';
import { useActiveStories } from '@/hooks/community/useStories';
import { useToggleLike } from '@/hooks/community/usePostInteractions';
import { useBlockUser, useReportContent } from '@/hooks/community/useModeration';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');



export default function CommunityFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, userId, profilePhoto, role } = useUser();

  const { data: storiesGrouped, refetch: refetchStories } = useActiveStories(gymId ?? null, userId ?? null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch: refetchFeed } = useCommunityFeed(gymId ?? null, userId ?? null);
  const toggleLikeMutation = useToggleLike();
  const blockUserMutation = useBlockUser();
  const reportContentMutation = useReportContent();
  const deletePostMutation = useDeletePost();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStories(), refetchFeed()]);
    setRefreshing(false);
  }, [refetchStories, refetchFeed]);

  const [activeModal, setActiveModal] = useState<'none' | 'options' | 'confirmDelete' | 'confirmReport' | 'confirmBlock'>('none');
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const posts = useMemo(() => {
    return data?.pages.flatMap(page => page) || [];
  }, [data]);

  const handleToggleLike = (postId: string) => {
    if (!userId || !gymId) return;
    toggleLikeMutation.mutate({ postId, userId, gymId });
  };

  const handleOpenOptions = (post: any) => {
    setSelectedPost(post);
    setActiveModal('options');
  };

  const renderStory = ({ item, index }: { item: any, index: number }) => (
    <Pressable className="items-center mr-4 active:opacity-70" onPress={() => {
      if (item.isAddButton) {
        router.push('/community/create-story');
      } else {
        router.push(`/community/story-viewer?userIndex=${index - 1}`);
      }
    }}>
      <View className="relative mb-1">
        {item.isAddButton ? (
          <View className="w-[68px] h-[68px] rounded-full border border-[#27272A] items-center justify-center bg-[#161616]">
            <View className="w-[60px] h-[60px] rounded-full overflow-hidden bg-[#27272A] items-center justify-center opacity-60">
              <StaticAvatar uri={profilePhoto} name="You" size={60} className="w-[60px] h-[60px] rounded-full" />
            </View>
            <View className="absolute bottom-0 right-0 bg-[#C4EF00] rounded-full w-5 h-5 items-center justify-center border-2 border-[#0A0A0A]">
              <Plus size={12} color="#000000" weight="bold" />
            </View>
          </View>
        ) : (
          <View 
            className="w-[68px] h-[68px] rounded-full items-center justify-center"
            style={{ borderWidth: 2, borderColor: item.allViewed ? '#27272A' : '#C4EF00' }}
          >
            <View className="w-[60px] h-[60px] rounded-full bg-[#0A0A0A] items-center justify-center overflow-hidden">
              <StaticAvatar uri={item.user?.profilePhoto} name={item.user?.name} size={60} className="w-[60px] h-[60px] rounded-full" />
            </View>
          </View>
        )}
      </View>
      <Text className="text-[#A1A1AA] text-[11px]" numberOfLines={1}>{item.name}</Text>
    </Pressable>
  );

  const mergedStories = useMemo(() => {
    const list: any[] = [];
    // ALWAYS show the Add Story button so users can post multiple stories
    list.push({ isAddButton: true, name: 'Your story' });
    
    if (storiesGrouped) {
      storiesGrouped.forEach(group => {
        list.push({
          ...group,
          name: group.userId === userId ? 'Your stories' : group.user?.name || 'User',
          isAddButton: false
        });
      });
    }
    return list;
  }, [storiesGrouped, userId]);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-white tracking-wide">Community</Text>
        <Pressable 
          onPress={() => router.push('/community/profile')} 
          className="active:opacity-70 flex-row items-center bg-[#1C1C1E] px-3 py-1.5 rounded-full gap-1.5"
        >
          <BookmarkSimple size={14} color="#C4EF00" weight="fill" />
          <Text className="text-white text-xs font-semibold">Saved</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C4EF00" />
        </View>
      ) : (
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={({ nativeEvent }) => {
            if (isFetchingNextPage || !hasNextPage) return;
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50) {
              fetchNextPage();
            }
          }}
          scrollEventThrottle={400}
        >
          {/* Stories List */}
          <View className="mb-6">
            <FlatList
              data={mergedStories}
              renderItem={renderStory}
              keyExtractor={(item: any, index) => item.isAddButton ? 'add' : item.userId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            />
          </View>

          {/* Feed */}
          <View className="px-5">
            {posts.map(post => {
              const isSuperAdmin = post.users?.role === 'superadmin';
              const isOwner = post.users?.role === 'owner';
              
              const cardClass = isSuperAdmin 
                ? "bg-[#1A1C0B] rounded-3xl p-4 mb-4" 
                : isOwner 
                  ? "bg-[#0B101C] rounded-3xl p-4 mb-4" 
                  : "bg-[#121214] rounded-3xl p-4 mb-4 border border-[#1F1F22]";

              const displayName = isSuperAdmin ? "GK-Gym Life" : (post.users?.name || 'Unknown User');
              const nameColor = isSuperAdmin ? "text-[#C4EF00]" : isOwner ? "text-[#60A5FA]" : "text-white";

              return (
                <View key={post.gymCommunityPostId} className={cardClass}>
                  
                  {/* Post Header */}
                  <View className="flex-row justify-between items-center mb-3">
                    <Pressable 
                      className="flex-row items-center active:opacity-70"
                      onPress={() => router.push(`/community/profile/${post.createdBy}`)}
                    >
                      <StaticAvatar 
                        uri={post.users?.profilePhoto || (post.users as any)?.avatar} 
                        name={displayName}
                        size={40}
                        className="w-10 h-10 rounded-full mr-3" 
                      />
                      <View>
                        <Text className={`font-bold text-[15px] ${nameColor}`}>{displayName}</Text>
                        <Text className="text-[#71717A] text-xs mt-0.5">
                          {new Date(post.createdAt).toLocaleDateString()} • <Text className={isSuperAdmin ? "text-[#C4EF00] font-medium" : isOwner ? "text-[#60A5FA] font-medium" : "text-[#A1A1AA] font-medium"}>{post.users?.role}</Text>
                        </Text>
                      </View>
                    </Pressable>
                  <Pressable className="active:opacity-70 p-1" onPress={() => handleOpenOptions(post)}>
                    <DotsThreeVertical size={20} color="#71717A" weight="bold" />
                  </Pressable>
                </View>

                {/* Content (tap to open post detail) */}
                <Pressable onPress={() => router.push(`/community/post/${post.gymCommunityPostId}`)} className="active:opacity-90">
                  <Text className="text-[#E4E4E7] text-[13px] leading-5 mb-4">
                    {post.caption}
                  </Text>

                  {/* Images */}
                  {post.imagePath && (
                    <View className="mb-4 h-[240px]">
                      <Image 
                        source={{ uri: post.imagePath }} 
                        className="flex-1 rounded-xl bg-[#27272A]" 
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </Pressable>

                {/* Actions */}
                <View className="flex-row items-center gap-6 mt-1">
                  <Pressable 
                    className="flex-row items-center gap-1.5 active:opacity-70"
                    onPress={() => handleToggleLike(post.gymCommunityPostId)}
                  >
                    <Heart size={20} color={post.isLikedByMe ? "#EF4444" : "#71717A"} weight={post.isLikedByMe ? "fill" : "regular"} />
                    <Text className="text-[#A1A1AA] text-[13px]">{post.likesCount}</Text>
                  </Pressable>
                  <Pressable 
                    className="flex-row items-center gap-1.5 active:opacity-70"
                    onPress={() => router.push(`/community/comments?postId=${post.gymCommunityPostId}`)}
                  >
                    <ChatCircle size={20} color="#71717A" />
                    <Text className="text-[#A1A1AA] text-[13px]">{post.commentsCount}</Text>
                  </Pressable>
                </View>
              </View>
            )})}
            {!isLoading && posts.length === 0 && (
              <View className="items-center justify-center py-10">
                <Text className="text-[#A1A1AA] text-sm">No posts yet. Be the first to share!</Text>
              </View>
            )}
            {isFetchingNextPage && (
              <View className="items-center justify-center py-4">
                <ActivityIndicator color="#C4EF00" size="small" />
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modals */}
      <ActionSheetModal
        visible={activeModal === 'options'}
        onClose={() => setActiveModal('none')}
        options={
          selectedPost?.createdBy === userId || role === 'superadmin'
            ? [{ label: 'Delete Post', destructive: true, onPress: () => setActiveModal('confirmDelete') }]
            : [
                { label: 'Report Post', destructive: true, onPress: () => setActiveModal('confirmReport') },
                { label: 'Block User', destructive: true, onPress: () => setActiveModal('confirmBlock') }
              ]
        }
      />

      <ActionSheetModal
        visible={activeModal === 'confirmDelete'}
        onClose={() => setActiveModal('none')}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        options={[
          { label: 'Delete', destructive: true, onPress: () => {
              if (selectedPost && userId) {
                deletePostMutation.mutate({ postId: selectedPost.gymCommunityPostId, userId, gymId: gymId ?? null, role: role ?? undefined });
              }
              setActiveModal('none');
          }}
        ]}
      />

      <ActionSheetModal
        visible={activeModal === 'confirmReport'}
        onClose={() => setActiveModal('none')}
        title="Report Post"
        message="Are you sure you want to report this post? Our team will review it shortly."
        options={[
          { label: 'Report', destructive: true, onPress: () => {
              if (selectedPost && userId) {
                reportContentMutation.mutate({ reporterId: userId, reason: 'Inappropriate content', reportedUserId: selectedPost.createdBy, postId: selectedPost.gymCommunityPostId });
              }
              setActiveModal('none');
          }}
        ]}
      />

      <ActionSheetModal
        visible={activeModal === 'confirmBlock'}
        onClose={() => setActiveModal('none')}
        title="Block User"
        message="Are you sure you want to block this user? You will no longer see their posts."
        options={[
          { label: 'Block', destructive: true, onPress: () => {
              if (selectedPost && userId) {
                blockUserMutation.mutate({ blockerId: userId, blockedId: selectedPost.createdBy });
              }
              setActiveModal('none');
          }}
        ]}
      />

      {/* Floating Action Button for New Post */}
      <Pressable 
        className="absolute right-5 w-14 h-14 rounded-full bg-[#C4EF00] items-center justify-center active:opacity-80 z-50"
        style={{
          bottom: insets.bottom + 90,
          shadowColor: '#C4EF00',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        }}
        onPress={() => router.push('/community/create')}
      >
        <Plus size={24} color="#000000" weight="bold" />
      </Pressable>
    </View>
  );
}
