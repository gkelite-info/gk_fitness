import React, { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info, CheckCircle, Crown, Star, Diamond, CaretRight, XCircle } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerMediumHaptic } from '@/lib/haptics';

export default function MembershipsScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: plans, isLoading, refetch: refetchPlans } = useGymCustomerMembershipPlans(undefined, userId!);
  const { data: customerProfileData, refetch: refetchProfile } = useCustomerProfile(userId);

  const currentPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans[0];
  }, [plans]);

  const gymId = currentPlan?.gymId || customerProfileData?.customerData?.gymId;

  const { data: gymPlans, isLoading: isGymPlansLoading, refetch: refetchGymPlans } = useMembershipPlans(gymId || null);

  const onRefresh = useCallback(async () => {
    triggerMediumHaptic();
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPlans(),
        refetchProfile(),
        refetchGymPlans()
      ]);
    } catch (error) {
      console.error('[Memberships] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPlans, refetchProfile, refetchGymPlans]);

  const upgradeOptions = useMemo(() => {
    if (!gymPlans) return [];
    return gymPlans;
  }, [gymPlans]);

  const isExpired = currentPlan?.endDate ? new Date(currentPlan.endDate) < new Date() : false;
  const statusLabel = isExpired ? 'Expired' : (currentPlan?.is_Active ? 'Active' : 'Inactive');
  const statusColor = isExpired ? '#EF4444' : (currentPlan?.is_Active ? '#CCFF00' : '#8E8E93');
  const planName = currentPlan?.plan?.planName || 'Free Plan';
  const planAmount = currentPlan?.customAmount ? `₹${currentPlan.customAmount}` : '₹0';

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A] pb-28">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#1C1C1E]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
          <ArrowLeft size={24} color="#FFF" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-white text-lg font-semibold">Upgrade Membership</Text>
          <Text className="text-[#9CA3AF] text-[11px] mt-0.5">Choose a plan that fits your fitness goals</Text>
        </View>
        {/* <Pressable className="w-10 h-10 items-center justify-center -mr-2 active:opacity-70">
          <Info size={24} color="#9CA3AF" />
        </Pressable> */}
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-widest mb-3">YOUR CURRENT PLAN</Text>

        {isLoading ? (
          <View className="bg-[#1C1C1E] rounded-3xl p-8 mb-8 items-center justify-center border border-[#27272A]">
            <ActivityIndicator size="small" color="#CCFF00" />
          </View>
        ) : (
          <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-8 flex-row items-center border border-[#27272A]">
            <View className="w-16 h-16 rounded-2xl bg-[#EAB308] items-center justify-center mr-4">
              <Crown size={32} color="#FFF" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-semibold mb-1">{planName}</Text>
              <View className="flex-row items-baseline mb-2">
                <Text className="text-white text-lg font-semibold">{planAmount}</Text>
                <Text className="text-[#9CA3AF] text-xs ml-1">Month</Text>
              </View>
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
        )}

        <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-widest mb-3">AVAILABLE PLANS</Text>

        {isGymPlansLoading ? (
          <View className="py-8 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
          </View>
        ) : (
          upgradeOptions.map((plan, index) => {
            const isFirst = index % 2 === 0;
            const isSelected = selectedPlanId === plan.id;
            const containerStyle = isSelected
              ? "bg-[#1C1C1E] rounded-3xl border-2 border-[#CCFF00] p-5 mb-6 relative overflow-hidden"
              : "bg-[#1C1C1E] rounded-3xl p-5 mb-6 border border-[#27272A]";
            const iconBg = isFirst ? "bg-[#9CA3AF]" : "bg-[#9D4CE9]";
            const checkColor = isFirst ? "#CCFF00" : "#9D4CE9";
            const buttonStyle = isFirst
              ? "bg-[#CCFF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80 border-2 border-[#CCFF00]"
              : "bg-transparent border-2 border-[#CCFF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80";
            const buttonTextStyle = isFirst ? "text-black text-[15px] font-semibold mr-2" : "text-[#CCFF00] text-[15px] font-semibold mr-2";
            const caretColor = isFirst ? "#000" : "#CCFF00";

            const isCurrentPlan = plan.id === currentPlan?.planId;
            const actionText = isCurrentPlan ? `Renew ${plan.name}` : `Change to ${plan.name}`;

            return (
              <Pressable key={plan.id} className={containerStyle} onPress={() => setSelectedPlanId(plan.id)}>
                <View className="flex-row items-center mb-6">
                  <View className={`w-16 h-16 rounded-2xl ${iconBg} items-center justify-center mr-4`}>
                    <Crown size={32} color="#FFF" weight="regular" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-white text-2xl font-semibold mr-2">{plan.name}</Text>
                      {isFirst ? (
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

                <View className="mb-6">
                  {plan.features.map((feature, fIndex) => (
                    <View key={fIndex} className={`flex-row items-center ${fIndex !== plan.features.length - 1 ? 'mb-3' : 'mb-1'}`}>
                      <CheckCircle size={18} color={checkColor} weight="regular" />
                      <Text className="text-white text-sm ml-3">{feature}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={() => router.push({ pathname: '/(customer)/memberships/review', params: { planId: plan.id } })}
                  className={buttonStyle}
                >
                  <Text className={buttonTextStyle}>{actionText}</Text>
                  <CaretRight size={16} color={caretColor} weight="bold" />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
