import React, { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: plans, isLoading, refetch: refetchPlans } = useGymCustomerMembershipPlans(undefined, userId ?? undefined);
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
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#1C1C1E]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
          <ArrowLeft size={24} color="#FFF" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-white text-lg font-semibold">Gym Membership</Text>
          <Text className="text-[#9CA3AF] text-[11px] mt-0.5">Physical Gym Access & Companion Plan</Text>
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
        {/* Physical Gym Notice Banner */}
        <View className="bg-[#1C1C1E] border border-[#CCFF00]/30 rounded-2xl p-4 mb-6 flex-row items-start">
          <Info size={22} color="#CCFF00" weight="fill" style={{ marginTop: 2, marginRight: 12 }} />
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-1">Physical Gym Membership</Text>
            <Text className="text-[#9CA3AF] text-xs leading-4">
              Membership plans cover entry and access to physical gym facilities, fitness equipment, and in-person trainer guidance. Memberships are assigned, upgraded, or renewed in-person at your gym reception counter.
            </Text>
          </View>
        </View>

        <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-widest mb-3 uppercase">YOUR CURRENT PLAN</Text>

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
                <Text className="text-[#9CA3AF] text-xs ml-1">/ Month (Paid Offline at Gym)</Text>
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

        <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-widest mb-3 uppercase">AVAILABLE GYM PLANS</Text>

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

            return (
              <Pressable key={plan.id} className={containerStyle} onPress={() => setSelectedPlanId(plan.id)}>
                <View className="flex-row items-center mb-5">
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

                <View className="mb-4">
                  <View className="flex-row items-center mb-3">
                    <CheckCircle size={18} color={checkColor} weight="regular" />
                    <Text className="text-white text-sm ml-3">Full Access to Gym Facility & Equipment</Text>
                  </View>
                  {plan.features.map((feature, fIndex) => (
                    <View key={fIndex} className="flex-row items-center mb-3">
                      <CheckCircle size={18} color={checkColor} weight="regular" />
                      <Text className="text-white text-sm ml-3">{feature}</Text>
                    </View>
                  ))}
                </View>

                <View className="bg-[#27272A]/60 rounded-xl p-3 border border-[#3F3F46]">
                  <Text className="text-[#9CA3AF] text-xs text-center">
                    Renew or upgrade this plan directly at your gym desk.
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
