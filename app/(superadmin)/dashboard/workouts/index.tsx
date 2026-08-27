import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert, FlatList, Modal, Image, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Barbell, Plus, Trash, PlayCircle, ArrowLeft, ArrowsClockwise, PencilSimple, MagnifyingGlass } from 'phosphor-react-native';
import { useWorkoutVideos } from '@/hooks/workoutVideos/useWorkoutVideos';
import { useWorkouts } from '@/hooks/workouts/useWorkouts';
import { useDeleteWorkoutVideo } from '@/hooks/workoutVideos/useDeleteWorkoutVideo';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '@/lib/supabase';

const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'abs', label: 'Abs' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'legs', label: 'Legs' },
];

export default function WorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [accumulatedVideos, setAccumulatedVideos] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<{ id: string, name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const { data: videosResponse, isLoading: isLoadingVideos, refetch: refetchVideos, isFetching } = useWorkoutVideos(page, limit, typeFilter);
  const { data: workouts, isLoading: isLoadingWorkouts } = useWorkouts();
  const deleteMutation = useDeleteWorkoutVideo();

  const total = videosResponse?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  useEffect(() => {
    setPage(1);
    setAccumulatedVideos([]);
  }, [typeFilter]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      refetchVideos();
    }, [refetchVideos])
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 2000);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (videosResponse?.data) {
      if (page === 1) {
        setAccumulatedVideos(videosResponse.data);
      } else {
        setAccumulatedVideos((prev) => {
          const prevIds = new Set(prev.map((v) => v.workoutVideoId));
          const newUnique = videosResponse.data.filter((v: any) => !prevIds.has(v.workoutVideoId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [videosResponse, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (page === 1) {
      await refetchVideos();
    } else {
      setPage(1);
    }
    setRefreshing(false);
  }, [page, refetchVideos]);

  const handleBack = () => {
    triggerLightHaptic();
    router.push('/(superadmin)/dashboard');
  };

  const handleAddWorkout = () => {
    triggerLightHaptic();
    router.push('/(superadmin)/dashboard/workouts/add' as any);
  };

  const handleEdit = (video: any) => {
    triggerLightHaptic();
    router.push({
      pathname: '/(superadmin)/dashboard/workouts/add' as any,
      params: {
        id: video.workoutVideoId,
        exerciseName: video.exerciseName || '',
        workoutType: video.workoutType || '',
        videoUrl: video.videoUrl || '',
      },
    });
  };

  const handlePlayVideo = (fileName: string) => {
    triggerLightHaptic();
    if (fileName.startsWith('http')) {
      setSelectedVideoUrl(fileName);
    } else {
      const { data } = supabase.storage.from('workout-videos').getPublicUrl(fileName);
      setSelectedVideoUrl(data.publicUrl);
    }
    setVideoModalVisible(true);
  };

  const handleDelete = (videoId: string, exerciseName: string) => {
    triggerLightHaptic();
    setVideoToDelete({ id: videoId, name: exerciseName });
    setConfirmModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;
    setConfirmModalVisible(false);
    try {
      await deleteMutation.mutateAsync(videoToDelete.id);
      triggerSuccessHaptic();
      toast.success('Workout video deleted successfully.');
      setAccumulatedVideos(prev => prev.filter(v => v.workoutVideoId !== videoToDelete.id));
      setVideoToDelete(null);
    } catch (error) {
      toast.error('Failed to delete workout video.');
    }
  };

  const isLoading = (isLoadingVideos && page === 1) || isLoadingWorkouts;

  const mappedVideos = React.useMemo(() => {
    if (!accumulatedVideos || !workouts) return [];
    
    let filtered = accumulatedVideos;
    if (debouncedSearchQuery) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((video: any) => 
        (video.exerciseName || '').toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered.map((video: any) => {
      const workout = workouts.find((w: any) => w.workoutId === video.workoutId);
      return {
        ...video,
        workoutType: workout ? workout.workoutType : 'unknown',
      };
    });
  }, [accumulatedVideos, workouts, debouncedSearchQuery]);

  const renderFooter = () => {
    if (isFetching && !refreshing) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#BEF227" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View className="py-4 items-center">
          <Pressable
            onPress={() => setPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#111622] border border-[#1F293D] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#BEF227" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedVideos.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#888888] text-xs font-sans">You've reached the end of the workouts</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-4 pt-0 border-b border-[#111827]">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={handleBack} className="p-2 rounded-full bg-[#111622] border border-[#1F293D] active:opacity-75">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xl font-semibold text-white">Workouts</Text>
        </View>

        {mappedVideos.length > 0 && (
          <Pressable
            onPress={handleAddWorkout}
            className="flex-row items-center gap-1 px-3 py-2 rounded-xl bg-[#BEF227] active:opacity-80">
            <Plus size={16} color="#000000" weight="bold" />
            <Text className="text-xs font-semibold text-black">Add Workout</Text>
          </Pressable>
        )}
      </View>

      <View className="mt-4 px-4 pb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[{ id: 'all', label: 'All Workouts' }, ...MUSCLE_GROUPS].map((group) => (
            <Pressable
              key={group.id}
              onPress={() => setTypeFilter(group.id)}
              className={`px-4 py-2 rounded-full mr-2 ${typeFilter === group.id ? 'bg-[#BEF227]' : 'bg-[#1C1C1E]'}`}
            >
              <Text className={`text-sm font-semibold ${typeFilter === group.id ? 'text-black' : 'text-white'}`}>
                {group.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View className="px-4 pb-4">
        <View className="flex-row items-center bg-[#111622] border border-[#1F293D] rounded-xl px-4 py-3">
          <MagnifyingGlass size={20} color="#888888" />
          <TextInput
            className="flex-1 ml-2 text-white font-sans text-sm p-0"
            placeholder="Search exercises..."
            placeholderTextColor="#888888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#BEF227" />
          <Text className="text-[#888888] text-sm mt-3">Loading workouts...</Text>
        </View>
      ) : mappedVideos.length === 0 ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
          refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="w-16 h-16 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center mb-4">
            <Barbell size={32} color="#BEF227" weight="fill" />
          </View>
          <Text className="text-xl font-semibold text-white text-center">No Workouts Found</Text>
          <Text className="text-sm text-[#888888] text-center mt-2 mb-6 max-w-[280px]">
            Get started by adding your first exercise workout video to the library.
          </Text>
          <Pressable
            onPress={handleAddWorkout}
            className="w-full max-w-[200px] flex-row items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#BEF227] active:opacity-80">
            <Plus size={18} color="#000000" weight="bold" />
            <Text className="text-sm font-semibold text-black">Add Workout</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <FlatList
          data={mappedVideos}
          keyExtractor={(item) => item.workoutVideoId}
          refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          ListFooterComponent={renderFooter}
          renderItem={({ item: video }) => (
            <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-lg font-semibold text-white leading-6">
                    {video.exerciseName || 'Unnamed Exercise'}
                  </Text>

                  <View className="flex-row mt-2">
                    <View className="px-2.5 py-1 rounded-lg bg-[#111622] border border-[#1F293D]">
                      <Text className="text-[11px] font-medium text-[#BEF227] uppercase tracking-wider">
                        {video.workoutType}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => handleEdit(video)}
                    className="p-2 rounded-xl bg-[#1C1C1E] active:bg-[#2C2C2E]">
                    <PencilSimple size={18} color="#BEF227" />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(video.workoutVideoId, video.exerciseName)}
                    className="p-2 rounded-xl bg-[#1C1C1E] active:bg-[#2C2C2E]">
                    <Trash size={18} color="#FF453A" />
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={() => handlePlayVideo(video.videoUrl)}
                className="mt-4 flex-row items-center gap-2 p-3 rounded-xl bg-[#111622] border border-[#1F293D] active:opacity-75">
                <PlayCircle size={20} color="#BEF227" weight="fill" />
                <Text className="flex-1 text-xs text-[#888888]" numberOfLines={1}>
                  {video.videoUrl}
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setVideoModalVisible(false);
          setSelectedVideoUrl(null);
        }}
      >
        <View className="flex-1 bg-black/90 justify-center items-center">
          <Pressable
            onPress={() => {
              setVideoModalVisible(false);
              setSelectedVideoUrl(null);
            }}
            className="absolute top-12 right-4 z-10 px-4 py-2 rounded-full bg-[#1C1C1E] active:opacity-75"
          >
            <Text className="text-white font-semibold">Close</Text>
          </Pressable>
          {selectedVideoUrl && (
            selectedVideoUrl.toLowerCase().endsWith('.gif') ? (
              <Image
                source={{ uri: selectedVideoUrl }}
                style={{ width: '100%', height: 400 }}
                resizeMode="contain"
              />
            ) : (
              <Video
                source={{ uri: selectedVideoUrl }}
                style={{ width: '100%', height: 400 }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
                shouldPlay
                isMuted={true}
              />
            )
          )}
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmModalVisible}
        onClose={() => {
          setConfirmModalVisible(false);
          setVideoToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Workout Video"
        description={`Are you sure you want to delete "${videoToDelete?.name || 'this workout'}"?`}
        confirmText="Delete"
        confirmButtonColor="bg-red-500"
      />
    </View>
  );
}
