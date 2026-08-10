import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  CaretLeft, 
  FadersHorizontal, 
  Heart,
  NavigationArrow
} from 'phosphor-react-native';

const COMMENTS = [
  {
    id: '1',
    author: 'Sarah Lee',
    time: '1h ago',
    avatar: 'https://i.pravatar.cc/150?u=10',
    content: 'Amazing pump! Keep pushing 🔥',
    likes: 12,
  },
  {
    id: '2',
    author: 'Mike Turner',
    time: '56m ago',
    avatar: 'https://i.pravatar.cc/150?u=11',
    content: 'That back is looking insane! 👏',
    likes: 8,
  },
  {
    id: '3',
    author: 'Jessica Wilson',
    time: '35m ago',
    avatar: 'https://i.pravatar.cc/150?u=12',
    content: 'Beast mode! 🔥 💪',
    likes: 5,
  },
  {
    id: '4',
    author: 'David Miller',
    time: '28m ago',
    avatar: 'https://i.pravatar.cc/150?u=13',
    content: 'What a workout! Mind sharing the routine?',
    likes: 3,
    replies: [
      {
        id: '4-1',
        author: 'Alex Johnson',
        isAuthor: true,
        time: '20m ago',
        avatar: 'https://i.pravatar.cc/150?u=5',
        content: 'Sure, will share it in my next post! 💪',
        likes: 2,
      }
    ]
  },
  {
    id: '5',
    author: 'Emma Davis',
    time: '15m ago',
    avatar: 'https://i.pravatar.cc/150?u=14',
    content: "You're an inspiration! Keep it up 🙌",
    likes: 1,
  },
];

export default function CommentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [comment, setComment] = useState('');

  const renderComment = (item: any, isReply = false, isLastReply = false) => (
    <View key={item.id} className={`flex-row mb-6 relative ${isReply ? 'ml-6 mt-4' : ''}`}>
      {/* Thread Line for Reply */}
      {isReply && (
        <View className="absolute -left-[27px] -top-8 w-6 h-[46px] border-l-2 border-b-2 border-[#1F1F22] rounded-bl-xl" />
      )}
      
      <Image source={{ uri: item.avatar }} className="w-10 h-10 rounded-full mr-3" />
      
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="text-white font-bold text-[14px]">{item.author}</Text>
          {item.isAuthor && (
            <View className="bg-[#2B3513] px-1.5 py-0.5 rounded-[4px] ml-2">
              <Text className="text-[#C4EF00] text-[9px] font-bold tracking-widest">AUTHOR</Text>
            </View>
          )}
          <Text className="text-[#71717A] text-[12px] ml-2 font-medium">{item.time}</Text>
        </View>
        
        <Text className="text-[#E4E4E7] text-[14px] leading-5 mb-2 pr-4">{item.content}</Text>
        
        <Pressable className="active:opacity-70">
          <Text className="text-[#71717A] text-[13px] font-semibold">Reply</Text>
        </Pressable>
      </View>
      
      <View className="items-center w-10">
        <Pressable className="items-center active:opacity-70 p-1">
          <Heart size={18} color="#A1A1AA" weight="regular" />
          <Text className="text-[#A1A1AA] text-[11px] mt-1 font-medium">{item.likes}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#0A0A0A' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#1F1F22]">
          <Pressable 
            onPress={() => router.back()} 
            className="w-8 h-8 items-center justify-center -ml-1 active:opacity-70"
          >
            <CaretLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text className="text-[17px] font-bold text-white">Comments (24)</Text>
          <Pressable className="w-8 h-8 items-center justify-center -mr-1 active:opacity-70">
            <FadersHorizontal size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          {COMMENTS.map(comment => (
            <View key={comment.id}>
              {renderComment(comment)}
              {comment.replies && comment.replies.length > 0 && (
                <View>
                  {comment.replies.map((reply, idx) => 
                    renderComment(reply, true, idx === comment.replies.length - 1)
                  )}
                </View>
              )}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Input Area */}
        <View className="flex-row items-center px-4 py-3 bg-[#0A0A0A] border-t border-[#1F1F22]" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Image source={{ uri: 'https://i.pravatar.cc/150?u=20' }} className="w-9 h-9 rounded-full mr-3" />
          <View className="flex-1 flex-row items-center bg-[#161616] rounded-full px-4 h-11 border border-[#27272A]">
            <TextInput
              placeholder="Write a comment..."
              placeholderTextColor="#71717A"
              className="flex-1 text-white text-[14px]"
              value={comment}
              onChangeText={setComment}
              selectionColor="#C4EF00"
            />
            {comment.length > 0 && (
              <Pressable className="w-[30px] h-[30px] rounded-full bg-[#C4EF00] items-center justify-center -mr-2 active:opacity-80">
                <NavigationArrow size={14} color="#000000" weight="bold" />
              </Pressable>
            )}
            {comment.length === 0 && (
              <View className="w-[30px] h-[30px] rounded-full bg-[#C4EF00] items-center justify-center -mr-2 opacity-50">
                <NavigationArrow size={14} color="#000000" weight="bold" />
              </View>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
