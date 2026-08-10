import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import { 
  CaretLeft, 
  DotsThree,
  Heart,
  ChatCircle,
  BookmarkSimple
} from 'phosphor-react-native';

const MY_POSTS = [
  {
    id: '1',
    time: '2h ago',
    title: 'Back & Biceps session complete! 💪',
    content: 'Progress is built one rep at a time.',
    img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=400&auto=format&fit=crop',
    likes: 128,
    comments: 24,
    isLiked: true,
  },
  {
    id: '2',
    time: '1d ago',
    title: 'Day 30 update! Down 3.5 kg and feeling stronger every day. 🔥',
    content: '',
    img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop',
    likes: 156,
    comments: 38,
    isLiked: true,
  },
  {
    id: '3',
    time: '3d ago',
    title: 'Post workout meal ✅',
    content: 'Fuel your body, fuel your goals.',
    img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=400&auto=format&fit=crop',
    likes: 97,
    comments: 15,
    isLiked: true,
  },
  {
    id: '4',
    time: '5d ago',
    title: 'Morning run to clear the mind. 🏃‍♂️',
    content: '5K done!',
    img: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=400&auto=format&fit=crop',
    likes: 82,
    comments: 12,
    isLiked: true,
  },
];

export default function MyPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Posts');

  const tabs = [
    { id: 'Posts', label: 'Posts' },
    { id: 'Saved', label: 'Saved' }
  ];

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide flex-1 text-center pr-8">My Posts</Text>
      </View>

      {/* Tabs */}
      <View className="px-5 border-b border-[#1F1F22]">
        <AnimatedTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>

      <ScrollView 
        className="flex-1 px-5 pt-6" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <Text className="text-[#A1A1AA] text-[13px] mb-5">
          All the posts you've shared with the community.
        </Text>

        {/* Posts List */}
        <View>
          {MY_POSTS.map(post => (
            <View key={post.id} className="bg-[#121214] border border-[#1F1F22] rounded-3xl p-4 mb-4">
              
              {/* Top Row: Image + Content */}
              <View className="flex-row mb-4">
                <Image 
                  source={{ uri: post.img }} 
                  className="w-[100px] h-[100px] rounded-2xl bg-[#27272A] mr-4" 
                />
                
                <View className="flex-1 justify-center">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-[#A1A1AA] text-xs font-medium">{post.time}</Text>
                    <Pressable className="active:opacity-70 p-1 -mr-2 -mt-2">
                      <DotsThree size={24} color="#71717A" weight="bold" />
                    </Pressable>
                  </View>
                  
                  <Text className="text-white font-bold text-[14px] leading-5 mb-1.5" numberOfLines={2}>
                    {post.title}
                  </Text>
                  
                  {post.content ? (
                    <Text className="text-[#A1A1AA] text-[12px] leading-4" numberOfLines={2}>
                      {post.content}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Bottom Row: Actions */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-5">
                  <Pressable className="flex-row items-center gap-1.5 active:opacity-70">
                    <Heart size={18} color={post.isLiked ? "#C4EF00" : "#71717A"} weight={post.isLiked ? "fill" : "regular"} />
                    <Text className="text-[#C4EF00] text-[13px] font-medium">{post.likes}</Text>
                  </Pressable>
                  <Pressable className="flex-row items-center gap-1.5 active:opacity-70">
                    <ChatCircle size={18} color="#E4E4E7" weight="regular" />
                    <Text className="text-[#E4E4E7] text-[13px] font-medium">{post.comments}</Text>
                  </Pressable>
                </View>
                
                <Pressable className="flex-row items-center gap-1.5 active:opacity-70">
                  <BookmarkSimple size={18} color="#E4E4E7" weight="regular" />
                  <Text className="text-[#E4E4E7] text-[13px] font-medium">Save</Text>
                </Pressable>
              </View>
              
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
