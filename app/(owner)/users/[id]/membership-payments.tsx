import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CreditCard,
  Medal,
  CalendarBlank,
  Clock,
  Receipt,
  CaretRight,
  CheckCircle,
  CurrencyInr,
} from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useCustomerGymPayments } from '@/hooks/customerGymPayments/useCustomerGymPayments';
import { triggerLightHaptic } from '@/lib/haptics';

export default function UserMembershipPaymentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(id);
  const { data: plans = [], isLoading: isPlansLoading } = useGymCustomerMembershipPlans(
    customer?.gymId,
    id
  );
  const { data: payments = [], isLoading: isPaymentsLoading } = useCustomerGymPayments(
    customer?.gymId,
    id
  );

  const activePlan = useMemo(() => {
    return plans.find((p: any) => p.is_Active && !p.is_deleted) || plans[0] || null;
  }, [plans]);

  const memberCode = useMemo(() => {
    if (!id) return 'CUST-XXXX';
    return `CUST-${id.substring(0, 6).toUpperCase()}`;
  }, [id]);

  const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const planName = (activePlan as any)?.plan?.planName || (activePlan as any)?.planName || 'Standard Membership';
  const rawDuration = (activePlan as any)?.plan?.durationMonths || (activePlan as any)?.durationMonths || 1;
  const startDate = formatDate(activePlan?.startDate || activePlan?.createdAt);
  const endDate = formatDate(activePlan?.endDate);
  const isPlanActive = Boolean(activePlan?.is_Active);

  const isLoading = isCustomerLoading || isPlansLoading || isPaymentsLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading membership & payments...</Text>
      </View>
    );
  }

  const handleViewReceipt = (paymentId: string) => {
    triggerLightHaptic();
    router.push(`/(owner)/users/${id}/payment-details/${paymentId}` as any);
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1F1F22]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Membership & Payments</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Member Strip */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4 flex-row items-center justify-between">
          <View>
            <Text className="text-gray-400 text-xs">Member</Text>
            <Text className="text-white text-base font-bold mt-0.5">{customer?.fullName || 'Customer'}</Text>
          </View>
          <View className="bg-[#1C1F26] border border-[#2A2E38] px-3 py-1 rounded-lg">
            <Text className="text-[#CCF200] text-xs font-semibold">{memberCode}</Text>
          </View>
        </View>

        {/* Current Active Plan Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[#CCF200] text-xs font-bold uppercase tracking-wider">
              Membership Plan
            </Text>
            <View
              className={`px-2.5 py-0.5 rounded-md ${
                isPlanActive ? 'bg-[#373F0E]' : 'bg-[#4A1D1D]'
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isPlanActive ? 'text-[#CCF200]' : 'text-[#FFB6C1]'
                }`}
              >
                {isPlanActive ? 'Active Plan' : 'Expired'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 rounded-xl bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-3">
              <Medal size={24} color="#CCF200" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold">{planName}</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Duration: {rawDuration} Month(s)</Text>
            </View>
          </View>

          <View className="pt-3 border-t border-[#222226] flex-row justify-between">
            <View>
              <Text className="text-gray-400 text-xs">Start Date</Text>
              <Text className="text-white text-xs font-semibold mt-1">{startDate}</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-xs">Valid Until</Text>
              <Text className="text-[#CCF200] text-xs font-semibold mt-1">{endDate}</Text>
            </View>
          </View>
        </View>

        {/* Payment History List */}
        <Text className="text-[#CCF200] text-xs font-bold uppercase tracking-wider mt-6 mb-3">
          Payment Transactions ({payments.length})
        </Text>

        {payments.length === 0 ? (
          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-8 items-center mt-2">
            <Receipt size={32} color="#666" />
            <Text className="text-white text-sm font-semibold mt-3">No Payments Recorded</Text>
            <Text className="text-gray-400 text-xs text-center mt-1">
              No gym payments have been registered for this customer yet.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {payments.map((payment: any, index: number) => {
              const paymentId = payment.customerPaymentId || payment.gymPaymentId || `pay-${index}`;
              const formattedDate = formatDate(payment.createdAt || payment.paymentDate);
              const formattedAmount = (payment.amountPaid || payment.amount || 0).toLocaleString('en-IN');
              const method = (payment.paymentMethod || 'UPI').toUpperCase();
              const isSuccess = (payment.status?.toUpperCase() === 'SUCCESSFUL' || payment.status?.toUpperCase() === 'SUCCESS' || !payment.status);

              return (
                <Pressable
                  key={paymentId}
                  onPress={() => handleViewReceipt(paymentId)}
                  className="bg-[#141416] border border-[#242424] rounded-2xl p-4 active:bg-[#1E1E22] active:border-[#CCF200]/30"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="w-9 h-9 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3">
                        <Receipt size={18} color="#CCF200" />
                      </View>
                      <View>
                        <Text className="text-white text-sm font-bold">
                          {payment.plan?.planName || planName}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-0.5">{formattedDate}</Text>
                      </View>
                    </View>

                    <Text className="text-[#CCF200] text-base font-bold">
                      ₹{formattedAmount}
                    </Text>
                  </View>

                  <View className="pt-3 border-t border-[#222226] flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="bg-[#1C1F26] px-2 py-0.5 rounded border border-[#2A2E38]">
                        <Text className="text-gray-300 text-[10px] font-bold">{method}</Text>
                      </View>
                      <View
                        className={`px-2 py-0.5 rounded ${
                          isSuccess ? 'bg-[#373F0E]' : 'bg-[#4A1D1D]'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            isSuccess ? 'text-[#CCF200]' : 'text-[#FFB6C1]'
                          }`}
                        >
                          {isSuccess ? 'Verified' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center">
                      <Text className="text-gray-400 text-xs font-semibold mr-1">Receipt</Text>
                      <CaretRight size={14} color="#71717A" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
