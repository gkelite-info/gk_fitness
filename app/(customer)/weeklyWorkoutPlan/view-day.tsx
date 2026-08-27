import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Clock, Info, X } from 'phosphor-react-native';
import { Video, ResizeMode } from 'expo-av';
import { fetchWorkoutPlanDayById } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import { useWorkoutPlanDayById } from '@/hooks/customerWorkouts/useWorkoutPlanDayById';
import { useWorkoutPlanDayExercises } from '@/hooks/customerWorkouts/useWorkoutPlanDayExercises';

export default function ViewDay() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();

  const { data: dayData, isLoading: isLoadingDay } = useWorkoutPlanDayById(dayId);
  const { data: eData, isLoading: isLoadingExercises } = useWorkoutPlanDayExercises(dayId);

  const exercises = React.useMemo(() => {
    return eData ? [...eData].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) : [];
  }, [eData]);

  const isLoading = isLoadingDay || isLoadingExercises;

  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');

  const openVideo = (exerciseName: string) => {
    const normalizedTitle = exerciseName?.toLowerCase() || '';
    let localVideoSource: any = null;

    if (normalizedTitle.includes('incline') && normalizedTitle.includes('dumb')) {
      localVideoSource = require('../../../assets/videos/incline_dumbell_press.mp4');
    } else if (normalizedTitle.includes('bench press')) {
      localVideoSource = require('../../../assets/videos/bench_press_video.mp4');
    } else if (normalizedTitle.includes('pec deck') || normalizedTitle.includes('pec-deck') || normalizedTitle.includes('peck deck')) {
      localVideoSource = require('../../../assets/videos/pec_deck_exercise_video.mp4');
    } else if (normalizedTitle.includes('dip')) {
      localVideoSource = require('../../../assets/videos/dips_exercise_video.mp4');
    } else if (normalizedTitle.includes('chest press') || normalizedTitle.includes('machine press')) {
      localVideoSource = require('../../../assets/videos/chest_press_machine_video.mp4');
    } else if (normalizedTitle.includes('cable') || normalizedTitle.includes('fly')) {
      localVideoSource = require('../../../assets/videos/cable_fly_video.mp4');
    } else if (normalizedTitle.includes('pushup') || normalizedTitle.includes('push-up')) {
      localVideoSource = require('../../../assets/videos/pushup_video.mp4');
    } else if (normalizedTitle.includes('romanian deadlift') || normalizedTitle.includes('rdl')) {
      localVideoSource = require('../../../assets/videos/romanian_deadlift_video.mp4');
    } else if (normalizedTitle.includes('deadlift') && !normalizedTitle.includes('romanian')) {
      localVideoSource = require('../../../assets/videos/deadlift_back_workout_video.mp4');
    } else if (normalizedTitle.includes('squat')) {
      localVideoSource = require('../../../assets/videos/squat_exercise_video.mp4');
    } else if (normalizedTitle.includes('leg press')) {
      localVideoSource = require('../../../assets/videos/legpress_exercise_video.mp4');
    } else if (normalizedTitle.includes('leg extension')) {
      localVideoSource = require('../../../assets/videos/leg_extension_video.mp4');
    } else if (normalizedTitle.includes('calf raise')) {
      localVideoSource = require('../../../assets/videos/calf_raise_video.mp4');
    } else if (normalizedTitle.includes('lunge')) {
      localVideoSource = require('../../../assets/videos/lunges_exercise_video.mp4');
    } else if (normalizedTitle.includes('hamstring curl') || normalizedTitle.includes('leg curl')) {
      localVideoSource = require('../../../assets/videos/hamstring_curls_video.mp4');
    } else if (normalizedTitle.includes('lat pulldown') || normalizedTitle.includes('pulldown')) {
      localVideoSource = require('../../../assets/videos/lat_pulldown_video.mp4');
    } else if (normalizedTitle.includes('pull up') || normalizedTitle.includes('pull-up') || normalizedTitle.includes('pullups')) {
      localVideoSource = require('../../../assets/videos/pull_ups_video.mp4');
    } else if (normalizedTitle === 'seated row' || normalizedTitle.includes('seated row')) {
      localVideoSource = require('../../../assets/videos/back_seated_row_video.mp4');
    } else if (normalizedTitle.includes('single arm row') || normalizedTitle.includes('single-arm row')) {
      localVideoSource = require('../../../assets/videos/single_arm_row_video.mp4');
    } else if (normalizedTitle.includes('t bar row') || normalizedTitle.includes('t-bar row')) {
      localVideoSource = require('../../../assets/videos/t_bar_row_exercise_video.mp4');
    } else if (normalizedTitle.includes('hyper-extension') || normalizedTitle.includes('hyperextension') || normalizedTitle.includes('hyper extension')) {
      localVideoSource = require('../../../assets/videos/hyper_extension_video.mp4');
    } else if (normalizedTitle.includes('overhead press')) {
      localVideoSource = require('../../../assets/videos/overhead_press_video.mp4');
    } else if (normalizedTitle.includes('lateral raise')) {
      localVideoSource = require('../../../assets/videos/lateral_raises_video.mp4');
    } else if (normalizedTitle.includes('front raise')) {
      localVideoSource = require('../../../assets/videos/front-raised_video.mp4');
    } else if (normalizedTitle.includes('reverse pec deck') || normalizedTitle.includes('reverse fly')) {
      localVideoSource = require('../../../assets/videos/reverse_pec_deck_video.mp4');
    } else if (normalizedTitle.includes('shrug')) {
      localVideoSource = require('../../../assets/videos/shrugs_video.mp4');
    } else if (normalizedTitle.includes('arnold press')) {
      localVideoSource = require('../../../assets/videos/arnold_press_video.mp4');
    } else if (normalizedTitle.includes('face pull')) {
      localVideoSource = require('../../../assets/videos/face_pulls_video.mp4');
    } else if (normalizedTitle.includes('preacher curl')) {
      localVideoSource = require('../../../assets/videos/preacher_curls_video.mp4');
    } else if (normalizedTitle.includes('hammer curl')) {
      localVideoSource = require('../../../assets/videos/hammer_curls_video.mp4');
    } else if (normalizedTitle.includes('bicep curl') || normalizedTitle.includes('curl')) {
      localVideoSource = require('../../../assets/videos/bicep_curls_video.mp4');
    } else if (normalizedTitle.includes('overhead extension')) {
      localVideoSource = require('../../../assets/videos/overhead_extension_video.mp4');
    } else if (normalizedTitle.includes('pushdown') || normalizedTitle.includes('push down') || normalizedTitle.includes('push-down') || normalizedTitle.includes('tricep extension')) {
      localVideoSource = require('../../../assets/videos/tricep_pushdown_video.mp4');
    } else if (normalizedTitle.includes('skull crusher') || normalizedTitle.includes('skullcrusher')) {
      localVideoSource = require('../../../assets/videos/skull_crushers_video.mp4');
    } else if (normalizedTitle.includes('chin up') || normalizedTitle.includes('chin-up') || normalizedTitle.includes('chinups')) {
      localVideoSource = require('../../../assets/videos/chin_ups_video.gif');
    }

    if (localVideoSource) {
      setSelectedVideo(localVideoSource);
      setVideoTitle(exerciseName);
      setIsModalVisible(true);
    }
  };



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
              <Pressable
                key={item.dayExerciseId || index}
                onPress={() => openVideo(item.exerciseName || item.name)}
                className="flex-row items-center bg-[#18181B] rounded-2xl p-4 border border-[#262626] active:opacity-70"
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
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

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

          <Text className="text-[#D4FF00] text-xl font-bold mb-6 mx-4 text-center">{videoTitle}</Text>

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
