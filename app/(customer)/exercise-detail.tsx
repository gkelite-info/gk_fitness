import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, Info, Play, Barbell, Lightbulb, CaretLeft, CaretRight, CheckCircle, Pause, ArrowCounterClockwise } from 'phosphor-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '@/lib/supabase';
import { useWorkoutPlanDayById } from '@/hooks/customerWorkouts/useWorkoutPlanDayById';
import { useWorkoutPlanDayExercises } from '@/hooks/customerWorkouts/useWorkoutPlanDayExercises';
import { useLogWorkoutCompletion } from '@/hooks/customerWorkouts/useLogWorkoutCompletion';

export default function ExerciseDetail() {
  const params = useLocalSearchParams<{
    dayId: string;
    exerciseIndex: string;
  }>();

  const initialIndex = parseInt(params.exerciseIndex || '0');

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useFocusEffect(
    React.useCallback(() => {
      setCurrentIndex(parseInt(params.exerciseIndex || '0'));
    }, [params.exerciseIndex])
  );

  const [isPlaying, setIsPlaying] = useState(true);

  const { data: dayData, isLoading: isLoadingDay } = useWorkoutPlanDayById(params.dayId);
  const { data: eData, isLoading: isLoadingExercises } = useWorkoutPlanDayExercises(params.dayId);

  const exercises = React.useMemo(() => {
    return eData ? [...eData].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) : [];
  }, [eData]);

  const isLoading = isLoadingDay || isLoadingExercises;

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  const startOver = () => {
    player.currentTime = 0;
    player.play();
    setIsPlaying(true);
  };

  // Handle navigation between exercises
  const { mutateAsync: logWorkout } = useLogWorkoutCompletion();
  const handleNext = async () => {
    if (currentIndex < (exercises.length || 5) - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      try {
        await logWorkout({
          planDayId: params.dayId,
          durationMinutes: dayData?.durationMinutes || 50,
        });
      } catch (err) {
        console.error('Failed to log workout', err);
      }
      router.push({
        pathname: '/(customer)/workout-session',
        params: { dayId: params.dayId }
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const currentExercise = exercises[currentIndex];
  const nextExercise = currentIndex < exercises.length - 1 ? exercises[currentIndex + 1] : null;

  const total = exercises.length || 5;
  const segments = Array.from({ length: total }, (_, i) => i);
  const workoutType = (dayData?.workoutType || 'CHEST DAY').toUpperCase();

  // Wait until data is loaded

  // Fallbacks if no data
  const title = currentExercise?.exerciseName || currentExercise?.name || 'Flat Barbell Bench Press';
  const setsValue = (currentExercise?.sets || '4 sets').replace(/[^0-9]/g, '') || '4';
  const repsValue = (currentExercise?.reps || '8-10 reps').replace(/[^0-9-]/g, '') || '8-10';
  const imageUri = currentExercise?.image?.uri || currentExercise?.image || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop';

  const localVideoSource = React.useMemo(() => {
    if (!currentExercise) return null;

    if (currentExercise.videoUrl) {
      const isAbsolute = currentExercise.videoUrl.startsWith('http://') || currentExercise.videoUrl.startsWith('https://');
      const fullUrl = isAbsolute ? currentExercise.videoUrl : supabase.storage.from('workout-videos').getPublicUrl(currentExercise.videoUrl).data.publicUrl;
      return fullUrl;
    }

    return null;
  }, [currentExercise]);

  const player = useVideoPlayer(localVideoSource, player => {
    player.loop = true;
    if (isPlaying) player.play();
  });

  const isGif = currentExercise?.videoUrl?.toLowerCase().endsWith('.gif') ||
    (localVideoSource && typeof localVideoSource === 'number' && localVideoSource.toString().includes('.gif'));

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] pt-12 px-4">
        <View className="h-10 w-full bg-[#18181B] rounded mb-6 animate-pulse" />
        <View className="flex-1 bg-[#18181B] rounded-2xl animate-pulse" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0A] pt-12">
      <View className="flex-row items-center justify-between px-4 mb-4 bg-transparent">
        <Pressable
          onPress={() => router.push({ pathname: '/(customer)/workout-session', params: { dayId: params.dayId } })}
          className="p-2"
        >
          <ArrowLeft size={24} color="#FFF" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-white text-base font-semibold tracking-widest uppercase mb-1">
            {workoutType}
          </Text>
          <Text className="text-[#C4EF00] text-xs font-semibold">
            Exercise {currentIndex + 1} of {total}
          </Text>
        </View>
        <View className="w-10" />
      </View>

      {/* Progress Bar */}
      {/* <View className="flex-row px-4 gap-x-2 mb-6">
        {segments.map((s, i) => (
          <View
            key={i}
            className={`flex-1 h-1 rounded-full ${i === currentIndex ? 'bg-[#C4EF00]' : i < currentIndex ? 'bg-[#C4EF00]/50' : 'bg-[#262626]'}`}
          />
        ))}
      </View> */}

      <ScrollView className="flex-1 px-4 mb-24" showsVerticalScrollIndicator={false}>
        <View className="bg-[#18181B] rounded-2xl p-4 border border-[#262626] mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white text-2xl font-semibold flex-1 mr-2">{title}</Text>
            <Info size={24} color="#8E8E8E" />
          </View>

          <View className="flex-row items-center mb-4">
            <Barbell size={16} color="#C4EF00" weight="fill" />
            <Text className="text-[#8E8E8E] text-xs ml-2">Targets: {dayData?.workoutType || 'Chest (Pectorals)'}</Text>
          </View>

          <View className={`relative w-full rounded-xl overflow-hidden bg-black items-center justify-center ${localVideoSource ? 'h-96' : 'h-52'}`}>
            {localVideoSource ? (
              isGif || title.toLowerCase()?.includes('chin up') || title.toLowerCase()?.includes('chin-up') || title.toLowerCase()?.includes('chinups') || title.toLowerCase()?.includes('woodchopper') || title.toLowerCase()?.includes('wood chopper') ? (
                <Image
                  source={localVideoSource}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
                <>
                  <VideoView
                    player={player}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                    nativeControls
                  />
                  <View className="absolute bottom-4 right-4 flex-row gap-x-3">
                    <Pressable
                      onPress={startOver}
                      className="w-12 h-12 rounded-full bg-black/60 items-center justify-center border border-white/20 active:bg-black/80"
                    >
                      <ArrowCounterClockwise size={24} color="#FFF" />
                    </Pressable>
                    <Pressable
                      onPress={togglePlayPause}
                      className="w-12 h-12 rounded-full bg-black/60 items-center justify-center border border-white/20 active:bg-black/80"
                    >
                      {isPlaying ? (
                        <Pause size={24} color="#FFF" weight="fill" />
                      ) : (
                        <Play size={24} color="#FFF" weight="fill" />
                      )}
                    </Pressable>
                  </View>
                </>
              )
            ) : (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: '100%', opacity: 0.6 }}
                  resizeMode="cover"
                />
                <View className="absolute w-16 h-16 rounded-full bg-[#C4EF00] items-center justify-center pl-1">
                  <Play size={32} color="black" weight="fill" />
                </View>
              </>
            )}
          </View>
        </View>

        <View className="flex-row gap-x-4 mb-4">
          <View className="flex-1 bg-[#18181B] border border-[#262626] rounded-2xl p-4 items-center">
            <Text className="text-[#8E8E8E] text-[10px] font-semibold tracking-widest uppercase mb-2">SETS</Text>
            <Text className="text-[#C4EF00] text-2xl font-semibold">{setsValue}</Text>
          </View>
          <View className="flex-1 bg-[#18181B] border border-[#262626] rounded-2xl p-4 items-center">
            <Text className="text-[#8E8E8E] text-[10px] font-semibold tracking-widest uppercase mb-2">REPS</Text>
            <Text className="text-white text-2xl font-semibold">{repsValue}</Text>
          </View>
        </View>

        <View className="bg-[#18181B] rounded-2xl border border-[#262626] p-4 flex-row items-center mb-4">
          <View className="w-10 h-10 rounded-full bg-[#191E00] items-center justify-center mr-4">
            <Lightbulb size={20} color="#C4EF00" weight="fill" />
          </View>
          <View className="flex-1 mr-2">
            <Text className="text-white text-sm mb-1">Focus on controlled reps...</Text>
            <Text className="text-[#8E8E8E] text-xs">Keep shoulder blades retracted.</Text>
          </View>
          <Text className="text-[#C4EF00] text-xs font-semibold">Form Tips</Text>
        </View>

        {nextExercise && (
          <Pressable onPress={handleNext} className="bg-[#18181B] rounded-2xl border border-[#262626] p-3 flex-row items-center mb-6">
            <Image
              source={{ uri: nextExercise.image?.uri || nextExercise.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' }}
              style={{ width: 60, height: 60, borderRadius: 12, marginRight: 16 }}
            />
            <View className="flex-1 mr-2">
              <Text className="text-[#C4EF00] text-[10px] font-semibold tracking-widest uppercase mb-1">UP NEXT</Text>
              <Text className="text-white text-base font-semibold mb-1">{nextExercise.exerciseName || nextExercise.name}</Text>
              <Text className="text-[#8E8E8E] text-xs">{nextExercise.sets || '3 sets'} • {nextExercise.reps || '10 reps'}</Text>
            </View>
            <CaretRight size={16} color="#8E8E8E" />
          </Pressable>
        )}

        <View className="px-4 py-4 bg-[#0A0A0A] flex-row items-center justify-between border-t border-[#18181B] mb-5">
          <Pressable
            onPress={handlePrev}
            disabled={currentIndex === 0}
            className={`w-12 h-12 rounded-xl items-center justify-center border border-[#262626] ${currentIndex === 0 ? 'bg-[#121212] opacity-50' : 'bg-[#18181B]'}`}
          >
            <CaretLeft size={24} color="#FFF" />
          </Pressable>

          <Pressable
            onPress={handleNext}
            className="flex-1 mx-4 h-14 bg-[#C4EF00] rounded-xl flex-row items-center justify-center active:opacity-80"
          >
            <Text className="text-black font-semibold text-base tracking-widest mr-2">{currentIndex === total - 1 ? 'FINISH WORKOUT' : 'FINISH SET'}</Text>
            <CheckCircle size={24} color="black" weight="fill" />
          </Pressable>

          <Pressable
            onPress={handleNext}
            disabled={currentIndex === total - 1}
            className={`w-12 h-12 rounded-xl items-center justify-center border border-[#262626] ${currentIndex === total - 1 ? 'bg-[#121212] opacity-50' : 'bg-[#18181B]'}`}
          >
            <CaretRight size={24} color="#FFF" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
