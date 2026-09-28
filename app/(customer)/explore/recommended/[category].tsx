import React, { useState, useEffect } from 'react';
import { View, FlatList, Pressable, Image, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, PlayCircle, Barbell, BookmarkSimple, X, MagnifyingGlass } from 'phosphor-react-native';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from '@/components/ui/Video';
import { useUser } from '@/context/UserContext';
import { useCustomerMuscleGroupWorkouts } from '@/hooks/customerWorkouts/useCustomerMuscleGroupWorkouts';
import { supabase } from '@/lib/supabase';
import { Modal } from 'react-native';
import { useWorkoutVideos } from '@/hooks/workoutVideos/useWorkoutVideos';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';

export default function RecommendedExercisesScreen() {
  const { category, filterTabs: filterTabsStr } = useLocalSearchParams<{ category: string, filterTabs?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const [activeCategory, setActiveCategory] = useState(category || 'All');
  const filterTabs = filterTabsStr ? JSON.parse(filterTabsStr) : ['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Abs'];

  const { data: customerProfileData } = useCustomerProfile(userId);
  const userGender = customerProfileData?.customerData?.gender?.toLowerCase() || 'all';

  const getWorkoutType = (cat: string) => {
    const c = cat.toLowerCase();
    if (c === 'shoulders') return 'shoulder';
    if (c === 'arms') return 'arms';
    return c;
  };

  const { data: queryData, isLoading } = useWorkoutVideos(1, 100, getWorkoutType(activeCategory), userGender, 'all');
  const rawExercises = queryData?.data || [];

  const allExercises = React.useMemo(() => {
    const uniqueRecommended: any[] = [];
    const seenNames = new Set<string>();
    for (const ex of rawExercises) {
      const name = ex.exerciseName || 'Workout Video';
      if (!seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        uniqueRecommended.push({ ...ex, exerciseName: name, category: activeCategory });
      }
    }

    return uniqueRecommended.map(ex => {
      let videoSource = null;
      if (ex.videoUrl) {
        const isAbsolute = ex.videoUrl.startsWith('http://') || ex.videoUrl.startsWith('https://');
        videoSource = isAbsolute ? ex.videoUrl : supabase.storage.from('workout-videos').getPublicUrl(ex.videoUrl).data.publicUrl;
      }
      return { ...ex, video: videoSource || ex.video || null, reps: 'Follow along' };
    });
  }, [rawExercises, activeCategory]);

  const [savedWorkouts, setSavedWorkouts] = useState<Record<string, boolean>>({});
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExercises = React.useMemo(() => {
    if (!searchQuery.trim()) return allExercises;
    const lowerQ = searchQuery.toLowerCase();
    return allExercises.filter(ex => ex.exerciseName?.toLowerCase().includes(lowerQ));
  }, [allExercises, searchQuery]);

  // Client-side infinite scroll pagination
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Reset pagination when category changes
  useEffect(() => {
    setPage(1);
  }, [activeCategory, searchQuery]);

  const limit = 10;
  const displayedExercises = filteredExercises.slice(0, page * limit);
  const hasMore = filteredExercises.length > page * limit;

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setPage(prev => prev + 1);
        setIsLoadingMore(false);
      }, 800); // 800ms delay to simulate network request and show spinner
    }
  };

  const toggleSave = (title: string) => {
    setSavedWorkouts(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const openVideo = (exerciseName: string, videoSource: any) => {
    if (videoSource) {
      setSelectedVideo(videoSource);
      setVideoTitle(exerciseName);
      setIsModalVisible(true);
    }
  };

  const renderItem = ({ item: workout }: { item: any }) => (
    <View className="bg-[#111111] rounded-3xl border border-[#1D1D1D] pb-4 flex-1 m-2">
      <View className="w-full h-40 bg-[#1a1a1a] rounded-t-3xl items-center justify-center overflow-hidden">
        {workout.video ? (
          (workout.exerciseName?.toLowerCase().includes('chin up') || workout.exerciseName?.toLowerCase().includes('chin-up') || workout.exerciseName?.toLowerCase().includes('chinups') || workout.exerciseName?.toLowerCase().includes('woodchopper') || workout.exerciseName?.toLowerCase().includes('wood chopper')) ? (
            <Image
              source={workout.video}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Video
              source={workout.video}
              style={{ width: '100%', height: '100%' }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              isLooping={false}
              isMuted={true}
            />
          )
        ) : (
          <Image 
            source={workout.image ? (typeof workout.image === 'string' ? { uri: workout.image } : workout.image) : require('../../../../assets/dumbell-strength.png')} 
            style={{ width: '100%', height: '100%' }} 
            resizeMode="cover" 
          />
        )}
        {workout.video && (
          <Pressable
            onPress={() => openVideo(workout.exerciseName, workout.video)}
            className="absolute inset-0 bg-black/30 items-center justify-center active:opacity-80"
          >
            <BlurView intensity={30} tint="light" className="p-3 rounded-full overflow-hidden border border-white/30">
              <PlayCircle size={36} color="white" weight="fill" />
            </BlurView>
          </Pressable>
        )}
        <View className="absolute top-3 left-3 flex-row gap-1">
          <View className="bg-[#C4EF00] p-1.5 rounded-lg"><Barbell size={14} color="black" weight="fill" /></View>
        </View>
        <View className="absolute top-3 right-3">
          <Pressable onPress={() => toggleSave(workout.exerciseName)}>
            <BookmarkSimple size={20} color={savedWorkouts[workout.exerciseName] ? "#C4EF00" : "white"} weight={savedWorkouts[workout.exerciseName] ? "fill" : "bold"} />
          </Pressable>
        </View>
      </View>
      <View className="px-4 pt-4 gap-1.5">
        <Text className="text-white font-semibold text-base" numberOfLines={1}>{workout.exerciseName}</Text>
        <Text className="text-[#8E8E8E] text-xs font-medium">{workout.category}</Text>
        <Text className="text-[#8E8E8E] text-xs font-medium mt-1">{workout.reps}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#27272A]">
        <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70 p-2 bg-[#1A1A1A] rounded-full">
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-xl font-semibold flex-1">
          Recommended {category !== 'All' ? category : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 py-3 border-b border-[#27272A] bg-[#0F0F0F]">
        <View className="flex-row items-center bg-[#1A1A1A] border border-[#27272A] rounded-xl px-4 py-3">
          <MagnifyingGlass size={18} color="#8E8E8E" weight="bold" />
          <TextInput
            placeholder="Search exercises..."
            placeholderTextColor="#8E8E8E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-white font-medium text-[15px]"
            selectionColor="#C4EF00"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} className="p-1">
              <X size={16} color="#8E8E8E" weight="bold" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters */}
      {filterTabs && filterTabs.length > 0 && (
        <View className="pt-4 pb-2 border-b border-[#27272A]">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {filterTabs.map((tab: string, i: number) => {
              const isActive = tab === activeCategory;
              return (
                <Pressable
                  key={i}
                  onPress={() => setActiveCategory(tab)}
                  className={`px-5 py-2.5 rounded-full border ${
                    isActive ? 'border-[#C4EF00] bg-[#1a2000]' : 'border-[#27272A] bg-[#111111]'
                  } active:opacity-70`}
                >
                  <Text className={`text-sm font-semibold ${isActive ? 'text-[#C4EF00]' : 'text-[#8E8E8E]'}`}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#C4EF00" />
        </View>
      ) : allExercises.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[#8E8E8E] text-center leading-5 text-base">
            No recommended exercises found for {category}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedExercises}
          keyExtractor={(item, index) => `${item.exerciseName}-${index}`}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore ? (
              <View className="py-6 items-center justify-center">
                <ActivityIndicator size="small" color="#C4EF00" />
              </View>
            ) : displayedExercises.length > 0 ? (
              <View className="py-6 items-center justify-center">
                <Text className="text-[#666666] text-sm font-medium">End of list</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Video Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 bg-black/95 justify-center items-center">
          <Pressable
            onPress={() => setIsModalVisible(false)}
            className="absolute top-12 right-6 p-2 z-50 bg-[#18181B] rounded-full border border-[#262626]"
          >
            <X size={24} color="#FFF" />
          </Pressable>

          <Text className="text-[#C4EF00] text-xl font-bold mb-6 mx-4 text-center">{videoTitle}</Text>

          <View className="w-full h-80 bg-black">
            {selectedVideo && (
              (videoTitle?.toLowerCase().includes('chin up') || videoTitle?.toLowerCase().includes('chin-up') || videoTitle?.toLowerCase().includes('chinups')) ? (
                <Image
                  source={selectedVideo}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
                <Video
                  source={selectedVideo}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  shouldPlay
                  isLooping={false}
                  isMuted={true}
                />
              )
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
