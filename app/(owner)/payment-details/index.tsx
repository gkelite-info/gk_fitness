import { useState } from 'react';
import { View, ScrollView, Pressable, Platform, StatusBar } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { useOwnerPaymentDetails } from '@/hooks/paymentDetails/useOwnerPaymentDetails';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import {
  CaretLeft,
  Bank,
  CheckCircle,
  ShieldCheck,
  ChartBar,
  CaretRight,
  PlusCircle,
  CurrencyInrIcon
} from 'phosphor-react-native';

export default function PaymentSettingsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId } = useUser();
  const { data: details, isLoading, refetch } = useOwnerPaymentDetails(gymId);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight }}>
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70 p-1">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Payment Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-[#A1A1AA] text-sm mb-6 mt-2">
          Manage where your membership payments are received
        </Text>

        <View className="bg-[#161616] rounded-2xl p-5 border border-[#C4EF00] mb-4 flex-row">
          <View className="w-14 h-14 rounded-xl bg-[#1E2015] items-center justify-center mr-4">
            <Bank size={28} color="#C4EF00" weight="fill" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[#A1A1AA] text-xs">Settlement Method</Text>
              <View className={`flex-row items-center px-2 py-1 rounded-full border border-[#27272A] ${details ? 'bg-[#1E2015]' : 'bg-[#2A1515]'}`}>
                <View className={`w-2 h-2 rounded-full ${details ? 'bg-[#C4EF00]' : 'bg-[#EF4444]'} mr-1.5`} />
                <Text className={`${details ? 'text-[#C4EF00]' : 'text-[#EF4444]'} text-[10px] font-semibold`}>{details ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            <Text className="text-white text-lg font-semibold mb-1">{details?.primarySettlementMethod === 'upi' ? 'UPI' : 'Bank Transfer'}</Text>
            <Text className="text-[#A1A1AA] text-[11px] leading-4 pr-4">
              Membership payments will be settled to your bank account
            </Text>
          </View>
        </View>

        <View className="bg-[#161616] rounded-2xl p-5 border border-[#1F1F22] mb-4">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-white text-base font-semibold">Primary Payout Account</Text>
            <View className={`flex-row items-center px-2 py-1 rounded-full border border-[#27272A] ${details?.isVerified ? 'bg-[#1E2015]' : 'bg-[#2A1515]'}`}>
              {details?.isVerified ? (
                <CheckCircle size={12} color="#C4EF00" weight="fill" style={{ marginRight: 1 }} />
              ) : (
                <View className="w-2 h-2 rounded-full bg-[#EF4444] mr-1.5" />
              )}
              <Text className={`${details?.isVerified ? 'text-[#C4EF00]' : 'text-[#EF4444]'} text-[10px] font-semibold`}>{details?.isVerified ? 'Verified' : 'Not verified'}</Text>
            </View>
          </View>

          <View className="space-y-4 mb-5">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[#A1A1AA] text-sm">Account Holder</Text>
              <Text className="text-white text-sm">{details?.accountHolderName || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[#A1A1AA] text-sm">Bank</Text>
              <Text className="text-white text-sm">{details?.bankName || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[#A1A1AA] text-sm">Account Number</Text>
              <Text className="text-white text-sm">{details?.accountNumber ? `•••• ${details.accountNumber.slice(-4)}` : 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-[#A1A1AA] text-sm">IFSC</Text>
              <Text className="text-white text-sm">{details?.ifscCode || 'N/A'}</Text>
            </View>
          </View>

          <View className="h-[1px] bg-[#1F1F22] w-full mb-4" />

          <View className="flex-row items-start">
            <ShieldCheck size={16} color={details?.isVerified ? "#C4EF00" : "#EF4444"} weight="fill" style={{ marginTop: 2, marginRight: 8 }} />
            <Text className="text-[#A1A1AA] text-xs flex-1 leading-5">
              {details?.isVerified
                ? 'Your bank account is verified and ready to receive payments.'
                : 'Your bank account is currently unverified.'}
            </Text>
          </View>
        </View>

        <View className="bg-[#161616] rounded-2xl p-5 border border-[#1F1F22] mb-4 flex-row items-center">
          <View className="w-14 h-14 rounded-xl bg-[#1E2015] items-center justify-center mr-4">
            <CurrencyInrIcon size={22} color='#C4EF00' />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white text-sm font-semibold">UPI ID</Text>
              <View className="flex-row items-center bg-[#1E2015] px-2 py-1 rounded-full border border-[#27272A]">
                <View className="w-2 h-2 rounded-full bg-[#C4EF00] mr-1.5" />
                <Text className="text-[#C4EF00] text-[10px] font-semibold">Enabled</Text>
              </View>
            </View>
            <Text className="text-white text-base font-semibold mb-1">{details?.upiId || 'Not Setup'}</Text>
            <Text className="text-[#A1A1AA] text-[11px] leading-4">
              Receive membership payments via UPI
            </Text>
          </View>
        </View>

        <View className="bg-[#161616] rounded-2xl p-5 border border-[#1F1F22] mb-8">
          <View className="flex-row items-center mb-5">
            <View className="w-6 h-6 rounded-md bg-[#1E2015] items-center justify-center mr-3">
              <ChartBar size={14} color="#C4EF00" weight="fill" />
            </View>
            <Text className="text-white text-base font-semibold">Payout Status</Text>
          </View>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#A1A1AA] text-sm">Account Status</Text>
              <Text className={`${details?.isVerified ? 'text-[#C4EF00]' : 'text-[#EF4444]'} text-sm font-semibold`}>{details?.isVerified ? 'Verified' : 'Not verified'}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#A1A1AA] text-sm">Settlement Type</Text>
              <Text className="text-white text-sm">Membership Payments</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-[#A1A1AA] text-sm">Last Updated</Text>
              <Text className="text-white text-sm">
                {details?.updatedAt ? new Date(details.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              </Text>
            </View>
          </View>
        </View>

        {details && (
          <Pressable
            className="bg-[#C4EF00] rounded-xl py-4 flex-row items-center justify-center mb-4 active:opacity-80"
            onPress={() => router.push({ pathname: '/(owner)/payment-details/add-payment-method', params: { mode: 'update' } })}
          >
            <Text className="text-black text-base font-semibold mr-2">Update Payment Details</Text>
            <CaretRight size={16} color="#000000" weight="bold" />
          </Pressable>
        )}
        {!details && (
          <Pressable
            className="bg-transparent border border-[#C4EF00] rounded-xl py-4 flex-row items-center justify-center active:opacity-70"
            onPress={() => router.push('/(owner)/payment-details/add-payment-method')}
          >
            <PlusCircle size={20} color="#C4EF00" weight="regular" style={{ marginRight: 2 }} />
            <Text className="text-[#C4EF00] text-base font-semibold">Add New Payment Method</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
