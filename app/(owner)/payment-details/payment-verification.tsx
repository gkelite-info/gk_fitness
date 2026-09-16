import { View, ScrollView, Pressable, Platform, StatusBar } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  ShieldCheck,
  Clock,
  Info,
  ClipboardText
} from 'phosphor-react-native';

export default function PaymentVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  }>();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#131313]" style={{ paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight }}>
      <View className="flex-row items-center px-5 py-4 relative">
        <Pressable onPress={() => router.back()} className="absolute left-5 z-10 p-1 active:opacity-70">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Payment Verification</Text>
          <Text className="text-[#8E8E93] text-[13px] mt-1">Review your payout account status</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="border border-[#D6FF00] bg-[#232323] rounded-3xl p-5 mb-5">
          <View className="flex-row items-start mb-4">
            <View className="w-12 h-12 rounded-[14px] bg-[#2A280B] items-center justify-center mr-4">
              <ShieldCheck size={28} color="#D6FF00" weight="fill" />
            </View>
            <View className="flex-1 flex-row justify-between items-start">
              <Text className="text-white text-[17px] font-semibold max-w-[130px] leading-6">Payment Details Added</Text>
              <View className="flex-row items-center bg-[#2A280B] rounded-full px-2.5 py-1.5 border border-[#2A280B]">
                <Clock size={14} color="#D6FF00" weight="fill" style={{ marginRight: 1.5 }} />
                <Text className="text-[#D6FF00] text-[11px] font-semibold">Pending Verification</Text>
              </View>
            </View>
          </View>
          <Text className="text-[#8E8E93] text-[13px] leading-5">
            Your payout account details have been submitted successfully.
          </Text>
        </View>

        <View className="bg-[#232323] rounded-3xl p-5 mb-5 border border-white/5">
          <Text className="text-white text-[16px] font-semibold mb-6">Submitted Payout Account Details</Text>

          <View className="flex-col">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#8E8E93] text-[14px]">Account Holder</Text>
              <Text className="text-white text-[14px]">{params.accountHolderName || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#8E8E93] text-[14px]">Bank Name</Text>
              <Text className="text-white text-[14px]">{params.bankName || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#8E8E93] text-[14px]">Account Number</Text>
              <Text className="text-white text-[14px]">{params.accountNumber ? `•••• ${params.accountNumber.slice(-4)}` : 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#8E8E93] text-[14px]">IFSC Code</Text>
              <Text className="text-white text-[14px]">{params.ifscCode || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#8E8E93] text-[14px]">UPI ID</Text>
              <Text className="text-white text-[14px]">{params.upiId || 'Not provided'}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-[#8E8E93] text-[14px]">Submitted On</Text>
              <Text className="text-white text-[14px]">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#232323] rounded-3xl p-5 mb-8 border border-white/5">
          <View className="flex-row items-start mb-5">
            <View className="w-7 h-7 rounded-full bg-[#D6FF00] items-center justify-center mr-3 mt-0.5">
              <Info size={18} color="#000000" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-[16px] font-semibold mb-1.5">Verification in Progress</Text>
              <Text className="text-[#8E8E93] text-[13px] leading-5">
                We are verifying your bank account details. Payouts will begin once your account is approved.
              </Text>
            </View>
          </View>

          <View className="flex-col pl-2">
            <View className="flex-row items-center mb-3.5">
              <Clock size={18} color="#D6FF00" weight="regular" style={{ marginRight: 3 }} />
              <Text className="text-white text-[13px] flex-1">Verification usually takes 1–2 business days.</Text>
            </View>
            <View className="flex-row items-center mb-3.5">
              <ClipboardText size={18} color="#D6FF00" weight="regular" style={{ marginRight: 3 }} />
              <Text className="text-white text-[13px] flex-1">We may review bank details for accuracy.</Text>
            </View>
            <View className="flex-row items-center">
              <ShieldCheck size={18} color="#D6FF00" weight="regular" style={{ marginRight: 3 }} />
              <Text className="text-white text-[13px] flex-1">You can update details if needed before approval.</Text>
            </View>
          </View>
        </View>

        <View className="w-full px-5 pb-8 pt-4 bg-[#131313]">
          <Pressable
            className="bg-[#D6FF00] rounded-xl py-4 items-center justify-center mb-3 active:opacity-80"
            onPress={() => router.push('/(owner)/payment-details')}
          >
            <Text className="text-[#131313] text-[16px] font-semibold">Done</Text>
          </Pressable>

          <Pressable
            className="bg-transparent border border-[#D6FF00] rounded-xl py-4 items-center justify-center active:opacity-70"
            onPress={() => router.push('/(owner)/payment-details/add-payment-method')}
          >
            <Text className="text-[#D6FF00] text-[16px] font-semibold">Update Details</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
