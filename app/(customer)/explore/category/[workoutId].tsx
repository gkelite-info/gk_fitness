import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, CaretRight, PlayCircle } from 'phosphor-react-native';
import { fetchWorkoutVideosByWorkoutId } from '@/helpers/workoutVideos/workoutVideoHelper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExploreCategoryScreen() {
  const { workoutId, workoutType } = useLocalSearchParams<{ workoutId: string; workoutType: string }>();
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    async function loadExercises() {
      try {
        if (!workoutId) return;
        const data = await fetchWorkoutVideosByWorkoutId(workoutId);
        setExercises(data);
      } catch (error) {
        console.error('[ExploreCategoryScreen] loadExercises error:', error);
      } finally {
        setLoading(false);
      }
    }
    loadExercises();
  }, [workoutId]);

  const recommendedExercises = exercises.slice(0, 4);
  const allExercises = exercises.slice(4);
  const visibleAllExercises = allExercises.slice(0, visibleCount);

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#27272A]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text className="text-xl font-semibold text-white capitalize">
          {workoutType || 'Exercises'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#C4EF00" className="mt-10" />
        ) : (
          <>
            {/* Recommended Section */}
            {recommendedExercises.length > 0 && (
              <View className="mb-8">
                <Text className="text-white text-lg font-bold mb-4">Recommended</Text>
                {recommendedExercises.map((item) => (
                  <Pressable
                    key={item.workoutVideoId}
                    className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 mb-3 flex-row items-center active:opacity-70"
                    onPress={() => {
                      router.push({
                        pathname: '/(customer)/explore/exercise-detail/[workoutVideoId]' as any,
                        params: { workoutVideoId: item.workoutVideoId, exerciseName: item.exerciseName }
                      });
                    }}
                  >
                    <View className="w-12 h-12 rounded-xl bg-[#242424] items-center justify-center mr-4">
                      <PlayCircle size={24} color="#C4EF00" weight="fill" />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className="text-white font-semibold text-base" numberOfLines={1}>{item.exerciseName}</Text>
                      <Text className="text-[#8E8E8E] text-xs mt-1 capitalize">{workoutType}</Text>
                    </View>
                    <CaretRight size={20} color="#8E8E8E" />
                  </Pressable>
                ))}
              </View>
            )}

            {/* All Exercises Section */}
            {allExercises.length > 0 && (
              <View>
                <Text className="text-white text-lg font-bold mb-4">All Exercises</Text>
                {visibleAllExercises.map((item) => (
                  <Pressable
                    key={item.workoutVideoId}
                    className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 mb-3 flex-row items-center active:opacity-70"
                    onPress={() => {
                      router.push({
                        pathname: '/(customer)/explore/exercise-detail/[workoutVideoId]' as any,
                        params: { workoutVideoId: item.workoutVideoId, exerciseName: item.exerciseName }
                      });
                    }}
                  >
                    <View className="w-12 h-12 rounded-xl bg-[#242424] items-center justify-center mr-4">
                      <PlayCircle size={24} color="#C4EF00" weight="fill" />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className="text-white font-semibold text-base" numberOfLines={1}>{item.exerciseName}</Text>
                      <Text className="text-[#8E8E8E] text-xs mt-1 capitalize">{workoutType}</Text>
                    </View>
                    <CaretRight size={20} color="#8E8E8E" />
                  </Pressable>
                ))}

                {visibleCount < allExercises.length && (
                  <Pressable
                    className="bg-[#161616] py-4 rounded-xl border border-[#27272A] items-center mt-2 active:opacity-70"
                    onPress={() => setVisibleCount((prev) => prev + 4)}
                  >
                    <Text className="text-white font-medium text-sm">Load More</Text>
                  </Pressable>
                )}
              </View>
            )}

            {exercises.length === 0 && (
              <Text className="text-[#8E8E8E] text-center mt-10">No exercises found for this category.</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
