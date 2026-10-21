import React, { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info, CheckCircle, Crown, Star, Diamond, CaretRight, XCircle } from 'phosphor-react-native';
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

export default function MembershipsScreen() {
  const router = useRouter();
  const { userId, role } = useUser();
  const isIndividual = role === 'individual';
  const insets = useSafeAreaInsets();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: plans, isLoading: isGymCustomerPlansLoading, refetch: refetchPlans } = useGymCustomerMembershipPlans(
    undefined,
    !isIndividual && userId ? userId : undefined
  );
  const {
    data: individualCustomerPlans,
    isLoading: isIndivCustomerPlansLoading,
    refetch: refetchIndivCustomerPlans,
  } = useIndividualCustomerPlans(isIndividual && userId ? userId : undefined, undefined, {
    enabled: isIndividual && !!userId,
  });

  const { data: customerProfileData, refetch: refetchProfile } = useCustomerProfile(userId);

  const {
    data: individualSubscriptions,
    isLoading: isSubscriptionsLoading,
    refetch: refetchSubscriptions,
  } = useSubscriptions(undefined, 'customer', { enabled: isIndividual });

  const currentPlan = useMemo(() => {
    if (isIndividual) {
      if (!individualCustomerPlans || individualCustomerPlans.length === 0) return null;
      const first = individualCustomerPlans[0];
      return {
        planId: first.subscriptionPlanId,
        customAmount: first.customAmount,
        startDate: first.startDate,
        endDate: first.endDate,
        is_Active: first.isActive ?? true,
        plan: {
          planName: first.subscription?.planName || 'Individual Subscription',
        },
      };
    }

    if (!plans || plans.length === 0) return null;
    return plans[0];
  }, [isIndividual, individualCustomerPlans, plans]);

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

        return {
          id: sub.subscriptionPlanId,
          name: sub.planName,
          priceFormatted: `₹${sub.price ?? 0}`,
          priceNumeric: String(sub.price ?? 0),
          billingCycle: '/ Month',
          duration: '1 Month',
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

  const isExpired = currentPlan?.endDate ? new Date(currentPlan.endDate) < new Date() : false;
  const statusLabel = isExpired ? 'Expired' : (currentPlan?.is_Active ? 'Active' : 'Inactive');
  const statusColor = isExpired ? '#EF4444' : (currentPlan?.is_Active ? '#CCFF00' : '#8E8E93');
  const planName = currentPlan?.plan?.planName || 'Basic Membership';
  const planAmount = currentPlan?.customAmount ? `₹${currentPlan.customAmount}` : '₹0';

  const openWebCheckout = async (targetPlanId?: string | null, targetPlanName?: string | null) => {
    triggerMediumHaptic();
    try {
      let session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshData?.session) {
          session = refreshData.session;
        } else {
          console.warn('[Memberships] Token refresh warning:', refreshErr?.message);
        }
      }

      if (!session?.access_token) {
        Alert.alert(
          'Login Required',
          'Your session has expired. Please log in again to continue.',
          [
            {
              text: 'Log In',
              onPress: () => router.replace('/auth/otp-auth' as any),
            },
          ]
        );
        return;
      }

      const webHost = process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://www.gkgymlife.com';
      const baseUrl = `${webHost}/api/auth/sso`;
      const params = new URLSearchParams();

      params.append('returnTo', '/customer');
      if (Platform.OS !== 'ios') {
        params.append('action', isIndividual ? 'subscribe' : 'renew');
        if (targetPlanId) params.append('planId', targetPlanId);
        if (targetPlanName) params.append('planName', targetPlanName);
      }
      if (userId) params.append('userId', userId);
      if (role) params.append('role', role);
      if (customerProfileData?.customerData?.customerId) {
        params.append('customerId', customerProfileData.customerData.customerId);
      }
      const gymIdVal = customerProfileData?.customerData?.gymId || gymId;
      if (gymIdVal) params.append('gymId', gymIdVal);

      const emailVal = session.user?.email || customerProfileData?.customerData?.email;
      const phoneVal = session.user?.phone || customerProfileData?.customerData?.phone;
      if (emailVal) params.append('email', emailVal);
      if (phoneVal) params.append('phone', phoneVal);

      params.append('access_token', session.access_token);
      if (session.refresh_token) {
        params.append('refresh_token', session.refresh_token);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const targetUrl = `${baseUrl}${queryString}`;

      await WebBrowser.openBrowserAsync(targetUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#0A0A0A',
        controlsColor: '#CCFF00',
      });
    } catch (err) {
      console.error('[Memberships] Error opening web browser:', err);
      try {
        const fallbackUrl = Platform.OS === 'ios'
          ? 'https://www.gkgymlife.com/customer'
          : `https://www.gkgymlife.com/customer?action=${isIndividual ? 'subscribe' : 'renew'}`;
        await Linking.openURL(fallbackUrl);
      } catch (linkErr) {
        Alert.alert('Error', 'Unable to open browser. Please visit https://www.gkgymlife.com/customer');
      }
    }
  };

  const handleRenewCurrentPlan = () => {
    openWebCheckout(currentPlan?.planId, planName);
  };

  const handleRenewPlan = (plan: any) => {
    setSelectedPlanId(plan.id);
    openWebCheckout(plan.id, plan.name);
  };

  const isPlansLoading = isIndividual ? isSubscriptionsLoading : isGymPlansLoading;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(customer)/profile');
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-[#1C1C1E]">
        <Pressable onPress={handleBack} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
          <ArrowLeft size={22} color="#FFF" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-white text-lg font-semibold">{isIndividual ? 'Subscription Plans' : 'Gym Membership'}</Text>
          <Text className="text-[#9CA3AF] text-[11px] mt-0.5">{isIndividual ? 'Fitness & Companion Membership' : 'Physical Gym Access & Companion Plan'}</Text>
        </View>
        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 100 }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="bg-[#1C1C1E] border border-[#CCFF00]/30 rounded-2xl p-4 mb-6 flex-row items-start">
          <Info size={22} color="#CCFF00" weight="fill" style={{ marginTop: 2, marginRight: 12 }} />
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-1">
              {isIndividual ? 'Individual Subscription' : 'Physical Gym Membership'}
            </Text>
            <Text className="text-[#9CA3AF] text-xs leading-4">
              {isIndividual
                ? 'Subscription plans provide full access to personalized workouts, diet plans, daily health tracking, and premium features on the mobile app.'
                : 'Membership plans cover entry and access to physical gym facilities, fitness equipment, and in-person trainer guidance. Memberships are assigned, upgraded, or renewed in-person at your gym reception counter.'}
            </Text>
          </View>
        </View>

        <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-widest mb-3 uppercase">
          {isIndividual ? 'YOUR CURRENT SUBSCRIPTION' : 'YOUR CURRENT PLAN'}
        </Text>

        {isLoading ? (
          <View className="bg-[#1C1C1E] rounded-3xl p-8 mb-8 items-center justify-center border border-[#27272A]">
            <ActivityIndicator size="small" color="#CCFF00" />
          </View>
        ) : currentPlan ? (
          <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-8 border border-[#27272A]">
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-2xl bg-[#EAB308] items-center justify-center mr-4">
                <Crown size={32} color="#FFF" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-xl font-semibold mb-1">{planName}</Text>
                {Platform.OS !== 'ios' && (
                  <View className="flex-row items-baseline mb-2">
                    <Text className="text-white text-lg font-semibold">{planAmount}</Text>
                    <Text className="text-[#9CA3AF] text-xs ml-1">/ Month</Text>
                  </View>
                )}
                <View className="flex-row items-center">
                  {statusLabel === 'Expired' || statusLabel === 'Inactive' ? (
                    <XCircle size={14} color={statusColor} weight="fill" />
                  ) : (
                    <CheckCircle size={14} color={statusColor} weight="fill" />
                  )}
                  <Text style={{ color: statusColor }} className="text-[11px] font-medium ml-1.5">{statusLabel}</Text>
                </View>
              </View>
            </View>

            {statusLabel !== 'Active' && (
              <Pressable
                className="bg-[#CCFF00] py-3.5 px-5 rounded-2xl flex-row items-center justify-center mt-4 active:opacity-80"
                onPress={() => handleRenewCurrentPlan()}
              >
                <Text className="text-black text-sm font-semibold tracking-wide mr-1 uppercase">
                  {Platform.OS === 'ios' ? 'MEMBERSHIP DETAILS' : 'RENEW PLAN'}
                </Text>
                <CaretRight size={16} color="#000000" weight="bold" />
              </Pressable>
            )}

            {statusLabel === 'Active' && currentPlan?.endDate && (
              <View className="mt-4 pt-3.5 border-t border-[#27272A] flex-row items-center justify-between">
                <Text className="text-[#9CA3AF] text-xs">Plan Validity</Text>
                <Text className="text-[#CCFF00] text-xs font-semibold">
                  Valid until {new Date(currentPlan.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            )}

            {Platform.OS === 'ios' && statusLabel !== 'Active' && (
              <Text className="text-[#9CA3AF] text-[11px] text-center mt-2.5">
                View your membership details and account profile securely on our web portal.
              </Text>
            )}
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

        {Platform.OS !== 'ios' && (
          <>
            <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-widest mb-3 uppercase">
              {isIndividual ? 'AVAILABLE SUBSCRIPTION PLANS' : 'OTHER AVAILABLE PLANS'}
            </Text>

            {isPlansLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="large" color="#CCFF00" />
              </View>
            ) : upgradeOptions.length === 0 ? (
              <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-8 border border-[#27272A] items-center">
                <Text className="text-[#9CA3AF] text-xs text-center">
                  {isIndividual
                    ? 'No subscription plans are currently available.'
                    : (statusLabel === 'Active'
                        ? 'You are currently on an active plan. No other plans are available.'
                        : 'No other gym plans are currently available. You can renew your current plan above.')}
                </Text>
              </View>
            ) : (
              upgradeOptions.map((plan: any, index: number) => {
                const isFirst = index % 2 === 0;
                const isSelected = selectedPlanId === plan.id;
                const containerStyle = isSelected
                  ? "bg-[#1C1C1E] rounded-3xl border-2 border-[#CCFF00] p-5 mb-6 relative overflow-hidden"
                  : "bg-[#1C1C1E] rounded-3xl p-5 mb-6 border border-[#27272A]";
                const iconBg = isFirst ? "bg-[#9CA3AF]" : "bg-[#9D4CE9]";
                const checkColor = isFirst ? "#CCFF00" : "#9D4CE9";

                return (
                  <Pressable key={plan.id} className={containerStyle} onPress={() => setSelectedPlanId(plan.id)}>
                    <View className="flex-row items-center mb-5">
                      <View className={`w-16 h-16 rounded-2xl ${iconBg} items-center justify-center mr-4`}>
                        <Crown size={32} color="#FFF" weight="regular" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="text-white text-2xl font-semibold mr-2">{plan.name}</Text>
                          {plan.label ? (
                            <View className="bg-[#CCFF00]/20 border border-[#CCFF00]/40 px-2 py-0.5 rounded-full mr-2">
                              <Text className="text-[#CCFF00] text-[10px] font-semibold uppercase">{plan.label}</Text>
                            </View>
                          ) : isFirst ? (
                            <Star size={16} color="#EAB308" weight="fill" />
                          ) : (
                            <Diamond size={16} color="#9D4CE9" weight="regular" />
                          )}
                        </View>
                        <View className="flex-row items-baseline mt-1">
                          <Text className="text-white text-xl font-semibold">{plan.priceFormatted}</Text>
                          <Text className="text-[#9CA3AF] text-sm ml-1">{plan.billingCycle}</Text>
                        </View>
                      </View>
                    </View>

                    <View className="mb-4">
                      {!isIndividual && (
                        <View className="flex-row items-center mb-3">
                          <CheckCircle size={18} color={checkColor} weight="regular" />
                          <Text className="text-white text-sm ml-3">Full Access to Gym Facility & Equipment</Text>
                        </View>
                      )}
                      {plan.features.map((feature: string, fIndex: number) => (
                        <View key={fIndex} className="flex-row items-center mb-3">
                          <CheckCircle size={18} color={checkColor} weight="regular" />
                          <Text className="text-white text-sm ml-3">{feature}</Text>
                        </View>
                      ))}
                    </View>

                    <Pressable
                      className="bg-[#CCFF00] py-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80"
                      onPress={() => handleRenewPlan(plan)}
                    >
                      <Text className="text-black text-sm font-semibold tracking-wide mr-1 uppercase">
                        {isIndividual ? 'SELECT PLAN' : (statusLabel === 'Active' ? 'UPGRADE PLAN' : 'RENEW PLAN')}
                      </Text>
                      <CaretRight size={16} color="#000000" weight="bold" />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
