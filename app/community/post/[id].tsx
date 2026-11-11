import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Modal, Dimensions, Keyboard } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Heart, ChatCircle, BookmarkSimple, DotsThreeVertical, NavigationArrow, X, FadersHorizontal } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCommunityFeed } from '@/hooks/community/useCommunityFeed';
import { useToggleLike, useToggleSave, usePostComments, useAddComment, useDeleteComment } from '@/hooks/community/usePostInteractions';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { toast } from '@/lib/toast';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function ImageZoomModal({ visible, imageUri, onClose, topInset }: { visible: boolean; imageUri?: string; onClose: () => void; topInset: number }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Reset on open
  const handleClose = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-black">
        <Pressable
          onPress={handleClose}
          className="absolute right-4 z-50 p-3 active:opacity-70"
          style={{ top: topInset || 40 }}
        >
          <X size={28} color="#FFFFFF" weight="bold" />
        </Pressable>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, animatedStyle]}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 }}
              resizeMode="contain"
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

export default function PostDetailScreen() {
  const { id: routePostId } = useLocalSearchParams();
  const postId = Array.isArray(routePostId) ? routePostId[0] : routePostId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, userId, name, profilePhoto, role } = useUser();

  const lastNavigationTimeRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const safeNavigate = useCallback((navigateFn: () => void, cooldown = 750) => {
    const now = Date.now();
    if (now - lastNavigationTimeRef.current < cooldown) {
      console.log('[PostDetail] Rapid tap ignored to prevent duplicate navigation');
      return;
    }
    lastNavigationTimeRef.current = now;
    navigateFn();
  }, []);

  const { data, isLoading } = useCommunityFeed(gymId ?? null, userId ?? null, role ?? null);
  const toggleLikeMutation = useToggleLike();
  const toggleSaveMutation = useToggleSave();

  // Sort State
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('oldest');
  const [activeModal, setActiveModal] = useState<'none' | 'sortOptions'>('none');

  // Comments
  const { data: comments, isLoading: commentsLoading } = usePostComments(postId ?? null, userId ?? null, sortBy);
  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();

  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
  const [imageZoomVisible, setImageZoomVisible] = useState(false);

  // Pagination & Replies State
  const [visibleComments, setVisibleComments] = useState(5);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Find the exact post from the feed cache
  const post = data?.pages.flatMap(page => page).find(p => p.gymCommunityPostId === postId);

  // Local saved state for instantaneous UI feedback and persistence sync
  const [localSaved, setLocalSaved] = useState<boolean | null>(null);

  useEffect(() => {
    if (post && typeof post.isSavedByMe === 'boolean') {
      setLocalSaved(post.isSavedByMe);
    }
  }, [post?.isSavedByMe]);

  const isSaved = localSaved !== null ? localSaved : Boolean(post?.isSavedByMe);

  const handleToggleLike = () => {
    if (!userId) {
      toast.error('Please log in to like posts.');
      return;
    }
    toggleLikeMutation.mutate({ postId, userId, gymId: gymId ?? null });
  };

  const handleToggleSave = () => {
    if (!userId) {
      toast.error('Please log in to save posts.');
      return;
    }
    const nextSaved = !isSaved;
    setLocalSaved(nextSaved);

    toggleSaveMutation.mutate(
      { postId, userId, gymId: gymId ?? null },
      {
        onSuccess: (result: any) => {
          if (result && typeof result.isSaving === 'boolean') {
            setLocalSaved(result.isSaving);
          }
        },
        onError: () => {
          setLocalSaved(!nextSaved);
          toast.error('Failed to update save status.');
        }
      }
    );
  };

  const handleSendComment = useCallback(() => {
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
  }, [comment, userId, postId, replyingTo]);

  // Comments grouping
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

  const renderComment = (item: any, isReply = false) => (
    <View key={item.gymCommunityCommentId} className={`flex-row mb-5 relative ${isReply ? 'ml-6 mt-3' : ''}`}>
      {isReply && (
        <View className="absolute -left-[27px] -top-8 w-6 h-[46px] border-l-2 border-b-2 border-[#1F1F22] rounded-bl-xl" />
      )}
      <Pressable onPress={() => safeNavigate(() => router.push(`/community/profile/${item.authorId}`))}>
        <StaticAvatar
          uri={item.users?.profilePhoto}
          name={item.users?.name}
          size={32}
          className="w-8 h-8 rounded-full mr-3"
        />
      </Pressable>
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="text-white font-semibold text-[13px]">{item.users?.name || 'Unknown'}</Text>
          {item.authorId === userId && (
            <View className="bg-[#2B3513] px-1.5 py-0.5 rounded-[4px] ml-2">
              <Text className="text-[#C4EF00] text-[9px] font-semibold tracking-widest">YOU</Text>
            </View>
          )}
          <Text className="text-[#71717A] text-[11px] ml-2">{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text className="text-[#E4E4E7] text-[13px] leading-5 mb-1.5 pr-4">{item.content}</Text>
        {!isReply && (
          <Pressable
            className="active:opacity-70"
            onPress={() => setReplyingTo({ id: item.gymCommunityCommentId, name: item.users?.name || 'Unknown' })}
          >
            <Text className="text-[#71717A] text-[12px] font-semibold">Reply</Text>
          </Pressable>
        )}
      </View>
      {item.authorId === userId && (
        <Pressable
          className="p-1 active:opacity-70"
          onPress={() => deleteCommentMutation.mutate({ commentId: item.gymCommunityCommentId, userId: userId! })}
        >
          <X size={14} color="#71717A" />
        </Pressable>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <Text className="text-white text-lg">Post not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-white/10 rounded-lg">
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0A0A0A]"
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3 border-b border-[#1F1F22]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-semibold text-white tracking-wide">Post</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 120 : 30 }}
      >
        <View className="px-5 pt-4">
          <View className="flex-row justify-between items-center mb-3">
            <Pressable
              className="flex-row items-center active:opacity-70"
              onPress={() => safeNavigate(() => router.push(`/community/profile/${post.createdBy}`))}
            >
              <StaticAvatar
                uri={post.users?.profilePhoto}
                name={post.users?.name}
                size={40}
                className="w-10 h-10 rounded-full mr-3"
              />
              <View>
                <Text className="text-white font-semibold text-[15px]">{post.users?.name || 'Unknown User'}</Text>
                <Text className="text-[#71717A] text-xs mt-0.5">
                  {new Date(post.createdAt).toLocaleDateString()} • <Text className="text-[#C4EF00] font-medium capitalize text-sm">{post.users?.role}</Text>
                </Text>
              </View>
            </Pressable>
            <Pressable className="active:opacity-70 p-1">
              <DotsThreeVertical size={20} color="#71717A" weight="bold" />
            </Pressable>
          </View>

          {/* Caption */}
          <Text className="text-[#E4E4E7] text-[14px] leading-6 mb-4">
            {post.caption}
          </Text>

          {/* Image (tap to zoom) */}
          {post.imagePath && (
            <Pressable onPress={() => setImageZoomVisible(true)} className="mb-4 h-[300px] rounded-xl overflow-hidden">
              <Image
                source={{ uri: post.imagePath }}
                className="flex-1 bg-[#27272A]"
                resizeMode="cover"
              />
            </Pressable>
          )}

          {/* Actions */}
          <View className="flex-row items-center gap-6 mt-1 mb-6">
            <Pressable
              className="flex-row items-center gap-1.5 active:opacity-70"
              onPress={handleToggleLike}
            >
              <Heart
                size={22}
                color={post.isLikedByMe ? "#EF4444" : "#71717A"}
                weight={post.isLikedByMe ? "fill" : "bold"}
              />
              <Text className={post.isLikedByMe ? "text-[#EF4444] font-medium" : "text-[#71717A] font-medium"}>
                {post.likesCount || 0}
              </Text>
            </Pressable>

            <View className="flex-row items-center gap-1.5">
              <ChatCircle size={22} color="#71717A" weight="bold" />
              <Text className="text-[#71717A] font-medium">{topLevelComments.length}</Text>
            </View>

            <Pressable
              className="flex-row items-center gap-1.5 active:opacity-70 ml-auto"
              onPress={handleToggleSave}
            >
              <BookmarkSimple
                size={22}
                color={isSaved ? "#C4EF00" : "#71717A"}
                weight={isSaved ? "fill" : "bold"}
              />
            </Pressable>
          </View>

          {/* Divider */}
          <View className="h-px bg-[#1F1F22] mb-4" />

          {/* Comments Section */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white font-semibold text-[15px]">Comments</Text>
            {topLevelComments.length > 0 && (
              <Pressable
                className="flex-row items-center active:opacity-70"
                onPress={() => setActiveModal('sortOptions')}
              >
                <Text className="text-[#A1A1AA] text-xs mr-1">{sortBy === 'oldest' ? 'Oldest' : 'Newest'}</Text>
                <FadersHorizontal size={16} color="#A1A1AA" />
              </Pressable>
            )}
          </View>

          {commentsLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#C4EF00" size="small" />
            </View>
          ) : topLevelComments.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-[#71717A] text-sm">No comments yet. Be the first!</Text>
            </View>
          ) : (
            <>
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
            </>
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View
        className="bg-[#121214] px-5 py-3 border-t border-[#1F1F22]"
        style={{
          paddingBottom: isKeyboardVisible
            ? (Platform.OS === 'ios' ? 14 : 14)
            : Math.max(insets.bottom, 16),
          marginBottom: isKeyboardVisible && Platform.OS === 'android' ? 6 : 0,
        }}
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
              className="flex-1 text-white text-[14px] font-sans"
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              placeholderTextColor="#71717A"
              value={comment}
              onChangeText={setComment}
              selectionColor="#C4EF00"
              cursorColor="#C4EF00"
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

      {/* Full-Screen Image Zoom Modal */}
      <ImageZoomModal
        visible={imageZoomVisible}
        imageUri={post?.imagePath || undefined}
        onClose={() => setImageZoomVisible(false)}
        topInset={insets.top}
      />

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
    </KeyboardAvoidingView>
  );
}
