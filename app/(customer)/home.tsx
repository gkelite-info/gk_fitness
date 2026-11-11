import React, { useEffect, useState } from 'react';
import { getLocalDateString, getCalendarDaysDifference } from '@/lib/dateUtils';
import { View, ScrollView, Image, Pressable, ActivityIndicator, BackHandler, Platform, Linking } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerMediumHaptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useCustomerDashboardData } from '@/hooks/customerWorkouts/useCustomerDashboardData';
import { useTrainerDashboardData } from '@/hooks/trainerWorkoutPlans/useTrainerDashboardData';
import { useCustomerOnboardingStatus, sessionSkippedUsers } from '@/hooks/auth/useCustomerOnboardingStatus';
import { fetchGymCustomerMembershipPlans, toggleGymCustomerMembershipPlanActiveStatus } from '@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipPlans';
import { fetchIndividualCustomerPlans } from '@/helpers/individual/membership/individualCustomerPlan';
import {
  useIndividualCustomerPlans,
  useToggleIndividualCustomerPlanActiveStatus,
} from '@/hooks/individual/membership/individualCustomerPlan';
import { syncAllLocalReminders } from '@/lib/services/notificationService';
import { useSubscriptions } from '@/hooks/superadmin/subscriptions/subscriptions';
import {
  Star,
  QrCode,
  QrCode as QrCodeIcon,
  Barbell,
  Clock,
  ArrowRight,
  Flame,
  Footprints,
  Drop,
  Lightning,
  ForkKnife,
  BowlFood,
} from 'phosphor-react-native';
import { usePedometer } from '@/hooks/fitness/usePedometer';
import { useFitnessStats } from '@/hooks/fitness/useFitnessStats';
import { useWorkoutStreak } from '@/hooks/customerWorkouts/useWorkoutStreak';
import { useWeeklyStats } from '@/hooks/fitness/useWeeklyStats';
import { useGyms } from '@/hooks/gyms/useGyms';


// Module-level persistent cache across screen navigation
let cachedCustomerMembershipInfo: {
  planName: string;
  daysLeft: number | string;
  progressPercentage: number;
  membershipStatus: 'active' | 'pending_activation' | 'expired' | 'no_plan';
  individualPlanPrice: number;
  pendingTierUpdate: any;
} | null = null;
let cachedCustomerDashboardData: any = null;
let cachedTrainerDashboardData: any = null;

export default function CustomerHome() {
  const { name, userId, role } = useUser();
  const firstName = name?.split(' ')[0] || 'Customer';
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: customerDashboardData, isLoading: isLoadingCustomerDash, refetch: refetchCustomerDash } = useCustomerDashboardData(userId);
  const { data: trainerDashboardData, isLoading: isLoadingTrainerDash, refetch: refetchTrainerDash } = useTrainerDashboardData(userId);

  if (customerDashboardData) cachedCustomerDashboardData = customerDashboardData;
  if (trainerDashboardData) cachedTrainerDashboardData = trainerDashboardData;

  const effectiveCustomerDash = customerDashboardData || cachedCustomerDashboardData;
  const effectiveTrainerDash = trainerDashboardData || cachedTrainerDashboardData;

  const isTrainerPlan = !effectiveCustomerDash?.hasPlan && (effectiveTrainerDash?.hasPlan ?? false);
  const dashboardData = isTrainerPlan ? effectiveTrainerDash : effectiveCustomerDash;
  const isLoadingDashboard = (!effectiveCustomerDash && !effectiveTrainerDash) && (isLoadingCustomerDash || isLoadingTrainerDash);

  const { data: streakData } = useWorkoutStreak();
  const { data: weeklyStats, refetch: refetchWeeklyStats } = useWeeklyStats(userId);
  const { data: onboardingStatus, isLoading: isCheckingOnboarding, refetch: refetchOnboarding } = useCustomerOnboardingStatus(userId);
  const { data: dbGyms = [] } = useGyms();

  const todayWorkoutDayId = dashboardData?.todayWorkout?.dayId || null;
  const todayWorkoutType = dashboardData?.todayWorkout?.type || 'Rest';
  const todayDuration = dashboardData?.todayWorkout?.duration?.toString() || '0';
  const todayExercisesCount = dashboardData?.todayWorkout?.exercisesCount?.toString() || '0';

  const {
    data: individualCustomerPlans,
    isLoading: isIndivCustomerPlansLoading,
    refetch: refetchIndivCustomerPlans,
  } = useIndividualCustomerPlans(userId || undefined, undefined, { enabled: !!userId });
  const hasIndividualPlan = Boolean(individualCustomerPlans && individualCustomerPlans.length > 0);
  const isIndividual = role === 'individual' || hasIndividualPlan;
  const { mutateAsync: toggleIndivPlanActiveStatus } = useToggleIndividualCustomerPlanActiveStatus();

  const { data: customerSubscriptions, refetch: refetchSubscriptions } = useSubscriptions(
    undefined,
    'customer',
    { enabled: isIndividual }
  );

  const showQrCheckIn = React.useMemo(() => {
    if (!isIndividual) {
      return true;
    }

    if (!individualCustomerPlans || individualCustomerPlans.length === 0) {
      return false;
    }

    const activePlan =
      individualCustomerPlans.find(
        (p: any) =>
          p.isActive &&
          p.endDate &&
          new Date(p.endDate).getTime() > Date.now() &&
          p.status !== 'pending' &&
          p.transactionId
      ) || individualCustomerPlans[0];

    if (!activePlan) return false;

    const validCustomerSubscriptions = (customerSubscriptions || []).filter(
      (sub: any) =>
        !sub.is_deleted &&
        sub.isActive !== false &&
        (sub.planFor === 'customer' || sub.planFor === 'customers' || sub.planFor === 'individual_customer')
    );

    const matchedSubscription = validCustomerSubscriptions.find(
      (sub: any) => sub.subscriptionPlanId === activePlan.subscriptionPlanId
    );

    const userPlanPrice = Number(
      matchedSubscription?.price ?? activePlan.subscription?.price ?? activePlan.customAmount ?? 0
    );

    if (userPlanPrice <= 0) {
      return false;
    }

    if (validCustomerSubscriptions.length > 0) {
      const maxCustomerPrice = Math.max(
        ...validCustomerSubscriptions.map((sub: any) => Number(sub.price) || 0)
      );

      return maxCustomerPrice > 0 && userPlanPrice >= maxCustomerPrice;
    }

    return Boolean(activePlan.subscription?.price && activePlan.subscription.price > 0);
  }, [isIndividual, individualCustomerPlans, customerSubscriptions]);

  const [planName, setPlanName] = useState<string>(cachedCustomerMembershipInfo?.planName || 'MEMBER');
  const [daysLeft, setDaysLeft] = useState<number | string>(cachedCustomerMembershipInfo ? cachedCustomerMembershipInfo.daysLeft : '--');
  const [progressPercentage, setProgressPercentage] = useState<number>(cachedCustomerMembershipInfo?.progressPercentage || 0);
  const [isLoadingMembership, setIsLoadingMembership] = useState(!cachedCustomerMembershipInfo);
  const [membershipStatus, setMembershipStatus] = useState<'active' | 'pending_activation' | 'expired' | 'no_plan'>(
    cachedCustomerMembershipInfo?.membershipStatus || 'no_plan'
  );
  const [individualPlanPrice, setIndividualPlanPrice] = useState<number>(cachedCustomerMembershipInfo?.individualPlanPrice || 0);
  const [pendingTierUpdate, setPendingTierUpdate] = useState<{
    pendingPlanId: string;
    pendingPlanName: string;
    pendingAmount?: number | null;
  } | null>(cachedCustomerMembershipInfo?.pendingTierUpdate || null);

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

  const openCamera = () => {
    router.push('/(customer)/home/scan');
  };

  const fetchMembershipInfo = React.useCallback(
    async (forceFresh: boolean = false) => {
      if (!userId) {
        setIsLoadingMembership(false);
        return;
      }
      if (!cachedCustomerMembershipInfo && !forceFresh) {
        setIsLoadingMembership(true);
      }
      try {
        syncAllLocalReminders(userId).catch(console.error);

        let indivPlans: any[] = [];
        if (forceFresh || !individualCustomerPlans || individualCustomerPlans.length === 0) {
          try {
            indivPlans = await fetchIndividualCustomerPlans(userId);
          } catch (e) {
            indivPlans = individualCustomerPlans || [];
          }
        } else {
          indivPlans = individualCustomerPlans;
        }

        const hasIndiv = (indivPlans && indivPlans.length > 0) || role === 'individual';

        if (hasIndiv && indivPlans && indivPlans.length > 0) {
          setPendingTierUpdate(null);
          const latestPlan = indivPlans[0];
          const isPending = Boolean(
            latestPlan &&
            (latestPlan.status === 'pending' ||
              !latestPlan.transactionId ||
              !latestPlan.startDate)
          );

          if (isPending) {
            const rawPrice = latestPlan.customAmount ?? latestPlan.subscription?.price ?? 0;
            const pName = (latestPlan.subscription?.planName || 'INDIVIDUAL PLAN').toUpperCase();
            setIndividualPlanPrice(rawPrice);
            setMembershipStatus('pending_activation');
            setDaysLeft(0);
            setProgressPercentage(0);
            setPlanName(pName);
            cachedCustomerMembershipInfo = {
              planName: pName,
              daysLeft: 0,
              progressPercentage: 0,
              membershipStatus: 'pending_activation',
              individualPlanPrice: rawPrice,
              pendingTierUpdate: null,
            };
            return;
          }

          const activePlan = indivPlans.find((p: any) => p.isActive && p.endDate && p.status !== 'pending' && p.transactionId) || (latestPlan.isActive && latestPlan.endDate ? latestPlan : null);

          if (activePlan && activePlan.endDate) {
            const diffDays = getCalendarDaysDifference(activePlan.endDate);
            const currentDaysLeft = diffDays > 0 ? diffDays : 0;

            if (diffDays <= 0) {
              if (activePlan.individualCustomerPlanId && activePlan.isActive) {
                toggleIndivPlanActiveStatus({
                  individualCustomerPlanId: activePlan.individualCustomerPlanId,
                  currentStatus: true,
                }).catch(console.warn);
              }
              const pName = (activePlan.subscription?.planName || 'EXPIRED').toUpperCase();
              setDaysLeft(0);
              setProgressPercentage(0);
              setMembershipStatus('expired');
              setPlanName(pName);
              cachedCustomerMembershipInfo = {
                planName: pName,
                daysLeft: 0,
                progressPercentage: 0,
                membershipStatus: 'expired',
                individualPlanPrice: 0,
                pendingTierUpdate: null,
              };
              return;
            }

            setDaysLeft(currentDaysLeft);
            setMembershipStatus('active');

            let percentage = 0;
            if (activePlan.startDate) {
              const totalDays = getCalendarDaysDifference(activePlan.endDate, activePlan.startDate);
              if (totalDays > 0) {
                percentage = (currentDaysLeft / totalDays) * 100;
                percentage = Math.min(Math.max(percentage, 0), 100);
              }
            }
            setProgressPercentage(percentage);

            const planTitle = (activePlan.subscription?.planName || 'INDIVIDUAL PLAN').toUpperCase();
            setPlanName(planTitle);

            cachedCustomerMembershipInfo = {
              planName: planTitle,
              daysLeft: currentDaysLeft,
              progressPercentage: percentage,
              membershipStatus: 'active',
              individualPlanPrice: 0,
              pendingTierUpdate: null,
            };
          } else {
            const pName = latestPlan?.subscription?.planName ? `${latestPlan.subscription.planName.toUpperCase()} (EXPIRED)` : 'NO ACTIVE PLAN';
            setDaysLeft(0);
            setProgressPercentage(0);
            setMembershipStatus('expired');
            setPlanName(pName);
            cachedCustomerMembershipInfo = {
              planName: pName,
              daysLeft: 0,
              progressPercentage: 0,
              membershipStatus: 'expired',
              individualPlanPrice: 0,
              pendingTierUpdate: null,
            };
          }
        } else {
          let targetCustomerId = userId;
          try {
            const { data: gymCust } = await supabase
              .from('gym_customers')
              .select('customerId')
              .or(`userId.eq.${userId},customerId.eq.${userId}`)
              .eq('is_deleted', false)
              .maybeSingle();
            if (gymCust?.customerId) {
              targetCustomerId = gymCust.customerId;
            }
          } catch (e) {
            // fallback
          }

          const plans = await fetchGymCustomerMembershipPlans(undefined, targetCustomerId);
          const latestPlan = plans && plans.length > 0 ? plans[0] : null;
          let pendingInfo: any = null;
          if (latestPlan?.pendingPlanId) {
            pendingInfo = {
              pendingPlanId: latestPlan.pendingPlanId,
              pendingPlanName: (latestPlan as any).pendingPlan?.planName || 'Club Access Pass',
              pendingAmount: (latestPlan as any).pendingAmount,
            };
            setPendingTierUpdate(pendingInfo);
          } else {
            setPendingTierUpdate(null);
          }

          const activePlan = plans?.find((p: any) => p.is_Active && p.endDate);
          if (activePlan) {
            const diffDays = getCalendarDaysDifference(activePlan.endDate);
            const currentDaysLeft = diffDays > 0 ? diffDays : 0;

            if (diffDays <= 0) {
              toggleGymCustomerMembershipPlanActiveStatus(activePlan.GymCustomerMembershipPlanId, true).catch(console.warn);
              setDaysLeft(0);
              setProgressPercentage(0);
              setMembershipStatus('expired');
              setPlanName('EXPIRED');
              cachedCustomerMembershipInfo = {
                planName: 'EXPIRED',
                daysLeft: 0,
                progressPercentage: 0,
                membershipStatus: 'expired',
                individualPlanPrice: 0,
                pendingTierUpdate: pendingInfo,
              };
              return;
            }

            setDaysLeft(currentDaysLeft);
            setMembershipStatus('active');

            let percentage = 0;
            if (activePlan.startDate) {
              const totalDays = getCalendarDaysDifference(activePlan.endDate, activePlan.startDate);
              if (totalDays > 0) {
                percentage = (currentDaysLeft / totalDays) * 100;
                percentage = Math.min(Math.max(percentage, 0), 100);
              }
            }
            setProgressPercentage(percentage);

            let resolvedPlanName = 'MEMBER';
            const { data: planDetails } = await supabase
              .from('gym_membership_plans')
              .select('planName')
              .eq('planId', activePlan.planId)
              .maybeSingle();

            if (planDetails?.planName) {
              resolvedPlanName = planDetails.planName.toUpperCase();
              setPlanName(resolvedPlanName);
            }

            cachedCustomerMembershipInfo = {
              planName: resolvedPlanName,
              daysLeft: currentDaysLeft,
              progressPercentage: percentage,
              membershipStatus: 'active',
              individualPlanPrice: 0,
              pendingTierUpdate: pendingInfo,
            };
          } else {
            setDaysLeft(0);
            setProgressPercentage(0);
            setMembershipStatus('no_plan');
            setPlanName('NO PLAN');
            cachedCustomerMembershipInfo = {
              planName: 'NO PLAN',
              daysLeft: 0,
              progressPercentage: 0,
              membershipStatus: 'no_plan',
              individualPlanPrice: 0,
              pendingTierUpdate: pendingInfo,
            };
          }
        }
      } catch (err) {
        console.error('Error fetching membership info', err);
      } finally {
        setIsLoadingMembership(false);
      }
    },
    [userId, role, individualCustomerPlans, toggleIndivPlanActiveStatus]
  );

  const hasFetchedMembershipRef = React.useRef(false);

  useEffect(() => {
    if (userId) {
      if (!cachedCustomerMembershipInfo || !hasFetchedMembershipRef.current) {
        hasFetchedMembershipRef.current = true;
        fetchMembershipInfo();
      }
    } else {
      setIsLoadingMembership(false);
    }
  }, [userId, fetchMembershipInfo]);

  useEffect(() => {
    if (!individualCustomerPlans || individualCustomerPlans.length === 0) {
      if (isIndividual && !isIndivCustomerPlansLoading) {
        setIsLoadingMembership(false);
      }
      return;
    }
    const latestPlan = individualCustomerPlans[0];
    const isPending = Boolean(
      latestPlan &&
      (latestPlan.status === 'pending' ||
        !latestPlan.transactionId ||
        !latestPlan.startDate)
    );

    if (isPending) {
      const rawPrice = latestPlan.customAmount ?? latestPlan.subscription?.price ?? 0;
      setIndividualPlanPrice(rawPrice);
      setMembershipStatus('pending_activation');
      setDaysLeft(0);
      setProgressPercentage(0);
      setPlanName((latestPlan.subscription?.planName || 'INDIVIDUAL PLAN').toUpperCase());
      setIsLoadingMembership(false);
      return;
    }

    const activePlan = individualCustomerPlans.find((p: any) => p.isActive && p.endDate && p.status !== 'pending' && p.transactionId) || (latestPlan.isActive && latestPlan.endDate ? latestPlan : null);

    if (activePlan && activePlan.endDate) {
      const diffDays = getCalendarDaysDifference(activePlan.endDate);
      const currentDaysLeft = diffDays > 0 ? diffDays : 0;

      if (diffDays <= 0) {
        setDaysLeft(0);
        setProgressPercentage(0);
        setMembershipStatus('expired');
        setPlanName((activePlan.subscription?.planName || 'EXPIRED').toUpperCase());
        if (activePlan.individualCustomerPlanId && activePlan.isActive) {
          toggleIndivPlanActiveStatus({
            individualCustomerPlanId: activePlan.individualCustomerPlanId,
            currentStatus: true,
          }).catch(console.warn);
        }
        setIsLoadingMembership(false);
        return;
      }

      setDaysLeft(currentDaysLeft);
      setMembershipStatus('active');

      let percentage = 0;
      if (activePlan.startDate) {
        const totalDays = getCalendarDaysDifference(activePlan.endDate, activePlan.startDate);
        if (totalDays > 0) {
          percentage = (currentDaysLeft / totalDays) * 100;
          percentage = Math.min(Math.max(percentage, 0), 100);
        }
      }
      setProgressPercentage(percentage);
      setPlanName((activePlan.subscription?.planName || 'INDIVIDUAL PLAN').toUpperCase());
    } else {
      setDaysLeft(0);
      setProgressPercentage(0);
      setMembershipStatus('expired');
      setPlanName(latestPlan?.subscription?.planName ? `${latestPlan.subscription.planName.toUpperCase()} (EXPIRED)` : 'NO ACTIVE PLAN');
    }
    setIsLoadingMembership(false);
  }, [individualCustomerPlans, toggleIndivPlanActiveStatus, isIndividual, isIndivCustomerPlansLoading]);

  useEffect(() => {
    if (daysLeft !== '--') {
      cachedCustomerMembershipInfo = {
        planName,
        daysLeft,
        progressPercentage,
        membershipStatus,
        individualPlanPrice,
        pendingTierUpdate,
      };
    }
  }, [planName, daysLeft, progressPercentage, membershipStatus, individualPlanPrice, pendingTierUpdate]);

  const today = getLocalDateString(new Date());
  const { steps, calories, syncSteps } = usePedometer();
  const { data: stats, refetch: refetchStats } = useFitnessStats(userId, today);

  const displaySteps = Math.max(steps, stats?.steps || 0);
  const displayCalories = Math.max(calories, stats?.calories || 0, Math.round(displaySteps * 0.04));
  const stepGoal = stats?.stepGoal || 10000;

  useFocusEffect(
    React.useCallback(() => {
      // Data remains cached across screen/tab navigation; manual refresh available via pull-to-refresh
    }, [])
  );

  const onRefresh = React.useCallback(async () => {
    triggerMediumHaptic();
    setRefreshing(true);
    try {
      await Promise.all([
        refetchCustomerDash(),
        refetchTrainerDash(),
        refetchOnboarding(),
        refetchStats(),
        isIndividual ? refetchIndivCustomerPlans() : Promise.resolve(),
        isIndividual ? refetchSubscriptions() : Promise.resolve(),
        fetchMembershipInfo(true),
        refetchWeeklyStats(),
        syncSteps?.(),
      ]);
    } catch (error) {
      console.error('[Customer Home] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCustomerDash, refetchTrainerDash, refetchOnboarding, refetchStats, isIndividual, refetchIndivCustomerPlans, refetchSubscriptions, fetchMembershipInfo, refetchWeeklyStats, syncSteps]);

  const isMembershipLoading = isIndividual ? (isIndivCustomerPlansLoading || isLoadingMembership) : isLoadingMembership;

  const waterGoal = stats?.waterGoalML || 2500;
  const waterTotal = stats?.totalWaterML || 0;

  useEffect(() => {
    if (userId && onboardingStatus && !isCheckingOnboarding) {
      if (!onboardingStatus.isOnboarded && !onboardingStatus.isSkipped) {
        router.replace('/(customer)/(onboarding)/step1');
      }
    }
  }, [userId, onboardingStatus, isCheckingOnboarding, router]);

  const needsOnboardingRedirect = userId && onboardingStatus && !onboardingStatus.isOnboarded && !onboardingStatus.isSkipped;
  const hasLoadedDash = !!(effectiveCustomerDash || effectiveTrainerDash);
  if (needsOnboardingRedirect || (!hasLoadedDash && (isCheckingOnboarding || isLoadingDashboard))) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#d4ff00" />
      </View>
    );
  }

  const waterCompletion = Math.min((weeklyStats?.totals.water || 0) / (weeklyStats?.totals.waterGoal || 1), 1);
  const stepsCompletion = Math.min((weeklyStats?.totals.steps || 0) / (weeklyStats?.totals.stepGoal || 1), 1);
  const workoutCompletion = Math.min((weeklyStats?.totals.workouts || 0) / (weeklyStats?.totals.workoutGoal || 1), 1);

  const overallCompletion = Math.round(((waterCompletion + stepsCompletion + workoutCompletion) / 3) * 100) || 0;

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const dynamicWeeklyBars = weeklyStats?.thisWeek?.map((d) => {
    const dateObj = new Date(d.date);
    const dayStr = daysOfWeek[dateObj.getDay()];

    const waterP = Math.min((d.waterIntake || 0) / (d.waterGoal || 1), 1);
    const stepP = Math.min((d.steps || 0) / (d.stepGoal || 1), 1);
    const workP = Math.min((d.activeMinutes || 0) > 0 ? 1 : 0, 1);

    const dailyHeight = Math.round(((waterP + stepP + workP) / 3) * 100);

    return {
      day: dayStr,
      height: dailyHeight || 5,
      active: dailyHeight >= 50
    };
  }) || [
      { day: 'M', height: 5, active: false },
      { day: 'T', height: 5, active: false },
      { day: 'W', height: 5, active: false },
      { day: 'T', height: 5, active: false },
      { day: 'F', height: 5, active: false },
      { day: 'S', height: 5, active: false },
      { day: 'S', height: 5, active: false },
    ];

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="mb-5">
        <Text className="text-[#8E8E93] text-sm font-medium">
          Hi {firstName} 👋
        </Text>
        <Text className="text-white text-lg font-semibold mt-1">
          Every rep. Every step. <Text className="text-[#D7FF00]">Better than yesterday.</Text>
        </Text>
      </View>

      <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
        {isMembershipLoading ? (
          <ActivityIndicator size="small" color="#D7FF00" className="self-start my-4" />
        ) : membershipStatus === 'pending_activation' ? (
          <>
            <View className="flex-row items-center gap-2 mb-3.5">
              <View className="w-6 h-6 rounded-full bg-[#D7FF00] items-center justify-center">
                <Star size={14} color="#000000" weight="fill" />
              </View>
              <Text className="text-[#D7FF00] text-xs font-semibold tracking-wider">
                {planName}
              </Text>
            </View>
            <View className="mt-1 bg-[#1C160C] border border-[#F59E0B]/30 rounded-2xl p-3.5">
              <View className="flex-row items-center mb-1.5">
                <View className="w-2 h-2 rounded-full bg-[#F59E0B] mr-2" />
                <Text className="text-[#F59E0B] text-[10px] font-semibold tracking-widest uppercase">
                  PENDING ACTIVATION
                </Text>
              </View>
              <Text className="text-white text-base font-semibold mb-1">
                {planName}
              </Text>
              <Text className="text-[#8E8E93] text-xs leading-4 mb-3.5">
                Complete your payment to activate your membership plan.
              </Text>
              <Pressable
                onPress={() => router.push('/(customer)/memberships' as any)}
                className="w-full bg-[#D7FF00] py-2.5 px-4 rounded-xl flex-row items-center justify-center active:opacity-85"
              >
                <Text className="text-black text-xs font-semibold uppercase tracking-wider mr-1.5 text-center" numberOfLines={1}>
                  ACTIVATE MEMBERSHIP
                </Text>
                <ArrowRight size={14} color="#000000" weight="bold" />
              </Pressable>
            </View>
          </>
        ) : typeof daysLeft === 'number' && daysLeft > 0 ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-6 h-6 rounded-full bg-[#D7FF00] items-center justify-center">
                  <Star size={14} color="#000000" weight="fill" />
                </View>
                <Text className="text-[#D7FF00] text-xs font-semibold tracking-wider" numberOfLines={1}>
                  {planName}
                </Text>
              </View>

              <View className="flex-row items-baseline gap-2 mb-2">
                <Text className="text-white text-3xl font-semibold">{daysLeft}</Text>
                <Text className="text-[#8E8E93] text-xs font-medium">Days Left</Text>
              </View>

              <View className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden mb-2.5">
                <View className="h-full bg-[#D7FF00] rounded-full" style={{ width: `${progressPercentage}%` }} />
              </View>

              {pendingTierUpdate ? (
                <View className="mt-1 bg-[#1C160C] border border-[#F59E0B]/30 rounded-xl p-2.5">
                  <Text className="text-[#F59E0B] text-[9px] font-semibold tracking-widest uppercase mb-1">
                    UPGRADE PENDING
                  </Text>
                  <Text className="text-white text-xs font-semibold mb-2" numberOfLines={1}>
                    {pendingTierUpdate.pendingPlanName}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(customer)/memberships' as any)}
                    className="w-full bg-[#D7FF00] py-1.5 px-3 rounded-lg flex-row items-center justify-center active:opacity-85"
                  >
                    <Text className="text-black text-[10px] font-semibold uppercase tracking-wider mr-1 text-center" numberOfLines={1}>
                      ACTIVATE
                    </Text>
                    <ArrowRight size={12} color="#000000" weight="bold" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => router.push('/(customer)/memberships' as any)}
                  className="flex-row items-center gap-1.5 active:opacity-70 mt-0.5"
                >
                  <Text className="text-[#8E8E93] text-xs font-medium">
                    Pass Details
                  </Text>
                  <ArrowRight size={12} color="#8E8E93" weight="bold" />
                </Pressable>
              )}
            </View>

            {/* Right View: QR Check-in & View button in column */}
            {showQrCheckIn && (
              <View className="flex-col items-center justify-center gap-2 pl-1">
                <Pressable
                  onPress={openCamera}
                  className="flex-row items-center justify-center gap-1.5 bg-[#1C1C1E] border border-[#2A2A2A] px-2.5 py-1.5 rounded-xl active:opacity-80"
                >
                  <QrCodeIcon size={18} color="#D7FF00" weight="bold" />
                  <Text className="text-white text-[11px] font-semibold text-center" numberOfLines={1}>Check-in</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(customer)/attendance' as any)}
                  className="px-2 py-0.5 items-center justify-center active:opacity-70"
                >
                  <Text className="text-[#CCFF00] text-xs underline font-medium text-center">View</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <>
            <View className="flex-row items-center gap-2 mb-3.5">
              <View className="w-6 h-6 rounded-full bg-[#D7FF00] items-center justify-center">
                <Star size={14} color="#000000" weight="fill" />
              </View>
              <Text className="text-[#D7FF00] text-xs font-semibold tracking-wider" numberOfLines={1}>
                {planName}
              </Text>
            </View>

            <View className="mb-1">
              <Text className="text-[#EF4444] text-xl font-semibold mb-1">Plan Expired</Text>
              <Text className="text-[#8E8E93] text-xs font-medium mb-3">
                Renew your plan to continue your journey.
              </Text>
              {pendingTierUpdate ? (
                <View className="mt-2 bg-[#1C160C] border border-[#F59E0B]/30 rounded-2xl p-3.5">
                  <Text className="text-[#F59E0B] text-[10px] font-semibold tracking-widest uppercase mb-1">
                    UPGRADE PENDING
                  </Text>
                  <Text className="text-white text-sm font-semibold mb-3">
                    {pendingTierUpdate.pendingPlanName}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(customer)/memberships' as any)}
                    className="w-full bg-[#D7FF00] py-2.5 px-4 rounded-xl flex-row items-center justify-center active:opacity-85"
                  >
                    <Text className="text-black text-xs font-semibold uppercase tracking-wider mr-1.5 text-center" numberOfLines={1}>
                      ACTIVATE UPGRADE
                    </Text>
                    <ArrowRight size={14} color="#000000" weight="bold" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  className="bg-[#D7FF00] py-2.5 px-5 rounded-xl self-start active:opacity-80 flex-row items-center justify-center"
                  onPress={() => router.push('/(customer)/memberships' as any)}
                >
                  <Text className="text-black text-xs font-semibold tracking-wide text-center" numberOfLines={1}>
                    RENEW PLAN
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      {(role === 'individual' || isIndividual) && (
        <Pressable
          onPress={() => router.push('/(customer)/explore-gyms' as any)}
          className="w-full rounded-3xl overflow-hidden mb-4 border border-[#222222] bg-[#0A0D08] relative active:opacity-95"
        >
          <Image
            source={require('@/assets/explore_gym.png')}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />

          <View className="p-5 z-10 w-[70%]">
            <Text className="text-[#CCFF00] text-[10px] font-semibold tracking-widest uppercase mb-1">
              EXPLORE NEARBY GYMS
            </Text>
            <Text className="text-white text-2xl font-semibold leading-tight mb-1">
              Find a gym that{'\n'}fits you.
            </Text>
            <Text className="text-[#888888] text-xs font-medium mb-3.5">
              {dbGyms.length} gyms near you
            </Text>

            <View className="bg-[#CCFF00] self-start py-2.5 px-4 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm">
              <Text className="text-black text-xs font-semibold text-center" numberOfLines={1}>Explore Gyms</Text>
              <ArrowRight size={14} color="#000000" weight="bold" />
            </View>
          </View>
        </Pressable>
      )}

      <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4 relative overflow-hidden flex-row items-center justify-between">
        <View className="flex-1 z-10 pr-2">
          <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider mb-1">
            TODAY&apos;S WORKOUT
          </Text>
          {todayWorkoutDayId && todayWorkoutType ? (
            <>
              <Text className="text-white text-2xl font-semibold mb-2">
                {todayWorkoutType.charAt(0).toUpperCase() + todayWorkoutType.slice(1)}
              </Text>

              <View className="flex-row items-center gap-3 mb-4">
                <View className="flex-row items-center gap-1.5">
                  <Barbell size={16} color="#8E8E93" />
                  <Text className="text-[#8E8E93] text-xs font-medium">{todayExercisesCount} Exercises</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Clock size={16} color="#8E8E93" />
                  <Text className="text-[#8E8E93] text-xs font-medium">{todayDuration} min</Text>
                </View>
              </View>

              {todayWorkoutType.toLowerCase() !== 'rest' && (
                <Pressable
                  onPress={() => {
                    router.push({
                      pathname: '/(customer)/workout-countdown',
                      params: {
                        dayId: todayWorkoutDayId,
                        workoutType: todayWorkoutType,
                        duration: todayDuration,
                        exercisesCount: todayExercisesCount,
                        isTrainer: isTrainerPlan ? 'true' : 'false'
                      }
                    });
                  }}
                  className="bg-[#D7FF00] rounded-full py-2.5 px-4 flex-row items-center justify-center self-start active:opacity-90"
                >
                  <Text className="text-black font-semibold text-xs sm:text-sm mr-1.5 text-center" numberOfLines={1}>
                    Start Workout
                  </Text>
                  <View className="w-5 h-5 rounded-full bg-black/10 items-center justify-center">
                    <ArrowRight size={12} color="#000000" weight="bold" />
                  </View>
                </Pressable>
              )}
              {todayWorkoutType.toLowerCase() === 'rest' && (
                <Text className="text-[#8E8E93] text-sm mt-1">Take it easy and recover for tomorrow.</Text>
              )}
            </>
          ) : (
            <>
              <Text className="text-white text-lg font-semibold mb-3 leading-tight">
                No Workout{'\n'}Scheduled
              </Text>
              <Pressable
                onPress={() => router.push('/(customer)/workoutPlan')}
                className="bg-[#D7FF00] rounded-full py-2.5 px-4 flex-row items-center justify-center self-start active:opacity-90 mt-1"
              >
                <Text className="text-black font-semibold text-xs sm:text-sm mr-1.5 text-center" numberOfLines={1}>
                  Add workout plan
                </Text>
                <View className="w-5 h-5 rounded-full bg-black/10 items-center justify-center shrink-0">
                  <ArrowRight size={12} color="#000000" weight="bold" />
                </View>
              </Pressable>
            </>
          )}
        </View>

        <View className="items-end justify-center shrink-0 pointer-events-none">
          <Image
            source={require('../../assets/fit-1.png')}
            style={{ width: 125, height: 145 }}
            resizeMode="contain"
          />
        </View>
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-3 mb-4">
        <Pressable onPress={() => router.push('/(customer)/fitness/calories')} className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4 active:opacity-80">
          <View className="w-8 h-8 rounded-full bg-[#FF453A]/10 items-center justify-center mb-2">
            <Flame size={20} color="#FF453A" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">{displayCalories}</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            CALORIES KCAL
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#FF453A] rounded-full" style={{ width: `${Math.min((displayCalories / 500) * 100, 100)}%` }} />
          </View>
        </Pressable>

        <Pressable onPress={() => router.push('/(customer)/fitness/steps')} className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4 active:opacity-80">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-8 h-8 rounded-full bg-[#C3F400]/10 items-center justify-center">
              <Footprints size={20} color="#C3F400" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold bg-[#1C1C1E] px-2 py-0.5 rounded-full">
              /{stepGoal >= 1000 ? `${(stepGoal / 1000).toFixed(stepGoal % 1000 === 0 ? 0 : 1)}k` : stepGoal}
            </Text>
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">{displaySteps.toLocaleString()}</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            STEPS
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#C3F400] rounded-full" style={{ width: `${Math.min((displaySteps / stepGoal) * 100, 100)}%` }} />
          </View>
        </Pressable>

        <Pressable onPress={() => router.push('/(customer)/fitness/water')} className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4 active:opacity-80">
          <View className="w-8 h-8 rounded-full bg-[#00DBE7]/10 items-center justify-center mb-2">
            <Drop size={20} color="#00DBE7" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">{(waterTotal / 1000).toFixed(1)}</Text>
          <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-wider mt-1">
            WATER (LITERS)
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#00DBE7] rounded-full" style={{ width: `${Math.min((waterTotal / waterGoal) * 100, 100)}%` }} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(customer)/streak-details')}
          className="w-[48.5%] bg-[#141414] border border-[#222222] rounded-3xl p-4 active:opacity-80"
        >
          <View className="w-8 h-8 rounded-full bg-[#FB923C]/10 items-center justify-center mb-2">
            <Lightning size={20} color="#FB923C" weight="fill" />
          </View>
          <Text className="text-white text-3xl font-semibold mt-1">{streakData?.currentStreak || 0}</Text>
          <Text className="text-[#8E8E8E] text-[11px] font-semibold tracking-wider mt-1">
            WORKOUT STREAK
          </Text>
          <View className="w-full h-1 bg-[#262626] rounded-full overflow-hidden mt-3">
            <View className="h-full bg-[#FB923C] rounded-full" style={{ width: `${Math.min(((streakData?.currentStreak || 0) / 7) * 100, 100)}%` }} />
          </View>
        </Pressable>
      </View>

      <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-wider">
            WEEKLY PROGRESS
          </Text>
          <Pressable onPress={() => router.push('/(customer)/progress/weekly-progress')} className="flex-row items-center gap-1 active:opacity-80">
            <Text className="text-[#8E8E93] text-xs font-medium">View All</Text>
            <ArrowRight size={13} color="#8E8E93" />
          </Pressable>
        </View>

        <View className="flex-row items-end justify-between">
          <View className="justify-end mb-2">
            <View className="flex-row items-baseline">
              <Text className="text-white text-4xl font-semibold">{overallCompletion}</Text>
              <Text className="text-white text-xl font-semibold ml-0.5">%</Text>
            </View>
            <Text className="text-[#8E8E93] text-xs font-medium mt-1">Completed</Text>
          </View>

          <View className="flex-row items-end gap-2.5">
            {dynamicWeeklyBars.map((item, index) => (
              <View key={index} className="items-center gap-2">
                <View className="w-3.5 h-20 bg-[#1E1E1E] rounded-full justify-end overflow-hidden">
                  <View
                    className="w-full rounded-full"
                    style={{
                      height: `${item.height}%`,
                      backgroundColor: item.height > 5 ? `rgba(196, 239, 0, ${Math.max(item.height / 100, 0.2)})` : '#2A2A2A',
                    }}
                  />
                </View>
                <Text className="text-[#8E8E93] text-[11px] font-semibold">{item.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="bg-[#141414] border border-[#222222] rounded-3xl p-5 mb-4 relative overflow-hidden flex-row items-center justify-between">
        <View className="flex-1 z-10 py-1">
          <View className="w-10 h-10 rounded-2xl bg-[#C0F905]/10 items-center justify-center mb-3">
            <BowlFood size={22} color="#C0F905" weight="fill" />
          </View>

          <Text className="text-white text-2xl font-semibold tracking-tight mb-1">Today&apos;s Meal Plan</Text>

          <Text className="text-[#8E8E93] text-[11px] font-medium mb-5">
            Dinner  <Text className="text-[#C0F905]">●</Text>  Breakfast  <Text className="text-[#C0F905]">●</Text>  Lunch  <Text className="text-[#C0F905]">●</Text>  Snack  <Text className="text-[#C0F905]">●</Text>
          </Text>

          <View className="flex-row items-center gap-2 mb-6">
            <View className="w-8 h-8 rounded-full border-2 border-[#C0F905] items-center justify-center">
              <ForkKnife size={14} color="#C0F905" weight="fill" />
            </View>
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-[#C0F905] text-lg font-semibold">3</Text>
              <Text className="text-[#8E8E93] text-xs font-medium">of <Text className="text-[#D4D4D4] font-semibold text-sm">4</Text> meals planned</Text>
            </View>
          </View>

          <Pressable
            // @ts-ignore
            onPress={() => router.push('/(customer)/nutrition')}
            className="bg-[#C4EF00] rounded-xl py-3 px-5 flex-row items-center justify-center self-start active:opacity-90">
            <Text className="text-black font-semibold text-sm mr-1.5 text-center" numberOfLines={1}>View Meal Plan</Text>
            <ArrowRight size={16} color="#000000" />
          </Pressable>
        </View>

        <View className="absolute -right-24 top-0 bottom-0 justify-center">
          <Image
            source={require('../../assets/home_diet_image.png')}
            style={{ width: 280, height: 280 }}
            resizeMode="contain"
          />
        </View>
      </View>
    </ScrollView>
  );
}
