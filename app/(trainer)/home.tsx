import React, { useMemo, useState } from 'react';
import { View, ScrollView, Text, Image, Pressable, ActivityIndicator, BackHandler } from 'react-native';
import {
  CaretRight,
  Plus,
  Users,
  User,
  ArrowRight,
  ClipboardText,
  Bag,
  Star,
  CalendarBlank,
  Barbell,
  CheckCircle,
  Clock,
} from 'phosphor-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useAssignedCustomersByTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymTrainerByUserId } from '@/hooks/trainers/useGymTrainers';
import { useIndividualCustomerTrainers } from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import { useIndividualTrainerSessionsForDate } from '@/hooks/individual/customer-trainer/individualTrainerSessions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

function getAddedDateString(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Recently assigned';
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (startOfD.getTime() === startOfToday.getTime()) {
    return 'Added today';
  } else if (startOfD.getTime() === startOfYesterday.getTime()) {
    return 'Added yesterday';
  } else {
    return `Added on ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
}

function parseWeekDays(weekDays: any): string[] {
  if (!weekDays) return [];
  if (Array.isArray(weekDays)) {
    return weekDays.map((d) => String(d).trim().toLowerCase());
  }
  if (typeof weekDays === 'string') {
    const trimmed = weekDays.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((d) => String(d).trim().toLowerCase());
        }
      } catch {
        // fallback to comma split
      }
    }
    return trimmed.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function isDayMatchingToday(weekDays: any, todayDate = new Date()): boolean {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const fullDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = todayDate.getDay();
  const todayShort = days[dayIndex];
  const todayFull = fullDays[dayIndex];
  const isoDayNumber = String(dayIndex === 0 ? 7 : dayIndex);
  const jsDayNumber = String(dayIndex);

  const parsed = parseWeekDays(weekDays);
  if (parsed.length === 0) return false;

  return parsed.some((d) => {
    return (
      d === todayShort ||
      d === todayFull ||
      d.startsWith(todayShort) ||
      todayFull.startsWith(d) ||
      d === isoDayNumber ||
      d === jsDayNumber ||
      d === 'daily' ||
      d === 'everyday' ||
      d === 'all'
    );
  });
}

function isExpiryValidForToday(expiryOn?: string | Date | null, todayDate = new Date()): boolean {
  if (!expiryOn) return true;
  const expiryDate = new Date(expiryOn);
  if (isNaN(expiryDate.getTime())) return true;
  const startOfToday = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 0, 0, 0, 0);
  const expiryEndOfDay = new Date(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate(),
    23,
    59,
    59,
    999
  );
  return expiryEndOfDay >= startOfToday;
}

function formatTimeString(timeStr?: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
    return `${hourStr}:${minute} ${ampm}`;
  }
  return trimmed;
}

function parseTimingParts(timingStr?: string | null): { start: string; end?: string } {
  if (!timingStr || timingStr.trim() === '') {
    return { start: 'Flexible', end: 'Schedule' };
  }
  const clean = timingStr.trim();
  if (clean.includes('-')) {
    const parts = clean.split('-').map((s) => s.trim());
    return { start: formatTimeString(parts[0]), end: formatTimeString(parts[1]) };
  }
  if (clean.includes('to')) {
    const parts = clean.split('to').map((s) => s.trim());
    return { start: formatTimeString(parts[0]), end: formatTimeString(parts[1]) };
  }
  return { start: formatTimeString(clean) };
}

let cachedGlobalTrainerRecord: any = null;
let cachedIndividualAssignments: any[] | null = null;
let cachedTodayDbSessions: any[] | null = null;
let cachedAssignments: any[] | null = null;

export default function TrainerHome() {
  const router = useRouter();
  const { userId, email, name, role, globalTrainerId: userGlobalTrainerId } = useUser();

  const { data: globalTrainerRecord, refetch: refetchGlobalTrainerRecord } = useQuery({
    queryKey: ['myGlobalTrainerId', userId, email],
    queryFn: async () => {
      if (!userId && !email) return null;
      let query = supabase.from('global_trainers').select('globalTrainerId');
      if (userId && email) {
        query = query.or(`userId.eq.${userId},email.eq.${email}`);
      } else if (userId) {
        query = query.eq('userId', userId);
      } else {
        query = query.eq('email', email);
      }
      const { data: gt } = await query.maybeSingle();
      if (gt) cachedGlobalTrainerRecord = gt;
      return gt;
    },
    enabled: !!(userId || email),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  if (globalTrainerRecord && !cachedGlobalTrainerRecord) {
    cachedGlobalTrainerRecord = globalTrainerRecord;
  }

  const effectiveGlobalTrainerId = userGlobalTrainerId || globalTrainerRecord?.globalTrainerId || cachedGlobalTrainerRecord?.globalTrainerId;
  const isGlobalTrainerRole = (role || '').toLowerCase().replace(/[\s_-]/g, '') === 'globaltrainer';
  const isGlobalTrainer = isGlobalTrainerRole || !!effectiveGlobalTrainerId;

  const { data: trainerData } = useGymTrainerByUserId(userId ?? undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const loggedInGymTrainerId = trainerData?.trainer?.gymTrainerId;
  const effectiveGymTrainerId = loggedInGymTrainerId || userId;

  const { data: assignments, isLoading: loadingAssignments, refetch: refetchAssignments } = useAssignedCustomersByTrainer(
    effectiveGymTrainerId ?? undefined,
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  if (assignments && assignments.length > 0) {
    cachedAssignments = assignments;
  }

  const individualFilters = useMemo(() => {
    return effectiveGlobalTrainerId ? { globalTrainerId: effectiveGlobalTrainerId } : undefined;
  }, [effectiveGlobalTrainerId]);

  const { data: individualAssignments, isLoading: loadingIndividual, refetch: refetchIndividual } = useIndividualCustomerTrainers(
    individualFilters,
    {
      enabled: !!effectiveGlobalTrainerId,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  if (individualAssignments && individualAssignments.length > 0) {
    cachedIndividualAssignments = individualAssignments;
  }

  const [refreshing, setRefreshing] = useState(false);
  const todayDate = useMemo(() => new Date(), []);

  const todayIndividualAssignments = useMemo(() => {
    const list = individualAssignments || cachedIndividualAssignments || [];
    return list.filter((assignment: any) => {
      const isApproved = !assignment.status || assignment.status.toLowerCase() === 'approved';
      const isActive = assignment.isActive !== false && String(assignment.isActive).toLowerCase() !== 'false';
      const isNotExpired = isExpiryValidForToday(assignment.expiryOn, todayDate);
      const isDayIncluded = isDayMatchingToday(assignment.weekDays, todayDate);
      const hasTimings = !!(assignment.timings && String(assignment.timings).trim() !== '');

      return isApproved && isActive && isNotExpired && isDayIncluded && hasTimings;
    });
  }, [individualAssignments, todayDate]);

  const todaySessionIds = useMemo(() => {
    return todayIndividualAssignments.map((a: any) => a.individualCustomerTrainerId).filter(Boolean) as string[];
  }, [todayIndividualAssignments]);

  const { data: dbTodaySessions, refetch: refetchTodayDbSessions } = useIndividualTrainerSessionsForDate(
    todaySessionIds,
    todayDate,
    {
      enabled: isGlobalTrainer && todaySessionIds.length > 0,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  if (dbTodaySessions && dbTodaySessions.length > 0) {
    cachedTodayDbSessions = dbTodaySessions;
  }

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAssignments(),
        refetchGlobalTrainerRecord?.(),
        refetchIndividual?.(),
        refetchTodayDbSessions?.(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const getAssignmentSessionStatus = (individualCustomerTrainerId: string): 'Completed' | 'Upcoming' | 'Cancelled' => {
    const allDbSessions = dbTodaySessions || cachedTodayDbSessions;
    const dbSession = allDbSessions?.find((s: any) => s.individualCustomerTrainerId === individualCustomerTrainerId);
    if (dbSession) {
      if (dbSession.status === 'completed') return 'Completed';
      if (dbSession.status === 'cancelled') return 'Cancelled';
      return 'Upcoming';
    }
    return 'Upcoming';
  };

  const todayTotalSessionsCount = todayIndividualAssignments.length;
  const todayCompletedSessionsCount = todayIndividualAssignments.filter(
    (a: any) => getAssignmentSessionStatus(a.individualCustomerTrainerId) === 'Completed'
  ).length;
  const todayCancelledSessionsCount = todayIndividualAssignments.filter(
    (a: any) => getAssignmentSessionStatus(a.individualCustomerTrainerId) === 'Cancelled'
  ).length;
  const todayUpcomingSessionsCount = Math.max(0, todayTotalSessionsCount - todayCompletedSessionsCount - todayCancelledSessionsCount);

  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    const day = d.getDate();
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  }, []);

  const { todaySessionsCount, validCustomersCount } = useMemo(() => {
    const today = new Date();

    // 1. Gym Trainer Sessions (for regular trainer)
    const activeAssignments = assignments || cachedAssignments || [];
    const gymSessions = activeAssignments.filter((assignment: any) => {
      const isSelectedDay = isDayMatchingToday(assignment.weekDays, today);
      const isActive = assignment.isActive === true || String(assignment.isActive).toLowerCase() === 'true';
      const isNotExpired = isExpiryValidForToday(assignment.expiryOn, today);

      return isSelectedDay && isActive && isNotExpired;
    });

    // 2. Individual Customer Trainer Sessions (for global trainer)
    const individualSessions = todayIndividualAssignments;

    // 3. Valid Individual Customers count (for PT Customers count card)
    const allIndividual = individualAssignments || cachedIndividualAssignments || [];
    const validIndividualCustomers = allIndividual.filter((assignment: any) => {
      const isApproved = !assignment.status || assignment.status.toLowerCase() === 'approved';
      const isActive = assignment.isActive !== false && String(assignment.isActive).toLowerCase() !== 'false';
      const isNotExpired = isExpiryValidForToday(assignment.expiryOn, today);

      return isApproved && isActive && isNotExpired;
    });

    // 4. Valid Gym Customers count
    const validGymCustomers = activeAssignments.filter((assignment: any) => {
      const isActive = assignment.isActive === true || String(assignment.isActive).toLowerCase() === 'true';
      const isNotExpired = isExpiryValidForToday(assignment.expiryOn, today);

      return isActive && isNotExpired;
    });

    const sessionsCount = isGlobalTrainer
      ? individualSessions.length
      : (gymSessions.length > 0 ? gymSessions.length : individualSessions.length);

    const customersCount = isGlobalTrainer
      ? validIndividualCustomers.length
      : (validGymCustomers.length > 0 ? validGymCustomers.length : validIndividualCustomers.length);

    return {
      todaySessionsCount: sessionsCount,
      validCustomersCount: customersCount,
    };
  }, [assignments, individualAssignments, todayIndividualAssignments, isGlobalTrainer]);

  const recentAssignments = useMemo(() => {
    const list = isGlobalTrainer
      ? (individualAssignments || cachedIndividualAssignments || [])
      : ((assignments && assignments.length > 0) ? assignments : (cachedAssignments || individualAssignments || cachedIndividualAssignments || []));

    return [...list]
      .sort((a: any, b: any) => {
        const dateA = new Date(a.assignedOn || a.createdAt || 0).getTime();
        const dateB = new Date(b.assignedOn || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 3);
  }, [isGlobalTrainer, assignments, individualAssignments]);

  const pendingRequestsCount = (individualAssignments || cachedIndividualAssignments)?.filter((a: any) => a.status === 'pending')?.length || 0;
  const hasExistingData = !!(
    (individualAssignments && individualAssignments.length > 0) ||
    (cachedIndividualAssignments && cachedIndividualAssignments.length > 0) ||
    (assignments && assignments.length > 0) ||
    (cachedAssignments && cachedAssignments.length > 0)
  );
  const isResolvingGlobalTrainer = isGlobalTrainerRole && !effectiveGlobalTrainerId;
  const isLoadingData = !hasExistingData && (isGlobalTrainer
    ? (loadingIndividual || isResolvingGlobalTrainer)
    : (loadingAssignments || (loadingIndividual && isResolvingGlobalTrainer)));
  const isLoadingSessions = isLoadingData;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      className="flex-1 bg-[#09090B]"
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="px-5 pt-5 pb-6">
        <Text className="text-white text-[28px] font-semibold">
          {getGreeting()},<Text className="text-[#CCFF00]">{name?.split(' ')[0] || 'Trainer'}</Text>
        </Text>
        <Text className="text-[#8E8E93] text-sm mt-1 font-sans">
          {isGlobalTrainer ? 'Global Trainer' : 'Strength & Conditioning Coach'}
        </Text>
      </View>

      {/* Global Trainer Dashboard UI */}
      {isGlobalTrainer ? (
        <>
          {/* Today's Sessions Container */}
          <View className="px-5 mb-6">
            <View className="bg-[#121214] rounded-[24px] p-5 border border-[#1F1F23]">
              <View className="flex-row justify-between items-center">
                <Text className="text-white text-lg font-semibold">Today's Sessions</Text>
                <View className="flex-row items-center">
                  <CalendarBlank size={16} color="#CCFF00" style={{ marginRight: 6 }} />
                  <Text className="text-[#CCFF00] text-xs font-semibold">{formattedTodayDate}</Text>
                </View>
              </View>

              <View className="flex-row gap-3 mt-4">
                {/* Total Sessions */}
                <View className="flex-1 bg-[#18181B] rounded-2xl py-3.5 px-2 items-center justify-center border border-[#27272A]/40">
                  <View className="flex-row items-center justify-center">
                    <Barbell size={20} color="#CCFF00" weight="bold" />
                    <Text className="text-white text-2xl font-semibold ml-2">{todayTotalSessionsCount}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-xs mt-1.5 font-sans text-center">Total Sessions</Text>
                </View>

                {/* Completed */}
                <View className="flex-1 bg-[#18181B] rounded-2xl py-3.5 px-2 items-center justify-center border border-[#27272A]/40">
                  <View className="flex-row items-center justify-center">
                    <CheckCircle size={20} color="#38BDF8" weight="bold" />
                    <Text className="text-white text-2xl font-semibold ml-2">{todayCompletedSessionsCount}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-xs mt-1.5 font-sans text-center">Completed</Text>
                </View>

                {/* Upcoming */}
                <View className="flex-1 bg-[#18181B] rounded-2xl py-3.5 px-2 items-center justify-center border border-[#27272A]/40">
                  <View className="flex-row items-center justify-center">
                    <Clock size={20} color="#C084FC" weight="bold" />
                    <Text className="text-white text-2xl font-semibold ml-2">{todayUpcomingSessionsCount}</Text>
                  </View>
                  <Text className="text-[#8E8E93] text-xs mt-1.5 font-sans text-center">Upcoming</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Today's Schedule Section */}
          <View className="px-5 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-lg font-semibold">Today's Schedule</Text>
              <Pressable
                className="flex-row items-center active:opacity-70"
                onPress={() => router.push('/(trainer)/pt-sessions' as any)}
              >
                <Text className="text-[#CCFF00] text-sm font-semibold mr-0.5 font-sans">View All</Text>
                <CaretRight size={14} color="#CCFF00" weight="bold" />
              </Pressable>
            </View>

            {todayIndividualAssignments.length === 0 ? (
              <View className="bg-[#141416] rounded-2xl border border-[#222226] p-6 items-center justify-center">
                <Clock size={28} color="#64748B" style={{ marginBottom: 6 }} />
                <Text className="text-[#8E8E93] text-xs font-sans text-center">No sessions scheduled for today</Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 285 }}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
              >
                {todayIndividualAssignments.map((assignment: any, index: number) => {
                  const sessionId = assignment.individualCustomerTrainerId;
                  const status = getAssignmentSessionStatus(sessionId);
                  const name = assignment.user?.name || assignment.user?.fullName || 'Customer';
                  const rawSpec = assignment.globalTrainer?.specialization;
                  const formatSpec = (s?: string) => {
                    if (!s) return 'Strength Training';
                    const lower = s.toLowerCase();
                    if (lower === 'strength') return 'Strength Training';
                    if (lower === 'fatloss') return 'Fat Loss Training';
                    if (lower === 'crossfit') return 'Crossfit Training';
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  };
                  const specialization = formatSpec(rawSpec);

                  let avatarUrl = assignment.user?.profilePic || assignment.user?.profilePhoto || null;
                  if (avatarUrl && typeof avatarUrl === 'string' && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('file:') && !avatarUrl.startsWith('data:')) {
                    const pathInBucket = avatarUrl.includes('/')
                      ? avatarUrl
                      : `${assignment.user?.userId || assignment.userId}/${avatarUrl}`;
                    const { data: pUrl } = supabase.storage.from('profile_photos').getPublicUrl(pathInBucket);
                    avatarUrl = pUrl?.publicUrl || null;
                  }

                  const timingParts = parseTimingParts(assignment.timings);

                  return (
                    <Pressable
                      key={sessionId || index}
                      className="bg-[#141416] rounded-2xl border border-[#222226] mb-3 flex-row overflow-hidden active:opacity-80"
                      onPress={() => router.push('/(trainer)/pt-sessions' as any)}
                    >
                      {/* Left: Timing */}
                      <View className="w-[94px] py-4 px-1 items-center justify-center">
                        <Text className="text-white text-xs font-semibold text-center">{timingParts.start}</Text>
                        {timingParts.end ? (
                          <>
                            <Text className="text-[#64748B] text-xs my-0.5">-</Text>
                            <Text className="text-white text-xs font-semibold text-center">{timingParts.end}</Text>
                          </>
                        ) : null}
                      </View>

                      {/* Vertical Accent Strip */}
                      <View
                        className={`w-1 self-stretch ${status === 'Completed'
                          ? 'bg-[#CCFF00]'
                          : status === 'Cancelled'
                            ? 'bg-[#EF4444]'
                            : 'bg-[#A855F7]'
                          }`}
                      />

                      {/* Right: Customer Info */}
                      <View className="flex-1 flex-row items-center p-3 pl-3.5">
                        <View className="w-12 h-12 rounded-full mr-3 overflow-hidden bg-[#1A1A1E] items-center justify-center border border-[#26262B]">
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} className="w-full h-full" />
                          ) : (
                            <User size={22} color="#8E8E93" weight="fill" />
                          )}
                        </View>
                        <View className="flex-1 justify-center">
                          <Text className="text-white text-base font-semibold mb-0.5" numberOfLines={1}>{name}</Text>
                          <Text className="text-[#8E8E93] text-xs mb-1.5 font-sans capitalize" numberOfLines={1}>
                            {specialization}
                          </Text>
                          <View
                            className={`self-start px-2.5 py-0.5 rounded-full border ${status === 'Completed'
                              ? 'bg-[#0D2818] border-[#22C55E]/40'
                              : status === 'Cancelled'
                                ? 'bg-[#450A0A]/40 border-[#EF4444]/40'
                                : 'bg-[#2E1065]/40 border-[#A855F7]/40'
                              }`}
                          >
                            <Text
                              className={`text-[10px] font-semibold ${status === 'Completed'
                                ? 'text-[#22C55E]'
                                : status === 'Cancelled'
                                  ? 'text-[#F87171]'
                                  : 'text-[#C084FC]'
                                }`}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </>
      ) : (
        /* Regular Gym Trainer Dashboard */
        <>
          <View className="px-5 mb-6">
            <View className="bg-[#141414] rounded-2xl p-5 border border-[#1A1A1A] flex-row justify-between items-center">
              <View className="flex-1 border-r border-[#2A2A2A] pr-4">
                <View className="flex-row items-center mb-3">
                  <View className="w-6 h-6 rounded-full bg-[#CCFF00] items-center justify-center mr-2">
                    <Star size={12} color="#000" weight="fill" />
                  </View>
                  <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider">MY ATTENDANCE</Text>
                </View>
                <View className="flex-row items-baseline mb-3">
                  <Text className="text-white text-5xl font-semibold mr-2">28</Text>
                  <Text className="text-[#A3A3A3] text-sm font-sans">Days Left</Text>
                </View>
                <View className="h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
                  <View className="h-full bg-[#CCFF00] w-1/3 rounded-full" />
                </View>
              </View>

              <View className="pl-6 items-center justify-center">
                <View className="w-10 h-10 mb-2 items-center justify-center">
                  <View className="flex-row flex-wrap w-6 h-6 justify-between content-between">
                    <View className="w-2.5 h-2.5 bg-[#CCFF00] rounded-sm" />
                    <View className="w-2.5 h-2.5 bg-[#CCFF00] rounded-sm" />
                    <View className="w-2.5 h-2.5 bg-[#CCFF00] rounded-sm" />
                    <View className="w-2.5 h-2.5 bg-[#CCFF00] rounded-sm" />
                  </View>
                </View>
                <Text className="text-[#A3A3A3] text-xs text-center mb-1 font-sans">Check-in{'\n'}(QR)</Text>
                <Pressable>
                  <Text className="text-[#CCFF00] text-xs underline font-sans">View</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View className="px-5 mb-6">
            <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3">TODAY</Text>
            <View className="flex-row justify-between">
              <View className="bg-[#141414] rounded-2xl p-4 border border-[#1A1A1A] flex-1 mr-2">
                <Pressable
                  className="flex-row items-center mb-2 active:opacity-70"
                  onPress={() => router.push('/(trainer)/session-history' as any)}
                >
                  <View className="w-10 h-10 rounded-full border border-[#CCFF00]/30 items-center justify-center mr-3">
                    <Users size={20} color="#CCFF00" />
                  </View>
                  <View>
                    <Text className="text-[#A3A3A3] text-xs font-sans">PT Sessions</Text>
                    {isLoadingSessions ? (
                      <ActivityIndicator size="small" color="#CCFF00" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                    ) : (
                      <Text className="text-white text-2xl font-semibold">{todaySessionsCount}</Text>
                    )}
                  </View>
                </Pressable>
                <View className="flex-row items-center justify-between mt-2 pt-3 border-t border-[#1A1A1A]">
                  <Text className="text-[#A3A3A3] text-[10px] font-sans">Scheduled today</Text>
                  <Pressable
                    onPress={() => router.push('/(trainer)/pt-sessions' as any)}
                    className="w-5 h-5 rounded-full border border-[#CCFF00] items-center justify-center active:opacity-70"
                  >
                    <ArrowRight size={12} color="#CCFF00" />
                  </Pressable>
                </View>
              </View>

              <View className="bg-[#141414] rounded-2xl p-4 border border-[#1A1A1A] flex-1 ml-2">
                <View className="flex-row items-center mb-2">
                  <View className="w-10 h-10 rounded-full border border-[#CCFF00]/30 items-center justify-center mr-3">
                    <User size={20} color="#CCFF00" />
                  </View>
                  <View>
                    <Text className="text-[#A3A3A3] text-xs font-sans">PT Customers</Text>
                    {isLoadingData ? (
                      <ActivityIndicator size="small" color="#CCFF00" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                    ) : (
                      <Text className="text-white text-2xl font-semibold">{validCustomersCount}</Text>
                    )}
                  </View>
                </View>
                <View className="flex-row items-center justify-between mt-2 pt-3 border-t border-[#1A1A1A]">
                  <Text className="text-[#A3A3A3] text-[10px] font-sans">Assigned to you</Text>
                  <Pressable
                    onPress={() => router.push('/(trainer)/pt-customers' as any)}
                    className="w-5 h-5 rounded-full border border-[#CCFF00] items-center justify-center active:opacity-70"
                  >
                    <ArrowRight size={12} color="#CCFF00" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View className="px-5 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider">NEW ASSIGNMENTS</Text>
              <Pressable
                className="flex-row items-center active:opacity-70"
                onPress={() => router.push('/(trainer)/pt-customers' as any)}
              >
                <Text className="text-[#CCFF00] text-xs mr-1 font-sans">View All</Text>
                <ArrowRight size={10} color="#CCFF00" />
              </Pressable>
            </View>

            <View className="bg-[#141414] rounded-2xl border border-[#1A1A1A] overflow-hidden">
              {isLoadingData ? (
                <View className="py-8 items-center justify-center">
                  <ActivityIndicator size="small" color="#CCFF00" />
                </View>
              ) : recentAssignments.length === 0 ? (
                <View className="py-8 items-center justify-center px-4">
                  <User size={28} color="#666666" style={{ marginBottom: 6 }} />
                  <Text className="text-[#A3A3A3] text-xs font-sans text-center">No assignments found</Text>
                </View>
              ) : (
                recentAssignments.map((assignment: any, index: number) => {
                  const isInd = !!assignment.individualCustomerTrainerId;
                  const name = isInd ? (assignment.user?.name || 'Customer') : (assignment.customer?.fullName || 'Customer');
                  const subtitle = isInd
                    ? (assignment.timings || 'Individual PT')
                    : (assignment.customer?.customId || 'Gym Client');

                  let image = isInd
                    ? (assignment.user?.profilePic || assignment.user?.profilePhoto || null)
                    : (assignment.customer?.users?.profilePhoto || assignment.customer?.users?.profilePic || null);

                  if (image && typeof image === 'string' && !image.startsWith('http') && !image.startsWith('file:') && !image.startsWith('data:')) {
                    const pathInBucket = image.includes('/')
                      ? image
                      : `${isInd ? (assignment.user?.userId || assignment.userId) : (assignment.customer?.users?.userId || assignment.customer?.userId)}/${image}`;
                    const { data: pUrl } = supabase.storage.from('profile_photos').getPublicUrl(pathInBucket);
                    image = pUrl?.publicUrl || null;
                  }

                  const addedText = getAddedDateString(assignment.assignedOn || assignment.createdAt);
                  const isLast = index === recentAssignments.length - 1;
                  const isPending = assignment.status === 'pending';

                  return (
                    <Pressable
                      key={assignment.individualCustomerTrainerId || assignment.customerTrainerId || index}
                      className={`flex-row items-center p-4 active:opacity-80 ${!isLast ? 'border-b border-[#1A1A1A]' : ''}`}
                      onPress={() => {
                        if (isInd) {
                          router.push('/(trainer)/pt-customers' as any);
                        } else if (assignment.customer?.customerId) {
                          router.push({
                            pathname: '/(trainer)/weeklyWorkoutPlan',
                            params: { customerId: assignment.customer.customerId }
                          } as any);
                        } else {
                          router.push('/(trainer)/pt-customers' as any);
                        }
                      }}
                    >
                      <View className="w-12 h-12 bg-gray-700 rounded-full mr-4 overflow-hidden items-center justify-center">
                        {image ? (
                          <Image source={{ uri: image }} className="w-full h-full" />
                        ) : (
                          <User size={22} color="#A3A3A3" weight="fill" />
                        )}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="text-white text-base font-semibold mr-2" numberOfLines={1}>{name}</Text>
                          <View className={`${isPending ? 'bg-[#CCFF00]/20' : 'bg-[#4D5900]'} px-1.5 py-0.5 rounded`}>
                            <Text className="text-[#CCFF00] text-[10px] font-semibold">{isPending ? 'PENDING' : 'NEW'}</Text>
                          </View>
                        </View>
                        <Text className="text-[#A3A3A3] text-xs mb-0.5 font-sans" numberOfLines={1}>{subtitle}</Text>
                        <Text className="text-[#A3A3A3] text-xs font-sans">{addedText}</Text>
                      </View>
                      <CaretRight size={16} color="#A3A3A3" />
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </>
      )}

      {/* Quick Actions */}
      <View className="px-5 mb-6">
        <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3">QUICK ACTIONS</Text>
        <View className="flex-row justify-between">
          <Pressable
            className="bg-[#141414] rounded-2xl p-4 border border-[#1A1A1A] flex-1 mr-2 flex-row items-center justify-between"
            onPress={() => router.push('/(trainer)/create-workout-plan' as any)}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-2 border border-[#2A2A2A]">
                <ClipboardText size={18} color="#A3A3A3" />
              </View>
              <View>
                <Text className="text-[#A3A3A3] text-[10px] font-sans">Create</Text>
                <Text className="text-white text-sm font-semibold">Workout{'\n'}Plan</Text>
              </View>
            </View>
            <View className="w-6 h-6 rounded-full bg-[#CCFF00] items-center justify-center ml-1">
              <Plus size={14} color="#000" weight="bold" />
            </View>
          </Pressable>

          <Pressable
            className="bg-[#141414] rounded-2xl p-4 border border-[#1A1A1A] flex-1 ml-2 flex-row items-center justify-between active:opacity-80"
            onPress={() => router.push('/(trainer)/create-diet-plan' as any)}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-2 border border-[#2A2A2A]">
                <Bag size={18} color="#A3A3A3" />
              </View>
              <View>
                <Text className="text-[#A3A3A3] text-[10px] font-sans">Create</Text>
                <Text className="text-white text-sm font-semibold">Diet Plan</Text>
              </View>
            </View>
            <View className="w-6 h-6 rounded-full bg-[#CCFF00] items-center justify-center ml-1">
              <Plus size={14} color="#000" weight="bold" />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Global Session Requests */}
      <View className="px-5 mb-10">
        <View className="bg-[#141414] rounded-2xl p-5 border border-[#1A1A1A]">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-row items-center pr-2 shrink">
              <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-3 border border-[#2A2A2A] relative">
                <Bag size={20} color="#CCFF00" weight="fill" />
                <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#CCFF00] rounded-full border border-[#141414]" />
              </View>
              <View className="shrink pr-2">
                <Text className="text-white text-xs font-semibold tracking-wider mb-1">GLOBAL SESSION REQUESTS</Text>
                <Text className="text-[#A3A3A3] text-xs font-sans">New customers want to book a session</Text>
              </View>
            </View>
            <View className="bg-[#CCFF00] px-2 py-1 rounded-full flex-row items-center">
              <Text className="text-black text-[12px] font-semibold mr-1">{pendingRequestsCount}</Text>
              <Text className="text-black text-[9px] font-semibold">PENDING</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-[#1A1A1A]">
            <Text className="text-[#A3A3A3] text-xs font-sans">Check new inquiries</Text>
            <Pressable
              onPress={() => router.push('/(trainer)/pt-customers' as any)}
              className="bg-[#1A1A1A] px-3 py-1.5 rounded-full flex-row items-center active:opacity-70"
            >
              <Text className="text-[#CCFF00] text-xs mr-1 font-sans">View All</Text>
              <ArrowRight size={10} color="#CCFF00" />
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
