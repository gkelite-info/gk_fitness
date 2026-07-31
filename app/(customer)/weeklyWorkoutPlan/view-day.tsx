import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Clock, Info } from 'phosphor-react-native';
import { fetchWorkoutPlanDayById } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export default function ViewDay() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const [dayData, setDayData] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!dayId) return;
      setIsLoading(true);
      try {
        const dData = await fetchWorkoutPlanDayById(dayId);
        if (dData) {
          setDayData(dData);
          const eData = await fetchWorkoutPlanDayExercises(dayId);
          if (eData) {
            setExercises(eData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
          }
        }
      } catch (error) {
        console.error('Error fetching view-day data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [dayId]);

  return (
    <View className="flex-1 bg-[#0A0A0A] pt-12 pb-28 px-4">
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => router.back()}
          className="w-11 h-11 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-white text-2xl font-semibold">
            {dayData ? `${dayData.dayOfWeek.charAt(0).toUpperCase() + dayData.dayOfWeek.slice(1)} Workout` : 'Workout'}
          </Text>
          <Text className="text-[#8E8E8E] text-sm">View your planned workout details.</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center pt-20">
          <ActivityIndicator size="large" color="#D4FF00" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Banner */}
          <View className="bg-[#121212] rounded-3xl border border-[#262626] p-5 mb-8 relative overflow-hidden">
            <View className="z-10 w-2/3">
              <Text className="text-[#D4FF00] text-xs font-semibold tracking-widest mb-2 uppercase">{dayData ? `${dayData.dayOfWeek} Workout` : 'Workout'}</Text>
              <Text className="text-white text-3xl font-black font-semibold mb-4">{dayData?.workoutType || 'Workout'}</Text>

              <View className="flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] mr-2" />
                <Text className="text-[#8E8E8E] text-sm">{exercises.length} Exercises</Text>
              </View>
            </View>

            <View
              style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20 }}
              className="w-8 h-8 rounded-full bg-[#18181B] border border-[#262626] items-center justify-center"
            >
              <Star size={16} color="#D4FF00" weight="fill" />
            </View>
          </View>

          <Text className="text-white text-xl font-semibold mb-4">Exercises ({exercises.length})</Text>

          <View className="gap-y-3">
            {exercises.map((item, index) => (
              <View
                key={item.dayExerciseId || index}
                className="flex-row items-center bg-[#18181B] rounded-2xl p-4 border border-[#262626]"
              >
                <View className="w-8 h-8 rounded-full border border-[#D4FF00] items-center justify-center mr-4">
                  <Text className="text-[#D4FF00] text-sm font-semibold">{index + 1}</Text>
                </View>

                <View className="flex-1 mr-2">
                  <Text className="text-white text-base font-semibold mb-0.5">{item.exerciseName}</Text>
                  <Text className="text-[#8E8E8E] text-xs">{item.category}</Text>
                </View>

                <View className="items-end">
                  <Text className="text-[#D4FF00] text-xs font-semibold tracking-wider mb-0.5">SETS</Text>
                  <Text className="text-[#8E8E8E] text-xs">{item.reps || 'N/A'}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
