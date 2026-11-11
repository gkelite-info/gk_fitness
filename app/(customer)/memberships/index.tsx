import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Platform, Alert, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Info,
  CheckCircle,
  Crown,
  Star,
  Diamond,
  CaretRight,
  XCircle,
  Clock,
} from 'phosphor-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useSubscriptions } from '@/hooks/superadmin/subscriptions';
import { useIndividualCustomerPlans } from '@/hooks/individual/membership/individualCustomerPlan';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerMediumHaptic } from '@/lib/haptics';
import {
  calculateRemainingDays,
  parseDurationMonths,
  calculatePlanStats,
  computeUpgradeCalculation,
} from '@/helpers/gymCustomerMembershipPlans/membershipPaymentLogic';

export default function MembershipsScreen() {
  const router = useRouter();
  const { userId, role, email: userEmail, phone: userPhone } = useUser();
  const insets = useSafeAreaInsets();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: individualCustomerPlans,
    isLoading: isIndivCustomerPlansLoading,
    refetch: refetchIndivCustomerPlans,
  } = useIndividualCustomerPlans(userId || undefined, undefined, {
    enabled: !!userId,
  });
  const hasIndividualPlan = Boolean(individualCustomerPlans && individualCustomerPlans.length > 0);
  const isIndividual = role === 'individual' || hasIndividualPlan;

  const { data: plans, isLoading: isGymCustomerPlansLoading, refetch: refetchPlans } = useGymCustomerMembershipPlans(
    undefined,
    !hasIndividualPlan && userId ? userId : undefined
  );

  const { data: customerProfileData, refetch: refetchProfile } = useCustomerProfile(userId);

  const {
    data: individualSubscriptions,
    isLoading: isSubscriptionsLoading,
    refetch: refetchSubscriptions,
  } = useSubscriptions(undefined, 'customer', { enabled: isIndividual });

  const currentPlan = useMemo(() => {
    if (isIndividual) {
      if (!individualCustomerPlans || individualCustomerPlans.length === 0) return null;
      const activeIndiv =
        individualCustomerPlans.find(
          (p: any) =>
            p.isActive &&
            p.endDate &&
            new Date(p.endDate).getTime() > Date.now() &&
            p.status !== 'pending' &&
            p.transactionId
        ) || individualCustomerPlans[0];

      const subMatch = individualSubscriptions?.find(
        (s: any) => s.subscriptionPlanId === activeIndiv.subscriptionPlanId
      );
      const isIndivActive =
        Boolean(activeIndiv.isActive) &&
        Boolean(activeIndiv.endDate && new Date(activeIndiv.endDate).getTime() > Date.now()) &&
        activeIndiv.status !== 'pending' &&
        Boolean(activeIndiv.transactionId);

      return {
        individualCustomerPlanId: activeIndiv.individualCustomerPlanId,
        planId: activeIndiv.subscriptionPlanId,
        customAmount: activeIndiv.customAmount ?? subMatch?.price ?? 0,
        status: activeIndiv.status || (isIndivActive ? 'active' : 'pending'),
        transactionId: activeIndiv.transactionId,
        startDate: activeIndiv.startDate,
        endDate: activeIndiv.endDate,
        isActive: isIndivActive,
        is_Active: isIndivActive,
        pendingAmount: activeIndiv.customAmount ?? subMatch?.price,
        plan: {
          planId: activeIndiv.subscriptionPlanId,
          planName: subMatch?.planName || activeIndiv.subscription?.planName || 'Individual Subscription',
          price: subMatch?.price ?? activeIndiv.customAmount ?? 0,
          durationMonths: subMatch?.durationMonths || 1,
        },
      };
    }

    if (!plans || plans.length === 0) return null;
    return plans[0];
  }, [isIndividual, individualCustomerPlans, plans, individualSubscriptions]);

  const gymId = (currentPlan as any)?.gymId || customerProfileData?.customerData?.gymId;

  const { data: gymPlans, isLoading: isGymPlansLoading, refetch: refetchGymPlans } = useMembershipPlans(
    !isIndividual && gymId ? gymId : null
  );

  const individualPlans = useMemo(() => {
    if (!individualSubscriptions) return [];
    return individualSubscriptions
      .filter((sub: any) => sub.planFor === 'customer' && !sub.is_deleted && sub.isActive !== false)
      .map((sub: any) => {
        const features = (sub.subscription_features || [])
          .filter((f: any) => !f.is_deleted && f.featureName)
          .map((f: any) => f.featureName);

        const durMonths = sub.durationMonths || 1;

        return {
          id: sub.subscriptionPlanId,
          name: sub.planName,
          priceFormatted: `₹${sub.price ?? 0}`,
          priceNumeric: String(sub.price ?? 0),
          billingCycle: durMonths > 1 ? `/ ${durMonths} Months` : '/ Month',
          duration: `${durMonths} Month${durMonths > 1 ? 's' : ''}`,
          durationMonths: durMonths,
          features: features.length > 0 ? features : ['Full App Access', 'Workout & Diet Plans'],
          label: sub.label,
        };
      });
  }, [individualSubscriptions]);

  const isLoading = isIndividual ? isIndivCustomerPlansLoading : isGymCustomerPlansLoading;

  const onRefresh = useCallback(async () => {
    triggerMediumHaptic();
    setRefreshing(true);
    try {
      if (isIndividual) {
        await Promise.all([
          refetchSubscriptions(),
          refetchIndivCustomerPlans(),
          refetchProfile(),
        ]);
      } else {
        await Promise.all([
          refetchPlans(),
          refetchProfile(),
          refetchGymPlans(),
        ]);
      }
    } catch (error) {
      console.error('[Memberships] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [isIndividual, refetchSubscriptions, refetchIndivCustomerPlans, refetchPlans, refetchProfile, refetchGymPlans]);

  const upgradeOptions = useMemo(() => {
    if (isIndividual) {
      if (!currentPlan) return individualPlans;
      return individualPlans.filter((plan: any) => {
        const isSameId = currentPlan.planId && plan.id === currentPlan.planId;
        const isSameName =
          currentPlan.plan?.planName &&
          plan.name &&
          currentPlan.plan.planName.trim().toLowerCase() === plan.name.trim().toLowerCase();

        return !isSameId && !isSameName;
      });
    }

    if (!gymPlans) return [];
    if (!currentPlan) return gymPlans;

    return gymPlans.filter((plan) => {
      const isSameId = currentPlan.planId && plan.id === currentPlan.planId;
      const isSameName =
        currentPlan.plan?.planName &&
        plan.name &&
        currentPlan.plan.planName.trim().toLowerCase() === plan.name.trim().toLowerCase();

      return !isSameId && !isSameName;
    });
  }, [isIndividual, individualPlans, gymPlans, currentPlan]);

  const numericAmount = Number(
    currentPlan?.plan?.price ?? currentPlan?.customAmount ?? (currentPlan as any)?.price ?? 0
  );
  const currentPlanMonths = parseDurationMonths(
    (currentPlan?.plan as any)?.durationMonths || (currentPlan as any)?.durationMonths || 1
  );
  const planAmount =
    numericAmount > 0
      ? `₹${numericAmount}`
      : (currentPlan?.plan as any)?.price
        ? `₹${(currentPlan?.plan as any)?.price}`
        : '₹0';

  const stats = useMemo(() => {
    return calculatePlanStats({
      planPrice: numericAmount,
      durationMonths: currentPlanMonths,
      startDate: currentPlan?.startDate,
      endDate: currentPlan?.endDate,
      isActive: Boolean(currentPlan?.is_Active ?? (currentPlan as any)?.isActive),
    });
  }, [
    numericAmount,
    currentPlanMonths,
    currentPlan?.startDate,
    currentPlan?.endDate,
    currentPlan?.is_Active,
    (currentPlan as any)?.isActive,
  ]);

  const remainingDays = stats.standardRemainingDays;
  const currentDailyRate = stats.dailyRate;
  const unusedCredit = stats.unusedCredit;

  // Pending activation is true ONLY when a plan has been assigned to the user but has not been paid yet
  const isPendingActivation = Boolean(
    currentPlan && (
      !currentPlan.startDate ||
      !currentPlan.endDate ||
      (!Boolean(currentPlan.is_Active ?? (currentPlan as any)?.isActive) && !currentPlan.endDate) ||
      (currentPlan as any)?.status === 'pending' ||
      (isIndividual && !(currentPlan as any)?.transactionId)
    )
  );

  const isExpired = !isPendingActivation && (stats.isExpired || remainingDays === 0);
  const isCurrentActive =
    !isPendingActivation &&
    stats.isPlanActive &&
    (currentPlan as any)?.status !== 'pending' &&
    remainingDays > 0;

  const statusLabel = isPendingActivation
    ? 'Pending Activation'
    : isExpired
      ? 'Expired'
      : isCurrentActive
        ? 'Active'
        : 'Inactive';

  const statusColor = isPendingActivation
    ? '#F59E0B'
    : isExpired
      ? '#EF4444'
      : isCurrentActive
        ? '#CCFF00'
        : '#8E8E93';

  const planName = currentPlan?.plan?.planName || 'Membership Plan';

  const hasPendingTierUpdate = Boolean(
    !isIndividual && (currentPlan?.pendingPlanId || (currentPlan as any)?.pendingPlan)
  );
  const pendingPlanName = (currentPlan as any)?.pendingPlan?.planName || 'Club Access Pass';
  const pendingAmount = (currentPlan as any)?.pendingAmount;
  const formattedPendingAmount =
    pendingAmount !== undefined && pendingAmount !== null
      ? Number(pendingAmount) % 1 === 0
        ? String(Number(pendingAmount))
        : Number(pendingAmount).toFixed(1)
      : null;

  const formattedEndDate = currentPlan?.endDate
    ? new Date(currentPlan.endDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : null;

  const openWebCheckout = async (
    targetPlanId?: string | null,
    targetPlanName?: string | null,
    targetAmount?: number | string | null,
    actionOverride?: string
  ) => {
    triggerMediumHaptic();

    let targetUrl = 'https://www.gkgymlife.com/customer';
    try {
      let session: any = null;
      try {
        const sessionRes = await supabase.auth.getSession();
        session = sessionRes?.data?.session;
        if (!session?.access_token || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            session = refreshData.session;
          } else if (refreshErr) {
            console.warn('[Memberships] Token refresh warning:', refreshErr?.message);
          }
        }
      } catch (sessErr) {
        console.warn('[Memberships] Session read warning:', sessErr);
      }

      if (!session?.access_token && !userId) {
        Alert.alert(
          'Login Required',
          'Please log in to continue.',
          [
            {
              text: 'Log In',
              onPress: () => router.replace('/auth/login' as any),
            },
          ]
        );
        return;
      }

      const webHost = 'https://www.gkgymlife.com';
      const baseUrl = `${webHost}/api/auth/sso`;
      const params = new URLSearchParams();

      params.append('returnTo', '/customer');
      const action =
        actionOverride || (isPendingActivation ? 'activate' : isIndividual ? 'subscribe' : 'renew');
      params.append('action', action);
      if (targetPlanId) params.append('planId', targetPlanId);
      if (targetPlanName) params.append('planName', targetPlanName);
      if (targetAmount !== undefined && targetAmount !== null) params.append('amount', String(targetAmount));

      if (userId) params.append('userId', userId);
      if (role) params.append('role', role);
      if (customerProfileData?.customerData?.customerId) {
        params.append('customerId', customerProfileData.customerData.customerId);
      }
      const gymIdVal = customerProfileData?.customerData?.gymId || gymId;
      if (gymIdVal) params.append('gymId', gymIdVal);

      const emailVal = session?.user?.email || customerProfileData?.customerData?.email || userEmail;
      const phoneVal = session?.user?.phone || customerProfileData?.customerData?.phone || userPhone;
      if (emailVal) params.append('email', emailVal);
      if (phoneVal) params.append('phone', phoneVal);

      if (session?.access_token) {
        params.append('access_token', session.access_token);
        if (session.refresh_token) {
          params.append('refresh_token', session.refresh_token);
        }
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      targetUrl = `${baseUrl}${queryString}`;

      try {
        await WebBrowser.openBrowserAsync(targetUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: '#0A0A0A',
          controlsColor: '#CCFF00',
        });
      } catch (browserErr) {
        console.warn('[Memberships] WebBrowser error, falling back to Linking:', browserErr);
        await Linking.openURL(targetUrl);
      }
    } catch (err) {
      console.warn('[Memberships] Error opening web browser:', err);
      try {
        await Linking.openURL(targetUrl);
      } catch (linkErr) {
        Alert.alert('Error', 'Unable to open browser. Please visit https://www.gkgymlife.com/customer');
      }
    }
  };

  const handleRenewCurrentPlan = () => {
    const targetPlanId = currentPlan?.planId || (currentPlan?.plan as any)?.planId;
    openWebCheckout(
      targetPlanId,
      planName,
      numericAmount > 0 ? numericAmount : undefined,
      isPendingActivation ? 'activate' : 'renew'
    );
  };

  const handleRenewPlan = (plan: any, customPayableAmount?: number) => {
    setSelectedPlanId(plan.id);
    const planPrice = Number(plan.priceNumeric || plan.price || 0);
    const amountToSend = customPayableAmount !== undefined ? customPayableAmount : planPrice;
    const action = isCurrentActive && planPrice > numericAmount ? 'upgrade' : isIndividual ? 'subscribe' : 'renew';
    openWebCheckout(
      plan.id,
      plan.name,
      amountToSend,
      action
    );
  };

  const isPlansLoading = isIndividual ? isSubscriptionsLoading : isGymPlansLoading;

  const handleBack = useCallback(() => {
    router.navigate('/(customer)/profile');
  }, [router]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const screenTitle = isPendingActivation
    ? 'Activate Membership'
    : hasPendingTierUpdate
      ? 'Upgrade Membership'
      : isIndividual
        ? 'Subscription Plans'
        : 'Gym Membership';

  const screenSubtitle = isPendingActivation
    ? 'Complete payment for your assigned membership plan'
    : hasPendingTierUpdate
      ? 'Complete payment for your pending plan upgrade'
      : isIndividual
        ? 'Fitness & Companion Membership'
        : 'Physical Gym Access & Companion Plan';

  const infoTitle = isPendingActivation
    ? 'Activate Assigned Plan'
    : hasPendingTierUpdate
      ? 'Upgrade Assigned Plan'
      : isIndividual
        ? 'Individual Subscription'
        : 'Physical Gym Membership';

  const infoDescription = isPendingActivation
    ? 'Your assigned plan is pending activation. Complete payment for your assigned plan above to get started.'
    : hasPendingTierUpdate
      ? 'Your membership upgrade is ready. Complete your payment below to activate your upgraded plan.'
      : isCurrentActive
        ? `Your current plan is active with ${remainingDays} day${remainingDays !== 1 ? 's' : ''} remaining. You can upgrade to a higher tier anytime with unused credit applied.`
        : isIndividual
          ? 'Subscription plans provide full access to personalized workouts, diet plans, daily health tracking, and premium features on the mobile app.'
          : 'Membership plans cover entry and access to physical gym facilities, fitness equipment, and in-person trainer guidance. Choose a plan to pay and activate securely.';

  const availableSectionTitle =
    isPendingActivation || !currentPlan
      ? isIndividual
        ? 'AVAILABLE SUBSCRIPTION PLANS'
        : 'AVAILABLE MEMBERSHIP PLANS'
      : isIndividual
        ? 'OTHER SUBSCRIPTION PLANS'
        : 'OTHER AVAILABLE PLANS';

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-[#1C1C1E]">
        <Pressable onPress={handleBack} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
          <ArrowLeft size={22} color="#FFF" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-white text-lg font-semibold">{screenTitle}</Text>
          <Text className="text-[#9CA3AF] text-[11px] mt-0.5">{screenSubtitle}</Text>
        </View>
        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 100 }}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Informational Guidance Banner */}
        <View className="bg-[#1C1C1E] border border-[#CCFF00]/30 rounded-2xl p-4 mb-6 flex-row items-start">
          <Info size={22} color="#CCFF00" weight="fill" style={{ marginTop: 2, marginRight: 12 }} />
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-1">{infoTitle}</Text>
            <Text className="text-[#9CA3AF] text-xs leading-4">{infoDescription}</Text>
          </View>
        </View>

        {/* Section Header: Current / Assigned Plan */}
        <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-widest mb-3 uppercase">
          {isPendingActivation
            ? isIndividual
              ? 'ASSIGNED SUBSCRIPTION PLAN'
              : 'ASSIGNED MEMBERSHIP PLAN'
            : isIndividual
              ? 'YOUR CURRENT SUBSCRIPTION'
              : 'YOUR CURRENT PLAN'}
        </Text>

        {isLoading ? (
          <View className="bg-[#1C1C1E] rounded-3xl p-8 mb-8 items-center justify-center border border-[#27272A]">
            <ActivityIndicator size="small" color="#CCFF00" />
          </View>
        ) : currentPlan ? (
          <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-8 border border-[#27272A]">
            {/* Top Row: Crown Icon, Plan Name, Status */}
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-2xl bg-[#EAB308] items-center justify-center mr-4">
                <Crown size={32} color="#FFF" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-xl font-semibold mb-0.5">{planName}</Text>
                <View className="flex-row items-baseline mb-1">
                  <Text className="text-white text-base font-semibold">{planAmount}</Text>
                  <Text className="text-[#8E8E93] text-xs ml-1">
                    {currentPlanMonths > 1 ? `/ ${currentPlanMonths} Months` : '/ Month'}
                  </Text>
                </View>

                <View className="flex-row items-center flex-wrap gap-2">
                  <View className="flex-row items-center">
                    {isPendingActivation ? (
                      <Clock size={14} color={statusColor} weight="fill" />
                    ) : isExpired || !isCurrentActive ? (
                      <XCircle size={14} color={statusColor} weight="fill" />
                    ) : (
                      <CheckCircle size={14} color={statusColor} weight="fill" />
                    )}
                    <Text style={{ color: statusColor }} className="text-[11px] font-semibold ml-1.5">
                      {statusLabel}
                    </Text>
                  </View>
                  {formattedEndDate && (
                    <Text className="text-[#8E8E93] text-[11px]">
                      • {isExpired ? 'Expired' : 'Expires'} {formattedEndDate}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Daily Rate & Unused Credit Breakdown (when active on Android, informational on iOS) */}
            {isCurrentActive && unusedCredit > 0 && (
              <View className="mt-3 pt-3 border-t border-[#27272A] flex-row items-center justify-between gap-2">
                <Text className="text-[#9CA3AF] text-xs flex-1 flex-shrink">
                  Daily Rate:{' '}
                  <Text className="text-white font-medium">₹{currentDailyRate}/day</Text> (
                  {remainingDays} day{remainingDays !== 1 ? 's' : ''} left)
                </Text>
                <Text className="text-[#CCFF00] text-xs font-semibold shrink-0">
                  Unused Credit: ₹{unusedCredit}
                </Text>
              </View>
            )}

            {/* Pending Upgrade Banner */}
            {hasPendingTierUpdate && (
              <View className="mt-4 pt-3.5 border-t border-[#27272A] bg-[#221B13] border border-[#5E4218] rounded-2xl p-4">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[#F59E0B] text-[10px] font-semibold tracking-widest uppercase">
                    UPGRADE PENDING
                  </Text>
                  {formattedPendingAmount && (
                    <Text className="text-[#CCFF00] font-extrabold text-sm">
                      ₹{formattedPendingAmount}
                    </Text>
                  )}
                </View>
                <Text className="text-white text-sm font-semibold">{pendingPlanName}</Text>
                <Text className="text-gray-400 text-[11px] mt-0.5">
                  Your gym owner initiated an upgrade. Complete payment below to activate your new tier!
                </Text>
                <Pressable
                  className="w-full bg-[#CCFF00] py-3 px-4 rounded-xl mt-3 flex-row items-center justify-center active:opacity-85"
                  onPress={() =>
                    openWebCheckout(
                      currentPlan?.pendingPlanId,
                      pendingPlanName,
                      pendingAmount,
                      'activate'
                    )
                  }
                >
                  <Text className="text-black font-semibold text-xs uppercase tracking-wider mr-1">
                    {`COMPLETE UPGRADE PAYMENT ${formattedPendingAmount ? `(₹${formattedPendingAmount})` : ''}`}
                  </Text>
                  <CaretRight size={14} color="#000000" weight="bold" />
                </Pressable>
              </View>
            )}

            {/* Current Plan Action Button */}
            {isCurrentActive && !isExpired && !isPendingActivation ? (
              <View className="w-full bg-[#27272A] py-3.5 px-5 rounded-2xl flex-row items-center justify-center mt-4 opacity-60">
                <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider uppercase">
                  {`Plan Active ${remainingDays > 0 ? `(${remainingDays} Days Left)` : ''}`}
                </Text>
              </View>
            ) : (
              <Pressable
                className="w-full bg-[#CCFF00] py-3.5 px-5 rounded-2xl flex-row items-center justify-center mt-4 active:opacity-85"
                onPress={() => handleRenewCurrentPlan()}
              >
                <Text className="text-black text-xs font-semibold tracking-wider mr-1 uppercase">
                  {isPendingActivation ? 'ACTIVATE MEMBERSHIP NOW' : 'RENEW PLAN'}
                </Text>
                <CaretRight size={15} color="#000000" weight="bold" />
              </Pressable>
            )}

            {/* Validity details footer */}
            {isCurrentActive && currentPlan?.endDate ? (
              <View className="mt-4 pt-3.5 border-t border-[#27272A] flex-row items-center justify-between gap-2">
                <Text className="text-[#9CA3AF] text-xs shrink-0">Plan Validity</Text>
                <Text className="text-[#CCFF00] text-xs font-semibold flex-1 text-right flex-shrink" numberOfLines={1}>
                  Valid until {formattedEndDate}
                </Text>
              </View>
            ) : isPendingActivation ? (
              <View className="mt-4 pt-3.5 border-t border-[#27272A] flex-row items-center justify-between gap-2">
                <Text className="text-[#9CA3AF] text-xs shrink-0">Membership Status</Text>
                <Text className="text-[#F59E0B] text-xs font-semibold flex-1 text-right flex-shrink" numberOfLines={2}>
                  Awaiting Activation • Pay to start access
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-8 border border-[#27272A] items-center">
            <Text className="text-white text-base font-semibold mb-1">No Active Plan</Text>
            <Text className="text-[#9CA3AF] text-xs text-center">
              {isIndividual
                ? 'You do not have an active subscription yet. Choose a plan below to get started.'
                : 'You do not have an active gym membership. Choose a plan below or visit your gym.'}
            </Text>
          </View>
        )}

        {/* Section: Other Available Plans */}
        <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-widest mb-3 uppercase">
          {availableSectionTitle}
        </Text>

        {hasPendingTierUpdate ? (
          <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-8 border border-[#27272A] items-center">
            <Text className="text-[#9CA3AF] text-xs text-center">
              You have a pending plan upgrade awaiting completion above. Complete your pending payment to unlock other plan changes.
            </Text>
          </View>
        ) : isPlansLoading ? (
          <View className="py-8 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
          </View>
        ) : upgradeOptions.length === 0 ? (
          <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-8 border border-[#27272A] items-center">
            <Text className="text-[#9CA3AF] text-xs text-center">
              {isIndividual
                ? 'No subscription plans are currently available.'
                : isCurrentActive
                  ? 'You are currently on an active plan. No other plans are available.'
                  : 'No other gym plans are currently available. You can renew your current plan above.'}
            </Text>
          </View>
        ) : (
          upgradeOptions.map((plan: any, index: number) => {
            const isFirst = index % 2 === 0;
            const isSelected = selectedPlanId === plan.id;
            const containerStyle = isSelected
              ? 'bg-[#1C1C1E] rounded-3xl border-2 border-[#CCFF00] p-5 mb-6 relative overflow-hidden'
              : 'bg-[#1C1C1E] rounded-3xl p-5 mb-6 border border-[#27272A]';
            const iconBg = isFirst ? 'bg-[#374151]' : 'bg-[#6D28D9]';
            const checkColor = isFirst ? '#CCFF00' : '#A78BFA';

            const planPriceNum = Number(plan.priceNumeric || plan.price || 0);
            const calc = computeUpgradeCalculation(currentPlan, {
              price: planPriceNum,
              durationMonths: plan.durationMonths || 1,
            });

            // A plan is an upgrade when the user has an active plan AND this plan has a greater amount
            const isHigherTierUpgrade = Boolean(isCurrentActive && calc?.isUpgrade && planPriceNum > numericAmount);
            const isUpgradeWithCredit = Boolean(isHigherTierUpgrade && calc && calc.unusedCredit > 0);
            const payableAmount = isHigherTierUpgrade && calc ? calc.payableAmount : planPriceNum;

            // Action is disabled ONLY when:
            // 1. Initial assigned plan has not been paid yet (isPendingActivation) -> user must activate assigned plan first
            // 2. OR User is already active, but this plan is NOT a higher-tier upgrade (e.g. same price or cheaper)
            const isActionDisabled = isPendingActivation || (isCurrentActive && !isHigherTierUpgrade);

            return (
              <Pressable
                key={plan.id}
                className={containerStyle}
                onPress={() => setSelectedPlanId(plan.id)}
              >
                <View className="flex-row items-center mb-4">
                  <View className={`w-14 h-14 rounded-2xl ${iconBg} items-center justify-center mr-4`}>
                    <Crown size={28} color="#FFF" weight="regular" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-white text-lg font-semibold mr-2">{plan.name}</Text>
                      {plan.label ? (
                        <View className="bg-[#CCFF00]/20 border border-[#CCFF00]/40 px-2 py-0.5 rounded-full mr-2">
                          <Text className="text-[#CCFF00] text-[10px] font-semibold uppercase">
                            {plan.label}
                          </Text>
                        </View>
                      ) : isFirst ? (
                        <Star size={16} color="#EAB308" weight="fill" />
                      ) : (
                        <Diamond size={16} color="#A78BFA" weight="regular" />
                      )}
                    </View>
                    <View className="flex-row items-baseline mt-0.5 gap-1.5 flex-wrap">
                      <Text className="text-white text-base font-semibold">
                        ₹{plan.priceNumeric ?? 0}
                      </Text>
                      <Text className="text-[#8E8E93] text-[11px] font-medium">+ GST (0%)</Text>
                      <Text className="text-[#8E8E93] text-xs">
                        {plan.billingCycle || `/ ${plan.duration || 'Month'}`}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="space-y-2 mb-4">
                  {!isIndividual && (
                    <View className="flex-row items-center mb-2.5">
                      <CheckCircle size={16} color={checkColor} weight="regular" />
                      <Text className="text-white text-xs ml-2.5">
                        Full Access to Gym Facility & Equipment
                      </Text>
                    </View>
                  )}
                  {plan.features.map((feature: string, fIndex: number) => (
                    <View key={fIndex} className="flex-row items-center mb-2.5">
                      <CheckCircle size={16} color={checkColor} weight="regular" />
                      <Text className="text-white text-xs ml-2.5">{feature}</Text>
                    </View>
                  ))}
                  {!isIndividual && (
                    <View className="flex-row items-center mb-2.5">
                      <CheckCircle size={16} color={checkColor} weight="regular" />
                      <Text className="text-white text-xs ml-2.5">
                        Locker & Shower Facilities
                      </Text>
                    </View>
                  )}
                </View>

                {/* Upgrade Credit Breakdown Box */}
                {isUpgradeWithCredit && calc && (
                  <View className="bg-[#141414] border border-[#27272A] rounded-2xl p-3.5 mb-4">
                    <View className="flex-row justify-between items-center mb-1.5 gap-2">
                      <Text className="text-xs text-[#8E8E93] flex-1">New Plan Price</Text>
                      <Text className="text-white text-xs font-medium shrink-0">₹{calc.newPlanPrice}</Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-1.5 gap-2">
                      <Text className="text-xs text-[#CCFF00] flex-1 flex-shrink" numberOfLines={2}>
                        Credit from Current Plan ({calc.remainingDays} days left)
                      </Text>
                      <Text className="text-[#CCFF00] text-xs font-semibold shrink-0">
                        -₹{calc.unusedCredit}
                      </Text>
                    </View>
                    <View className="border-t border-[#222222] pt-1.5 flex-row justify-between items-baseline gap-2">
                      <Text className="text-xs font-semibold text-white flex-1">Net Amount to Pay</Text>
                      <Text className="text-base font-semibold text-[#CCFF00] shrink-0">
                        ₹{calc.payableAmount}
                      </Text>
                    </View>
                  </View>
                )}

                <Pressable
                  disabled={isActionDisabled}
                  className={`w-full py-3.5 px-5 rounded-2xl flex-row items-center justify-center ${isActionDisabled
                    ? 'bg-[#27272A] opacity-60'
                    : 'bg-[#CCFF00] active:opacity-85'
                    }`}
                  onPress={() => {
                    if (isActionDisabled) return;
                    handleRenewPlan(plan, isHigherTierUpgrade ? payableAmount : undefined);
                  }}
                >
                  {isPendingActivation ? (
                    <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider uppercase">
                      Activate Assigned Plan First
                    </Text>
                  ) : isCurrentActive && !isHigherTierUpgrade ? (
                    <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider uppercase">
                      Plan Active {remainingDays > 0 ? `(${remainingDays} Days Left)` : ''}
                    </Text>
                  ) : (
                    <>
                      <Text className="text-black text-xs font-semibold tracking-wider mr-1 uppercase">
                        {isHigherTierUpgrade
                          ? `Upgrade Plan (₹${payableAmount})`
                          : `Choose Plan (₹${payableAmount})`}
                      </Text>
                      <CaretRight size={15} color="#000000" weight="bold" />
                    </>
                  )}
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
