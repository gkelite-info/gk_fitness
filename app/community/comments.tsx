import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  CaretLeft, 
  FadersHorizontal, 
  Heart,
  NavigationArrow
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { usePostComments, useAddComment, useDeleteComment } from '@/hooks/community/usePostInteractions';
import { useReportContent } from '@/hooks/community/useModeration';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';

export default function CommentsScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const insets = useSafeAreaInsets();
  const { userId, name, profilePhoto } = useUser();
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);

  // Pagination & Replies State
  const [visibleComments, setVisibleComments] = useState(5);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  
  // Sort State
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('oldest');

  const { data: comments, isLoading } = usePostComments(postId ?? null, userId ?? null, sortBy);
  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();
  const reportContentMutation = useReportContent();

  const [activeModal, setActiveModal] = useState<'none' | 'sortOptions' | 'options' | 'confirmDelete' | 'confirmReport'>('none');
  const [selectedComment, setSelectedComment] = useState<any>(null);

  const handleSendComment = () => {
    if (!comment.trim() || !userId || !postId) return;
    
    addCommentMutation.mutate(
      { postId, userId, content: comment.trim(), parentId: replyingTo?.id },
      {
        onSuccess: () => {
          setComment('');
          setReplyingTo(null);
        }
      }
    );
  };

  const handleOpenOptions = (item: any) => {
    if (!userId) return;
    setSelectedComment(item);
    setActiveModal('options');
  };

  const renderComment = (item: any, isReply = false) => (
    <View key={item.gymCommunityCommentId} className={`flex-row mb-6 relative ${isReply ? 'ml-6 mt-4' : ''}`}>
      {/* Thread Line for Reply */}
      {isReply && (
        <View className="absolute -left-[27px] -top-8 w-6 h-[46px] border-l-2 border-b-2 border-[#1F1F22] rounded-bl-xl" />
      )}
      
      <StaticAvatar 
        uri={item.users?.profilePhoto || item.users?.avatar} 
        name={item.users?.name}
        size={40}
        className="w-10 h-10 rounded-full mr-3" 
      />
      
      <Pressable className="flex-1" onLongPress={() => handleOpenOptions(item)}>
        <View className="flex-row items-center mb-1">
          <Text className="text-white font-bold text-[14px]">{item.users?.name || 'Unknown'}</Text>
          {item.authorId === userId && (
            <View className="bg-[#2B3513] px-1.5 py-0.5 rounded-[4px] ml-2">
              <Text className="text-[#C4EF00] text-[9px] font-bold tracking-widest">YOU</Text>
            </View>
          )}
          <Text className="text-[#71717A] text-[12px] ml-2 font-medium">{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        
        <Text className="text-[#E4E4E7] text-[14px] leading-5 mb-2 pr-4">{item.content}</Text>
        
        {!isReply && (
          <Pressable 
            className="active:opacity-70"
            onPress={() => setReplyingTo({ id: item.gymCommunityCommentId, name: item.users?.name || 'Unknown' })}
          >
            <Text className="text-[#71717A] text-[13px] font-semibold">Reply</Text>
          </Pressable>
        )}
      </Pressable>
      
      <View className="items-center w-10">
        <Pressable className="items-center active:opacity-70 p-1" onPress={() => handleOpenOptions(item)}>
          <Heart size={14} color="#71717A" weight="regular" style={{ marginBottom: 4 }} />
        </Pressable>
      </View>
    </View>
  );

  // Group by parent
  const topLevelComments = comments?.filter((c: any) => !c.parentId) || [];
  const getReplies = (parentId: string) => comments?.filter((c: any) => c.parentId === parentId) || [];

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-[#0A0A0A]" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4 border-b border-[#1F1F22]">
          <View className="w-10 h-10 -ml-2 items-center justify-center">
            <Pressable onPress={() => router.back()} className="active:opacity-70 p-2">
              <CaretLeft size={24} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text className="text-xl font-bold text-white tracking-wide text-center">
            Comments
          </Text>
          <Pressable 
            className="w-10 h-10 items-center justify-center -mr-2 active:opacity-70"
            onPress={() => setActiveModal('sortOptions')}
          >
            <FadersHorizontal size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C4EF00" />
        </View>
      ) : (
        <ScrollView 
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {topLevelComments.slice(0, visibleComments).map((item: any) => {
            const replies = getReplies(item.gymCommunityCommentId);
            const isExpanded = expandedReplies.has(item.gymCommunityCommentId);
            
            return (
              <View key={item.gymCommunityCommentId}>
                {renderComment(item)}
                {replies.length > 0 && !isExpanded && (
                  <Pressable 
                    className="ml-14 mb-5 flex-row items-center active:opacity-70" 
                    onPress={() => toggleReplies(item.gymCommunityCommentId)}
                  >
                    <View className="w-6 h-px bg-[#71717A] mr-3" />
                    <Text className="text-[#71717A] text-[13px] font-semibold">
                      View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </Text>
                  </Pressable>
                )}
                {isExpanded && (
                  <>
                    {replies.map((reply: any) => renderComment(reply, true))}
                    <Pressable 
                      className="ml-14 mb-5 flex-row items-center active:opacity-70" 
                      onPress={() => toggleReplies(item.gymCommunityCommentId)}
                    >
                      <View className="w-6 h-px bg-[#71717A] mr-3" />
                      <Text className="text-[#71717A] text-[13px] font-semibold">Hide replies</Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })}
          {topLevelComments.length > visibleComments && (
            <Pressable 
              className="items-center py-4 active:opacity-70 mb-4"
              onPress={() => setVisibleComments(prev => prev + 5)}
            >
              <Text className="text-[#71717A] text-[13px] font-semibold">View more comments</Text>
            </Pressable>
          )}
          {topLevelComments.length === 0 && (
            <View className="items-center justify-center py-10">
              <Text className="text-[#A1A1AA] text-sm">No comments yet. Be the first!</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Input Section */}
      <View 
        className="bg-[#121214] px-5 py-4 border-t border-[#1F1F22]"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        {replyingTo && (
          <View className="flex-row justify-between mb-2">
            <Text className="text-[#A1A1AA] text-xs">Replying to {replyingTo.name}</Text>
            <Pressable onPress={() => setReplyingTo(null)}>
              <Text className="text-[#EF4444] text-xs">Cancel</Text>
            </Pressable>
          </View>
        )}
        <View className="flex-row items-center gap-3">
          <StaticAvatar 
            uri={profilePhoto || undefined}
            name={name || undefined}
            size={36}
            className="w-9 h-9 rounded-full" 
          />
          <View className="flex-1 flex-row items-center bg-[#18181B] rounded-full px-4 border border-[#27272A] h-11">
            <TextInput
              className="flex-1 text-white text-[14px]"
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              placeholderTextColor="#71717A"
              value={comment}
              onChangeText={setComment}
              selectionColor="#C4EF00"
              editable={!addCommentMutation.isPending}
            />
            {comment.trim().length > 0 && (
              <Pressable 
                className="ml-2 active:opacity-70"
                onPress={handleSendComment}
                disabled={addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? (
                  <ActivityIndicator color="#C4EF00" size="small" />
                ) : (
                  <NavigationArrow size={18} color="#C4EF00" weight="bold" style={{ transform: [{ rotate: '90deg' }] }} />
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Modals */}
      <ActionSheetModal
        visible={activeModal === 'sortOptions'}
        onClose={() => setActiveModal('none')}
        title="Sort Comments"
        options={[
          { label: sortBy === 'oldest' ? '✓ Oldest First' : 'Oldest First', onPress: () => { setSortBy('oldest'); setActiveModal('none'); } },
          { label: sortBy === 'newest' ? '✓ Newest First' : 'Newest First', onPress: () => { setSortBy('newest'); setActiveModal('none'); } },
        ]}
      />

      <ActionSheetModal
        visible={activeModal === 'options'}
        onClose={() => setActiveModal('none')}
        options={
          selectedComment?.authorId === userId
            ? [{ label: 'Delete Comment', destructive: true, onPress: () => setActiveModal('confirmDelete') }]
            : [{ label: 'Report Comment', destructive: true, onPress: () => setActiveModal('confirmReport') }]
        }
      />

      <ActionSheetModal
        visible={activeModal === 'confirmDelete'}
        onClose={() => setActiveModal('none')}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        options={[
          { label: 'Delete', destructive: true, onPress: () => {
              if (selectedComment && userId) {
                deleteCommentMutation.mutate({ commentId: selectedComment.gymCommunityCommentId, userId });
              }
              setActiveModal('none');
          }}
        ]}
      />

      <ActionSheetModal
        visible={activeModal === 'confirmReport'}
        onClose={() => setActiveModal('none')}
        title="Report Comment"
        message="Are you sure you want to report this comment? Our team will review it shortly."
        options={[
          { label: 'Report', destructive: true, onPress: () => {
              if (selectedComment && userId) {
                reportContentMutation.mutate({ reporterId: userId, reason: 'Inappropriate content', reportedUserId: selectedComment.authorId, commentId: selectedComment.gymCommunityCommentId });
              }
              setActiveModal('none');
          }}
        ]}
      />
    </KeyboardAvoidingView>
  );
}
