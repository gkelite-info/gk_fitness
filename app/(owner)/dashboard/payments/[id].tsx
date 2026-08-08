import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { toast } from '@/lib/toast';
import { CaretLeft, User, CalendarBlank, CurrencyInr, Wallet, Receipt, Clock, ShieldCheck, DownloadSimple, ShareNetwork, Copy, CopySimple, ChatCircleText, CheckCircle, CaretRight } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymPayments } from '@/hooks/useGymPayments';

// Re-use badge or define a simple one
const PaymentMethodBadge = ({ method }: { method: string }) => {
  return (
    <View className="border border-[#CCF200] px-2 py-0.5 rounded-sm items-center justify-center">
      <Text className="text-[10px] font-semibold text-[#CCF200] uppercase tracking-wider">{method}</Text>
    </View>
  );
};

export default function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useUser();
  const { data: payments = [], isLoading } = useGymPayments(userId);

  const rawPayment = payments.find((p: any) => p.gymPaymentId === id);

  // Get initials for Avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleDownload = () => {
    toast.success('The receipt is downloading...');
  };

  const handleShare = () => {
    toast.success('Sharing receipt options...');
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <Text className="text-[#CCF200] font-semibold">Loading...</Text>
      </View>
    );
  }

  if (!rawPayment) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <Text className="text-white text-lg font-semibold">Payment not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-3 bg-[#1A1A1A] rounded-lg">
          <Text className="text-[#CCF200] font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const payment = {
    memberName: rawPayment.gym_customers?.fullName || 'Unknown',
    memberId: (rawPayment.customerId || '00000000').substring(0, 8).toUpperCase(),
    membershipPlan: rawPayment.gym_membership_plans?.planName || 'Unknown',
    duration: `${rawPayment.gym_membership_plans?.durationMonths || 1} Month(s)`,
    amount: rawPayment.amountPaid || 0,
    method: rawPayment.paymentMethod || 'cash',
    transactionId: rawPayment.transactionId || 'N/A',
    date: rawPayment.paymentDate,
    time: rawPayment.paymentTime,
    status: 'completed',
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-[#1A1A1A] rounded-full items-center justify-center active:opacity-70">
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Payment Details</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>

        {/* Profile Avatar & Info */}
        <View className="items-center mt-6 mb-8">
          <View className="w-20 h-20 rounded-full border border-[#4d5c00] items-center justify-center mb-4">
            <Text className="text-[#CCF200] text-2xl font-semibold">{getInitials(payment.memberName)}</Text>
          </View>
          <Text className="text-white text-2xl font-semibold mb-2">{payment.memberName}</Text>
          <View className="bg-[#141414] border border-[#27272A] rounded-full flex-row items-center px-3 py-1.5">
            <User size={12} color="#CCF200" weight="fill" />
            <Text className="text-[#888888] text-[10px] font-semibold tracking-wider ml-2 uppercase">MEMBER ID: {payment.memberId}</Text>
          </View>
        </View>

        {/* Details Card */}
        <View className="bg-[#121214] border border-[#27272A] rounded-3xl p-5 mb-5">
          {/* Membership Plan */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <User size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Membership Plan</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{payment.membershipPlan} Membership</Text>
          </View>

          {/* Plan Duration */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <CalendarBlank size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Plan Duration</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{payment.duration}</Text>
          </View>

          {/* Amount Paid */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <CurrencyInr size={18} color="#CCF200" weight="bold" />
              <Text className="text-[#888888] text-sm font-medium">Amount Paid</Text>
            </View>
            <Text className="text-white text-sm font-semibold">₹{payment.amount.toLocaleString()}</Text>
          </View>

          {/* Payment Method */}
          <View className="flex-row items-center justify-between mb-6 border-b border-[#27272A] pb-6">
            <View className="flex-row items-center gap-3">
              <Wallet size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Payment Method</Text>
            </View>
            <PaymentMethodBadge method={payment.method === 'gpay' ? 'UPI' : payment.method} />
          </View>

          {/* Transaction ID */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <ChatCircleText size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Transaction ID</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-sm font-semibold">{payment.transactionId}</Text>
              <CopySimple size={16} color="#CCF200" />
            </View>
          </View>

          {/* Payment Date */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <CalendarBlank size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Payment Date</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{payment.date}</Text>
          </View>

          {/* Payment Time */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <Clock size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Payment Time</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{payment.time}</Text>
          </View>

          {/* Payment Status */}
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-3 mt-1">
              <ShieldCheck size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Payment Status</Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <Text className="text-[#10B981] text-sm font-semibold capitalize">{payment.status}</Text>
              </View>
              <Text className="text-[#888888] text-[9px] font-medium text-right">Payment recorded automatically</Text>
            </View>
          </View>

        </View>

        {/* Payment Receipt Download */}
        <TouchableOpacity onPress={handleDownload} className="bg-[#121214] border border-[#27272A] rounded-2xl p-4 flex-row items-center justify-between mb-3 active:opacity-70">
          <View className="flex-row items-center gap-4">
            <View className="bg-[#1A1A1A] p-2 rounded-lg">
              <Receipt size={20} color="#CCF200" />
            </View>
            <View>
              <Text className="text-white text-sm font-semibold mb-0.5">Payment Receipt</Text>
              <Text className="text-[#888888] text-[11px] font-medium">Download receipt for this payment</Text>
            </View>
          </View>
          <DownloadSimple size={20} color="#CCF200" />
        </TouchableOpacity>

        {/* Share Receipt */}
        <TouchableOpacity onPress={handleShare} className="bg-[#121214] border border-[#27272A] rounded-2xl p-4 flex-row items-center justify-between active:opacity-70">
          <View className="flex-row items-center gap-3">
            <ShareNetwork size={20} color="#CCF200" />
            <Text className="text-[#CCF200] text-sm font-semibold ml-1">Share Payment Receipt</Text>
          </View>
          <CaretRight size={16} color="#4d5c00" weight="bold" />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
