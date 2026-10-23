import { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Pressable, Image, Modal, Alert, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCalendarDaysDifference } from '@/lib/dateUtils';
import {
  CaretLeft, CaretRight, Star, ShieldCheck, Sparkle, CalendarBlank, Clock,
  XCircle, CalendarPlus, ClipboardText, ChartBar, CalendarCheck, UserCircle, Barbell, CheckCircle, Trash
} from 'phosphor-react-native';
import { useTrainerStore } from '@/constants/trainerStore';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymTimings } from '@/hooks/gymTimings/useGymTimings';
import { useTrainerWeeklyPlan } from '@/hooks/trainerWorkoutPlans/useTrainerWeeklyPlan';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

const TIME_SLOTS = [
  { time: '6:00 AM', status: 'Available' },
  { time: '7:30 AM', status: 'Available' },
  { time: '5:00 PM', status: 'Available' },
  { time: '6:30 PM', status: 'Available' },
  { time: '8:00 PM', status: 'Available' },
];

export default function MyTrainerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const { data: customerProfile, isLoading: isProfileLoading, refetch: refetchProfile } = useCustomerProfile(userId);
  const customerId = customerProfile?.customerData?.customerId || userId;

  const {
    data: assignedTrainers,
    isLoading: isAssignedLoading,
    refetch: refetchAssigned
  } = useAssignedTrainersByCustomer(customerId, userId);

  const activeAssignment = useMemo(() => {
    if (!assignedTrainers || assignedTrainers.length === 0) return null;
    return (
      assignedTrainers.find((a: any) => a.isActive !== false && a.trainer && a.trainer.is_deleted !== true) ||
      assignedTrainers.find((a: any) => a.isActive !== false) ||
      assignedTrainers[0]
    );
  }, [assignedTrainers]);

  const effectiveGymId = activeAssignment?.gymId || customerProfile?.customerData?.gymId;
  const { data: gymTimings, refetch: refetchTimings } = useGymTimings(effectiveGymId || undefined);

  const {
    data: trainerWeeklyPlan,
    isLoading: isPlanLoading,
    refetch: refetchWeeklyPlan
  } = useTrainerWeeklyPlan(customerId, userId);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchAssigned(),
      refetchTimings(),
      refetchWeeklyPlan(),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchAssigned, refetchTimings, refetchWeeklyPlan]);

  useFocusEffect(
    useCallback(() => {
      refetchAssigned();
      refetchWeeklyPlan();
    }, [refetchAssigned, refetchWeeklyPlan])
  );

  const {
    trainer: storeTrainer, selectedSlot, setSelectedSlot, bookSelectedSlot,
    nextSessionTime, isSessionCancelled, cancelSession, resetTrainer
  } = useTrainerStore();

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAllSlotsModal, setShowAllSlotsModal] = useState(false);

  const assignedTrainer = activeAssignment?.trainer;
  const targetGymTrainerId = activeAssignment?.gymTrainerId || assignedTrainer?.gymTrainerId;

  const trainerUser = Array.isArray(assignedTrainer?.users)
    ? assignedTrainer.users[0]
    : (assignedTrainer?.users || (assignedTrainer as any)?.user);

  const trainerName = assignedTrainer?.fullName || (activeAssignment ? 'Trainer' : storeTrainer.name);

  const rawTrainerPhoto =
    trainerUser?.profilePhoto ||
    trainerUser?.profilePicture ||
    trainerUser?.profilePic ||
    trainerUser?.avatar ||
    assignedTrainer?.profilePhoto ||
    assignedTrainer?.profilePicture ||
    assignedTrainer?.profilePic ||
    assignedTrainer?.avatar ||
    assignedTrainer?.photo ||
    assignedTrainer?.image ||
    null;

  const trainerPhoto =
    rawTrainerPhoto &&
      typeof rawTrainerPhoto === 'string' &&
      rawTrainerPhoto.trim() !== '' &&
      rawTrainerPhoto !== 'null' &&
      rawTrainerPhoto !== 'undefined'
      ? rawTrainerPhoto.trim()
      : null;

  const rawGender =
    assignedTrainer?.gender ||
    trainerUser?.gender ||
    (assignedTrainer as any)?.trainerGender ||
    'male';
  const trainerGender = String(rawGender).toLowerCase().trim();

  const trainerSpecialty = assignedTrainer?.specialization || storeTrainer.specialty || 'Personal Trainer';
  const trainerRating = assignedTrainer?.rating || storeTrainer.rating || '4.8';
  const trainerReviews = assignedTrainer?.reviews || storeTrainer.reviews || '24';
  const isTrainerActive = activeAssignment ? (activeAssignment.isActive !== false) : true;

  const planDetails = useMemo(() => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();

    const isGymOpenOnDay = (dayName: string) => {
      if (!gymTimings || gymTimings.length === 0) {
        return dayName.toLowerCase() !== 'sunday';
      }
      const timing = gymTimings.find((t: any) => t.day?.toLowerCase() === dayName.toLowerCase());
      if (!timing) return dayName.toLowerCase() !== 'sunday';
      return !timing.isClosed;
    };

    let nextRenewalDate: Date;
    let cycleStartDate: Date;

    if (activeAssignment?.expiryOn) {
      nextRenewalDate = new Date(activeAssignment.expiryOn);
    } else if (activeAssignment?.renewalOn) {
      const ren = new Date(activeAssignment.renewalOn);
      if (ren.getTime() > now.getTime()) {
        nextRenewalDate = ren;
      } else {
        const nextMonth = new Date(ren);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextRenewalDate = nextMonth;
      }
    } else {
      const defaultNext = new Date(now);
      defaultNext.setMonth(defaultNext.getMonth() + 1);
      nextRenewalDate = defaultNext;
    }

    if (activeAssignment?.assignedOn) {
      const assigned = new Date(activeAssignment.assignedOn);
      cycleStartDate = assigned < nextRenewalDate ? assigned : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      const prevMonth = new Date(nextRenewalDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      cycleStartDate = prevMonth;
    }

    let totalWorkingDays = 0;
    const curDate = new Date(cycleStartDate);
    curDate.setHours(0, 0, 0, 0);
    const endBoundary = new Date(nextRenewalDate);
    endBoundary.setHours(23, 59, 59, 999);

    let loopGuard = 0;
    while (curDate <= endBoundary && loopGuard < 35) {
      const dayName = daysOfWeek[curDate.getDay()];
      if (isGymOpenOnDay(dayName)) {
        totalWorkingDays++;
      }
      curDate.setDate(curDate.getDate() + 1);
      loopGuard++;
    }

    if (totalWorkingDays === 0) totalWorkingDays = 26;

    let remainingWorkingDays = 0;
    const checkToday = new Date(now);
    checkToday.setHours(0, 0, 0, 0);
    loopGuard = 0;
    while (checkToday <= endBoundary && loopGuard < 35) {
      const dayName = daysOfWeek[checkToday.getDay()];
      if (isGymOpenOnDay(dayName)) {
        remainingWorkingDays++;
      }
      checkToday.setDate(checkToday.getDate() + 1);
      loopGuard++;
    }

    remainingWorkingDays = Math.min(totalWorkingDays, Math.max(0, remainingWorkingDays));

    const renewalInDays = Math.max(0, getCalendarDaysDifference(nextRenewalDate));

    const formattedRenewalDate = nextRenewalDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return {
      totalSessions: totalWorkingDays,
      remainingSessions: remainingWorkingDays < 10 ? `0${remainingWorkingDays}` : `${remainingWorkingDays}`,
      renewalInDays: `${renewalInDays} Days`,
      renewalDate: formattedRenewalDate,
    };
  }, [activeAssignment, gymTimings]);

  const nextSession = useMemo(() => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();

    if (trainerWeeklyPlan && Object.keys(trainerWeeklyPlan).length > 0) {
      for (let offset = 1; offset <= 7; offset++) {
        const candidateDate = new Date();
        candidateDate.setDate(now.getDate() + offset);
        const dayName = daysOfWeek[candidateDate.getDay()];

        const dayPlan =
          trainerWeeklyPlan[dayName] ||
          Object.values(trainerWeeklyPlan).find(
            (d: any) => d.dayOfWeek?.toLowerCase() === dayName.toLowerCase()
          );

        if (dayPlan && dayPlan.workoutType && dayPlan.workoutType.toLowerCase() !== 'rest') {
          const isTomorrow = offset === 1;
          const formattedDate = candidateDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          const dayLabel = isTomorrow ? 'Tomorrow' : dayName;

          return {
            title: dayPlan.workoutType,
            dayLabel,
            dateStr: formattedDate,
            time: activeAssignment?.timings || nextSessionTime || '6:00 AM',
            duration: dayPlan.durationMinutes ? `${dayPlan.durationMinutes} min` : '60 min',
            exerciseCount: dayPlan.exercises?.length || 0,
          };
        }
      }
    }

    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    return {
      title: 'Upper Body Strength',
      dayLabel: 'Tomorrow',
      dateStr: tomorrow.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: activeAssignment?.timings || nextSessionTime || '6:00 AM',
      duration: '60 min',
      exerciseCount: 0,
    };
  }, [trainerWeeklyPlan, activeAssignment, nextSessionTime]);

  const assignedTimings = activeAssignment?.timings;
  const assignedWeekdays = Array.isArray(activeAssignment?.weekDays)
    ? activeAssignment.weekDays
    : typeof activeAssignment?.weekDays === 'string'
      ? (activeAssignment.weekDays as string).split(',').map((s: string) => s.trim())
      : [];

  const handleBookSlot = () => {
    bookSelectedSlot();
    setShowSuccessModal(true);
  };

  const hasTrainer = !!activeAssignment || !!storeTrainer.name;
  const isLoading = (isProfileLoading || isAssignedLoading) && !hasTrainer;

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3.5 border-b border-[#1A1A1A]">
        <Pressable onPress={() => router.back()} className="p-2 -ml-1 active:opacity-70">
          <CaretLeft size={22} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-xl font-semibold mr-8">My Trainer</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator color="#D4FF00" size="large" />
            <Text className="text-[#8E8E93] text-sm mt-3">Loading your trainer details...</Text>
          </View>
        ) : !hasTrainer ? (
          <View className="bg-[#141414] rounded-3xl p-6 border border-[#222222] my-6 items-center">
            <View className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#27272A] items-center justify-center mb-4">
              <UserCircle size={36} color="#D4FF00" weight="regular" />
            </View>
            <Text className="text-white text-lg font-semibold text-center mb-2">No Trainer Assigned</Text>
            <Text className="text-[#8E8E93] text-xs text-center leading-5 mb-5 px-4">
              You do not have a dedicated personal trainer assigned right now. Explore available certified trainers and submit your request.
            </Text>
            <Pressable
              onPress={() => router.push('/(customer)/trainer/book-trainer')}
              className="bg-[#D4FF00] px-6 py-3 rounded-full flex-row items-center active:opacity-80"
            >
              <Text className="text-black font-semibold text-xs mr-2">Book a Personal Trainer</Text>
              <CaretRight size={14} color="#000000" weight="bold" />
            </Pressable>
          </View>
        ) : (
          <>
            <View className="bg-[#141414] rounded-3xl p-4 border border-[#222222] mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-2">
                <View className="relative">
                  <StaticAvatar
                    uri={trainerPhoto}
                    name={trainerName}
                    gender={trainerGender}
                    size={64}
                    className="w-16 h-16 rounded-full border border-[#27272A]"
                  />
                  <View className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${isTrainerActive ? 'bg-[#00FF66]' : 'bg-[#8E8E93]'} rounded-full border-2 border-[#141414]`} />
                </View>

                <View className="ml-3.5 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white text-lg font-semibold mr-1" numberOfLines={1}>{trainerName}</Text>
                    <Pressable
                      onPress={() => {
                        if (targetGymTrainerId) {
                          router.push({
                            pathname: `/(customer)/trainer/${targetGymTrainerId}`,
                            params: {
                              from: 'my-trainer',
                              trainerData: assignedTrainer ? JSON.stringify(assignedTrainer) : undefined,
                            },
                          } as any);
                        } else {
                          router.push({
                            pathname: `/(customer)/trainer/${storeTrainer.id}`,
                            params: { from: 'my-trainer' },
                          } as any);
                        }
                      }}
                      className="flex-row items-center active:opacity-70"
                    >
                      <Text className="text-[#D4FF00] text-xs font-semibold mr-1">View Profile</Text>
                      <CaretRight size={12} color="#D4FF00" weight="bold" />
                    </Pressable>
                  </View>

                  <Text className="text-[#8E8E93] text-[11px] mt-0.5 mb-1.5" numberOfLines={1}>{trainerSpecialty}</Text>

                  <View className="flex-row items-center justify-end">
                    {/* <View className="flex-row items-center">
                      <Star size={12} color="#D4FF00" weight="fill" />
                      <Text className="text-white text-xs font-semibold ml-1">{trainerRating}</Text>
                      <Text className="text-[#8E8E93] text-xs ml-1">({trainerReviews} Reviews)</Text>
                    </View> */}

                    <View className="flex-row items-center ml-2">
                      <ShieldCheck size={14} color="#D4FF00" weight="fill" />
                      <Text className="text-[#D4FF00] text-[10px] font-semibold ml-1 tracking-wider">
                        {isTrainerActive ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {(assignedTimings || assignedWeekdays.length > 0) && (
              <View className="bg-[#141414] rounded-2xl p-4 border border-[#222222] mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Clock size={16} color="#D4FF00" weight="bold" />
                    <Text className="text-white text-xs font-semibold ml-2">Assigned Timings</Text>
                  </View>
                  <Text className="text-[#D4FF00] text-xs font-semibold">{assignedTimings || 'Flexible'}</Text>
                </View>
                {assignedWeekdays.length > 0 && (
                  <View className="flex-row items-center justify-between pt-2 border-t border-[#1C1C1E]">
                    <View className="flex-row items-center">
                      <CalendarBlank size={16} color="#8E8E93" />
                      <Text className="text-[#8E8E93] text-xs ml-2">Training Days</Text>
                    </View>
                    <Text className="text-white text-xs capitalize">{assignedWeekdays.join(', ')}</Text>
                  </View>
                )}
              </View>
            )}

            <View className="bg-[#121212] rounded-3xl p-5 border border-[#222222] mb-6">
              <View className="flex-row items-center justify-between mb-5">
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-9 h-9 rounded-xl bg-[#212711] border border-[#374313] items-center justify-center mr-3">
                    <Sparkle size={20} color="#D4FF00" weight="fill" />
                  </View>
                  <Text className="text-[#D4FF00] text-[11px] font-semibold uppercase tracking-wider flex-1" numberOfLines={1}>
                    PERSONAL TRAINING PLAN
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between pt-2 border-t border-[#1C1C1E]">
                <View className="flex-1 pr-1">
                  <Text className="text-[#8E8E93] text-[9px] font-medium mb-1">Plan</Text>
                  <Text className="text-white font-semibold text-[13px]">{planDetails.totalSessions} Sessions</Text>
                  <Text className="text-[#8E8E93] text-[9px] mt-0.5">/ Month</Text>
                </View>

                <View className="w-[1px] h-9 bg-[#27272A] mx-1.5" />

                <View className="flex-1 px-1">
                  <Text className="text-[#8E8E93] text-[9px] font-medium mb-1">Remaining Sessions</Text>
                  <Text className="text-[#D4FF00] font-semibold text-lg leading-6">{planDetails.remainingSessions}</Text>
                  <Text className="text-[#8E8E93] text-[9px] mt-0.5">of {planDetails.totalSessions}</Text>
                </View>

                <View className="w-[1px] h-9 bg-[#27272A] mx-1.5" />

                <View className="flex-1 px-1">
                  <Text className="text-[#8E8E93] text-[9px] font-medium mb-1">Renewal In</Text>
                  <Text className="text-[#D4FF00] font-semibold text-[13px]">{planDetails.renewalInDays}</Text>
                  <Text className="text-[#8E8E93] text-[9px] mt-0.5">on {planDetails.renewalDate}</Text>
                </View>

                <View className="w-[1px] h-9 bg-[#27272A] mx-1.5" />

                <View className="flex-1 pl-1">
                  <Text className="text-[#8E8E93] text-[9px] font-medium mb-1">Next Renewal</Text>
                  <Text className="text-white font-semibold text-[13px]">{planDetails.renewalDate}</Text>
                  {/* {Platform.OS !== 'ios' && <Text className="text-[#8E8E93] text-[9px] mt-0.5">₹7,999</Text>} */}
                </View>
              </View>
            </View>

            <Text className="text-white text-xs font-semibold uppercase tracking-wider mb-3 ml-1">NEXT SESSION</Text>

            <View className="bg-[#141414] rounded-3xl p-5 border border-[#222222] mb-7">
              <View className="flex-row items-center mb-6">
                <View className="w-14 h-14 bg-[#222224] rounded-2xl items-center justify-center mr-4 border border-[#2E2E30]">
                  <Barbell size={28} color="#66666A" weight="fill" />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-white text-base font-semibold capitalize">{nextSession.title}</Text>
                    {isSessionCancelled && (
                      <View className="bg-[#3A1010] border border-[#FF3B30] px-2 py-0.5 rounded-md">
                        <Text className="text-[#FF3B30] text-[10px] font-semibold uppercase">Cancelled</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-start">
                    <View className="flex-row items-center mr-6">
                      <CalendarBlank size={14} color="#8E8E93" />
                      <View className="ml-1.5">
                        <Text className="text-[#8E8E93] text-[11px]">{nextSession.dayLabel}</Text>
                        <Text className="text-white text-xs font-semibold mt-0.5">{nextSession.dateStr}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center">
                      <Clock size={14} color="#8E8E93" />
                      <View className="ml-1.5">
                        <Text className="text-[#8E8E93] text-[11px]">{nextSession.time}</Text>
                        <Text className="text-white text-xs font-semibold mt-0.5">{nextSession.duration}</Text>
                      </View>
                    </View>
                  </View>
                  {nextSession.exerciseCount > 0 && (
                    <Text className="text-[#D4FF00] text-[11px] font-medium mt-2">
                      {nextSession.exerciseCount} exercises scheduled by your trainer
                    </Text>
                  )}
                </View>
              </View>

              {/* <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setShowAllSlotsModal(true);
                  }}
                  className="flex-1 border border-[#D4FF00] bg-[#1C2307] rounded-2xl py-3.5 items-center justify-center active:opacity-70"
                >
                  <Text className="text-[#D4FF00] font-semibold text-sm">Reschedule</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (isSessionCancelled) {
                      Alert.alert('Info', 'This session is already cancelled. Select a slot below to re-book.');
                    } else {
                      cancelSession();
                    }
                  }}
                  className={`flex-1 border ${isSessionCancelled ? 'border-[#444] bg-[#222]' : 'border-[#6B1C1C] bg-[#220B0B]'} rounded-2xl py-3.5 flex-row items-center justify-center active:opacity-70`}
                >
                  <XCircle size={17} color={isSessionCancelled ? '#8E8E93' : '#FF3B30'} weight="fill" />
                  <Text className={`${isSessionCancelled ? 'text-[#8E8E93]' : 'text-[#FF3B30]'} font-semibold text-sm ml-2`}>
                    {isSessionCancelled ? 'Cancelled' : 'Cancel Session'}
                  </Text>
                </Pressable>
              </View> */}
            </View>

            {/* <View className="flex-row items-center justify-between mb-3.5 px-1">
              <Text className="text-white text-xs font-semibold uppercase tracking-wider">BOOK A SLOT</Text>
              <Pressable onPress={() => setShowAllSlotsModal(true)} className="flex-row items-center active:opacity-70">
                <Text className="text-[#D4FF00] text-xs font-semibold mr-1">View All Slots</Text>
                <CaretRight size={12} color="#D4FF00" weight="bold" />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                return (
                  <Pressable
                    key={slot.time}
                    onPress={() => setSelectedSlot(slot.time)}
                    className={`rounded-2xl py-3 px-4 w-[112px] items-center justify-center border ${isSelected ? 'bg-[#1D2507] border-2 border-[#D4FF00]' : 'bg-[#141414] border-[#262628]'
                      } active:opacity-80`}
                  >
                    <Text className={`font-semibold text-[15px] mb-1.5 ${isSelected ? 'text-[#D4FF00]' : 'text-white'}`}>
                      {slot.time}
                    </Text>
                    <View className="flex-row items-center">
                      <View className={`w-2 h-2 rounded-full mr-1.5 ${isSelected ? 'bg-[#D4FF00]' : 'bg-[#00FF66]'}`} />
                      <Text className={`text-[11px] font-semibold ${isSelected ? 'text-gray-300' : 'text-[#8E8E93]'}`}>
                        {slot.status}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={handleBookSlot}
              className="bg-[#D4FF00] rounded-2xl py-4 flex-row items-center justify-center mt-5 mb-7 active:opacity-80 shadow-lg"
              style={{ shadowColor: '#D4FF00', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
            >
              <CalendarPlus size={20} color="#000000" weight="bold" />
              <Text className="text-black text-base font-semibold ml-2.5">Book Selected Slot</Text>
            </Pressable> */}

            <View className="flex-row justify-between gap-x-3 mb-7">
              <Pressable
                onPress={() => router.push('/(customer)/weeklyWorkoutPlan')}
                className="bg-[#141414] rounded-2xl p-4 flex-1 items-center justify-center border border-[#222222] active:opacity-75"
              >
                <View className="mb-2">
                  <ClipboardText size={26} color="#D4FF00" weight="regular" />
                </View>
                <Text className="text-white text-[13px] font-semibold text-center mb-0.5">Workout Plan</Text>
                <Text className="text-[#8E8E93] text-[10px] text-center font-medium">View your plan</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(customer)/progress')}
                className="bg-[#141414] rounded-2xl p-4 flex-1 items-center justify-center border border-[#222222] active:opacity-75"
              >
                <View className="mb-2">
                  <ChartBar size={26} color="#D4FF00" weight="regular" />
                </View>
                <Text className="text-white text-[13px] font-semibold text-center mb-0.5">Progress</Text>
                <Text className="text-[#8E8E93] text-[10px] text-center font-medium">Track progress</Text>
              </Pressable>

              <Pressable
                onPress={() => Alert.alert('Session History', 'You have completed 4 sessions this month with excellent consistency!')}
                className="bg-[#141414] rounded-2xl p-4 flex-1 items-center justify-center border border-[#222222] active:opacity-75"
              >
                <View className="mb-2">
                  <CalendarCheck size={26} color="#D4FF00" weight="regular" />
                </View>
                <Text className="text-white text-[13px] font-semibold text-center mb-0.5">Session History</Text>
                <Text className="text-[#8E8E93] text-[10px] text-center font-medium">View past sessions</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setShowChangeModal(true)}
              className="bg-[#141414] rounded-3xl p-4 border border-[#222222] mb-8 flex-row items-center justify-between active:opacity-80"
            >
              <View className="w-11 h-11 rounded-full bg-[#232910] border border-[#3E4A15] items-center justify-center mr-4">
                <UserCircle size={26} color="#D4FF00" weight="regular" />
              </View>

              <View className="flex-1 mr-2">
                <Text className="text-white text-[15px] font-semibold">Request Trainer Change</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">Trainer changes are subject to gym approval.</Text>
              </View>

              <CaretRight size={18} color="#D4FF00" weight="bold" />
            </Pressable>
          </>
        )}

      </ScrollView>

      <Modal visible={showPlanModal} transparent animationType="fade" onRequestClose={() => setShowPlanModal(false)}>
        <View className="flex-1 bg-black/85 justify-center items-center p-6">
          <View className="bg-[#18181A] w-full rounded-3xl p-6 border border-[#2A2A2E]">
            <View className="flex-row items-center mb-4">
              <Sparkle size={24} color="#D4FF00" weight="fill" />
              <Text className="text-white text-lg font-semibold uppercase ml-2.5">Personal Training Plan</Text>
            </View>
            <Text className="text-[#A1A1AA] text-sm leading-6 mb-6">
              Your ongoing subscription covers <Text className="text-white font-semibold">{planDetails.totalSessions} 1-on-1 personal coaching sessions</Text> every month with your verified trainer.{'\n\n'}
              • Unused sessions carry over for 7 days.{'\n'}
              • Reschedule up to 3 hours prior without losing a session credit.
              {Platform.OS !== 'ios' && (
                <>
                  {'\n'}• Next recurring billing is on <Text className="text-[#D4FF00] font-semibold">{planDetails.renewalDate}</Text> (₹7,999).
                </>
              )}
            </Text>
            <Pressable onPress={() => setShowPlanModal(false)} className="bg-[#D4FF00] py-3.5 rounded-2xl items-center">
              <Text className="text-black font-semibold text-base">Got It</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View className="flex-1 bg-black/85 justify-center items-center p-6">
          <View className="bg-[#18181A] w-full max-w-[320px] rounded-3xl p-6 items-center border border-[#2A2A2E]">
            <View className="w-16 h-16 rounded-full bg-[#20290A] items-center justify-center mb-4 border border-[#3E4E11]">
              <CheckCircle size={36} color="#00FF66" weight="fill" />
            </View>
            <Text className="text-white text-xl font-semibold text-center mb-2">Slot Confirmed!</Text>
            <Text className="text-[#A1A1AA] text-sm text-center leading-5 mb-6">
              Your next training session with <Text className="text-white font-semibold">{trainerName}</Text> is scheduled for <Text className="text-[#D4FF00] font-semibold">Tomorrow at {selectedSlot}</Text>.
            </Text>
            <Pressable onPress={() => setShowSuccessModal(false)} className="bg-[#D4FF00] w-full py-3.5 rounded-2xl items-center">
              <Text className="text-black font-semibold text-base">Awesome</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showAllSlotsModal} transparent animationType="slide" onRequestClose={() => setShowAllSlotsModal(false)}>
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-[#141414] rounded-t-3xl p-6 border-t border-[#2A2A2E] max-h-[80%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-white text-lg font-semibold">Select Available Slot</Text>
              <Pressable onPress={() => setShowAllSlotsModal(false)} className="p-2">
                <Text className="text-[#8E8E93] font-semibold text-sm">Close</Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-3 mb-6">
              {[
                { time: '6:00 AM', status: 'Available' },
                { time: '7:30 AM', status: 'Available' },
                { time: '9:00 AM', status: 'Available' },
                { time: '11:00 AM', status: 'Available' },
                { time: '4:00 PM', status: 'Available' },
                { time: '5:00 PM', status: 'Available' },
                { time: '6:30 PM', status: 'Available' },
                { time: '8:00 PM', status: 'Available' },
              ].map((s) => (
                <Pressable
                  key={s.time}
                  onPress={() => {
                    setSelectedSlot(s.time);
                    setShowAllSlotsModal(false);
                  }}
                  className={`w-[48%] p-3.5 rounded-2xl border flex-row justify-between items-center ${selectedSlot === s.time ? 'bg-[#1D2507] border-[#D4FF00]' : 'bg-[#1C1C1E] border-[#2C2C2E]'
                    }`}
                >
                  <Text className={`font-semibold ${selectedSlot === s.time ? 'text-[#D4FF00]' : 'text-white'}`}>{s.time}</Text>
                  <View className="w-2.5 h-2.5 rounded-full bg-[#00FF66]" />
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => {
                setShowAllSlotsModal(false);
                handleBookSlot();
              }}
              className="bg-[#D4FF00] py-4 rounded-2xl items-center"
            >
              <Text className="text-black font-semibold text-base">Confirm & Book Slot</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showChangeModal} transparent animationType="fade" onRequestClose={() => setShowChangeModal(false)}>
        <View className="flex-1 bg-black/85 justify-center items-center p-6">
          <View className="bg-[#18181A] w-full rounded-3xl p-6 border border-[#2A2A2E]">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-[#232910] items-center justify-center mb-3 border border-[#3E4A15]">
                <UserCircle size={36} color="#D4FF00" weight="regular" />
              </View>
              <Text className="text-white text-xl font-semibold text-center">Request Trainer Change</Text>
            </View>
            <Text className="text-[#A1A1AA] text-sm text-center leading-6 mb-6">
              Would you like to browse other certified trainers and submit a new trainer request?
            </Text>

            <Pressable
              onPress={() => {
                setShowChangeModal(false);
                router.push('/(customer)/trainer/book-trainer');
              }}
              className="bg-[#D4FF00] py-3.5 rounded-2xl items-center flex-row justify-center mb-3 active:opacity-75"
            >
              <Text className="text-black font-semibold text-base">Browse Other Trainers</Text>
            </Pressable>

            {/* <Pressable
              onPress={() => {
                setShowChangeModal(false);
                resetTrainer();
                router.replace('/(customer)/profile');
              }}
              className="bg-[#2D1212] border border-[#FF3B30] py-3.5 rounded-2xl items-center flex-row justify-center mb-3 active:opacity-75"
            >
              <Trash size={18} color="#FF3B30" weight="bold" />
              <Text className="text-[#FF3B30] font-semibold text-sm ml-2">Reset Demo Status</Text>
            </Pressable> */}

            <Pressable
              onPress={() => setShowChangeModal(false)}
              className="bg-[#262628] py-3.5 rounded-2xl items-center active:opacity-75"
            >
              <Text className="text-white font-semibold text-base">Keep Current Trainer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
