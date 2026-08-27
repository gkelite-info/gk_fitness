import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ImageBackground, Pressable } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { X } from 'phosphor-react-native';

export default function WorkoutCountdown() {
  const { dayId, workoutType, duration, exercisesCount } = useLocalSearchParams<{
    dayId: string;
    workoutType: string;
    duration: string;
    exercisesCount: string;
  }>();

  const [countdown, setCountdown] = useState(3);
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let interval: ReturnType<typeof setInterval>;
      let localSound: Audio.Sound | null = null;

      async function startCountdown() {
        setCountdown(3);

        try {
          const { sound } = await Audio.Sound.createAsync(require('../../assets/tick.mp3'));
          localSound = sound;
        } catch (error) {
          // console.log('Error loading sound:', error);
        }

        if (!isMounted) return;

        if (localSound) {
          localSound.replayAsync();
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }

            if (localSound) {
              localSound.replayAsync();
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            return prev - 1;
          });
        }, 1000);
      }

      startCountdown();

      return () => {
        isMounted = false;
        if (interval) clearInterval(interval);
        if (localSound) {
          localSound.unloadAsync();
        }
      };
    }, [])
  );

  useEffect(() => {
    if (countdown === 0) {
      router.replace({
        pathname: '/(customer)/exercise-detail',
        params: { dayId, exerciseIndex: 0 }
      });
    }
  }, [countdown, dayId]);

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
          <Text className="text-white text-[40px] font-semibold mb-[30px]">{workoutType || 'Chest Day'}</Text>

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
