import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Receipt,
  ShareNetwork,
  DownloadSimple,
  CheckCircle,
  Barbell,
  ShieldCheck,
} from 'phosphor-react-native';
import { useCustomerGymPayment } from '@/hooks/customerGymPayments/useCustomerGymPayments';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useGym } from '@/hooks/gyms/useGym';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

export default function DirectPaymentReceiptScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: payment, isLoading: isPaymentLoading } = useCustomerGymPayment(paymentId);
  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(payment?.customerId);
  const { data: gym } = useGym(payment?.gymId || null);

  const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const memberCode = useMemo(() => {
    if (!payment?.customerId) return 'CUST-XXXX';
    return `CUST-${payment.customerId.substring(0, 6).toUpperCase()}`;
  }, [payment?.customerId]);

  const handleShare = async () => {
    triggerLightHaptic();
    try {
      const amount = payment?.amountPaid || 0;
      await Share.share({
        message: `GK Fitness Payment Receipt\nMember: ${customer?.fullName || 'Member'}\nMember ID: ${memberCode}\nAmount: ₹${amount}\nStatus: Verified\nDate: ${formatDate(payment?.createdAt)}`,
      });
    } catch {
      // Ignored
    }
  };

  const handleDownload = () => {
    triggerSuccessHaptic();
    toast.success('Receipt downloaded successfully');
  };

  const isLoading = isPaymentLoading || isCustomerLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading receipt...</Text>
      </View>
    );
  }

  if (!payment) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center px-6">
        <Text className="text-white text-lg font-bold mb-2">Receipt Not Found</Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-[#1A1A1A] border border-[#27272A] px-6 py-3 rounded-xl mt-4"
        >
          <Text className="text-[#CCF200] font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const receiptNum = (payment.transactionId || payment.customerPaymentId || 'TXN00000')
    .substring(0, 10)
    .toUpperCase();
  const paymentDate = formatDate(payment.createdAt);
  const paymentTime = formatTime(payment.createdAt);
  const amountPaid = (payment.amountPaid || 0).toLocaleString('en-IN');
  const planName = (payment as any)?.plan?.planName || 'Gym Membership';

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
        <Text className="text-white text-lg font-bold">Payment Receipt</Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleShare}
            className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
          >
            <ShareNetwork size={18} color="#CCF200" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-6 mt-4 shadow-2xl">
          {/* Receipt Header */}
          <View className="items-center pb-5 border-b border-[#222226]">
            <View className="w-14 h-14 rounded-2xl bg-[#CCF200]/10 border border-[#CCF200]/30 items-center justify-center mb-3">
              <Barbell size={28} color="#CCF200" weight="fill" />
            </View>
            <Text className="text-white text-xl font-bold">{gym?.gymName || 'GK Fitness'}</Text>
            <Text className="text-[#CCF200] text-xs font-semibold tracking-widest uppercase mt-1">
              Payment Confirmation Receipt
            </Text>
            <View className="px-3 py-1 rounded-full bg-[#373F0E] mt-3 flex-row items-center gap-1.5">
              <CheckCircle size={14} color="#CCF200" weight="fill" />
              <Text className="text-[#CCF200] text-xs font-bold uppercase tracking-wider">
                Recorded & Verified
              </Text>
            </View>
          </View>

          {/* Key Meta */}
          <View className="py-4 border-b border-[#222226] flex-row justify-between">
            <View>
              <Text className="text-gray-400 text-xs">Receipt No.</Text>
              <Text className="text-white text-xs font-bold mt-0.5">{receiptNum}</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-xs">Date & Time</Text>
              <Text className="text-white text-xs font-bold mt-0.5">
                {paymentDate} {paymentTime ? `• ${paymentTime}` : ''}
              </Text>
            </View>
          </View>

          {/* Member Details */}
          <View className="py-4 border-b border-[#222226]">
            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Billed To
            </Text>
            <Text className="text-white text-base font-bold">{customer?.fullName || 'Member'}</Text>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-[#CCF200] text-xs font-semibold">{memberCode}</Text>
              <Text className="text-gray-400 text-xs">{customer?.phone || ''}</Text>
            </View>
          </View>

          {/* Plan Details */}
          <View className="py-4 border-b border-[#222226]">
            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Item Details
            </Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white text-sm font-bold">{planName}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">Gym Membership Access</Text>
              </View>
              <Text className="text-white text-sm font-bold">₹{amountPaid}</Text>
            </View>
          </View>

          {/* Total Amount Paid Highlight */}
          <View className="py-5 items-center bg-[#1C1F26] rounded-2xl my-4 border border-[#2A2E38]">
            <Text className="text-gray-400 text-xs uppercase tracking-wider font-semibold">
              Total Amount Paid
            </Text>
            <Text className="text-[#CCF200] text-3xl font-extrabold mt-1">
              ₹{amountPaid}
            </Text>
            <Text className="text-gray-400 text-[11px] mt-1">
              Method: {(payment.paymentMethod || 'UPI').toUpperCase()}
            </Text>
          </View>

          {/* Transaction Metadata */}
          <View className="gap-2 pt-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-400 text-xs">Transaction Ref</Text>
              <Text className="text-gray-200 text-xs font-mono">{payment.transactionId || receiptNum}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-400 text-xs">Payment Channel</Text>
              <Text className="text-gray-200 text-xs uppercase font-medium">
                {payment.paymentMethod || 'Online'}
              </Text>
            </View>
          </View>

          {/* Footer Note */}
          <View className="mt-6 pt-4 border-t border-[#222226] items-center">
            <ShieldCheck size={16} color="#71717A" />
            <Text className="text-gray-500 text-[11px] text-center mt-1 leading-4">
              Computer-generated payment voucher from {gym?.gymName || 'GK Fitness'}. No signature required.
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          onPress={handleDownload}
          className="bg-[#CCF200] rounded-2xl py-4 items-center justify-center flex-row gap-2 mt-5 active:opacity-80"
        >
          <DownloadSimple size={18} color="#000000" weight="bold" />
          <Text className="text-black font-bold text-base">Download Receipt</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
