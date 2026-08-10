import React from 'react';
import { View, ScrollView, Pressable, Image, FlatList, Dimensions } from 'react-native';
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
} from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STORIES = [
  { id: '1', name: 'Your story', isUser: true, img: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Stephen', isUser: false, img: 'https://i.pravatar.cc/150?u=2', borderColor: '#DFFF1B' },
  { id: '3', name: 'Sara', isUser: false, img: 'https://i.pravatar.cc/150?u=3', borderColor: '#F97316' },
  { id: '4', name: 'Jones', isUser: false, img: 'https://i.pravatar.cc/150?u=4', borderColor: '#EAB308' },
];

const FEED_POSTS = [
  {
    id: '1',
    author: 'Alex Johnson',
    time: '2h ago',
    tag: '',
    authorImg: 'https://i.pravatar.cc/150?u=5',
    content: 'Pushed through an intense chest & triceps session today! Consistency is everything. 💪',
    images: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&auto=format&fit=crop'
    ],
    likes: 248,
    comments: 18,
    shares: 12,
    isLiked: true,
  },
  {
    id: '2',
    author: 'Sarah Lee',
    time: '5h ago',
    tag: 'Progress',
    authorImg: 'https://i.pravatar.cc/150?u=6',
    content: 'Day 30 progress! Down 3.5 kg and feeling stronger every day. Small steps, big changes. 🌟',
    images: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop'
    ],
    likes: 248,
    comments: 18,
    shares: 12,
    isLiked: true,
  }
];

export default function CommunityFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderStory = ({ item }: { item: typeof STORIES[0] }) => (
    <View className="items-center mr-4">
      <View className="relative mb-1">
        {item.isUser ? (
          <View className="w-[68px] h-[68px] rounded-full border border-[#27272A] items-center justify-center bg-[#161616]">
            <View className="w-[60px] h-[60px] rounded-full overflow-hidden bg-[#27272A] items-center justify-center opacity-60">
              <Image source={{ uri: item.img }} style={{ width: 60, height: 60, borderRadius: 30 }} resizeMode="cover" />
            </View>
            <View className="absolute bottom-0 right-0 bg-[#C4EF00] rounded-full w-5 h-5 items-center justify-center border-2 border-[#0A0A0A]">
              <Plus size={12} color="#000000" weight="bold" />
            </View>
          </View>
        ) : (
          <View 
            className="w-[68px] h-[68px] rounded-full items-center justify-center"
            style={{ borderWidth: 2, borderColor: item.borderColor }}
          >
            <View className="w-[60px] h-[60px] rounded-full bg-[#0A0A0A] items-center justify-center overflow-hidden">
              <Image source={{ uri: item.img }} style={{ width: 60, height: 60, borderRadius: 30 }} resizeMode="cover" />
            </View>
          </View>
        )}
      </View>
      <Text className="text-[#A1A1AA] text-[11px]">{item.name}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-white tracking-wide">Community</Text>
        <View className="flex-row items-center gap-4">
          <Pressable className="active:opacity-70">
            <MagnifyingGlass size={22} color="#A1A1AA" />
          </Pressable>
          <Pressable 
            className="w-7 h-7 rounded-full bg-[#C4EF00] items-center justify-center active:opacity-70"
            onPress={() => router.push('/community/create')}
          >
            <Plus size={16} color="#000000" weight="bold" />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Stories List */}
        <View className="mb-6">
          <FlatList
            data={STORIES}
            renderItem={renderStory}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>

        {/* Feed */}
        <View className="px-5">
          {FEED_POSTS.map(post => (
            <View key={post.id} className="bg-[#121214] rounded-3xl p-4 mb-4 border border-[#1F1F22]">
              
              {/* Post Header */}
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Image source={{ uri: post.authorImg }} className="w-10 h-10 rounded-full mr-3" />
                  <View>
                    <Text className="text-white font-bold text-[15px]">{post.author}</Text>
                    <Text className="text-[#71717A] text-xs mt-0.5">
                      {post.time} {post.tag ? `• ` : ''}
                      {post.tag && <Text className="text-[#C4EF00] font-medium">{post.tag}</Text>}
                    </Text>
                  </View>
                </View>
                <Pressable className="active:opacity-70 p-1">
                  <DotsThreeVertical size={20} color="#71717A" weight="bold" />
                </Pressable>
              </View>

              {/* Content */}
              <Text className="text-[#E4E4E7] text-[13px] leading-5 mb-4">
                {post.content}
              </Text>

              {/* Images */}
              {post.images && post.images.length > 0 && (
                <View className="flex-row gap-2 mb-4 h-[240px]">
                  {post.images.map((img, index) => (
                    <Image 
                      key={index} 
                      source={{ uri: img }} 
                      className={`flex-1 rounded-xl bg-[#27272A] ${post.images.length === 1 ? 'h-full' : ''}`} 
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}

              {/* Actions */}
              <View className="flex-row items-center gap-6 mt-1">
                <Pressable className="flex-row items-center gap-1.5 active:opacity-70">
                  <Heart size={20} color={post.isLiked ? "#EF4444" : "#71717A"} weight={post.isLiked ? "fill" : "regular"} />
                  <Text className="text-[#A1A1AA] text-[13px]">{post.likes}</Text>
                </Pressable>
                <Pressable 
                  className="flex-row items-center gap-1.5 active:opacity-70"
                  onPress={() => router.push('/community/comments')}
                >
                  <ChatCircle size={20} color="#71717A" />
                  <Text className="text-[#A1A1AA] text-[13px]">{post.comments}</Text>
                </Pressable>
                <Pressable className="flex-row items-center gap-1.5 active:opacity-70">
                  <ShareNetwork size={20} color="#71717A" />
                  <Text className="text-[#A1A1AA] text-[13px]">{post.shares}</Text>
                </Pressable>
              </View>

            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
