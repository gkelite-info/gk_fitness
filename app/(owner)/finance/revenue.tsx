import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, CaretDown, CurrencyInr, CaretRight, Lightning, CreditCard, Money, Buildings, CalendarBlank } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useGymPayments } from '@/hooks/useGymPayments';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function RevenueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, gymId } = useUser();

  const { data: customersData, refetch: refetchCustomers } = useGymCustomers(gymId ?? undefined);
  const { data: membershipPlans, refetch: refetchPlans } = useMembershipPlans(gymId ?? null);
  const { data: customerPlans, refetch: refetchCustomerPlans } = useGymCustomerMembershipPlans(gymId ?? undefined);
  const { data: allPayments, refetch: refetchPayments } = useGymPayments(userId);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchCustomers(),
      refetchPlans(),
      refetchCustomerPlans(),
      refetchPayments()
    ]);
    setRefreshing(false);
  };

  const {
    todaysRevenue,
    revenueByPlan,
    methodRevenues,
    recentPayments
  } = useMemo(() => {
    let todaysRev = 0;
    const planRevenues: Record<string, number> = {};
    const methodRevs = {
      upi: 0,
      card: 0,
      cash: 0,
      netBanking: 0,
    };
    const recentTx: any[] = [];

    if (membershipPlans) {
      membershipPlans.forEach(plan => {
        planRevenues[plan.id] = 0;
      });
    }

    const now = new Date();
    const todayStr = now.toDateString();

    // Use allPayments as primary revenue source (paymentDate = actual transaction date)
    if (allPayments) {
      const todaysPayments = allPayments.filter((payment: any) => {
        const pDate = new Date(payment.paymentDate);
        return pDate.toDateString() === todayStr;
      });

      todaysPayments.forEach((payment: any) => {
        const amount = payment.amountPaid || 0;
        if (amount > 0) {
          todaysRev += amount;

          if (payment.planId) {
            if (planRevenues[payment.planId] === undefined) {
              planRevenues[payment.planId] = 0;
            }
            planRevenues[payment.planId] += amount;
          }

          const method = (payment.paymentMethod || '').toLowerCase();
          if (method.includes('upi') || method.includes('gpay') || method.includes('phonepe') || method.includes('paytm') || method.includes('qr')) {
            methodRevs.upi += amount;
          } else if (method.includes('card')) {
            methodRevs.card += amount;
          } else if (method.includes('net') || method.includes('bank')) {
            methodRevs.netBanking += amount;
          } else {
            methodRevs.cash += amount;
          }

          const customer = customersData?.find(c => c.customerId === payment.customerId);
          const plan = membershipPlans?.find(p => p.id === payment.planId);
          
          let txDate = new Date(payment.paymentDate);
          let timeStr = payment.paymentTime || '';
          if (payment.paymentDate && payment.paymentTime) {
            txDate = new Date(`${payment.paymentDate}T${payment.paymentTime}`);
            if (!isNaN(txDate.getTime())) {
              timeStr = txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }
          }
          
          recentTx.push({
            id: payment.gymPaymentId,
            name: customer?.fullName || 'Unknown Customer',
            plan: plan?.name || 'Unknown Plan',
            price: amount,
            time: timeStr,
            img: customer?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer?.fullName || 'User')}&background=random`,
            rawDate: txDate,
          });
        }
      });
    }

    const formattedRevenueByPlan = Object.keys(planRevenues).map(planId => {
      const planInfo = membershipPlans?.find(p => p.id === planId);
      return {
        planId,
        planName: planInfo?.name || 'Unknown Plan',
        revenue: planRevenues[planId],
      };
    }).sort((a, b) => b.revenue - a.revenue);

    recentTx.sort((a, b) => {
      const dA = a.rawDate instanceof Date && !isNaN(a.rawDate.valueOf()) ? a.rawDate.valueOf() : 0;
      const dB = b.rawDate instanceof Date && !isNaN(b.rawDate.valueOf()) ? b.rawDate.valueOf() : 0;
      return dB - dA;
    });

    return {
      todaysRevenue: todaysRev,
      revenueByPlan: formattedRevenueByPlan,
      methodRevenues: methodRevs,
      recentPayments: recentTx.slice(0, 10),
    };
  }, [allPayments, customerPlans, membershipPlans, customersData]);

  const colors = ['#84CC16', '#A855F7', '#71717A', '#F97316', '#3B82F6'];

  const formatCurrency = (val: number) => {
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#27272A]">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4">
            <CaretLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xl font-semibold text-white tracking-wide">Today&apos;s Revenue</Text>
        </View>
        <Pressable className="flex-row items-center bg-[#18181B] px-3 py-2 rounded-xl border border-[#27272A]">
          <CalendarBlank size={14} color="#8E8E93" />
          <Text className="text-white text-xs mx-2">Today</Text>
          <CaretDown size={14} color="#8E8E93" />
        </Pressable>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-5 mt-6 mb-8">
          <View className="bg-[#121214] rounded-3xl p-6 flex-row items-center">
            <View className="w-16 h-16 rounded-full bg-[#166534]/30 items-center justify-center mr-5">
              <CurrencyInr size={28} color="#22C55E" weight="bold" />
            </View>
            <View>
              <Text className="text-[#8E8E93] text-xs mb-1">Today&apos;s Revenue</Text>
              <Text className="text-white text-4xl font-semibold">{formatCurrency(todaysRevenue)}</Text>
            </View>
          </View>
        </View>

        <View className="px-5 mb-8">
          <Text className="text-[#8E8E93] font-medium text-sm mb-4">Revenue by Membership Plan</Text>
          <View className="bg-[#121214] rounded-3xl">
            {revenueByPlan.length > 0 ? revenueByPlan.map((plan, index) => (
              <View key={plan.planId} className={`flex-row items-center justify-between p-5 ${index < revenueByPlan.length - 1 ? 'border-b border-[#27272A]' : ''}`}>
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-full mr-4" style={{ backgroundColor: colors[index % colors.length] }} />
                  <Text className="text-white font-semibold text-sm">{plan.planName}</Text>
                </View>
                <Text className="text-white font-semibold text-sm">{formatCurrency(plan.revenue)}</Text>
              </View>
            )) : (
              <View className="p-5 items-center">
                <Text className="text-[#8E8E93] text-sm">No revenue today</Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-5 mb-8">
          <Text className="text-[#8E8E93] font-medium text-sm mb-4">Payment Methods</Text>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            <View className="w-[48%] bg-[#121214] rounded-3xl p-4 items-center">
              <Lightning size={24} color="#22C55E" weight="bold" style={{ marginBottom: 8 }} />
              <Text className="text-[#8E8E93] text-xs mb-1">UPI</Text>
              <Text className="text-white font-semibold text-sm">{formatCurrency(methodRevenues.upi)}</Text>
            </View>

            <View className="w-[48%] bg-[#121214] rounded-3xl p-4 items-center">
              <CreditCard size={24} color="#A855F7" weight="bold" style={{ marginBottom: 8 }} />
              <Text className="text-[#8E8E93] text-xs mb-1">Card</Text>
              <Text className="text-white font-semibold text-sm">{formatCurrency(methodRevenues.card)}</Text>
            </View>

            <View className="w-[48%] bg-[#121214] rounded-3xl p-4 items-center">
              <Money size={24} color="#F97316" weight="bold" style={{ marginBottom: 8 }} />
              <Text className="text-[#8E8E93] text-xs mb-1">Cash</Text>
              <Text className="text-white font-semibold text-sm">{formatCurrency(methodRevenues.cash)}</Text>
            </View>

            <View className="w-[48%] bg-[#121214] rounded-3xl p-4 items-center">
              <Buildings size={24} color="#3B82F6" weight="bold" style={{ marginBottom: 8 }} />
              <Text className="text-[#8E8E93] text-xs mb-1">Net Banking</Text>
              <Text className="text-white font-semibold text-sm">{formatCurrency(methodRevenues.netBanking)}</Text>
            </View>
          </View>
        </View>

        <View className="px-5 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[#8E8E93] font-medium text-sm">Recent Payments</Text>
            <Pressable className="flex-row items-center" onPress={() => router.push('/(owner)/dashboard/payments')}>
              <Text className="text-[#C4EF00] text-xs font-semibold mr-1">View All</Text>
              <CaretRight size={12} color="#C4EF00" weight="bold" />
            </Pressable>
          </View>

          <View className="gap-6">
            {recentPayments.length > 0 ? recentPayments.map((tx, idx) => (
              <View key={tx.id || idx} className="flex-row justify-between items-center">
                <View className="flex-row items-center flex-1 mr-2">
                  <Image source={{ uri: tx.img }} className="w-11 h-11 rounded-full mr-3 bg-[#27272A]" />
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-sm" numberOfLines={1}>{tx.name}</Text>
                    <Text className="text-[#8E8E93] text-[10px] mt-0.5" numberOfLines={1}>{tx.plan}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-[#8E8E93] text-[10px] mb-0.5">{tx.time}</Text>
                  <Text className="text-white font-semibold text-sm">{formatCurrency(tx.price)}</Text>
                </View>
              </View>
            )) : (
              <View className="items-center py-4">
                <Text className="text-[#8E8E93] text-sm">No recent payments</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
