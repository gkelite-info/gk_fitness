import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Info, Play, Barbell, Lightbulb, CaretLeft, CaretRight, CheckCircle, Pause, ArrowCounterClockwise } from 'phosphor-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useWorkoutPlanDayById } from '@/hooks/workout/useWorkoutPlanDayById';
import { useWorkoutPlanDayExercises } from '@/hooks/workout/useWorkoutPlanDayExercises';

export default function ExerciseDetail() {
  const params = useLocalSearchParams<{
    dayId: string;
    exerciseIndex: string;
  }>();

  const initialIndex = parseInt(params.exerciseIndex || '0');

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const { data: dayData, isLoading: isLoadingDay } = useWorkoutPlanDayById(params.dayId);
  const { data: eData, isLoading: isLoadingExercises } = useWorkoutPlanDayExercises(params.dayId);
  
  const exercises = React.useMemo(() => {
    return eData ? [...eData].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) : [];
  }, [eData]);

  const isLoading = isLoadingDay || isLoadingExercises;

  const togglePlayPause = () => {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const startOver = () => {
    videoRef.current?.replayAsync();
    setIsPlaying(true);
  };

  // Handle navigation between exercises
  const handleNext = () => {
    if (currentIndex < (exercises.length || 5) - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] pt-12 px-4">
        <View className="h-10 w-full bg-[#18181B] rounded mb-6 animate-pulse" />
        <View className="flex-1 bg-[#18181B] rounded-2xl animate-pulse" />
      </View>
    );
  }

  // Fallbacks if no data
  const title = currentExercise?.exerciseName || currentExercise?.name || 'Flat Barbell Bench Press';
  const setsValue = (currentExercise?.sets || '4 sets').replace(/[^0-9]/g, '') || '4';
  const repsValue = (currentExercise?.reps || '8-10 reps').replace(/[^0-9-]/g, '') || '8-10';
  const imageUri = currentExercise?.image?.uri || currentExercise?.image || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop';

  const normalizedTitle = title.toLowerCase();
  let localVideoSource: any = null;

  if (normalizedTitle.includes('incline') && normalizedTitle.includes('dumb')) {
    localVideoSource = require('../../assets/videos/incline_dumbell_press.mp4');
  } else if (normalizedTitle.includes('bench press')) {
    localVideoSource = require('../../assets/videos/bench_press_video.mp4');
  } else if (normalizedTitle.includes('pec deck') || normalizedTitle.includes('pec-deck') || normalizedTitle.includes('peck deck')) {
    localVideoSource = require('../../assets/videos/pec_deck_exercise_video.mp4');
  } else if (normalizedTitle.includes('dip')) {
    localVideoSource = require('../../assets/videos/dips_exercise_video.mp4');
  } else if (normalizedTitle.includes('chest press') || normalizedTitle.includes('machine press')) {
    localVideoSource = require('../../assets/videos/chest_press_machine_video.mp4');
  } else if (normalizedTitle.includes('woodchopper') || normalizedTitle.includes('wood chopper')) {
    localVideoSource = require('../../assets/videos/cable_woodchoppers.gif');
  } else if (normalizedTitle.includes('cable') || normalizedTitle.includes('fly')) {
    localVideoSource = require('../../assets/videos/cable_fly_video.mp4');
  } else if (normalizedTitle.includes('pushup') || normalizedTitle.includes('push-up')) {
    localVideoSource = require('../../assets/videos/pushup_video.mp4');
  } else if (normalizedTitle.includes('romanian deadlift') || normalizedTitle.includes('rdl')) {
    localVideoSource = require('../../assets/videos/romanian_deadlift_video.mp4');
  } else if (normalizedTitle.includes('deadlift') && !normalizedTitle.includes('romanian')) {
    localVideoSource = require('../../assets/videos/deadlift_back_workout_video.mp4');
  } else if (normalizedTitle.includes('squat')) {
    localVideoSource = require('../../assets/videos/squat_exercise_video.mp4');
  } else if (normalizedTitle.includes('leg press')) {
    localVideoSource = require('../../assets/videos/legpress_exercise_video.mp4');
  } else if (normalizedTitle.includes('leg extension')) {
    localVideoSource = require('../../assets/videos/leg_extension_video.mp4');
  } else if (normalizedTitle.includes('calf raise')) {
    localVideoSource = require('../../assets/videos/calf_raise_video.mp4');
  } else if (normalizedTitle.includes('lunge')) {
    localVideoSource = require('../../assets/videos/lunges_exercise_video.mp4');
  } else if (normalizedTitle.includes('hamstring curl') || normalizedTitle.includes('leg curl')) {
    localVideoSource = require('../../assets/videos/hamstring_curls_video.mp4');
  } else if (normalizedTitle.includes('lat pulldown') || normalizedTitle.includes('pulldown')) {
    localVideoSource = require('../../assets/videos/lat_pulldown_video.mp4');
  } else if (normalizedTitle.includes('pull up') || normalizedTitle.includes('pull-up') || normalizedTitle.includes('pullups')) {
    localVideoSource = require('../../assets/videos/pull_ups_video.mp4');
  } else if (normalizedTitle === 'seated row' || normalizedTitle.includes('seated row')) {
    localVideoSource = require('../../assets/videos/back_seated_row_video.mp4');
  } else if (normalizedTitle.includes('single arm row') || normalizedTitle.includes('single-arm row')) {
    localVideoSource = require('../../assets/videos/single_arm_row_video.mp4');
  } else if (normalizedTitle.includes('t bar row') || normalizedTitle.includes('t-bar row')) {
    localVideoSource = require('../../assets/videos/t_bar_row_exercise_video.mp4');
  } else if (normalizedTitle.includes('hyper-extension') || normalizedTitle.includes('hyperextension') || normalizedTitle.includes('hyper extension')) {
    localVideoSource = require('../../assets/videos/hyper_extension_video.mp4');
  } else if (normalizedTitle.includes('overhead press')) {
    localVideoSource = require('../../assets/videos/overhead_press_video.mp4');
  } else if (normalizedTitle.includes('lateral raise')) {
    localVideoSource = require('../../assets/videos/lateral_raises_video.mp4');
  } else if (normalizedTitle.includes('front raise')) {
    localVideoSource = require('../../assets/videos/front-raised_video.mp4');
  } else if (normalizedTitle.includes('reverse pec deck') || normalizedTitle.includes('reverse fly')) {
    localVideoSource = require('../../assets/videos/reverse_pec_deck_video.mp4');
  } else if (normalizedTitle.includes('shrug')) {
    localVideoSource = require('../../assets/videos/shrugs_video.mp4');
  } else if (normalizedTitle.includes('arnold press')) {
    localVideoSource = require('../../assets/videos/arnold_press_video.mp4');
  } else if (normalizedTitle.includes('face pull')) {
    localVideoSource = require('../../assets/videos/face_pulls_video.mp4');
  } else if (normalizedTitle.includes('preacher curl')) {
    localVideoSource = require('../../assets/videos/preacher_curls_video.mp4');
  } else if (normalizedTitle.includes('hammer curl')) {
    localVideoSource = require('../../assets/videos/hammer_curls_video.mp4');
  } else if (normalizedTitle.includes('bicep curl') || normalizedTitle.includes('curl')) {
    localVideoSource = require('../../assets/videos/bicep_curls_video.mp4');
  } else if (normalizedTitle.includes('overhead extension')) {
    localVideoSource = require('../../assets/videos/overhead_extension_video.mp4');
  } else if (normalizedTitle.includes('pushdown') || normalizedTitle.includes('push down') || normalizedTitle.includes('push-down') || normalizedTitle.includes('tricep extension')) {
    localVideoSource = require('../../assets/videos/tricep_pushdown_video.mp4');
  } else if (normalizedTitle.includes('skull crusher') || normalizedTitle.includes('skullcrusher')) {
    localVideoSource = require('../../assets/videos/skull_crushers_video.mp4');
  } else if (normalizedTitle.includes('chin up') || normalizedTitle.includes('chin-up') || normalizedTitle.includes('chinups')) {
    localVideoSource = require('../../assets/videos/chin_ups_video.gif');
  } else if (normalizedTitle.includes('bicycle crunch')) {
    localVideoSource = require('../../assets/videos/bicycle_crunches.mp4');
  } else if (normalizedTitle.includes('hanging knee raise') || normalizedTitle.includes('knee raise')) {
    localVideoSource = require('../../assets/videos/hanging_knee_raise_video.mp4');
  } else if (normalizedTitle.includes('russian twist')) {
    localVideoSource = require('../../assets/videos/russian_twist_video.mp4');
  } else if (normalizedTitle.includes('leg raise')) {
    localVideoSource = require('../../assets/videos/leg_raise_video.mp4');
  } else if (normalizedTitle.includes('crunch')) {
    localVideoSource = require('../../assets/videos/crunches_video.mp4');
  } else if (normalizedTitle.includes('plank')) {
    localVideoSource = require('../../assets/videos/plank_video.mp4');
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
              (normalizedTitle.includes('chin up') || normalizedTitle.includes('chin-up') || normalizedTitle.includes('chinups') || normalizedTitle.includes('woodchopper') || normalizedTitle.includes('wood chopper')) ? (
                <Image
                  source={localVideoSource}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
              <>
                <Video
                  ref={videoRef}
                  source={localVideoSource}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                  isMuted={true}
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
