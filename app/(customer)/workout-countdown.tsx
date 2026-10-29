import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ImageBackground, Pressable } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { X } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWatchSession } from '@/hooks/watch/useWatchSession';
import { useWorkoutPlanDayExercises } from '@/hooks/customerWorkouts/useWorkoutPlanDayExercises';
import { useTrainerWorkoutPlanDayExercises } from '@/hooks/trainerWorkoutPlans/useTrainerWorkoutPlanDayExercises';

export default function WorkoutCountdown() {
  const { dayId, workoutType, duration, exercisesCount, isTrainer, isCustom } = useLocalSearchParams<{
    dayId: string;
    workoutType: string;
    duration: string;
    exercisesCount: string;
    isTrainer?: string;
    isCustom?: string;
  }>();

  const isTrainerPlan = isTrainer === 'true';
  const { data: customerExercises } = useWorkoutPlanDayExercises(!isTrainerPlan && isCustom !== 'true' ? dayId : undefined);
  const { data: trainerExercises } = useTrainerWorkoutPlanDayExercises(isTrainerPlan && isCustom !== 'true' ? dayId : undefined);
  const { pushWorkout } = useWatchSession();

  const [countdown, setCountdown] = useState(3);
  const player = useAudioPlayer(require('../../assets/tick.mp3'));
  const lastSyncedKeyRef = useRef<string | null>(null);

  const playTick = useCallback(async () => {
    try {
      if (player) {
        await player.seekTo(0);
        player.play();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (e) {
      try {
        player?.play();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
  }, [player]);

  // Sync to watch in background once exercises are ready
  useEffect(() => {
    if (!dayId && isCustom !== 'true') return;
    const syncKey = `${dayId}_${isCustom}`;
    if (lastSyncedKeyRef.current === syncKey) return;

    async function syncToWatch() {
      try {
        let exerciseList: any[] = [];
        if (isCustom === 'true') {
          const raw = await AsyncStorage.getItem('@custom_workout_session');
          if (raw) exerciseList = JSON.parse(raw);
        } else {
          exerciseList = isTrainerPlan ? (trainerExercises || []) : (customerExercises || []);
        }

        if (exerciseList && exerciseList.length > 0) {
          lastSyncedKeyRef.current = syncKey;
          pushWorkout({
            planDayId: dayId || 'custom',
            workoutType: workoutType || 'Workout',
            durationMinutes: parseInt(duration, 10) || 45,
            isTrainerPlan,
            isCustom: isCustom === 'true',
            exercises: exerciseList,
          });
        }
      } catch (err) {
        console.warn('[workout-countdown] Watch sync attempt failed:', err);
      }
    }
    syncToWatch();
  }, [dayId, isCustom, isTrainerPlan, customerExercises, trainerExercises, workoutType, duration]);

  // Focus effect resets countdown and fires synchronized ticks for 3, 2, 1
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let hasNavigated = false;

      // 1. Immediately reset to 3 and play tick #1
      setCountdown(3);
      playTick();

      // 2. Play synchronized tick on every step: 2, 1, then navigate at 0
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (isMounted && !hasNavigated) {
              hasNavigated = true;
              if (isCustom === 'true') {
                router.replace({
                  pathname: '/(customer)/exercise-detail',
                  params: { dayId, exerciseIndex: 0, isCustom: 'true' }
                });
              } else {
                router.replace({
                  pathname: '/(customer)/workout-session',
                  params: { dayId, isTrainer: isTrainer || 'false' }
                });
              }
            }
            return 0;
          }

          // Fires tick #2 at count 2, and tick #3 at count 1
          playTick();
          return prev - 1;
        });
      }, 1000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [dayId, isTrainer, isCustom, playTick])
  );

  return (
    <ImageBackground
      source={require('../../assets/start_workout_image.png')}
      className="flex-1 w-full h-full"
      resizeMode="cover"
    >
      <View className="flex-1 bg-black/60 items-center justify-between py-[60px]">
        <Pressable onPress={() => router.back()} className="absolute top-[50px] left-[20px] z-10 p-2.5">
          <X size={24} color="#FFF" />
        </Pressable>

        <View className="items-center mt-[60px]">
          <View className="mb-2.5">
            <Text className="text-[40px] text-[#DFFF00]">🏋️</Text>
          </View>
          <Text className="text-white text-[40px] font-semibold mb-[30px]">{workoutType ? workoutType.charAt(0).toUpperCase() + workoutType.slice(1) : 'Chest Day'}</Text>

          <View className="flex-row items-center">
            <View className="items-center px-[30px]">
              <Text className="text-white text-2xl font-semibold">{exercisesCount || '0'}</Text>
              <Text className="text-[#8E8E8E] text-[10px] tracking-[1.5px] mt-1">EXERCISES</Text>
            </View>
            <View className="w-[1px] h-[40px] bg-[#333333]" />
            <View className="items-center px-[30px]">
              <Text className="text-white text-2xl font-semibold">{duration || '50'}</Text>
              <Text className="text-[#8E8E8E] text-[10px] tracking-[1.5px] mt-1">MINUTES</Text>
            </View>
          </View>
        </View>

        <View className="items-center justify-center flex-1 mt-0">
          <View className="w-[300px] h-[300px] rounded-[150px] border-4 border-[#DFFF00] items-center justify-center mb-[30px]">
            <Text className="text-[#DFFF00] text-sm font-semibold tracking-[3px] absolute top-[70px]">GET READY</Text>
            <Text className="text-[#DFFF00] text-[140px] font-semibold">{countdown > 0 ? countdown : 1}</Text>
          </View>
        </View>

        <View className="items-center mb-20">
          <Text className="text-white text-[32px] font-semibold mb-2.5">Let&apos;s Go! 💪</Text>
          <Text className="text-[#8E8E8E] text-base">Your best self is waiting.</Text>
        </View>
      </View>
    </ImageBackground>
  );
}
