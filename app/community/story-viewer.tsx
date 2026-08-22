import React, { useState, useEffect, useRef } from 'react';
import { View, Dimensions, Pressable, Platform, Image as RNImage } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { X, Eye, DotsThreeVertical, Heart, ChatCircle } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useActiveStories, useMarkStoryViewed, useStoryViewers, useDeleteStory, useToggleStoryLike } from '@/hooks/community/useStories';
import { useBlockUser, useReportContent } from '@/hooks/community/useModeration';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { StoryCommentsModal } from '@/components/community/StoryCommentsModal';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  cancelAnimation, 
  runOnJS,
  withSequence,
  withSpring,
  withDelay
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000;

export default function StoryViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, userId } = useUser();
  const params = useLocalSearchParams();
  const initialUserIndex = params.userIndex ? parseInt(params.userIndex as string, 10) : 0;

  const { data: storyGroups } = useActiveStories(gymId ?? null, userId ?? null);
  const markViewedMutation = useMarkStoryViewed();
  const deleteStoryMutation = useDeleteStory();
  const toggleLikeMutation = useToggleStoryLike();
  const blockUserMutation = useBlockUser();
  const reportContentMutation = useReportContent();

  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [activeModal, setActiveModal] = useState<'none' | 'options' | 'confirmDelete' | 'confirmReport' | 'confirmBlock'>('none');
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);

  const progress = useSharedValue(0);
  const heartbeatScale = useSharedValue(0);
  const heartbeatOpacity = useSharedValue(0);

  const heartbeatStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartbeatScale.value }],
    opacity: heartbeatOpacity.value,
  }));

  const activeGroup = storyGroups?.[currentUserIndex];
  const activeStory = activeGroup?.stories[currentStoryIndex];
  
  const isVideo = activeStory?.mediaUrl?.match(/\.(mp4|mov|m4v)$/i);

  // Keep a ref of the latest indices to avoid stale closures in Reanimated worklets
  const stateRef = useRef({ 
    userIndex: currentUserIndex, 
    storyIndex: currentStoryIndex, 
    groupLength: activeGroup?.stories?.length || 0,
    groupsLength: storyGroups?.length || 0
  });

  useEffect(() => {
    stateRef.current = {
      userIndex: currentUserIndex,
      storyIndex: currentStoryIndex,
      groupLength: activeGroup?.stories?.length || 0,
      groupsLength: storyGroups?.length || 0
    };
  }, [currentUserIndex, currentStoryIndex, activeGroup, storyGroups]);

  // Reset video duration when story changes
  useEffect(() => {
    setVideoDuration(0);
  }, [currentUserIndex, currentStoryIndex]);

  // Story Viewers (if looking at own story)
  const isMyStory = activeGroup?.userId === userId;
  const { data: viewers } = useStoryViewers(isMyStory ? activeStory?.gymCommunityStoryId || null : null);

  // Mark viewed when story changes
  useEffect(() => {
    if (activeStory && userId && gymId && !isMyStory) {
      // Check if already viewed to avoid unnecessary calls
      const alreadyViewed = activeStory.views?.some(v => v.viewedBy === userId);
      if (!alreadyViewed) {
        markViewedMutation.mutate({ storyId: activeStory.gymCommunityStoryId, viewedBy: userId, gymId });
      }
    }
  }, [activeStory, userId, gymId]);

  // Reset progress when story changes
  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
  }, [currentUserIndex, currentStoryIndex]);

  // Animation controller
  useEffect(() => {
    if (!activeStory || isPaused || activeModal !== 'none' || isCommentsVisible || (isVideo && videoDuration === 0)) {
      cancelAnimation(progress);
      return;
    }

    const duration = isVideo ? videoDuration : STORY_DURATION;
    const remainingProgress = 1 - progress.value;
    const remainingDuration = duration * remainingProgress;

    progress.value = withTiming(
      1, 
      { duration: remainingDuration, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(goToNextStory)();
        }
      }
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [currentUserIndex, currentStoryIndex, isPaused, activeStory, isVideo, videoDuration, activeModal, isCommentsVisible]);

  const goToNextStory = () => {
    const { storyIndex, groupLength } = stateRef.current;
    if (storyIndex < groupLength - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      goToNextUser();
    }
  };

  const goToPrevStory = () => {
    const { storyIndex } = stateRef.current;
    if (storyIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else {
      goToPrevUser();
    }
  };

  const goToNextUser = () => {
    const { userIndex, groupsLength } = stateRef.current;
    if (userIndex < groupsLength - 1) {
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      // User requested that tapping/finishing doesn't close the screen. Loop the last story.
      progress.value = 0;
      progress.value = withTiming(1, { duration: isVideo ? videoDuration || STORY_DURATION : STORY_DURATION, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(goToNextStory)();
      });
    }
  };

  const goToPrevUser = () => {
    const { userIndex } = stateRef.current;
    if (userIndex > 0) {
      setCurrentUserIndex(prev => prev - 1);
      setCurrentStoryIndex(0);
    } else {
      // First user, first story, tap left -> restart
      progress.value = 0;
      progress.value = withTiming(1, { duration: isVideo ? videoDuration || STORY_DURATION : STORY_DURATION, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(goToNextStory)();
      });
    }
  };

  const handleDelete = () => {
    if (!activeStory || !userId || !gymId) return;
    deleteStoryMutation.mutate({ storyId: activeStory.gymCommunityStoryId, userId, gymId }, {
      onSuccess: () => {
        if (activeGroup?.stories.length === 1) {
          // If it was the last story in the group, we either go to next user or close
          if (storyGroups && currentUserIndex < storyGroups.length - 1) {
            goToNextUser();
          } else {
            router.back();
          }
        } else {
          // Else just go to the next story, the activeGroup will refresh
          goToNextStory();
        }
      }
    });
  };

  const handleTap = (event: any) => {
    if (event.x < SCREEN_WIDTH / 3) {
      goToPrevStory();
    } else {
      goToNextStory();
    }
  };

  const handleToggleLike = () => {
    if (!activeStory || !userId || !gymId) return;
    toggleLikeMutation.mutate({
      gymId,
      storyId: activeStory.gymCommunityStoryId,
      userId,
      isCurrentlyLiked: !!activeStory.isLikedByMe
    });
  };

  const handleDoubleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    heartbeatScale.value = 0;
    heartbeatOpacity.value = 1;
    heartbeatScale.value = withSequence(
      withSpring(1.2, { damping: 12, stiffness: 250 }),
      withDelay(400, withTiming(0, { duration: 300 }))
    );
    heartbeatOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));

    if (activeStory && !activeStory.isLikedByMe) {
      handleToggleLike();
    }
  };

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(350)
    .onStart(() => {
      runOnJS(handleDoubleTap)();
    });

  const tapGesture = Gesture.Tap()
    .onStart((e) => {
      runOnJS(handleTap)(e);
    });

  const exclusiveTaps = Gesture.Exclusive(doubleTapGesture, tapGesture);

  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => runOnJS(setIsPaused)(true))
    .onEnd(() => runOnJS(setIsPaused)(false));

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .activeOffsetY([-50, 50])
    .onEnd((e) => {
      if (e.translationY > 100) {
        runOnJS(router.back)();
      } else if (e.translationX < -50) {
        runOnJS(goToNextUser)();
      } else if (e.translationX > 50) {
        runOnJS(goToPrevUser)();
      }
    });

  const composedGestures = Gesture.Simultaneous(
    exclusiveTaps,
    longPressGesture,
    swipeGesture
  );

  if (!storyGroups || !activeGroup || !activeStory) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <View className="flex-1 bg-black">
      <GestureDetector gesture={composedGestures}>
        <View className="absolute inset-0">
          {/* Story Media */}
          {isVideo ? (
            <Video
              source={{ uri: activeStory.mediaUrl! }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, position: 'absolute' }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={!isPaused && activeModal === 'none' && !isCommentsVisible}
              isLooping={false}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded && status.durationMillis && videoDuration === 0) {
                  setVideoDuration(status.durationMillis);
                }
              }}
            />
          ) : activeStory.mediaUrl ? (
            <RNImage 
              source={{ uri: activeStory.mediaUrl }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, position: 'absolute' }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 bg-[#1C1C1E] items-center justify-center">
              <Text className="text-white text-lg">Loading...</Text>
            </View>
          )}

          {/* Dimmer for paused state (optional but looks good) */}
          {isPaused && <View className="absolute inset-0 bg-black/20" />}
        </View>
      </GestureDetector>

      {/* Heartbeat Overlay */}
      <Animated.View 
        pointerEvents="none" 
        className="absolute inset-0 items-center justify-center z-50"
        style={heartbeatStyle}
      >
        <Heart size={120} color="#EF4444" weight="fill" style={{ shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }} />
      </Animated.View>

        {/* Top UI Overlay */}
        <View 
          className="absolute top-0 left-0 right-0 z-10 bg-black/30"
          style={{ paddingTop: insets.top || 40, paddingHorizontal: 10, paddingBottom: 15 }}
          pointerEvents="box-none"
        >
          {/* Progress Bars */}
          <View className="flex-row gap-1 mb-3">
            {activeGroup.stories.map((s, idx) => {
              return <ProgressBar 
                key={s.gymCommunityStoryId} 
                index={idx} 
                currentIndex={currentStoryIndex} 
                progress={progress} 
              />;
            })}
          </View>

          {/* Header (Avatar, Name, Close) */}
          <View className="flex-row items-center justify-between px-1">
            <Pressable 
              className="flex-row items-center flex-1"
              onPress={() => {
                router.push(`/community/profile/${activeGroup.userId}`);
              }}
            >
              <StaticAvatar 
                uri={activeGroup.user.profilePhoto} 
                name={activeGroup.user.name} 
                size={36} 
                className="w-9 h-9 rounded-full border border-white/20 mr-3" 
              />
              <View>
                <Text className="text-white font-bold text-[15px]">{activeGroup.user.name}</Text>
                <Text className="text-white/70 text-xs">
                  {new Date(activeStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </Pressable>

            <View className="flex-row items-center z-20">
              <Pressable onPress={() => setActiveModal('options')} className="p-2 mr-2 hit-slop-10 active:opacity-70">
                <DotsThreeVertical size={24} color="#FFFFFF" weight="bold" />
              </Pressable>
              <Pressable onPress={() => router.back()} className="p-2 hit-slop-10 active:opacity-70">
                <X size={24} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Caption Overlay */}
        {activeStory.caption && (
          <View className="absolute bottom-20 left-4 right-4 items-center z-10 pointer-events-none">
            <View className="bg-black/60 px-4 py-3 rounded-2xl max-w-[90%]">
              <Text className="text-white text-base text-center font-medium leading-5">
                {activeStory.caption}
              </Text>
            </View>
          </View>
        )}

        {/* TikTok Style Sidebar */}
        <View className="absolute bottom-24 right-4 items-center z-20" pointerEvents="box-none">
          {/* Like */}
          <Pressable onPress={handleToggleLike} className="items-center mb-5 active:opacity-70 hit-slop-10">
            <View className="bg-black/30 p-2.5 rounded-full mb-1 border border-white/10">
              <Heart size={28} color={activeStory.isLikedByMe ? "#EF4444" : "#FFFFFF"} weight={activeStory.isLikedByMe ? "fill" : "regular"} />
            </View>
            <Text className="text-white font-bold text-xs shadow-black shadow-sm">{activeStory.likesCount || 0}</Text>
          </Pressable>

          {/* Comment */}
          <Pressable onPress={() => setIsCommentsVisible(true)} className="items-center mb-5 active:opacity-70 hit-slop-10">
            <View className="bg-black/30 p-2.5 rounded-full mb-1 border border-white/10">
              <ChatCircle size={28} color="#FFFFFF" weight="fill" />
            </View>
            <Text className="text-white font-bold text-xs shadow-black shadow-sm">{activeStory.commentsCount || 0}</Text>
          </Pressable>

          {/* Views (Only for own story) */}
          {isMyStory && (
            <Pressable onPress={() => {}} className="items-center mb-5 active:opacity-70 hit-slop-10">
              <View className="bg-black/30 p-2.5 rounded-full mb-1 border border-white/10">
                <Eye size={28} color="#FFFFFF" weight="regular" />
              </View>
              <Text className="text-white font-bold text-xs shadow-black shadow-sm">{activeStory.views?.length || 0}</Text>
            </Pressable>
          )}
        </View>

        {/* Story Comments Modal */}
        <StoryCommentsModal 
          visible={isCommentsVisible} 
          onClose={() => setIsCommentsVisible(false)} 
          storyId={activeStory.gymCommunityStoryId} 
        />

        {/* Modals */}
        <ActionSheetModal
          visible={activeModal === 'options'}
          onClose={() => setActiveModal('none')}
          options={
            isMyStory
              ? [{ label: 'Delete Story', destructive: true, onPress: () => setActiveModal('confirmDelete') }]
              : [
                  { label: 'Report Story', destructive: true, onPress: () => setActiveModal('confirmReport') },
                  { label: 'Block User', destructive: true, onPress: () => setActiveModal('confirmBlock') }
                ]
          }
        />

        <ActionSheetModal
          visible={activeModal === 'confirmDelete'}
          onClose={() => setActiveModal('none')}
          title="Delete Story"
          message="Are you sure you want to delete this story? This action cannot be undone."
          options={[
            { label: 'Delete', destructive: true, onPress: () => {
                setActiveModal('none');
                handleDelete();
            }}
          ]}
        />

        <ActionSheetModal
          visible={activeModal === 'confirmReport'}
          onClose={() => setActiveModal('none')}
          title="Report Story"
          message="Are you sure you want to report this story? Our team will review it shortly."
          options={[
            { label: 'Report', destructive: true, onPress: () => {
                if (activeStory && userId) {
                  reportContentMutation.mutate({ reporterId: userId, reason: 'Inappropriate content', reportedUserId: activeGroup.userId, postId: activeStory.gymCommunityStoryId });
                  goToNextStory();
                }
                setActiveModal('none');
            }}
          ]}
        />

        <ActionSheetModal
          visible={activeModal === 'confirmBlock'}
          onClose={() => setActiveModal('none')}
          title="Block User"
          message="Are you sure you want to block this user? You will no longer see their posts or stories."
          options={[
            { label: 'Block', destructive: true, onPress: () => {
                if (activeGroup && userId) {
                  blockUserMutation.mutate({ blockerId: userId, blockedId: activeGroup.userId });
                  // Force close viewer or skip this user's stories since they are now blocked
                  goToNextUser();
                }
                setActiveModal('none');
            }}
          ]}
        />
    </View>
  );
}

// Subcomponent for Animated Progress Bar
function ProgressBar({ index, currentIndex, progress }: { index: number, currentIndex: number, progress: any }) {
  const animatedStyle = useAnimatedStyle(() => {
    let width = '0%';
    if (index < currentIndex) {
      width = '100%';
    } else if (index === currentIndex) {
      width = `${progress.value * 100}%`;
    }
    return { width: width as any };
  });

  return (
    <View className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
      <Animated.View className="h-full bg-white rounded-full" style={animatedStyle} />
    </View>
  );
}
