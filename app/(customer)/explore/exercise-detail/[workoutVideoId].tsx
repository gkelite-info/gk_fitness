import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Play, Pause } from 'phosphor-react-native';
import { fetchWorkoutVideoById } from '@/helpers/workoutVideos/workoutVideoHelper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { supabase } from '@/lib/supabase';

export default function ExploreExerciseDetailScreen() {
  const { workoutVideoId, exerciseName } = useLocalSearchParams<{ workoutVideoId: string; exerciseName: string }>();
  const insets = useSafeAreaInsets();
  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    async function loadExercise() {
      try {
        if (!workoutVideoId) return;
        const data = await fetchWorkoutVideoById(workoutVideoId);
        setExercise(data);
      } catch (error) {
        console.error('[ExploreExerciseDetailScreen] loadExercise error:', error);
      } finally {
        setLoading(false);
      }
    }
    loadExercise();
  }, [workoutVideoId]);

  const localVideoSource = React.useMemo(() => {
    if (!exercise?.videoUrl) return null;
    const url = exercise.videoUrl.trim();
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('file://') ||
      url.startsWith('data:')
    ) {
      return url;
    }
    return supabase.storage.from('workout-videos').getPublicUrl(url).data.publicUrl;
  }, [exercise]);

  const player = useVideoPlayer(localVideoSource, player => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 bg-transparent absolute z-10 w-full" style={{ top: insets.top }}>
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#C4EF00" className="m-auto" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Video Section */}
          <View className="w-full relative bg-black" style={{ height: width * 1.2 }}>
            {exercise?.videoUrl ? (
              <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                showsTimecodes={false}
                nativeControls={false}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-[#8E8E8E]">No video available</Text>
              </View>
            )}

            {/* Play/Pause overlay button */}
            {exercise?.videoUrl && (
              <Pressable
                onPress={() => setIsPlaying(!isPlaying)}
                className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-black/50 items-center justify-center active:opacity-70"
              >
                {isPlaying ? (
                  <Pause size={24} color="#C4EF00" weight="fill" />
                ) : (
                  <Play size={24} color="#C4EF00" weight="fill" />
                )}
              </Pressable>
            )}
          </View>

          {/* Details Section */}
          <View className="px-5 pt-6">
            <Text className="text-[#C4EF00] font-semibold text-sm mb-1 uppercase tracking-wider">Exercise Detail</Text>
            <Text className="text-white text-3xl font-bold">{exercise?.exerciseName || exerciseName}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
