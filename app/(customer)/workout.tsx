import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { ArrowRightIcon, CaretRightIcon, ClockIcon, HandWavingIcon, Check, Bell, LightningIcon, CalendarIcon, StarIcon, CheckCircleIcon, SquaresFour, Barbell, BookmarkSimple, PlayCircle, MagnifyingGlass, Robot, CalendarPlus, Sparkle, XCircle } from 'phosphor-react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, router } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export default function CustomerWorkout() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const navigation = useNavigation();
  const { name, userId } = useUser();

  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [weeklyPlanDays, setWeeklyPlanDays] = useState<any[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [yesterdayWorkout, setYesterdayWorkout] = useState<any>(null);

  useEffect(() => {
    async function loadPlan() {
      if (!userId) return;
      setIsLoadingPlan(true);
      try {
        const plans = await fetchCustomerWorkoutPlans(userId);
        const activePlan = plans.find((p: any) => p.isActive);

        if (activePlan) {
          const days = await fetchWorkoutPlanDays(activePlan.planId);

          const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const currentDayIndex = new Date().getDay();
          const todayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
          const todayString = dayOrder[todayIndex];

          const formattedDays = dayOrder.map(dayStr => {
            const dayData = days.find((d: any) => d.dayOfWeek.toLowerCase() === dayStr);
            const isToday = dayStr === todayString;

            const dayIdx = dayOrder.indexOf(dayStr);
            let status = 'rest';
            if (isToday) {
              status = 'active';
            } else if (dayData && dayData.workoutType !== 'Rest') {
              status = dayIdx < todayIndex ? 'completed' : 'pending';
            }

            return {
              dayStr,
              dayAbbr: dayStr.charAt(0).toUpperCase() + dayStr.slice(1, 3),
              type: dayData && dayData.workoutType !== 'Rest' ? dayData.workoutType : 'Rest',
              status: status,
              duration: dayData?.durationMinutes || 45,
              exercisesCount: 0,
              dayId: dayData?.planDayId,
            };
          });

          setWeeklyPlanDays(formattedDays);
          setTodayWorkout(formattedDays.find(d => d.dayStr === todayString));

          const yesterdayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
          const yesterdayString = dayOrder[yesterdayIndex];
          const yesterdayFormatted = formattedDays.find(d => d.dayStr === yesterdayString);

          if (yesterdayFormatted && yesterdayFormatted.type !== 'Rest') {
            const rawYesterdayData = days.find((d: any) => d.dayOfWeek.toLowerCase() === yesterdayString);
            if (rawYesterdayData) {
              const exs = await fetchWorkoutPlanDayExercises(rawYesterdayData.planDayId);
              yesterdayFormatted.exercisesCount = exs?.length || 0;
            }
          }
          setYesterdayWorkout(yesterdayFormatted);

          setHasPlan(true);
        } else {
          setHasPlan(false);
          setYesterdayWorkout(null);
        }
      } catch (error) {
        console.error('Error loading workout plan:', error);
        setHasPlan(false);
      } finally {
        setIsLoadingPlan(false);
      }
    }

    loadPlan();
  }, [userId]);

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
    <ScrollView className="flex-1 bg-[#0A0A0A]" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
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
        <>
          {isLoadingPlan ? (
            <View className="mt-5 w-full">
              <Text className='text-[#C4EF00] font-semibold text-xs tracking-wider mb-3 uppercase'>Weekly Workout Plan</Text>
              <View className="w-full border border-[#27272A] bg-[#111111] rounded-3xl p-5 items-center pb-6">
                <View className="bg-[#242A00] rounded-2xl mb-4 h-14 w-14 animate-pulse" />
                <View className="h-6 w-48 bg-[#27272A] rounded animate-pulse mb-3" />
                <View className="h-4 w-64 bg-[#27272A] rounded animate-pulse mb-6" />
                <View className="w-full h-16 bg-[#1A1A1A] border border-[#27272A] rounded-2xl animate-pulse mb-5" />
              </View>
            </View>
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
                  <Text className='text-xl text-white font-semibold'>{todayWorkout?.type || 'Rest Day'}</Text>

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
                                exercisesCount: todayWorkout.exercisesCount || 5
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
                  <View className='bg-[#111111] w-[48%] mb-3 p-3 flex-row items-center rounded-xl border border-[#1D1D1D]' key={index}>
                    <View className='h-9 w-9 rounded-xl overflow-hidden bg-[#242424]'>
                      <Image source={item.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                    <View className='flex-1 px-2'>
                      <Text className='text-xs text-white font-semibold' numberOfLines={2}>{item.text}</Text>
                    </View>
                    <CaretRightIcon size={16} color='white' />
                  </View>
                );
              })}
            </View>
          </View>

          <View className='mt-5 w-full flex-row items-center justify-between'>
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
          </View>

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
        {/* ) : null} */}
      </View>
    </ScrollView>
  );
}

function MuscleGroupView() {
  const [savedWorkouts, setSavedWorkouts] = useState<Record<string, boolean>>({});

  const toggleSave = (title: string) => {
    setSavedWorkouts(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const subTabs = [
    { name: 'All', icon: <SquaresFour size={28} color="#8E8E8E" weight="fill" /> },
    { name: 'Chest', image: require('../../assets/chest-stood.png') },
    { name: 'Back', image: require('../../assets/back-stood.png') },
    { name: 'Shoulders', image: require('../../assets/shoulders-stood.png') },
  ];

  const popularChest = [
    { title: 'Push Day', subtitle: 'Chest • Shoulders • Triceps', time: '45 min', image: require('../../assets/push-day.png') },
    { title: 'Lower Chest Sculpt', subtitle: 'Chest • Shoulders • Triceps', time: '45 min', image: require('../../assets/lower-chest-sculpt.png') },
  ];

  const recommended = [
    { title: 'Upper Chest Focus', subtitle: 'Chest', time: '35 min', image: require('../../assets/upper-chest-focus.png') },
    { title: 'Chest Intensity', subtitle: 'Chest', time: '35 min', image: require('../../assets/chest-intersity.png') },
  ];

  return (
    <View className="w-full mt-5 gap-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {subTabs.map((tab, i) => {
          const isActive = tab.name === 'Chest';
          return (
            <View key={i} className={`items-center justify-center p-3 rounded-2xl border ${isActive ? 'border-[#C4EF00] bg-[#1a2000]' : 'border-[#27272A] bg-[#111111]'}`} style={{ width: 85, height: 100 }}>
              <View className="flex-1 items-center justify-center">
                {tab.image ? (
                  <Image source={tab.image} style={{ width: 45, height: 50 }} resizeMode="contain" />
                ) : (
                  tab.icon
                )}
              </View>
              <Text className={`text-xs mt-2 font-semibold ${isActive ? 'text-[#C4EF00]' : 'text-[#8E8E8E]'}`}>{tab.name}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View className="bg-[#111111] p-5 rounded-3xl border border-[#1D1D1D] gap-4 w-full">
        <Text className="text-white text-lg font-semibold">Create Your Own Workout</Text>
        <Text className="text-[#8E8E8E] text-sm leading-5">Select muscle groups, equipment and duration to get your custom plan.</Text>
        <Pressable className="bg-[#C4EF00] flex-row items-center justify-center py-3 px-5 rounded-full self-start gap-2 mt-2">
          <Text className="text-black font-semibold text-sm">Build Workout</Text>
          <ArrowRightIcon size={16} color="black" weight="bold" />
        </Pressable>
      </View>

      <View className="w-full gap-4 mt-2">
        <Text className="text-white font-semibold text-xl">Popular Chest Workouts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {popularChest.map((workout, i) => (
            <View key={i} className="bg-[#111111] rounded-3xl p-3 border border-[#1D1D1D] gap-3" style={{ width: 280 }}>
              <Image source={workout.image} style={{ width: '100%', height: 160, borderRadius: 16 }} />
              <View className="gap-1 mt-1">
                <Text className="text-white font-semibold text-xl">{workout.title}</Text>
                <Text className="text-[#8E8E8E] text-sm font-medium">{workout.subtitle}</Text>
              </View>
              <View className="flex-row items-center justify-between mt-2 mb-1">
                <View className="flex-row items-center gap-1.5">
                  <ClockIcon size={16} color="#8E8E8E" />
                  <Text className="text-[#8E8E8E] text-sm">{workout.time}</Text>
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
        <View className="flex-row flex-wrap justify-between w-full">
          {recommended.map((workout, i) => (
            <View key={i} className="w-[48%] bg-[#111111] rounded-3xl border border-[#1D1D1D] mb-4 pb-4">
              <View className="w-full h-48 bg-[#1a1a1a] rounded-t-3xl items-center justify-center overflow-hidden">
                <Image source={workout.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <View className="absolute inset-0 bg-black/30 items-center justify-center">
                  <BlurView intensity={30} tint="light" className="p-3 rounded-full overflow-hidden border border-white/30">
                    <PlayCircle size={36} color="white" weight="fill" />
                  </BlurView>
                </View>
                <View className="absolute top-3 left-3 flex-row gap-1">
                  <View className="bg-black/60 p-1.5 rounded-lg border border-white/20"><Barbell size={14} color="white" /></View>
                  <View className="bg-[#C4EF00] p-1.5 rounded-lg"><Barbell size={14} color="black" weight="fill" /></View>
                </View>
                <View className="absolute top-3 right-3">
                  <Pressable onPress={() => toggleSave(workout.title)}>
                    <BookmarkSimple size={20} color={savedWorkouts[workout.title] ? "#C4EF00" : "white"} weight={savedWorkouts[workout.title] ? "fill" : "bold"} />
                  </Pressable>
                </View>
              </View>
              <View className="px-4 pt-4 gap-1.5">
                <Text className="text-white font-semibold text-base">{workout.title}</Text>
                <Text className="text-[#8E8E8E] text-xs font-medium">{workout.subtitle}</Text>
                <Text className="text-[#8E8E8E] text-xs font-medium mt-1">{workout.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

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
