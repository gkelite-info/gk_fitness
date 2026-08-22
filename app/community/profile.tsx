import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import { 
  CaretLeft, 
  DotsThreeVertical,
  Heart,
  ChatCircle,
  BookmarkSimple,
  Gear
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCommunityFeed, useDeletePost } from '@/hooks/community/useCommunityFeed';
import { useToggleLike, useToggleSave } from '@/hooks/community/usePostInteractions';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

export default function MyPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, userId } = useUser();
  const [activeTab, setActiveTab] = useState('Saved');

  const { data, isLoading } = useCommunityFeed(gymId ?? null, userId ?? null);
  const toggleLikeMutation = useToggleLike();
  const toggleSaveMutation = useToggleSave();
  const deletePostMutation = useDeletePost();

  const [activeModal, setActiveModal] = useState<'none' | 'options' | 'confirmDelete'>('none');
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const tabs = [
    { id: 'Posts', label: 'Posts' },
    { id: 'Saved', label: 'Saved' }
  ];

  const posts = useMemo(() => {
    const allPosts = data?.pages.flatMap(page => page) || [];
    if (activeTab === 'Saved') {
      return allPosts.filter(post => post.isSavedByMe);
    }
    return allPosts.filter(post => post.createdBy === userId);
  }, [data, activeTab, userId]);

  const handleToggleLike = (postId: string) => {
    if (!userId || !gymId) return;
    toggleLikeMutation.mutate({ postId, userId, gymId });
  };

  const handleToggleSave = (postId: string) => {
    if (!userId || !gymId) return;
    toggleSaveMutation.mutate({ postId, userId, gymId });
  };

  const handleOpenOptions = (post: any) => {
    if (!userId || !gymId) return;
    if (post.createdBy === userId) {
      setSelectedPost(post);
      setActiveModal('options');
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <View className="w-10">
          <Pressable 
            onPress={() => router.back()} 
            className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70"
          >
            <CaretLeft size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <Text className="text-xl font-bold text-white tracking-wide text-center">
          {activeTab === 'Posts' ? 'My Posts' : 'Saved Posts'}
        </Text>
        <View className="w-10 items-end">
          <Pressable 
            onPress={() => router.push('/community/settings')} 
            className="w-10 h-10 items-center justify-center -mr-2 active:opacity-70"
          >
            <Gear size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View className="px-5 border-b border-[#1F1F22]">
        <AnimatedTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C4EF00" />
        </View>
      ) : (
        <ScrollView 
          className="flex-1 px-5 pt-6" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          <Text className="text-[#A1A1AA] text-[13px] mb-5">
            {activeTab === 'Posts' 
              ? "All the posts you've shared with the community."
              : "Posts you've bookmarked for later."}
          </Text>

          {/* Posts List */}
          <View>
            {posts.map(post => (
              <View key={post.gymCommunityPostId} className="bg-[#121214] border border-[#1F1F22] rounded-[20px] p-4 mb-4">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 flex-row items-center">
                    <StaticAvatar 
                      uri={(post.users as any)?.profilePhoto || (post.users as any)?.avatar} 
                      name={post.users?.name}
                      size={40}
                      className="w-8 h-8 rounded-full mr-3" 
                    />
                    <View>
                      <Text className="text-white font-bold text-[14px]" numberOfLines={1}>{post.users?.name || 'Unknown'}</Text>
                      <Text className="text-[#71717A] text-[11px] mt-0.5">{new Date(post.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  {post.createdBy === userId && (
                    <Pressable className="p-1 active:opacity-70 ml-2" onPress={() => handleOpenOptions(post)}>
                      <DotsThreeVertical size={20} color="#71717A" weight="bold" />
                    </Pressable>
                  )}
                </View>
                
                <Text className="text-[#E4E4E7] text-[13px] leading-5 mb-4 pr-2">
                  {post.caption}
                </Text>

                {post.imagePath && (
                  <View className="mb-4 h-[180px]">
                    <Image source={{ uri: post.imagePath }} className="flex-1 rounded-xl bg-[#27272A]" resizeMode="cover" />
                  </View>
                )}

                <View className="flex-row items-center justify-between mt-1">
                  <View className="flex-row items-center gap-5">
                    <Pressable 
                      className="flex-row items-center gap-1.5 active:opacity-70"
                      onPress={() => handleToggleLike(post.gymCommunityPostId)}
                    >
                      <Heart size={18} color={post.isLikedByMe ? "#EF4444" : "#71717A"} weight={post.isLikedByMe ? "fill" : "regular"} />
                      <Text className="text-[#A1A1AA] text-[12px]">{post.likesCount}</Text>
                    </Pressable>
                    <Pressable 
                      className="flex-row items-center gap-1.5 active:opacity-70"
                      onPress={() => router.push(`/community/comments?postId=${post.gymCommunityPostId}`)}
                    >
                      <ChatCircle size={18} color="#71717A" />
                      <Text className="text-[#A1A1AA] text-[12px]">{post.commentsCount}</Text>
                    </Pressable>
                  </View>
                  <Pressable 
                    className="active:opacity-70"
                    onPress={() => handleToggleSave(post.gymCommunityPostId)}
                  >
                    <BookmarkSimple size={20} color={post.isSavedByMe ? "#C4EF00" : "#71717A"} weight={post.isSavedByMe ? "fill" : "regular"} />
                  </Pressable>
                </View>
              </View>
            ))}

            {posts.length === 0 && (
              <View className="items-center justify-center py-10">
                <Text className="text-[#A1A1AA] text-sm text-center">
                  {activeTab === 'Posts' 
                    ? "You haven't posted anything yet."
                    : "You haven't saved any posts yet."}
                </Text>
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
          [{ label: 'Delete Post', destructive: true, onPress: () => setActiveModal('confirmDelete') }]
        }
      />

      <ActionSheetModal
        visible={activeModal === 'confirmDelete'}
        onClose={() => setActiveModal('none')}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        options={[
          { label: 'Delete', destructive: true, onPress: () => {
              if (selectedPost && userId && gymId) {
                deletePostMutation.mutate({ postId: selectedPost.gymCommunityPostId, userId, gymId });
              }
              setActiveModal('none');
          }}
        ]}
      />
    </View>
  );
}
