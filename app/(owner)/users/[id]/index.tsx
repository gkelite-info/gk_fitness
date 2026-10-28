import { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Linking, Image, Modal, Platform } from 'react-native';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CaretRight,
  User,
  CreditCard,
  CalendarBlank,
  Users,
  Phone,
  EnvelopeSimple,
  Medal,
  Barbell,
  CheckCircle,
  X,
  Check,
  Lock,
  WarningCircle,
  Trash,
} from 'phosphor-react-native';
import ConfirmModal from '@/components/ConfirmModal';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useUserById } from '@/hooks/users/useUsers';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import {
  useGymCustomerMembershipPlans,
  useSaveGymCustomerMembershipPlan,
  useRevokeGymCustomerPendingPlan,
} from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { logGymCustomerMembershipHistory } from '@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipPlans';
import { useGymMembershipPlans } from '@/hooks/useGymMembershipPlans';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { getLocalDateString, parseLocalDate, getCalendarDaysDifference, parseDurationMonths, calculatePlanExpiryDate } from '@/lib/dateUtils';

export default function UserProfileHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: customer, isLoading: isCustomerLoading, refetch: refetchCustomer } = useGymCustomerById(id);
  const targetUserId = customer?.userId || id;
  const { data: userDetails, refetch: refetchUserDetails } = useUserById(targetUserId);
  const { data: trainers, isLoading: isTrainersLoading, refetch: refetchTrainers } = useAssignedTrainersByCustomer(id);
  const {
    data: plans,
    isLoading: isPlansLoading,
    refetch: refetchCustomerPlans,
  } = useGymCustomerMembershipPlans(customer?.gymId, id);
  const { data: availablePlans = [], refetch: refetchAvailablePlans } = useGymMembershipPlans(userId);

  const onRefresh = useCallback(async () => {
    triggerLightHaptic();
    setRefreshing(true);
    try {
      await Promise.all([
        refetchCustomer(),
        refetchUserDetails(),
        refetchTrainers(),
        refetchCustomerPlans(),
        refetchAvailablePlans(),
      ]);
    } catch (e) {
      console.warn('[UserProfile] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCustomer, refetchUserDetails, refetchTrainers, refetchCustomerPlans, refetchAvailablePlans]);

  const savePlanMutation = useSaveGymCustomerMembershipPlan();
  const revokePendingPlanMutation = useRevokeGymCustomerPendingPlan();

  const activeTrainerAssignment = useMemo(() => {
    if (!trainers || trainers.length === 0) return null;
    return trainers.find((t: any) => t.isActive && !t.is_deleted) || null;
  }, [trainers]);

  const activePlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    const nonDeleted = plans.filter((p: any) => !p.is_deleted);
    if (nonDeleted.length === 0) return plans[0];

    const activeWithFutureDate = nonDeleted.find((p: any) => {
      if (!p.endDate) return false;
      const end = new Date(p.endDate);
      end.setHours(23, 59, 59, 999);
      return end.getTime() >= Date.now() && p.is_Active !== false;
    });
    if (activeWithFutureDate) return activeWithFutureDate;

    const activeFlagged = nonDeleted.find((p: any) => p.is_Active);
    if (activeFlagged) return activeFlagged;

    return nonDeleted[0];
  }, [plans]);

  const memberCode = useMemo(() => {
    if (!id) return 'CUST-XXXX';
    return `CUST-${id.substring(0, 6).toUpperCase()}`;
  }, [id]);

  const planStats = useMemo(() => {
    if (!activePlan) {
      return {
        name: 'No Plan Assigned',
        duration: '0 Months',
        startDate: '-',
        expiryDate: '-',
        dateRangeText: 'No Plan Assigned',
        remainingDays: 0,
        isActive: false,
        isPending: false,
        isExpired: false,
        isInactive: false,
      };
    }

    const hasDates = Boolean(activePlan.startDate && activePlan.endDate);
    const start = activePlan.startDate ? parseLocalDate(activePlan.startDate) : null;

    let remaining = 0;
    let isPastEndDate = false;
    let end: Date | null = null;

    if (activePlan.endDate) {
      end = parseLocalDate(activePlan.endDate);
      const calendarDays = getCalendarDaysDifference(activePlan.endDate);
      isPastEndDate = calendarDays < 0;
      remaining = Math.max(0, calendarDays);
    }

    const formattedStart = start
      ? start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    const formattedEnd = end
      ? end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    const isPending = !hasDates || (!activePlan.startDate && !activePlan.endDate);

    const isExpired = !isPending && isPastEndDate;

    const isInactive = !isPending && !isExpired && activePlan.is_Active === false;

    const isPlanActive = !isPending && !isExpired && !isInactive;

    const rawDuration = (activePlan as any)?.plan?.durationMonths || (activePlan as any)?.durationMonths || 1;

    let dateRangeText = '-';
    if (isPending) {
      dateRangeText = 'Pending Activation (Awaiting payment)';
    } else if (formattedStart && formattedEnd) {
      dateRangeText = `${formattedStart} - ${formattedEnd}`;
    }

    return {
      name: (activePlan as any)?.plan?.planName || (activePlan as any)?.planName || 'Fitness Plan',
      duration: `${rawDuration} Month(s)`,
      startDate: formattedStart || '-',
      expiryDate: formattedEnd || '-',
      dateRangeText,
      remainingDays: remaining,
      isActive: isPlanActive,
      isPending,
      isExpired,
      isInactive,
    };
  }, [activePlan]);

  const currentPlanPrice = useMemo(() => {
    if (!activePlan) return 0;
    const planPrice = Number((activePlan as any)?.plan?.price);
    if (!isNaN(planPrice) && planPrice > 0) return planPrice;
    return Number(activePlan.customAmount ?? 0);
  }, [activePlan]);

  const currentPlanMonths = useMemo(() => {
    if (!activePlan) return 1;
    return parseDurationMonths((activePlan as any)?.plan?.durationMonths || (activePlan as any)?.durationMonths || 1);
  }, [activePlan]);

  // Standardized commercial billing: 1 month is always 30 days
  // (Daily rate is fixed at Price / 30 in every month; neither cheaper in December nor higher in February)
  const currentTotalDays = useMemo(() => {
    return Math.max(1, currentPlanMonths * 30);
  }, [currentPlanMonths]);

  const currentDailyRate = useMemo(() => {
    if (currentTotalDays <= 0 || currentPlanPrice <= 0) return 0;
    return Number((currentPlanPrice / currentTotalDays).toFixed(2));
  }, [currentPlanPrice, currentTotalDays]);

  // Calendar days actually passed since plan start date
  const daysPassed = useMemo(() => {
    if (!activePlan?.startDate) return 0;
    const diff = getCalendarDaysDifference(new Date(), activePlan.startDate);
    return Math.max(0, diff);
  }, [activePlan?.startDate]);

  // Remaining days out of the standardized 30-day month
  const standardRemainingDays = useMemo(() => {
    return Math.max(0, currentTotalDays - daysPassed);
  }, [currentTotalDays, daysPassed]);

  const isCurrentPlanActive = useMemo(() => {
    return Boolean(planStats.isActive && standardRemainingDays > 0);
  }, [planStats.isActive, standardRemainingDays]);

  const currentUnusedCredit = useMemo(() => {
    if (!isCurrentPlanActive || currentPlanPrice <= 0 || currentTotalDays <= 0) return 0;
    const rawCredit = (standardRemainingDays / currentTotalDays) * currentPlanPrice;
    return Math.min(currentPlanPrice, Math.max(0, Number(rawCredit.toFixed(2))));
  }, [isCurrentPlanActive, standardRemainingDays, currentTotalDays, currentPlanPrice]);

  const currentPlanId = useMemo(() => {
    return activePlan?.planId || (activePlan as any)?.plan?.planId || (customer as any)?.planId || null;
  }, [activePlan, customer]);

  const existingCustomerPlanIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentPlanId) ids.add(currentPlanId);
    if ((customer as any)?.planId) ids.add((customer as any).planId);
    if (Array.isArray(plans)) {
      plans.forEach((p: any) => {
        if (p.planId) ids.add(p.planId);
        if (p.plan?.planId) ids.add(p.plan.planId);
      });
    }
    return ids;
  }, [currentPlanId, customer, plans]);

  const hasPendingUpgrade = Boolean(activePlan?.pendingPlanId);
  const pendingPlanName = useMemo(() => {
    if (!hasPendingUpgrade) return null;
    return (
      (activePlan as any)?.pendingPlan?.planName ||
      availablePlans.find((p: any) => p.planId === activePlan?.pendingPlanId)?.planName ||
      'New Plan'
    );
  }, [hasPendingUpgrade, activePlan, availablePlans]);

  const planListWithStatus = useMemo(() => {
    return availablePlans.map((plan: any) => {
      const planPrice = Number(plan.price || 0);
      const isCurrentPlan = plan.planId === currentPlanId || existingCustomerPlanIds.has(plan.planId);
      const isPendingUpgradePlan = Boolean(hasPendingUpgrade && plan.planId === activePlan?.pendingPlanId);
      const isLowerTier = !isCurrentPlan && isCurrentPlanActive && currentPlanPrice > 0 && planPrice <= currentPlanPrice;
      const isSelectable = !isCurrentPlan && !isLowerTier && !hasPendingUpgrade;

      return {
        ...plan,
        planPrice,
        isCurrentPlan,
        isPendingUpgradePlan,
        isLowerTier,
        isSelectable,
      };
    });
  }, [availablePlans, currentPlanId, existingCustomerPlanIds, isCurrentPlanActive, currentPlanPrice, hasPendingUpgrade, activePlan?.pendingPlanId]);

  const selectablePlans = useMemo(() => {
    return planListWithStatus.filter((p: any) => p.isSelectable);
  }, [planListWithStatus]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId || hasPendingUpgrade) return null;
    if (selectedPlanId === currentPlanId || existingCustomerPlanIds.has(selectedPlanId)) return null;
    return availablePlans.find((p: any) => p.planId === selectedPlanId) || null;
  }, [availablePlans, selectedPlanId, currentPlanId, existingCustomerPlanIds, hasPendingUpgrade]);

  const upgradeCalculation = useMemo(() => {
    if (!selectedPlan) return null;

    const newPlanPrice = Number(selectedPlan.price || 0);
    const newPlanMonths = parseDurationMonths(selectedPlan.durationMonths);
    const newTotalDays = Math.max(1, newPlanMonths * 30);
    const newDailyRate = Number((newPlanPrice / newTotalDays).toFixed(2));

    if (!isCurrentPlanActive || currentPlanPrice <= 0) {
      return {
        isUpgrade: false,
        newPlanPrice,
        newPlanMonths,
        newDailyRate,
        currentDailyRate: 0,
        remainingDays: 0,
        unusedCredit: 0,
        payableAmount: newPlanPrice,
      };
    }

    const payable = Math.max(0, Number((newPlanPrice - currentUnusedCredit).toFixed(2)));

    return {
      isUpgrade: true,
      newPlanPrice,
      newPlanMonths,
      newDailyRate,
      currentDailyRate,
      remainingDays: standardRemainingDays,
      unusedCredit: currentUnusedCredit,
      payableAmount: payable,
    };
  }, [selectedPlan, isCurrentPlanActive, currentPlanPrice, currentUnusedCredit, currentDailyRate, standardRemainingDays]);

  const isLoading = isCustomerLoading || isTrainersLoading || isPlansLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading member profile...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center px-6">
        <Text className="text-white text-lg font-semibold mb-2">Member Not Found</Text>
        <Text className="text-gray-400 text-sm text-center mb-6">
          Could not find customer details with ID: {id}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-[#1A1A1A] border border-[#27272A] px-6 py-3 rounded-xl active:opacity-70"
        >
          <Text className="text-[#CCF200] font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isActive = Boolean(customer.is_Active);
  const initials = customer.fullName
    ? customer.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  const navigateTo = (subroute: string) => {
    triggerLightHaptic();
    router.push(`/(owner)/users/${id}/${subroute}` as any);
  };

  const handleConfirmChangePlan = async () => {
    if (hasPendingUpgrade) {
      triggerErrorHaptic();
      toast.error('An upgrade is already pending. Please revoke it first before choosing another plan.');
      return;
    }

    if (!selectedPlanId || !customer?.gymId) {
      toast.error('Please select a membership plan.');
      return;
    }

    const chosenPlan = availablePlans.find((p: any) => p.planId === selectedPlanId);
    if (!chosenPlan) {
      toast.error('Invalid plan selected.');
      return;
    }

    if (existingCustomerPlanIds.has(chosenPlan.planId) || chosenPlan.planId === currentPlanId) {
      toast.error("Member is already enrolled in this plan.");
      return;
    }

    if (isCurrentPlanActive && Number(chosenPlan.price || 0) <= currentPlanPrice) {
      toast.error('Cannot downgrade to a lower tier plan.');
      return;
    }

    setIsUpdatingPlan(true);
    try {
      const remainingPayable = upgradeCalculation ? upgradeCalculation.payableAmount : Number(chosenPlan.price || 0);

      if (activePlan?.GymCustomerMembershipPlanId && isCurrentPlanActive) {
        await savePlanMutation.mutateAsync({
          GymCustomerMembershipPlanId: activePlan.GymCustomerMembershipPlanId,
          customerId: id,
          gymId: customer.gymId,
          planId: activePlan.planId,
          pendingPlanId: chosenPlan.planId,
          pendingAmount: remainingPayable,
          createdBy: userId || 'owner',
        });
      } else {
        const todayStr = getLocalDateString(new Date());
        const expiryStr = calculatePlanExpiryDate(todayStr, chosenPlan.durationMonths);
        await savePlanMutation.mutateAsync({
          GymCustomerMembershipPlanId: (activePlan as any)?.GymCustomerMembershipPlanId,
          customerId: id,
          gymId: customer.gymId,
          planId: chosenPlan.planId,
          pendingPlanId: null,
          pendingAmount: null,
          customAmount: Number(chosenPlan.price || 0),
          startDate: todayStr,
          endDate: expiryStr,
          is_Active: true,
          createdBy: userId || 'owner',
        });
      }

      logGymCustomerMembershipHistory({
        GymCustomerMembershipPlanId: (activePlan as any)?.GymCustomerMembershipPlanId,
        customerId: id,
        gymId: customer.gymId,
        planId: chosenPlan.planId,
        previousPlanId: activePlan?.planId || null,
        actionType: isCurrentPlanActive ? 'UPGRADED' : 'ASSIGNED',
        customAmount: remainingPayable,
        unusedCredit: upgradeCalculation ? upgradeCalculation.unusedCredit : 0,
        paymentStatus: 'pending',
        notes: `Plan change to ${chosenPlan.planName} requested by owner`,
        createdBy: userId || 'owner',
      }).catch((e) => console.warn('History tracking notice:', e));

      triggerSuccessHaptic();
      toast.success(
        isCurrentPlanActive
          ? `Upgrade to ${chosenPlan.planName} initiated! Customer can pay to activate.`
          : `Membership plan updated to ${chosenPlan.planName}!`
      );
      setShowChangePlanModal(false);
      setSelectedPlanId(null);
      await refetchCustomerPlans();
    } catch (err: any) {
      triggerErrorHaptic();
      toast.error(err?.message || 'Failed to update membership plan.');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleRevokePendingPlan = async () => {
    if (!activePlan?.GymCustomerMembershipPlanId) return;
    try {
      setIsRevoking(true);
      triggerLightHaptic();
      await revokePendingPlanMutation.mutateAsync({
        GymCustomerMembershipPlanId: activePlan.GymCustomerMembershipPlanId,
        customerId: id,
        gymId: customer.gymId,
      });
      triggerSuccessHaptic();
      toast.success('Pending plan upgrade revoked successfully.');
      setShowRevokeModal(false);
      await refetchCustomerPlans();
    } catch (err: any) {
      triggerErrorHaptic();
      toast.error(err?.message || 'Failed to revoke pending plan.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleOpenWebPayment = async (targetPlanId?: string, targetAmount?: number) => {
    triggerMediumHaptic();
    try {
      const webHost = 'https://www.gkgymlife.com';
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      params.append('returnTo', '/customer');
      if (Platform.OS !== 'ios') {
        params.append('action', 'upgrade');
        if (targetPlanId) params.append('planId', targetPlanId);
        if (targetAmount !== undefined && !isNaN(targetAmount)) params.append('amount', targetAmount.toString());
      }
      if (id) params.append('customerId', id);
      if (customer?.gymId) params.append('gymId', customer.gymId);
      if (session?.access_token) params.append('access_token', session.access_token);

      const targetUrl = `${webHost}/api/auth/sso?${params.toString()}`;
      await WebBrowser.openBrowserAsync(targetUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#0A0A0A',
        controlsColor: '#CCF200',
      });
    } catch (err) {
      console.warn('[handleOpenWebPayment] Error:', err);
      const fallbackUrl = Platform.OS === 'ios'
        ? 'https://www.gkgymlife.com/customer'
        : `https://www.gkgymlife.com/customer?action=upgrade&customerId=${id}`;
      Linking.openURL(fallbackUrl).catch(() => {
        toast.error('Unable to open web browser. Please visit https://www.gkgymlife.com');
      });
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-10" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1F1F22]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Member Profile</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
          <View className="flex-row items-center mb-4">
            <View className="relative mr-4">
              {customer?.user?.profilePhoto || userDetails?.profilePhoto ? (
                <Image
                  source={{ uri: customer?.user?.profilePhoto || userDetails?.profilePhoto }}
                  className="w-16 h-16 rounded-2xl border border-[#333]"
                />
              ) : (
                <View className="w-16 h-16 rounded-2xl bg-[#1C1F26] border border-[#333] items-center justify-center">
                  <Text className="text-[#CCF200] text-xl font-semibold">{initials}</Text>
                </View>
              )}
              <View
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#141416] ${isActive ? 'bg-[#CCF200]' : 'bg-[#EF4444]'
                  }`}
              />
            </View>

            <View className="flex-1 justify-center">
              <View className="flex-row items-center">
                <Text className="text-white text-xl font-semibold mr-2" numberOfLines={1}>
                  {customer.fullName}
                </Text>
                {isActive && <CheckCircle size={16} color="#CCF200" weight="fill" />}
              </View>
              <Text className="text-[#CCF200] text-xs font-semibold mt-0.5 tracking-wider">
                {memberCode}
              </Text>

              <View
                className={`self-start px-2.5 py-0.5 rounded-md mt-2 ${isActive ? 'bg-[#373F0E]' : 'bg-[#4A1D1D]'
                  }`}
              >
                <Text
                  className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'text-[#CCF200]' : 'text-[#FFB6C1]'
                    }`}
                >
                  {isActive ? 'Active Member' : 'Inactive Member'}
                </Text>
              </View>
            </View>
          </View>

          <View className="pt-3 border-t border-[#222226] flex-row flex-wrap gap-2">
            {customer.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${customer.phone}`)}
                className="flex-row items-center bg-[#1C1F26] border border-[#2A2E38] px-3 py-1.5 rounded-xl active:opacity-70"
              >
                <Phone size={14} color="#CCF200" />
                <Text className="text-gray-200 text-xs ml-2 font-medium">{customer.phone}</Text>
              </Pressable>
            )}
            {customer.email && (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${customer.email}`)}
                className="flex-row items-center bg-[#1C1F26] border border-[#2A2E38] px-3 py-1.5 rounded-xl active:opacity-70"
              >
                <EnvelopeSimple size={14} color="#A1A1AA" />
                <Text className="text-gray-300 text-xs ml-2 font-medium" numberOfLines={1}>
                  {customer.email}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View className="gap-3 mt-4">
          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-2.5">
                  <Medal size={16} color="#CCF200" weight="fill" />
                </View>
                <Text className="text-white text-sm font-semibold">Active Membership</Text>
              </View>
              {planStats.isPending ? (
                <View className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                  <Text className="text-amber-400 text-[10px] font-semibold">Pending Activation</Text>
                </View>
              ) : planStats.isExpired ? (
                <View className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30">
                  <Text className="text-red-400 text-[10px] font-semibold">Expired</Text>
                </View>
              ) : planStats.isInactive ? (
                <View className="px-2 py-0.5 rounded bg-zinc-500/20 border border-zinc-500/30">
                  <Text className="text-zinc-400 text-[10px] font-semibold">Inactive</Text>
                </View>
              ) : planStats.isActive ? (
                <View className="px-2 py-0.5 rounded bg-[#CCF200]/20 border border-[#CCF200]/30">
                  <Text className="text-[#CCF200] text-[10px] font-semibold">
                    {planStats.remainingDays === 0 ? 'Expires Today' : `${planStats.remainingDays} ${planStats.remainingDays === 1 ? 'Day' : 'Days'} Left`}
                  </Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded bg-zinc-500/20 border border-zinc-500/30">
                  <Text className="text-zinc-400 text-[10px] font-semibold">No Plan</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-white text-base font-semibold mb-0.5">{planStats.name}</Text>
                <Text className="text-gray-400 text-xs">
                  {planStats.duration} • {planStats.dateRangeText}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setShowChangePlanModal(true);
                }}
                className={`${activePlan ? 'bg-[#242428] border border-[#333]' : 'bg-[#CCF200]'} px-3.5 py-1.5 rounded-lg active:opacity-70`}
              >
                <Text className={`text-xs font-semibold ${activePlan ? 'text-white' : 'text-black'}`}>
                  {activePlan ? 'Change Plan' : 'Assign Plan'}
                </Text>
              </Pressable>
            </View>

            {activePlan?.pendingPlanId && (
              <View className="mt-3 pt-2.5 border-t border-[#222733] flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-[#F59E0B] text-xs font-semibold">
                    Upgrade Pending: {(activePlan as any)?.pendingPlan?.planName || 'New Plan'}
                    {(activePlan as any)?.pendingAmount ? ` (₹${Number((activePlan as any).pendingAmount).toFixed(0)})` : ''}
                  </Text>
                  <Text className="text-gray-400 text-[11px] mt-0.5">
                    Customer has not paid yet. Active access remains undisturbed.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setShowRevokeModal(true);
                  }}
                  className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg active:opacity-70"
                >
                  <Text className="text-red-400 text-xs font-semibold">Revoke</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-2.5">
                  <Barbell size={16} color="#CCF200" weight="fill" />
                </View>
                <Text className="text-white text-sm font-semibold">Assigned Trainer</Text>
              </View>
              {activeTrainerAssignment ? (
                <View className="px-2 py-0.5 rounded bg-[#373F0E]">
                  <Text className="text-[#CCF200] text-[10px] font-semibold">Assigned</Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded bg-[#2A2A2E]">
                  <Text className="text-gray-400 text-[10px] font-semibold">None</Text>
                </View>
              )}
            </View>

            {activeTrainerAssignment?.trainer ? (
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-base font-semibold">
                    {activeTrainerAssignment.trainer.fullName}
                  </Text>
                  <Text className="text-[#CCF200] text-xs mt-0.5">
                    {activeTrainerAssignment.trainer.specialization || 'Personal Trainer'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => navigateTo('change-trainer')}
                  className="bg-[#242428] px-3 py-1.5 rounded-lg border border-[#333] active:opacity-70"
                >
                  <Text className="text-white text-xs font-semibold">Change</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-400 text-xs">No trainer currently assigned</Text>
                <Pressable
                  onPress={() => navigateTo('change-trainer')}
                  className="bg-[#CCF200] px-3 py-1.5 rounded-lg active:opacity-80"
                >
                  <Text className="text-black text-xs font-semibold">Assign Trainer</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <Text className="text-[#CCF200] text-xs font-semibold uppercase tracking-wider mt-6 mb-3">
          Member Sub-Pages & Details
        </Text>

        <View className="bg-[#141416] border border-[#242424] rounded-2xl overflow-hidden">
          <Pressable
            onPress={() => navigateTo('personal-details')}
            className="flex-row items-center justify-between p-4 border-b border-[#222226] active:bg-[#1E1E22]"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3.5">
                <User size={20} color="#CCF200" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold mb-0.5">Personal Details</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  Contact, address, emergency info & stats
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#71717A" />
          </Pressable>

          <Pressable
            onPress={() => navigateTo('attendance-history')}
            className="flex-row items-center justify-between p-4 border-b border-[#222226] active:bg-[#1E1E22]"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3.5">
                <CalendarBlank size={20} color="#CCF200" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold mb-0.5">Attendance History</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  View check-ins, monthly calendar & streaks
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#71717A" />
          </Pressable>

          <Pressable
            onPress={() => navigateTo('assigned-trainer')}
            className="flex-row items-center justify-between p-4 border-b border-[#222226] active:bg-[#1E1E22]"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3.5">
                <Users size={20} color="#CCF200" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold mb-0.5">Assigned Trainer</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  View trainer schedule & manage assignment
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#71717A" />
          </Pressable>

          <Pressable
            onPress={() => navigateTo('membership-payments')}
            className="flex-row items-center justify-between p-4 active:bg-[#1E1E22]"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3.5">
                <CreditCard size={20} color="#CCF200" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold mb-0.5">Membership & Payments</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  Payment history, receipts & invoices
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#71717A" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Change Membership Modal */}
      <Modal
        visible={showChangePlanModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedPlanId(null);
          setShowChangePlanModal(false);
        }}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View
            className="bg-[#121214] border-t border-[#27272A] rounded-t-3xl p-5 max-h-[88%]"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-[#222226]">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-xl bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-3">
                  <Medal size={20} color="#CCF200" weight="fill" />
                </View>
                <View>
                  <Text className="text-white text-base font-semibold">Change Membership</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {customer.fullName} • {memberCode}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setSelectedPlanId(null);
                  setShowChangePlanModal(false);
                }}
                className="w-8 h-8 rounded-full bg-[#1C1F26] items-center justify-center active:opacity-70"
              >
                <X size={16} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="my-2">
              {/* Current Plan Card with Daily Rate & Unused Balance */}
              <View className="bg-[#181B22] border border-[#252A36] rounded-2xl p-4 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Text className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">
                      Current:
                    </Text>
                    <Text className="text-white text-xs font-semibold ml-1.5" numberOfLines={1}>
                      {planStats.name}
                    </Text>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded-full ${planStats.isPending
                      ? 'bg-amber-500/15 border border-amber-500/30'
                      : planStats.isExpired
                        ? 'bg-red-500/15 border border-red-500/30'
                        : planStats.isInactive
                          ? 'bg-zinc-500/15 border border-zinc-500/30'
                          : planStats.isActive
                            ? 'bg-[#CCF200]/15 border border-[#CCF200]/30'
                            : 'bg-zinc-500/15 border border-zinc-500/30'
                      }`}
                  >
                    <Text
                      className={`text-[10px] font-semibold ${planStats.isPending
                        ? 'text-amber-400'
                        : planStats.isExpired
                          ? 'text-red-400'
                          : planStats.isInactive
                            ? 'text-zinc-400'
                            : planStats.isActive
                              ? 'text-[#CCF200]'
                              : 'text-zinc-400'
                        }`}
                    >
                      {planStats.isPending
                        ? 'Pending Activation'
                        : planStats.isExpired
                          ? 'Expired'
                          : planStats.isInactive
                            ? 'Inactive'
                            : planStats.isActive
                              ? planStats.remainingDays === 0 ? 'Expires Today' : `${planStats.remainingDays} Days Left`
                              : 'No Plan'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-[#222733]">
                  <View>
                    <Text className="text-gray-400 text-[10px]">Cost / Day</Text>
                    <Text className="text-white text-xs font-semibold mt-0.5">
                      ₹{currentDailyRate.toFixed(1)}/day
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-400 text-[10px]">Plan Price</Text>
                    <Text className="text-white text-xs font-semibold mt-0.5">
                      ₹{currentPlanPrice.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-400 text-[10px] font-sans">Unused Balance</Text>
                    <Text
                      className={`text-xs font-semibold mt-0.5 ${isCurrentPlanActive ? 'text-[#CCF200]' : 'text-gray-500'
                        }`}
                    >
                      ₹{currentUnusedCredit.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Pending Upgrade Alert Banner */}
              {hasPendingUpgrade && (
                <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-3">
                  <View className="flex-row items-center mb-1">
                    <WarningCircle size={18} color="#F59E0B" weight="fill" />
                    <Text className="text-amber-400 text-xs font-bold ml-2">
                      Upgrade Pending ({pendingPlanName})
                    </Text>
                  </View>
                  <Text className="text-gray-300 text-xs leading-4">
                    Member already has an upgrade pending to <Text className="font-semibold text-white">{pendingPlanName}</Text>. To choose a different plan, you must first revoke the pending upgrade.
                  </Text>
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setShowChangePlanModal(false);
                      setShowRevokeModal(true);
                    }}
                    className="mt-2.5 bg-red-500/15 border border-red-500/30 px-3 py-1.5 rounded-lg self-start active:opacity-70 flex-row items-center gap-1.5"
                  >
                    <Trash size={13} color="#F87171" weight="bold" />
                    <Text className="text-red-400 text-xs font-semibold">Revoke Pending Upgrade</Text>
                  </Pressable>
                </View>
              )}

              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className={`${hasPendingUpgrade ? 'text-amber-400' : 'text-[#CCF200]'
                    } text-xs font-semibold uppercase tracking-wider`}
                >
                  {hasPendingUpgrade ? 'Plan Selection Locked' : 'Select Upgrade Plan'}
                </Text>
                <Text className="text-gray-500 text-[10px]">
                  {hasPendingUpgrade ? 'Revoke Required' : `${selectablePlans.length} Available`}
                </Text>
              </View>

              {planListWithStatus.length === 0 ? (
                <View className="bg-[#18181B] rounded-2xl p-6 items-center border border-[#27272A] my-2">
                  <Medal size={32} color="#71717A" weight="duotone" />
                  <Text className="text-white text-sm font-semibold mt-2.5 text-center">
                    No Membership Plans
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1 text-center leading-4 px-2">
                    No membership plans found for this gym.
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5 pb-2">
                  {selectablePlans.length === 0 && isCurrentPlanActive && !hasPendingUpgrade && (
                    <View className="bg-[#18181B] rounded-2xl p-4 items-center border border-[#27272A] mb-1">
                      <Text className="text-white text-xs font-semibold text-center">
                        Member is on the highest tier plan
                      </Text>
                      <Text className="text-gray-400 text-[11px] mt-0.5 text-center">
                        No higher upgrade tiers available.
                      </Text>
                    </View>
                  )}

                  {planListWithStatus.map((plan: any) => {
                    const isSelected = selectedPlanId === plan.planId;
                    const planMonths = parseDurationMonths(plan.durationMonths);
                    const planDays = Math.max(1, planMonths * 30);
                    const planDaily = (plan.planPrice / planDays).toFixed(1);

                    if (plan.isCurrentPlan) {
                      return (
                        <Pressable
                          key={plan.planId}
                          onPress={() => {
                            triggerErrorHaptic();
                            toast.error('Member is already enrolled in this plan.');
                          }}
                          className="p-3.5 rounded-2xl border border-amber-500/30 bg-[#1A1813] opacity-80 flex-row items-center justify-between active:opacity-95"
                        >
                          <View className="flex-1 pr-3">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-white text-sm font-semibold">
                                {plan.planName}
                              </Text>
                              <View className="bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                <Text className="text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
                                  CURRENT PLAN
                                </Text>
                              </View>
                            </View>
                            <Text className="text-amber-400/80 text-xs mt-1">
                              Current active plan • Cannot re-select
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="text-gray-400 text-sm font-semibold">
                              ₹{plan.planPrice.toLocaleString('en-IN')}
                            </Text>
                            <View className="w-5 h-5 rounded-full border border-amber-500/40 bg-amber-500/10 mt-1 items-center justify-center">
                              <Lock size={12} color="#F59E0B" weight="bold" />
                            </View>
                          </View>
                        </Pressable>
                      );
                    }

                    if (plan.isPendingUpgradePlan) {
                      return (
                        <Pressable
                          key={plan.planId}
                          onPress={() => {
                            triggerErrorHaptic();
                            toast.error('This upgrade is already pending customer payment or revoke.');
                          }}
                          className="p-3.5 rounded-2xl border border-amber-500/40 bg-[#1C1A12] flex-row items-center justify-between active:opacity-85"
                        >
                          <View className="flex-1 pr-3">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-white text-sm font-semibold">
                                {plan.planName}
                              </Text>
                              <View className="bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
                                <Text className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                  UPGRADE PENDING
                                </Text>
                              </View>
                            </View>
                            <Text className="text-amber-400/80 text-xs mt-1">
                              Already queued • Awaiting customer payment
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="text-amber-400 text-sm font-semibold">
                              ₹{plan.planPrice.toLocaleString('en-IN')}
                            </Text>
                            <View className="w-5 h-5 rounded-full border border-amber-500/40 bg-amber-500/20 mt-1 items-center justify-center">
                              <Lock size={12} color="#F59E0B" weight="bold" />
                            </View>
                          </View>
                        </Pressable>
                      );
                    }

                    if (hasPendingUpgrade) {
                      return (
                        <Pressable
                          key={plan.planId}
                          onPress={() => {
                            triggerErrorHaptic();
                            toast.error('Cannot choose another plan while an upgrade is pending. Revoke it first.');
                          }}
                          className="p-3.5 rounded-2xl border border-[#27272A] bg-[#141416] opacity-45 flex-row items-center justify-between active:opacity-60"
                        >
                          <View className="flex-1 pr-3">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-gray-400 text-sm font-medium">
                                {plan.planName}
                              </Text>
                              <View className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                                <Text className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">
                                  LOCKED
                                </Text>
                              </View>
                            </View>
                            <Text className="text-gray-500 text-xs mt-1">
                              Revoke pending upgrade first to select
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="text-gray-500 text-sm font-semibold">
                              ₹{plan.planPrice.toLocaleString('en-IN')}
                            </Text>
                            <View className="w-5 h-5 rounded-full border border-zinc-700 bg-zinc-800 mt-1 items-center justify-center">
                              <Lock size={12} color="#71717A" weight="bold" />
                            </View>
                          </View>
                        </Pressable>
                      );
                    }

                    if (plan.isLowerTier) {
                      return (
                        <Pressable
                          key={plan.planId}
                          onPress={() => {
                            triggerErrorHaptic();
                            toast.error('Cannot downgrade to a lower tier plan.');
                          }}
                          className="p-3.5 rounded-2xl border border-[#27272A] bg-[#141416] opacity-50 flex-row items-center justify-between active:opacity-65"
                        >
                          <View className="flex-1 pr-3">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-gray-400 text-sm font-medium">
                                {plan.planName}
                              </Text>
                              <View className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                                <Text className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
                                  LOWER TIER
                                </Text>
                              </View>
                            </View>
                            <Text className="text-gray-500 text-xs mt-1">
                              Downgrades are not permitted
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="text-gray-500 text-sm font-semibold">
                              ₹{plan.planPrice.toLocaleString('en-IN')}
                            </Text>
                            <View className="w-5 h-5 rounded-full border border-zinc-700 bg-zinc-800 mt-1 items-center justify-center">
                              <Lock size={12} color="#71717A" weight="bold" />
                            </View>
                          </View>
                        </Pressable>
                      );
                    }

                    return (
                      <Pressable
                        key={plan.planId}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedPlanId(plan.planId);
                        }}
                        className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${isSelected
                          ? 'bg-[#1C2010] border-[#CCF200]'
                          : 'bg-[#18181B] border-[#27272A] active:border-[#3F3F46]'
                          }`}
                      >
                        <View className="flex-1 pr-3">
                          <Text
                            className={`text-sm font-semibold ${isSelected ? 'text-[#CCF200]' : 'text-white'
                              }`}
                          >
                            {plan.planName}
                          </Text>
                          <Text className="text-gray-400 text-xs mt-0.5">
                            {planMonths} Month(s) ({planDays} days) • ₹{planDaily}/day
                            {plan.description ? ` • ${plan.description}` : ''}
                          </Text>
                        </View>

                        <View className="items-end">
                          <Text className="text-[#CCF200] text-sm font-semibold">
                            ₹{plan.planPrice.toLocaleString('en-IN')}
                          </Text>
                          <View
                            className={`w-5 h-5 rounded-full border mt-1 items-center justify-center ${isSelected
                              ? 'bg-[#CCF200] border-[#CCF200]'
                              : 'border-[#444]'
                              }`}
                          >
                            {isSelected && <Check size={12} color="#000" weight="bold" />}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Upgrade Summary Card */}
              {upgradeCalculation && (
                <View className="bg-[#14171F] border border-[#262F3E] rounded-2xl p-4 mt-2 mb-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                      Upgrade Calculation
                    </Text>
                    <Text className="text-[#CCF200] text-xs font-semibold">
                      {selectedPlan?.planName}
                    </Text>
                  </View>

                  <View className="pt-1">
                    <View className="flex-row justify-between items-center py-1">
                      <Text className="text-gray-400 text-xs">
                        New Plan Price ({upgradeCalculation.newPlanMonths} mo @ ₹{upgradeCalculation.newDailyRate}/day)
                      </Text>
                      <Text className="text-white text-xs font-semibold">
                        ₹{upgradeCalculation.newPlanPrice.toLocaleString('en-IN')}
                      </Text>
                    </View>

                    {upgradeCalculation.isUpgrade && upgradeCalculation.unusedCredit > 0 && (
                      <View className="flex-row justify-between items-center py-1">
                        <Text className="text-gray-400 text-xs">
                          Credit from Current Plan ({upgradeCalculation.remainingDays} days left)
                        </Text>
                        <Text className="text-[#CCF200] text-xs font-semibold">
                          -₹{upgradeCalculation.unusedCredit.toFixed(1)}
                        </Text>
                      </View>
                    )}

                    <View className="h-[1px] bg-[#222733] my-2" />

                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-white text-xs font-semibold">Net Amount to Pay</Text>
                        {upgradeCalculation.isUpgrade && upgradeCalculation.unusedCredit > 0 && (
                          <Text className="text-gray-400 text-[10px]">
                            ₹{upgradeCalculation.newPlanPrice} - ₹{upgradeCalculation.unusedCredit.toFixed(1)}
                          </Text>
                        )}
                      </View>
                      <Text className="text-[#CCF200] text-lg font-semibold">
                        ₹{upgradeCalculation.payableAmount.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View className="mt-2 gap-2.5">
              <Pressable
                disabled={!selectedPlanId || !selectedPlan || isUpdatingPlan || hasPendingUpgrade}
                onPress={handleConfirmChangePlan}
                className={`py-3.5 rounded-2xl items-center justify-center flex-row gap-2 ${!selectedPlanId || !selectedPlan || isUpdatingPlan || hasPendingUpgrade
                  ? 'bg-[#CCF200]/40'
                  : 'bg-[#CCF200] active:opacity-85'
                  }`}
              >
                {isUpdatingPlan ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#000000" weight="bold" />
                    <Text className="text-black font-semibold text-sm">
                      {hasPendingUpgrade ? 'Upgrade Already Pending' : 'Confirm & Update Plan'}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                disabled={!selectedPlanId || !selectedPlan}
                onPress={() => {
                  setShowChangePlanModal(false);
                  router.push({
                    pathname: '/(owner)/dashboard/payments/add' as any,
                    params: {
                      customerId: id,
                      planId: selectedPlanId || undefined,
                      amount: upgradeCalculation
                        ? upgradeCalculation.payableAmount.toFixed(1)
                        : undefined,
                    },
                  });
                }}
                className={`py-3 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center ${!selectedPlanId || !selectedPlan ? 'opacity-50' : 'active:opacity-75'
                  }`}
              >
                <Text className="text-gray-300 text-xs font-semibold">
                  {upgradeCalculation
                    ? `Record New Payment & Receipt (₹${upgradeCalculation.payableAmount.toFixed(1)}) →`
                    : 'Record New Payment & Receipt →'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={showRevokeModal}
        onClose={() => setShowRevokeModal(false)}
        onConfirm={handleRevokePendingPlan}
        isLoading={isRevoking}
        title="Revoke Plan Upgrade"
        description={`Are you sure you want to revoke the pending upgrade to ${(activePlan as any)?.pendingPlan?.planName || 'the new plan'}? The member's current active membership and dates will remain undisturbed.`}
        confirmText="Revoke Upgrade"
        cancelText="Cancel"
        confirmButtonColor="bg-red-500"
        confirmTextColor="text-white"
        icon={
          <View className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center border border-red-500/20">
            <WarningCircle size={28} color="#EF4444" weight="fill" />
          </View>
        }
      />
    </View>
  );
}
