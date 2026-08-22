import React, { useState } from 'react';
import { View, Modal, Pressable, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { X, PaperPlaneRight } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStoryComments, useAddStoryComment } from '@/hooks/community/useStories';
import { useUser } from '@/context/UserContext';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

interface StoryCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  storyId: string | null;
}

export function StoryCommentsModal({ visible, onClose, storyId }: StoryCommentsModalProps) {
  const insets = useSafeAreaInsets();
  const { gymId, userId } = useUser();
  const [newComment, setNewComment] = useState('');

  const { data: comments, isLoading } = useStoryComments(storyId);
  const addCommentMutation = useAddStoryComment();

  const handlePostComment = () => {
    if (!newComment.trim() || !storyId || !gymId || !userId) return;
    addCommentMutation.mutate(
      { gymId, storyId, userId, content: newComment.trim() },
      {
        onSuccess: () => {
          setNewComment('');
        }
      }
    );
  };

  const renderComment = ({ item }: { item: any }) => (
    <View className="flex-row mb-4 px-4">
      <StaticAvatar 
        uri={item.users?.profilePhoto} 
        name={item.users?.name} 
        size={36} 
        className="w-9 h-9 rounded-full mr-3" 
      />
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="text-white/70 text-xs font-bold mr-2">{item.users?.name || 'User'}</Text>
          <Text className="text-white/40 text-[10px]">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text className="text-white text-[13px] leading-5">{item.content}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/40" onPress={onClose} />
        
        <View 
          className="bg-[#121214] rounded-t-3xl h-[60%]"
          style={{ paddingBottom: insets.bottom || 20 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#27272A]">
            <View className="w-6" />
            <Text className="text-white font-bold text-base">
              {comments?.length || 0} Comments
            </Text>
            <Pressable onPress={onClose} className="p-1 active:opacity-70 hit-slop-10">
              <X size={20} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#C4EF00" />
            </View>
          ) : (
            <FlatList
              data={comments || []}
              renderItem={renderComment}
              keyExtractor={(item) => item.gymCommunityStoryCommentId}
              contentContainerStyle={{ paddingTop: 16 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center pt-10">
                  <Text className="text-white/50 text-sm">No comments yet. Be the first!</Text>
                </View>
              }
            />
          )}

          {/* Input Area */}
          <View className="px-4 py-3 border-t border-[#27272A] flex-row items-end">
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              placeholderTextColor="#71717A"
              className="flex-1 bg-[#1C1C1E] text-white rounded-2xl px-4 py-3 min-h-[44px] max-h-[100px]"
              multiline
            />
            <Pressable 
              onPress={handlePostComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className={`ml-3 p-3 rounded-full items-center justify-center ${newComment.trim() ? 'bg-[#C4EF00]' : 'bg-[#2A2A2D]'}`}
            >
              {addCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <PaperPlaneRight size={20} color={newComment.trim() ? '#000000' : '#71717A'} weight="fill" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
