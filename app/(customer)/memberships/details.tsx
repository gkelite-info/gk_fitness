import React, { useMemo, useState, useEffect } from 'react';
import { View, Pressable, Dimensions, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useCustomerGymPaymentsPaginated } from '@/hooks/useGymPayments';
import {
  CaretLeft,
  Crown,
  CaretRight,
  Barbell,
  UserCircle,
  LockKey,
  Users,
  Ruler,
  AppleLogo,
  Calendar,
  Wallet,
  FileText,
  CheckCircle
} from 'phosphor-react-native';

const { width } = Dimensions.get('window');

export default function MembershipDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const benefits = [
    { icon: <Barbell size={20} color="#CCFF00" weight="fill" />, title: 'Unlimited\nGym Access' },
    { icon: <UserCircle size={20} color="#CCFF00" weight="fill" />, title: '12 PT Sessions\n/ Month' },
    { icon: <LockKey size={20} color="#CCFF00" weight="fill" />, title: 'Locker\nAccess' },
    { icon: <Users size={20} color="#CCFF00" weight="fill" />, title: 'Group\nClasses' },
    { icon: <Ruler size={20} color="#CCFF00" weight="fill" />, title: 'Monthly Body\nAssessment' },
    { icon: <AppleLogo size={20} color="#CCFF00" weight="fill" />, title: 'Nutrition\nConsultation' },
  ];

  const { userId } = useUser();
  const { data: plans, isLoading: isCustomerPlansLoading } = useGymCustomerMembershipPlans(undefined, userId ?? undefined);
  const { data: customerProfileData } = useCustomerProfile(userId);

  const currentPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans[0];
  }, [plans]);

  const gymId = currentPlan?.gymId || customerProfileData?.customerData?.gymId;

  const { data: gymPlans, isLoading: isGymPlansLoading } = useMembershipPlans(gymId || null);

  const activePlanDetails = useMemo(() => {
    if (!gymPlans || !currentPlan) return null;
    return gymPlans.find(p => p.id === currentPlan.planId);
  }, [gymPlans, currentPlan]);

  const validUntil = currentPlan?.endDate
    ? new Date(currentPlan.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '--';

  let remainingDays = 0;
  if (currentPlan?.endDate) {
    const diffTime = new Date(currentPlan.endDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    remainingDays = diffDays > 0 ? diffDays : 0;
  }

  const isExpired = currentPlan?.endDate ? new Date(currentPlan.endDate) < new Date() : false;
  const statusLabel = isExpired ? 'EXPIRED' : (currentPlan?.is_Active ? 'ACTIVE' : 'INACTIVE');
  const statusColor = isExpired ? '#EF4444' : (currentPlan?.is_Active ? '#22C55E' : '#9CA3AF');
  const statusBg = isExpired ? 'bg-[#EF4444]/10' : (currentPlan?.is_Active ? 'bg-[#22C55E]/10' : 'bg-[#9CA3AF]/10');

  const planName = activePlanDetails?.name || currentPlan?.plan?.planName || 'Free Plan';

  const getFeatureIcon = (feature: string) => {
    const lower = feature.toLowerCase();
    if (lower.includes('access') || lower.includes('gym')) return <Barbell size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('pt') || lower.includes('trainer') || lower.includes('session')) return <UserCircle size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('locker')) return <LockKey size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('class') || lower.includes('group')) return <Users size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('body') || lower.includes('assessment') || lower.includes('progress')) return <Ruler size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('nutrition') || lower.includes('diet') || lower.includes('recipe')) return <AppleLogo size={20} color="#CCFF00" weight="fill" />;
    return <CheckCircle size={20} color="#CCFF00" weight="fill" />;
  };

  const dynamicBenefits = activePlanDetails?.features?.map(f => ({
    icon: getFeatureIcon(f),
    title: f
  })) || benefits;

  const handleOnclick = () => {
    router.push('/(customer)/memberships' as any);
  }

  const handleRenew = () => {
    router.push({
      pathname: '/(customer)/memberships/review',
      params: { planId: currentPlan?.planId }
    } as any);
  }

  const [page, setPage] = useState(1);
  const limit = 10;
  const [accumulatedLogs, setAccumulatedLogs] = useState<any[]>([]);

  const { data: paginatedPayments, isLoading: isPaymentsLoading, isFetching: isPaymentsFetching } = useCustomerGymPaymentsPaginated(userId, page, limit);

  useEffect(() => {
    if (paginatedPayments?.data) {
      if (page === 1) {
        setAccumulatedLogs(paginatedPayments.data);
      } else {
        setAccumulatedLogs((prev) => {
          const prevIds = new Set(prev.map((l) => l.gymPaymentId));
          const newUnique = paginatedPayments.data.filter((l) => !prevIds.has(l.gymPaymentId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [paginatedPayments, page]);

  const lastPayment = accumulatedLogs.length > 0
    ? `₹${accumulatedLogs[0].amountPaid}`
    : (currentPlan?.customAmount ? `₹${currentPlan.customAmount}` : '₹0');

  const totalPayments = paginatedPayments?.total || 0;
  const hasMore = accumulatedLogs.length < totalPayments;

  if (isCustomerPlansLoading || isGymPlansLoading || (isPaymentsLoading && page === 1)) {
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#0A0A0A] justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#1C1C1E]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#FFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Membership</Text>
        <View className="w-10 h-10" />
      </View>

      <FlatList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        data={accumulatedLogs}
        keyExtractor={(item) => item.gymPaymentId}
        onEndReached={() => {
          if (hasMore && !isPaymentsFetching) {
            setPage(p => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            <View className="bg-[#121212] rounded-3xl border border-[#2A2A2A] p-5 mb-8 relative">
              <View className="flex-row justify-between mb-6">
                <View className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/30 items-center justify-center">
                  <Crown size={32} color="#FFD700" weight="fill" />
                </View>
                <View className="items-end">
                  <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-wider mb-1 uppercase">Valid Until</Text>
                  <Text className="text-[#FFD700] text-sm font-semibold">{validUntil}</Text>
                </View>
              </View>

              <View className="flex-row justify-between items-end mb-6">
                <View>
                  <View className={`${statusBg} self-start px-2 py-1 rounded-full flex-row items-center mb-2`}>
                    <View className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: statusColor }} />
                    <Text style={{ color: statusColor }} className="text-[10px] font-semibold tracking-widest">{statusLabel}</Text>
                  </View>
                  <Text className="text-white text-2xl font-semibold">{planName}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[#9CA3AF] text-[10px] font-semibold tracking-wider mb-0.5 uppercase">Remaining</Text>
                  <View className="flex-row items-baseline">
                    <Text className="text-[#CCFF00] text-4xl font-semibold">{remainingDays}</Text>
                    <Text className="text-white text-sm font-semibold ml-1">Days</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-3">
                <Pressable onPress={handleRenew} className="flex-1 bg-[#CCFF00] rounded-xl py-3.5 flex-row items-center justify-center active:opacity-80">
                  <Text className="text-black text-sm font-semibold mr-1">Renew Membership</Text>
                  <CaretRight size={14} color="#000" weight="bold" />
                </Pressable>
                <Pressable
                  className="flex-1 bg-transparent border border-[#CCFF00]/50 rounded-xl py-3.5 items-center justify-center active:opacity-80"
                  onPress={handleOnclick}
                >
                  <Text className="text-[#CCFF00] text-sm font-semibold">Change Plan</Text>
                </Pressable>
              </View>
            </View>

            <Text className="text-white text-lg font-semibold mb-4">Membership Benefits</Text>
            <View className="flex-row flex-wrap justify-between mb-8">
              {dynamicBenefits.map((benefit, index) => (
                <View key={index} className="w-[48%] bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 flex-row items-center mb-3">
                  <View className="w-8 h-8 rounded-full bg-[#CCFF00]/10 items-center justify-center mr-3">
                    {benefit.icon}
                  </View>
                  <Text className="text-white text-[11px] font-medium leading-tight flex-1">{benefit.title}</Text>
                </View>
              ))}
            </View>

            <Text className="text-white text-lg font-semibold mb-4">Membership Usage</Text>
            <View className="flex-row justify-between mb-8">
              <View className="flex-1 bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 mr-2 relative overflow-hidden">
                <View className="flex-row items-center mb-4">
                  <View className="w-5 h-5 rounded-full bg-[#CCFF00]/10 items-center justify-center mr-2">
                    <UserCircle size={12} color="#CCFF00" weight="fill" />
                  </View>
                  <Text className="text-[#9CA3AF] text-[8px] font-semibold tracking-widest uppercase">PT Sessions Left</Text>
                </View>
                <Text className="text-white text-lg font-semibold mb-3">0</Text>
                <View className="w-full h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <View className="h-full bg-[#CCFF00]" style={{ width: '66%' }} />
                </View>
              </View>

              <View className="flex-1 bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 mr-2">
                <View className="flex-row items-center mb-4">
                  <View className="w-5 h-5 rounded-md bg-[#CCFF00]/10 items-center justify-center mr-2">
                    <Calendar size={12} color="#CCFF00" weight="fill" />
                  </View>
                  <Text className="text-[#9CA3AF] text-[8px] font-semibold tracking-widest uppercase">Next Renewal</Text>
                </View>
                <Text className="text-[#CCFF00] text-sm font-semibold mt-1">{validUntil}</Text>
              </View>

              <View className="flex-1 bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4">
                <View className="flex-row items-center mb-4">
                  <View className="w-5 h-5 rounded-md bg-[#CCFF00]/10 items-center justify-center mr-2">
                    <Wallet size={12} color="#CCFF00" weight="fill" />
                  </View>
                  <Text className="text-[#9CA3AF] text-[8px] font-semibold tracking-widest uppercase">Last Payment</Text>
                </View>
                <Text className="text-[#CCFF00] text-sm font-semibold mt-1">{lastPayment}</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-semibold">Recent Payments</Text>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const formattedDate = new Date(item.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          const isSuccess = true;

          return (
            <View className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-[#1F2937] items-center justify-center mr-4">
                  <FileText size={20} color="#9CA3AF" weight="fill" />
                </View>
                <Text className="text-white text-sm font-semibold">{formattedDate}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white text-sm font-semibold mr-4">₹{item.amountPaid}</Text>
                <View className="flex-row items-center">
                  <CheckCircle size={14} color="#22C55E" weight="fill" />
                  <Text className="text-[#22C55E] text-[10px] font-semibold ml-1 uppercase">SUCCESSFUL</Text>
                </View>
                <CaretRight size={16} color="#9CA3AF" style={{ marginLeft: 3 }} />
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          isPaymentsFetching && page > 1 ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#CCFF00" />
            </View>
          ) : !hasMore && accumulatedLogs.length > 0 ? (
            <View className="py-6 items-center">
              <Text className="text-[#666666] text-xs font-sans">You've reached the end of the payments</Text>
            </View>
          ) : accumulatedLogs.length === 0 && !isPaymentsFetching ? (
            <View className="py-6 items-center">
              <Text className="text-[#666666] text-xs font-sans">No recent payments found.</Text>
            </View>
          ) : null
        }
      />

      <View style={{ marginBottom: (insets.bottom || 0) + 60 }} className="p-5 bg-[#0A0A0A] border-t border-[#1C1C1E]">
        <Pressable onPress={handleRenew} className="bg-[#CCFF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80">
          <Text className="text-black text-base font-semibold mr-2">Renew Membership</Text>
          <CaretRight size={16} color="#000" weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}
