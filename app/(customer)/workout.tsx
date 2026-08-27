import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, Pressable, TextInput, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { ArrowRightIcon, CaretRightIcon, ClockIcon, HandWavingIcon, Check, Bell, LightningIcon, CalendarIcon, StarIcon, CheckCircleIcon, SquaresFour, Barbell, BookmarkSimple, PlayCircle, MagnifyingGlass, Robot, CalendarPlus, Sparkle, XCircle, CaretLeft, X, ArrowsClockwise } from 'phosphor-react-native';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, router } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import { useCustomerMuscleGroupWorkouts } from '@/hooks/customerWorkouts/useCustomerMuscleGroupWorkouts';
import { useCustomerDashboardData } from '@/hooks/customerWorkouts/useCustomerDashboardData';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useQueryClient } from '@tanstack/react-query';
import WorkoutShimmer from '@/components/shimmers/workoutShimmer';

export default function CustomerWorkout() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const navigation = useNavigation();
  const { name, userId } = useUser();
  const queryClient = useQueryClient();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data: dashboardData, isLoading: isLoadingPlan, isRefetching } = useCustomerDashboardData(userId);

  const hasPlan = dashboardData?.hasPlan ?? null;
  const weeklyPlanDays = dashboardData?.weeklyPlanDays ?? [];
  const todayWorkout = dashboardData?.todayWorkout ?? null;
  const yesterdayWorkout = dashboardData?.yesterdayWorkout ?? null;

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customerDashboardData'] }),
      queryClient.invalidateQueries({ queryKey: ['customerMuscleGroupWorkouts'] })
    ]);
    setIsManualRefreshing(false);
  };

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', () => {
      setActiveTab(null);
    });
    return unsubscribe;
  }, [navigation]);

  const cardsText = [
    { text: "Muscle Group" },
    { text: "Equipment" },
    { text: "Videos" },
    { text: "Saved" },
  ];

  const weeklyPlan = [
    { day: 'Mon', type: 'Push', status: 'active' },
    { day: 'Tue', type: 'Pull', status: 'completed' },
    { day: 'Wed', type: 'Legs', status: 'completed' },
    { day: 'Thu', type: 'Rest', status: 'rest' },
    { day: 'Fri', type: 'Push', status: 'completed' },
  ];

  const quikStartCards = [
    { image: require('../../assets/workout_fullbody.jpg'), text: "Full Body Workout" },
    { image: require('../../assets/workout_upperbody.jpg'), text: "Upper Body Workout" },
    { image: require('../../assets/workout_legs.jpg'), text: "Lower Body Workout" },
    { image: require('../../assets/workout_abs.jpg'), text: "Abs Workout" }
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<CustomRefreshControl refreshing={isManualRefreshing || isRefetching} onRefresh={handleRefresh} />}
    >
      <View className="items-start justify-start p-5 gap-3 pb-20">
        <Text className="text-foreground text-sm text-[#8E8E8E]">
          Hi {name || 'User'} <HandWavingIcon size={20} color='#FFCB3F' weight='fill' />
        </Text>
        <Text className="text-foreground text-sm text-white">
          Let's crush your <Text className='text-base font-semibold text-[#C4EF00]'>Muscle Gain</Text> goal today!
        </Text>
        <Text className="text-foreground text-sm text-[#8E8E8E]">
          Discipline today, strength tomorrow.
        </Text>

        <View className='border border-[#4B4B4B] bg-[#222222] rounded-full px-3 py-2 flex-row gap-2 items-center self-start'>
          <View className='h-4 w-4 rounded-full bg-[#C4EF00]'></View>
          <Text className='text-white text-sm'>Goal: Muscle Gain</Text>
          <CaretRightIcon size={17} color='white' />
        </View>

        {/* <View className="w-full mt-5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            {cardsText.map((item, index) => {
              const isActive = activeTab === item.text;
              return (
                <Pressable
                  onPress={() => setActiveTab(isActive ? null : item.text)}
                  className={`px-4 py-2 justify-center ${isActive ? 'border-b-2 border-[#C4EF00]' : 'border border-[#27272A] rounded-xl bg-[#111111]'}`}
                  key={index}
                >
                  <Text className={`text-sm ${isActive ? 'text-[#C4EF00] font-semibold' : 'text-[#A1A1AA]'}`}>{item.text}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View> */}

        {/* {activeTab === 'Muscle Group' ? (
          <MuscleGroupView />
        ) : activeTab === 'Equipment' ? (
          <EquipmentView />
        ) : !activeTab ? ( */}
        {activeTab === 'Full Body Workout' || activeTab === 'Upper Body Workout' || activeTab === 'Lower Body Workout' || activeTab === 'Abs Workout' ? (
          <View className="w-full mt-2">
            <Pressable onPress={() => setActiveTab(null)} className="flex-row items-center gap-2 mb-2 active:opacity-70">
              <CaretLeft size={20} color="white" weight="bold" />
              <Text className="text-white font-semibold">Back to Workout</Text>
            </Pressable>
            <MuscleGroupView
              filterTabs={
                activeTab === 'Upper Body Workout' ? ['All', 'Chest', 'Back', 'Shoulders'] :
                  activeTab === 'Lower Body Workout' ? ['All', 'Legs'] :
                    activeTab === 'Abs Workout' ? ['All', 'Abs'] :
                      undefined
              }
            />
          </View>
        ) : (
          <>
            {isLoadingPlan || isManualRefreshing ? (
              <WorkoutShimmer />
            ) : !hasPlan ? (
              <View className="mt-5 w-full">
                <Text className='text-[#C4EF00] font-semibold text-xs tracking-wider mb-3 uppercase'>Weekly Workout Plan</Text>
                <View className="w-full border border-[#27272A] bg-[#111111] rounded-3xl p-5 items-center pb-6">
                  <View className="bg-[#242A00] p-3 rounded-2xl mb-4 relative">
                    <CalendarIcon size={32} color="#C4EF00" weight="regular" />
                    <View className="absolute -bottom-1 -right-1 bg-black rounded-full border border-[#27272A]">
                      <XCircle size={14} color="#8E8E8E" weight="fill" />
                    </View>
                  </View>

                  <Text className="text-white text-2xl font-semibold mb-2">No Workout Plan Yet</Text>
                  <Text className="text-[#8E8E8E] text-center text-sm px-4 mb-6">
                    Create a personalized weekly plan based on your fitness goal.
                  </Text>

                  <Pressable
                    onPress={() => router.push('/(customer)/workoutPlan' as any)}
                    className="w-full bg-[#111111] border border-[#27272A] rounded-2xl p-4 flex-row items-center active:opacity-80 mb-5"
                  >
                    <View className="bg-[#1A1A1A] p-3 rounded-xl mr-3 border border-[#27272A]">
                      <CalendarPlus size={24} color="white" weight="regular" />
                    </View>
                    <View className="flex-1 justify-center">
                      <Text className="text-white font-semibold text-lg mb-0.5">Build My Own Plan</Text>
                      <Text className="text-[#8E8E8E] text-xs pr-2">Choose workouts and schedule them manually.</Text>
                    </View>
                    <CaretRightIcon size={20} color="#8E8E8E" />
                  </Pressable>

                  <View className="flex-row items-center justify-center gap-1.5">
                    <Sparkle size={14} color="#C4EF00" weight="fill" />
                    <Text className="text-[#8E8E8E] text-xs font-medium">Uses your onboarding preferences</Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <View className='mt-8 w-full flex-row items-center justify-between'>
                  <Text className='text-[#C4EF00] font-semibold text-xs tracking-wider uppercase'>Weekly Workout Plan</Text>
                  <Pressable
                    onPress={() => router.push('/(customer)/weeklyWorkoutPlan' as any)}
                    className='flex-row items-center gap-1 active:opacity-70'
                  >
                    <Text className='text-[#8E8E8E] text-sm'>View Full Plan</Text>
                    <CaretRightIcon size={14} color='#8E8E8E' />
                  </Pressable>
                </View>

                <View className='w-full mt-4'>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingRight: 20 }}
                  >
                    {weeklyPlanDays.map((item, index) => {
                      const isActive = item.status === 'active';
                      const isRest = item.type === 'Rest';
                      const isCompleted = item.status === 'completed';

                      return (
                        <View
                          key={index}
                          className={`items-center justify-center rounded-2xl py-3 px-1 w-[85px] gap-2.5 ${isActive ? 'bg-[#C4EF00]' : 'border border-[#27272A] bg-[#111111]'
                            }`}
                        >
                          <Text className={`font-semibold text-sm ${isActive ? 'text-black' : 'text-[#8E8E8E]'}`}>
                            {item.dayAbbr}
                          </Text>

                          {isActive && (
                            <View className="h-9 w-9 rounded-full bg-black items-center justify-center">
                              <Check size={18} color="white" weight="bold" />
                            </View>
                          )}

                          {isCompleted && !isRest && (
                            <View className="h-9 w-9 rounded-full bg-[#242A00] items-center justify-center">
                              <Check size={18} color="#C4EF00" weight="bold" />
                            </View>
                          )}

                          {!isActive && !isCompleted && !isRest && (
                            <View className="h-9 w-9 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#27272A]">
                              <Barbell size={18} color="#555" weight="fill" />
                            </View>
                          )}

                          {isRest && !isActive && (
                            <View className="h-9 w-9 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#27272A]">
                              <Bell size={18} color="#555" weight="fill" />
                            </View>
                          )}

                          <Text className={`font-semibold text-[11px] uppercase ${isActive ? 'text-black' : isRest ? 'text-[#555]' : 'text-white'}`}>
                            {item.type}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                  <View className="flex-row items-center justify-between mt-5">
                    <Text className="text-[#8E8E8E] text-xs font-medium mb-1">Weekly Progress</Text>
                    <Text className="text-white text-xs font-semibold mb-1">0%</Text>
                  </View>
                  <View className="w-full h-1.5 bg-[#27272A] rounded-full mt-1">
                    <View className="h-full bg-[#C4EF00] rounded-full" style={{ width: '0%' }} />
                  </View>
                </View>

                <View className='flex flex-row items-center justify-between gap-2 w-full mt-5 bg-[#191919] p-3 pb-0 rounded-xl'>
                  <View className='w-[50%] h-full gap-3 pb-4'>
                    <Text className='text-[#C4EF00] text-xs font-semibold tracking-wider'>TODAY'S WORKOUT</Text>
                    <Text className='text-xl text-white font-semibold'>
                      {(() => {
                        const type = todayWorkout?.type || 'Rest Day';
                        return type.charAt(0).toUpperCase() + type.slice(1);
                      })()}
                    </Text>

                    {todayWorkout?.type !== 'Rest' && (
                      <>
                        <View className='flex-row items-center gap-1'>
                          <ClockIcon size={15} color='#8E8E8E' />
                          <Text className='text-[#8E8E8E] text-sm'>{todayWorkout?.duration} Mins</Text>
                        </View>
                        <View className='flex-row items-center gap-1'>
                          <View className='h-2 w-2 rounded-full bg-[#C4EF00]'></View>
                          <Text className='text-[#8E8E8E] text-sm'>Exercises</Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            if (todayWorkout?.dayId) {
                              router.push({
                                pathname: '/(customer)/workout-countdown',
                                params: {
                                  dayId: todayWorkout.dayId,
                                  workoutType: todayWorkout.type,
                                  duration: todayWorkout.duration,
                                  exercisesCount: todayWorkout.exercisesCount || 0
                                }
                              });
                            }
                          }}
                          className='bg-[#C4EF00] p-2 px-3 mt-1 flex-row items-center justify-center gap-2 w-fit rounded-xl'
                        >
                          <Text className='font-semibold text-black'>Start Workout</Text>
                          <ArrowRightIcon size={15} color='black' weight='bold' />
                        </Pressable>
                      </>
                    )}
                    {todayWorkout?.type === 'Rest' && (
                      <Text className='text-[#8E8E8E] text-sm mt-1'>Take it easy and recover for tomorrow.</Text>
                    )}
                  </View>
                  <View className='w-[50%] items-end justify-end'>
                    {todayWorkout?.type !== 'Rest' && (
                      <Image
                        source={require('../../assets/fit-1.png')}
                        style={{ width: 160, height: 160, marginRight: -10, marginBottom: -10 }}
                        resizeMode='contain'
                      />
                    )}
                  </View>
                </View>
              </>
            )}

            <View className='mt-5 w-full'>
              <Text className='text-white font-semibold'>EXPLORE MORE</Text>
              <View className='mt-3 flex-wrap flex-row justify-between'>
                {quikStartCards.map((item, index) => {
                  return (
                    <Pressable
                      className='bg-[#111111] w-[48%] mb-3 p-3 flex-row items-center rounded-xl border border-[#1D1D1D] active:opacity-70'
                      key={index}
                      onPress={() => {
                        if (item.text === 'Full Body Workout' || item.text === 'Upper Body Workout' || item.text === 'Lower Body Workout' || item.text === 'Abs Workout') {
                          setActiveTab(item.text);
                        }
                      }}
                    >
                      <View className='h-9 w-9 rounded-xl overflow-hidden bg-[#242424]'>
                        <Image source={item.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </View>
                      <View className='flex-1 px-2'>
                        <Text className='text-xs text-white font-semibold' numberOfLines={2}>{item.text}</Text>
                      </View>
                      <CaretRightIcon size={16} color='white' />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Not required */}
            {/* <View className='mt-5 w-full flex-row items-center justify-between'>
              <View className='bg-[#111111] w-[48%] p-3 rounded-xl gap-1 border border-[#1D1D1D]'>
                <Text className='text-[#C4EF00] font-semibold text-sm'>FEATURED PROGRAM</Text>
                <Text className='text-white font-semibold text-lg w-[80%]'>8 Week Mass Builder</Text>
                <View className='flex-row items-center gap-1'>
                  <LightningIcon size={13} color='#8E8E8E' />
                  <Text className='text-[#8E8E8E] text-sm'>Intermediate</Text>
                </View>
                <View className='flex-row items-center gap-1'>
                  <CalendarIcon size={13} color='#8E8E8E' />
                  <Text className='text-[#8E8E8E] text-sm'>4 Days/Week</Text>
                </View>
                <View className='flex-row justify-center items-center bg-green-00'>
                  <Pressable className='mt-2 bg-[#1D1D1D] px-4 py-2 rounded-lg'>
                    <Text className='text-white text-sm font-semibold'>View Program</Text>
                  </Pressable>
                </View>
              </View>

              <View className='bg-[#111111] w-[48%] p-3 rounded-xl gap-1 border border-[#1D1D1D]'>
                <Text className='text-[#C4EF00] font-semibold text-sm'>DAILY CHALLENGE</Text>
                <Text className='text-white font-semibold text-lg w-[80%]'>Plank Hold Challenge</Text>
                <View className='flex-row items-center gap-1'>
                  <ClockIcon size={13} color='#8E8E8E' />
                  <Text className='text-[#8E8E8E] text-sm'>Hold for 2 min</Text>
                </View>
                <View className='flex-row items-center gap-1'>
                  <StarIcon size={13} color='#8E8E8E' />
                  <Text className='text-[#8E8E8E] text-xs'>Complete & earn 50 XP</Text>
                </View>
                <View className='flex-row justify-center items-center bg-green-00'>
                  <Pressable className='flex-row items-center gap-1 mt-2 bg-[#C4EF00] px-4 py-2 rounded-lg'>
                    <Text className='text-black text-sm font-semibold'>View Program</Text>
                    <CaretRightIcon size={15} />
                  </Pressable>
                </View>
              </View>
            </View> */}
            {/* Not required */}

            {yesterdayWorkout && yesterdayWorkout.type !== 'Rest' && (
              <View className='bg-[#111111] border border-[#1D1D1D] mt-5 w-full p-4 rounded-lg flex flex-row justify-between'>
                <View className='bg-yellow-00 flex-row items-center justify-start'>
                  <Image
                    source={require('../../assets/workout.png')}
                    style={{ height: 120, width: 120 }}
                    resizeMode='contain'
                  />
                  <View>
                    <Text className='text-white font-semibold'>{yesterdayWorkout.type}</Text>
                    <View className='flex-row justify-between gap-2 mt-1'>
                      <Text className='text-xs text-[#8E8E8E]'>{yesterdayWorkout.duration} mins</Text>
                      <Text className='text-xs text-[#8E8E8E]'>{yesterdayWorkout.exercisesCount || 0} Exercises</Text>
                    </View>
                  </View>
                </View>
                <View className='bg-blue-00 flex flex-col items-center justify-center gap-1'>
                  <Text className='text-[#8E8E8E] text-sm'>Yesterday</Text>
                  <CheckCircleIcon size={25} weight='fill' color='#C4EF00' />
                </View>
              </View>
            )}
          </>
        )}
        {/* ) : null} */}
      </View>
    </ScrollView>
  );
}

function MuscleGroupView({ filterTabs }: { filterTabs?: string[] }) {
  const { userId } = useUser();
  const [activeSubTab, setActiveSubTab] = useState('All');
  const [savedWorkouts, setSavedWorkouts] = useState<Record<string, boolean>>({});
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');

  const [page, setPage] = useState(1);
  const limit = 5;

  useEffect(() => {
    setPage(1);
  }, [activeSubTab]);

  const openVideo = (exerciseName: string, videoSource: any) => {
    if (videoSource) {
      setSelectedVideo(videoSource);
      setVideoTitle(exerciseName);
      setIsModalVisible(true);
    }
  };

  const { data: recommendedExercises = [], isLoading, isFetching } = useCustomerMuscleGroupWorkouts(userId, activeSubTab);

  const toggleSave = (title: string) => {
    setSavedWorkouts(prev => ({ ...prev, [title]: !prev[title] }));
  };

  let subTabs = [
    { name: 'All', icon: <SquaresFour size={28} color="#8E8E8E" weight="fill" /> },
    { name: 'Chest', image: require('../../assets/chest-stood.png') },
    { name: 'Back', image: require('../../assets/back-stood.png') },
    { name: 'Shoulders', image: require('../../assets/shoulders-stood.png') },
    { name: 'Legs', image: require('../../assets/workout_legs.jpg') },
    { name: 'Abs', image: require('../../assets/workout_abs.jpg') },
  ];

  if (filterTabs) {
    subTabs = subTabs.filter(tab => filterTabs.includes(tab.name));
  }

  const popularWorkoutsMap: Record<string, any[]> = {
    Chest: [
      { title: 'Push Day', subtitle: 'Chest • Shoulders • Triceps', time: '45 min', exercisesCount: '6 Exercises', image: require('../../assets/push-day.png') },
      { title: 'Upper Chest Focus', subtitle: 'Chest Focus', time: '40 min', exercisesCount: '5 Exercises', image: require('../../assets/upper-chest-focus.png') },
    ],
    Back: [
      { title: 'Pull Day', subtitle: 'Back • Biceps', time: '45 min', exercisesCount: '6 Exercises', image: require('../../assets/fit-1.png') },
      { title: 'Lat Builder', subtitle: 'Back Focus', time: '40 min', exercisesCount: '5 Exercises', image: require('../../assets/workout_upperbody.jpg') },
    ],
    Shoulders: [
      { title: 'Boulder Shoulders', subtitle: 'Shoulders Focus', time: '35 min', exercisesCount: '5 Exercises', image: require('../../assets/chest-intersity.png') },
      { title: 'Shoulder Press Mastery', subtitle: 'Heavy Shoulders', time: '40 min', exercisesCount: '4 Exercises', image: require('../../assets/bodyweight-blast.png') },
    ],
    Legs: [
      { title: 'Leg Day Blast', subtitle: 'Quads • Hamstrings', time: '50 min', exercisesCount: '6 Exercises', image: require('../../assets/workout_legs.jpg') },
      { title: 'Lower Body Strength', subtitle: 'Glutes Focus', time: '45 min', exercisesCount: '5 Exercises', image: require('../../assets/kettlebell-burn.png') },
    ],
    Abs: [
      { title: 'Core Crusher', subtitle: 'Abs Focus', time: '20 min', exercisesCount: '5 Exercises', image: require('../../assets/workout_abs.jpg') },
      { title: 'Six Pack Abs', subtitle: 'Core Strength', time: '15 min', exercisesCount: '4 Exercises', image: require('../../assets/workout_abs.jpg') },
    ],
  };
  if (filterTabs) {
    popularWorkoutsMap['All'] = filterTabs.filter(t => t !== 'All').flatMap(t => popularWorkoutsMap[t] || []);
  } else {
    popularWorkoutsMap['All'] = [...popularWorkoutsMap['Chest'], ...popularWorkoutsMap['Back'], ...popularWorkoutsMap['Shoulders'], ...popularWorkoutsMap['Legs'], ...popularWorkoutsMap['Abs']];
  }

  const currentPopular = popularWorkoutsMap[activeSubTab] || popularWorkoutsMap['All'];

  const placeholderRecommendedMap: Record<string, any[]> = {
    Chest: [
      { exerciseName: 'Flat Barbell Bench Press', category: 'Chest', reps: '8-10 reps', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/bench_press_video.mp4') },
      { exerciseName: 'Incline Dumbbell Flyes', category: 'Chest', reps: '12 reps', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/cable_fly_video.mp4') },
      { exerciseName: 'Chest Press Machine', category: 'Chest', reps: '10 reps', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/chest_press_machine_video.mp4') },
      { exerciseName: 'Pushups', category: 'Chest', reps: 'to failure', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/pushup_video.mp4') },
      { exerciseName: 'Cable Crossovers', category: 'Chest', reps: '15 reps', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/cable_fly_video.mp4') },
    ],
    Back: [
      { exerciseName: 'Lat Pulldown', category: 'Back', reps: '10-12 reps', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/lat_pulldown_video.mp4') },
      { exerciseName: 'Seated Row', category: 'Back', reps: '10-12 reps', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/back_seated_row_video.mp4') },
      { exerciseName: 'Single Arm Row', category: 'Back', reps: '10-12 reps', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/back_seated_row_video.mp4') },
      { exerciseName: 'Pull Ups', category: 'Back', reps: 'to failure', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/lat_pulldown_video.mp4') },
      { exerciseName: 'Deadlift', category: 'Back', reps: '8 reps', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/deadlift_back_workout_video.mp4') },
      { exerciseName: 'Hyper-extensions', category: 'Back', reps: '12-15 reps', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=200&auto=format&fit=crop', video: null },
      { exerciseName: 'T Bar Row', category: 'Back', reps: '10-12 reps', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/back_seated_row_video.mp4') },
    ],
    Shoulders: [
      { exerciseName: 'Shoulder Press', category: 'Shoulders', reps: '10-12 reps', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/tri_che_shou_video.mp4') },
      { exerciseName: 'Lateral Raises', category: 'Shoulders', reps: '12-15 reps', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/tri_che_shou_video.mp4') },
    ],
    Legs: [
      { exerciseName: 'Squats', category: 'Legs', reps: '10-12 reps', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/squat_exercise_video.mp4') },
      { exerciseName: 'Leg Press', category: 'Legs', reps: '12-15 reps', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/legpress_exercise_video.mp4') },
      { exerciseName: 'Romanian Deadlift', category: 'Legs', reps: '10-12 reps', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=200&auto=format&fit=crop', video: require('../../assets/videos/romanian_deadlift_video.mp4') },
    ],
  };
  if (filterTabs) {
    placeholderRecommendedMap['All'] = filterTabs.filter(t => t !== 'All').flatMap(t => placeholderRecommendedMap[t] || []);
  } else {
    placeholderRecommendedMap['All'] = [...placeholderRecommendedMap['Chest'], ...placeholderRecommendedMap['Back'], ...placeholderRecommendedMap['Shoulders'], ...placeholderRecommendedMap['Legs']];
  }

  const currentRecommended = React.useMemo(() => {
    const uniqueRecommended: any[] = [];
    const seenNames = new Set<string>();
    for (const ex of recommendedExercises) {
      if (ex.exerciseName && !seenNames.has(ex.exerciseName.toLowerCase())) {
        seenNames.add(ex.exerciseName.toLowerCase());
        uniqueRecommended.push(ex);
      }
    }

    const mappedRecommended = uniqueRecommended.map(ex => {
      let videoSource = null;
      const lowerName = ex.exerciseName?.toLowerCase() || '';
      if (lowerName.includes('incline') && lowerName.includes('dumb')) {
        videoSource = require('../../assets/videos/incline_dumbell_press.mp4');
      } else if (lowerName.includes('bench press')) {
        videoSource = require('../../assets/videos/bench_press_video.mp4');
      } else if (lowerName.includes('pec deck') || lowerName.includes('pec-deck') || lowerName.includes('peck deck')) {
        videoSource = require('../../assets/videos/pec_deck_exercise_video.mp4');
      } else if (lowerName.includes('dip')) {
        videoSource = require('../../assets/videos/dips_exercise_video.mp4');
      } else if (lowerName.includes('chest press') || lowerName.includes('machine press')) {
        videoSource = require('../../assets/videos/chest_press_machine_video.mp4');
      } else if (lowerName.includes('woodchopper') || lowerName.includes('wood chopper')) {
        videoSource = require('../../assets/videos/cable_woodchoppers.gif');
      } else if (lowerName.includes('cable') || lowerName.includes('fly')) {
        videoSource = require('../../assets/videos/cable_fly_video.mp4');
      } else if (lowerName.includes('pushup') || lowerName.includes('push-up')) {
        videoSource = require('../../assets/videos/pushup_video.mp4');
      } else if (lowerName.includes('romanian deadlift') || lowerName.includes('rdl')) {
        videoSource = require('../../assets/videos/romanian_deadlift_video.mp4');
      } else if (lowerName.includes('deadlift') && !lowerName.includes('romanian')) {
        videoSource = require('../../assets/videos/deadlift_back_workout_video.mp4');
      } else if (lowerName.includes('squat')) {
        videoSource = require('../../assets/videos/squat_exercise_video.mp4');
      } else if (lowerName.includes('leg press')) {
        videoSource = require('../../assets/videos/legpress_exercise_video.mp4');
      } else if (lowerName.includes('leg extension')) {
        videoSource = require('../../assets/videos/leg_extension_video.mp4');
      } else if (lowerName.includes('calf raise')) {
        videoSource = require('../../assets/videos/calf_raise_video.mp4');
      } else if (lowerName.includes('lunge')) {
        videoSource = require('../../assets/videos/lunges_exercise_video.mp4');
      } else if (lowerName.includes('hamstring curl') || lowerName.includes('leg curl')) {
        videoSource = require('../../assets/videos/hamstring_curls_video.mp4');
      } else if (lowerName.includes('lat pulldown') || lowerName.includes('pulldown')) {
        videoSource = require('../../assets/videos/lat_pulldown_video.mp4');
      } else if (lowerName.includes('pull up') || lowerName.includes('pull-up') || lowerName.includes('pullups')) {
        videoSource = require('../../assets/videos/pull_ups_video.mp4');
      } else if (lowerName === 'seated row' || lowerName.includes('seated row')) {
        videoSource = require('../../assets/videos/back_seated_row_video.mp4');
      } else if (lowerName.includes('single arm row') || lowerName.includes('single-arm row')) {
        videoSource = require('../../assets/videos/single_arm_row_video.mp4');
      } else if (lowerName.includes('t bar row') || lowerName.includes('t-bar row') || lowerName.includes('t bar') || lowerName.includes('t-bar')) {
        videoSource = require('../../assets/videos/t_bar_row_exercise_video.mp4');
      } else if (lowerName.includes('hyper-extension') || lowerName.includes('hyperextension') || lowerName.includes('hyper extension')) {
        videoSource = require('../../assets/videos/hyper_extension_video.mp4');
      } else if (lowerName.includes('overhead press') || lowerName.includes('shoulder press')) {
        videoSource = require('../../assets/videos/overhead_press_video.mp4');
      } else if (lowerName.includes('lateral raise')) {
        videoSource = require('../../assets/videos/lateral_raises_video.mp4');
      } else if (lowerName.includes('front raise') || lowerName.includes('front raises') || lowerName.includes('front')) {
        videoSource = require('../../assets/videos/front-raised_video.mp4');
      } else if (lowerName.includes('reverse pec deck') || lowerName.includes('reverse fly')) {
        videoSource = require('../../assets/videos/reverse_pec_deck_video.mp4');
      } else if (lowerName.includes('shrug')) {
        videoSource = require('../../assets/videos/shrugs_video.mp4');
      } else if (lowerName.includes('arnold press') || lowerName.includes('arnoid press') || lowerName.includes('arnoid')) {
        videoSource = require('../../assets/videos/arnold_press_video.mp4');
      } else if (lowerName.includes('face pull') || lowerName.includes('face pulls') || lowerName.includes('face')) {
        videoSource = require('../../assets/videos/face_pulls_video.mp4');
      } else if (lowerName.includes('preacher curl') || lowerName.includes('preacher')) {
        videoSource = require('../../assets/videos/preacher_curls_video.mp4');
      } else if (lowerName.includes('hammer curl')) {
        videoSource = require('../../assets/videos/hammer_curls_video.mp4');
      } else if (lowerName.includes('bicep curl') || lowerName.includes('biceps curl') || lowerName.includes('bicep') || lowerName.includes('curl')) {
        videoSource = require('../../assets/videos/bicep_curls_video.mp4');
      } else if (lowerName.includes('overhead extension') || lowerName.includes('overhead tricep') || lowerName.includes('overhead triceps')) {
        videoSource = require('../../assets/videos/overhead_extension_video.mp4');
      } else if (lowerName.includes('pushdown') || lowerName.includes('push down') || lowerName.includes('push-down') || lowerName.includes('tricep extension')) {
        videoSource = require('../../assets/videos/tricep_pushdown_video.mp4');
      } else if (lowerName.includes('skull crusher') || lowerName.includes('skullcrusher') || lowerName.includes('skull')) {
        videoSource = require('../../assets/videos/skull_crushers_video.mp4');
      } else if (lowerName.includes('chin up') || lowerName.includes('chin-up') || lowerName.includes('chinups')) {
        videoSource = require('../../assets/videos/chin_ups_video.gif');
      } else if (lowerName.includes('bicycle crunch')) {
        videoSource = require('../../assets/videos/bicycle_crunches.mp4');
      } else if (lowerName.includes('hanging knee raise') || lowerName.includes('knee raise')) {
        videoSource = require('../../assets/videos/hanging_knee_raise_video.mp4');
      } else if (lowerName.includes('russian twist')) {
        videoSource = require('../../assets/videos/russian_twist_video.mp4');
      } else if (lowerName.includes('leg raise')) {
        videoSource = require('../../assets/videos/leg_raise_video.mp4');
      } else if (lowerName.includes('crunch')) {
        videoSource = require('../../assets/videos/crunches_video.mp4');
      } else if (lowerName.includes('plank')) {
        videoSource = require('../../assets/videos/plank_video.mp4');
      } else if (lowerName.includes('raise')) {
        videoSource = require('../../assets/videos/tri_che_shou_video.mp4');
      }
      return { ...ex, video: videoSource || ex.video };
    });
    let recs = mappedRecommended;
    if (filterTabs && filterTabs.length > 0) {
      const allowedCategories = filterTabs.filter(t => t !== 'All').map(t => t.toLowerCase());
      if (allowedCategories.length > 0) {
        recs = recs.filter(r => {
          const cat = r.category?.toLowerCase() || '';
          const dayType = r.dayWorkoutType?.toLowerCase() || '';
          if (!cat && !dayType) return true;

          return allowedCategories.some(allowed =>
            cat === allowed ||
            cat.startsWith(allowed.slice(0, 4)) ||
            allowed.startsWith(cat.slice(0, 4)) ||
            dayType === allowed ||
            dayType.startsWith(allowed.slice(0, 4)) ||
            allowed.startsWith(dayType.slice(0, 4))
          );
        });
      }
    }
    return recs;
  }, [recommendedExercises, filterTabs]);

  const paginatedRecommended = currentRecommended.slice(0, page * limit);
  const hasMore = paginatedRecommended.length < currentRecommended.length;

  return (
    <View className="w-full mt-5 gap-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {subTabs.map((tab, i) => {
          const isActive = tab.name === activeSubTab;
          return (
            <Pressable onPress={() => setActiveSubTab(tab.name)} key={i} className={`items-center justify-center p-3 rounded-2xl border active:opacity-70 ${isActive ? 'border-[#C4EF00] bg-[#1a2000]' : 'border-[#27272A] bg-[#111111]'}`} style={{ width: 85, height: 100 }}>
              <View className="flex-1 items-center justify-center">
                {tab.image ? (
                  <Image source={tab.image} style={{ width: 45, height: 50 }} resizeMode="contain" />
                ) : (
                  tab.icon
                )}
              </View>
              <Text className={`text-xs mt-2 font-semibold ${isActive ? 'text-[#C4EF00]' : 'text-[#8E8E8E]'}`}>{tab.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* <View className="bg-[#111111] p-5 rounded-3xl border border-[#1D1D1D] gap-4 w-full">
        <Text className="text-white text-lg font-semibold">Create Your Own Workout</Text>
        <Text className="text-[#8E8E8E] text-sm leading-5">Select muscle groups, equipment and duration to get your custom plan.</Text>
        <Pressable className="bg-[#C4EF00] flex-row items-center justify-center py-3 px-5 rounded-full self-start gap-2 mt-2">
          <Text className="text-black font-semibold text-sm">Build Workout</Text>
          <ArrowRightIcon size={16} color="black" weight="bold" />
        </Pressable>
      </View> */}

      <View className="w-full gap-4 mt-2">
        <Text className="text-white font-semibold text-xl">Popular {activeSubTab !== 'All' ? activeSubTab : ''} Workouts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {currentPopular.map((workout, i) => (
            <View key={i} className="bg-[#111111] rounded-3xl p-3 border border-[#1D1D1D] gap-3" style={{ width: 280 }}>
              <Image source={workout.image} style={{ width: '100%', height: 160, borderRadius: 16 }} />
              <View className="gap-1 mt-1">
                <Text className="text-white font-semibold text-xl">{workout.title}</Text>
                <Text className="text-[#8E8E8E] text-sm font-medium">{workout.subtitle}</Text>
              </View>
              <View className="flex-row items-center justify-between mt-2 mb-1">
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1.5">
                    <ClockIcon size={16} color="#8E8E8E" />
                    <Text className="text-[#8E8E8E] text-sm">{workout.time}</Text>
                  </View>
                  {workout.exercisesCount && (
                    <View className="flex-row items-center gap-1.5">
                      <Barbell size={16} color="#8E8E8E" />
                      <Text className="text-[#8E8E8E] text-sm">{workout.exercisesCount}</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => toggleSave(workout.title)}>
                  <BookmarkSimple size={24} color={savedWorkouts[workout.title] ? "#C4EF00" : "white"} weight={savedWorkouts[workout.title] ? "fill" : "regular"} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className="w-full gap-4 mt-2">
        <Text className="text-white font-semibold text-xl">Recommended For You</Text>
        {(isLoading || isFetching) && currentRecommended.length === 0 ? (
          <View className="mt-8 items-center justify-center">
            <ActivityIndicator size="large" color="#C4EF00" />
          </View>
        ) : currentRecommended.length === 0 ? (
          <View className="bg-[#111111] border border-[#1D1D1D] rounded-2xl p-5 mt-2">
            <Text className="text-[#8E8E8E] text-center leading-5">No workouts have been found in your weekly plan{activeSubTab !== 'All' ? ` for ${activeSubTab}` : ''}.</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {paginatedRecommended.map((workout, index) => (
              <View key={index} className="bg-[#111111] rounded-3xl border border-[#1D1D1D] pb-4" style={{ width: 220 }}>
                <View className="w-full h-48 bg-[#1a1a1a] rounded-t-3xl items-center justify-center overflow-hidden">
                  {workout.video ? (
                    (workout.exerciseName.toLowerCase().includes('chin up') || workout.exerciseName.toLowerCase().includes('chin-up') || workout.exerciseName.toLowerCase().includes('chinups') || workout.exerciseName.toLowerCase().includes('woodchopper') || workout.exerciseName.toLowerCase().includes('wood chopper')) ? (
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
                        positionMillis={1000}
                      />
                    )
                  ) : (
                    <Image source={workout.image ? (typeof workout.image === 'string' ? { uri: workout.image } : workout.image) : require('../../assets/dumbell-strength.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
                  <Text className="text-white font-semibold text-base">{workout.exerciseName}</Text>
                  <Text className="text-[#8E8E8E] text-xs font-medium">{workout.category}</Text>
                  <Text className="text-[#8E8E8E] text-xs font-medium mt-1">{workout.reps}</Text>
                </View>
              </View>
            ))}
            {hasMore ? (
              <View className="justify-center px-4 ml-3" style={{ height: 192 }}>
                {isFetching ? (
                  <ActivityIndicator size="small" color="#C4EF00" />
                ) : (
                  <Pressable
                    onPress={() => setPage(p => p + 1)}
                    className="flex-row items-center justify-center gap-x-2 bg-[#1a2000] border border-[#C4EF00]/50 px-5 py-4 rounded-2xl active:opacity-70"
                    style={{ height: 128 }}
                  >
                    <ArrowsClockwise size={20} color="#C4EF00" />
                    <Text className="text-[#C4EF00] text-base font-semibold">Load More</Text>
                  </Pressable>
                )}
              </View>
            ) : currentRecommended.length > limit ? (
              <View className="justify-center px-4 ml-3" style={{ height: 192 }}>
                <Text className="text-[#666666] text-sm font-medium text-center w-24">End of list</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

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

function EquipmentView() {
  const [savedWorkouts, setSavedWorkouts] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEquipment, setActiveEquipment] = useState('All');

  const toggleSave = (title: string) => {
    setSavedWorkouts(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const subTabs = [
    { name: 'All', icon: <SquaresFour size={28} color="#8E8E8E" weight="fill" /> },
    { name: 'Dumbbell', image: require('../../assets/dumbell.png') },
    { name: 'Barbell', image: require('../../assets/barbell.png') },
    { name: 'Kettlebell', image: require('../../assets/kettlebell.png') },
    { name: 'Band', image: require('../../assets/resistance-band.png') },
  ];

  const workouts = [
    { title: 'Dumbbell Strength', subtitle: 'Full body strength workout using dumbbells', time: '5 min', level: 'Intermediate', image: require('../../assets/dumbell-strength.png'), equipment: 'Dumbbell' },
    { title: 'Barbell Power', subtitle: 'Build strength and power with barbell exercises', time: '5 min', level: 'Advanced', image: require('../../assets/barbell-power.png'), equipment: 'Barbell' },
    { title: 'Kettlebell Burn', subtitle: 'High intensity kettlebell circuit for fat loss', time: '3 min', level: 'Intermediate', image: require('../../assets/kettlebell-burn.png'), equipment: 'Kettlebell' },
    { title: 'Resistance Band Flow', subtitle: 'Tone and strengthen with resistance bands', time: '2 min', level: 'Beginner', image: require('../../assets/resistance-band-flow.png'), equipment: 'Resistance Band' },
    { title: 'Bodyweight Blast', subtitle: 'No equipment? No problem. Get stronger anywhere!', time: '2 min', level: 'Beginner', image: require('../../assets/bodyweight-blast.png'), equipment: 'Bodyweight' },
  ];

  const filteredWorkouts = workouts.filter(w => {
    const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEquipment = activeEquipment === 'All' || w.equipment === activeEquipment;
    return matchesSearch && matchesEquipment;
  });

  return (
    <View className="w-full mt-5 gap-6">
      <View className="gap-1">
        <Text className="text-white text-xl font-semibold">Browse by Equipment</Text>
        <Text className="text-[#8E8E8E] text-sm">Choose your equipment and start training</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {subTabs.map((tab, i) => {
          const isActive = tab.name === activeEquipment;
          return (
            <Pressable
              key={i}
              onPress={() => setActiveEquipment(tab.name)}
              className={`items-center justify-center p-3 rounded-2xl border ${isActive ? 'border-[#C4EF00] bg-[#1a2000]' : 'border-[#27272A] bg-[#111111]'}`}
              style={{ width: 85, height: 100 }}
            >
              <View className="flex-1 items-center justify-center">
                {tab.image ? (
                  <Image source={tab.image} style={{ width: 45, height: 50 }} resizeMode="contain" />
                ) : (
                  tab.icon
                )}
              </View>
              <Text className={`text-xs mt-2 font-semibold ${isActive ? 'text-[#C4EF00]' : 'text-[#8E8E8E]'}`}>{tab.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="w-full bg-[#111111] rounded-2xl border border-[#27272A] px-4 flex-row items-center gap-3 h-[50px]">
        <MagnifyingGlass size={20} color="#8E8E8E" />
        <TextInput
          placeholder="Search workouts..."
          placeholderTextColor="#8E8E8E"
          className="flex-1 text-white h-full"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View className="gap-4 w-full">
        {filteredWorkouts.map((workout, i) => (
          <View key={i} className="bg-[#111111] rounded-3xl p-3 border border-[#1D1D1D] flex-row gap-4 w-full">
            <Image source={workout.image} style={{ width: 100, height: 100, borderRadius: 16 }} />
            <View className="flex-1 justify-between py-1">
              <View>
                <View className="flex-row items-start justify-between">
                  <Text className="text-white font-semibold text-base flex-1 mr-2">{workout.title}</Text>
                  <Pressable onPress={() => toggleSave(workout.title)}>
                    <BookmarkSimple size={20} color={savedWorkouts[workout.title] ? "#C4EF00" : "#8E8E8E"} weight={savedWorkouts[workout.title] ? "fill" : "regular"} />
                  </Pressable>
                </View>
                <Text className="text-[#8E8E8E] text-xs mt-1 leading-4 pr-2">{workout.subtitle}</Text>
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row items-center gap-1.5">
                  <ClockIcon size={14} color="#8E8E8E" />
                  <Text className="text-[#8E8E8E] text-xs">{workout.time}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <LightningIcon size={14} color={workout.level === 'Beginner' ? '#C4EF00' : workout.level === 'Intermediate' ? '#FFCB3F' : '#FF4F4F'} weight="fill" />
                  <Text className="text-[#8E8E8E] text-xs">{workout.level}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
        {filteredWorkouts.length === 0 && (
          <Text className="text-[#8E8E8E] text-center mt-4">No workouts found matching your search.</Text>
        )}
      </View>
    </View>
  );
}
