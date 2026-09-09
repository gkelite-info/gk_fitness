import React from 'react';
import { View, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check, ClipboardText, WarningCircle, Money, DownloadSimple, ArrowLeft, Copy } from 'phosphor-react-native';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { planName, amount, paymentMethod, transactionId, upiId } = useLocalSearchParams<{
    planName: string;
    amount: string;
    paymentMethod: string;
    transactionId: string;
    upiId?: string;
  }>();

  const planNameParts = (planName || 'Gold Membership').split(' ');
  const firstWord = planNameParts[0];
  const restOfName = planNameParts.slice(1).join(' ');

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 60, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-[#CCFF00] items-center justify-center relative shadow-[0_0_40px_rgba(204,255,0,0.4)]">
            <View className="absolute inset-0 rounded-full bg-[#CCFF00] opacity-30 scale-125" />
            <View className="absolute inset-0 rounded-full bg-[#CCFF00] opacity-10 scale-150" />
            <Check size={48} color="#000" weight="bold" />
          </View>
        </View>

        <View className="items-center mb-8">
          <Text className="text-white text-2xl font-semibold mb-2">Payment Successful!</Text>
          <View className="flex-row items-baseline mb-2">
            <Text className="text-[#CCFF00] text-[32px] font-semibold">{amount || '₹3,999'}</Text>
            <Text className="text-white text-lg ml-2">Paid</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-[#FFD700] text-base">{firstWord}</Text>
            <Text className="text-[#9CA3AF] text-base"> {restOfName} Renewed</Text>
          </View>
        </View>

        <View className="bg-[#121212] rounded-2xl p-5 mb-8 border border-[#1F2937]">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-[#1F2937] items-center justify-center mr-3">
                <ClipboardText size={20} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#9CA3AF] text-[15px]">Transaction ID</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-white text-[15px] font-medium mr-2">{transactionId || 'TXN348729'}</Text>
              <Copy size={16} color="#CCFF00" />
            </View>
          </View>

          <View className="border-t border-dashed border-[#1F2937] mb-4 w-full h-[1px]" />

          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-[#1F2937] items-center justify-center mr-3">
                <WarningCircle size={20} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#9CA3AF] text-[15px]">Paid Via</Text>
            </View>
            <View className="items-end">
              <Text className="text-white text-[15px] font-medium">{paymentMethod || 'UPI'}</Text>
              {(paymentMethod === 'UPI' && upiId) && (
                <Text className="text-[#9CA3AF] text-xs mt-0.5">{upiId}</Text>
              )}
            </View>
          </View>

          <View className="border-t border-dashed border-[#1F2937] mb-4 w-full h-[1px]" />

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-[#1F2937] items-center justify-center mr-3">
                <Money size={20} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#9CA3AF] text-[15px]">Amount Paid</Text>
            </View>
            <Text className="text-white text-[15px] font-medium">{amount || '₹3,999'}</Text>
          </View>
        </View>

        <View className="gap-4">
          <Pressable 
            disabled={true}
            className="bg-[#0A0A0A] border border-[#CCFF00]/50 rounded-2xl py-4 flex-row items-center justify-center opacity-50"
          >
            <DownloadSimple size={20} color="#CCFF00" weight="bold" style={{ marginRight: 2 }} />
            <Text className="text-[#CCFF00] text-[16px] font-semibold">Download Receipt</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(customer)/memberships')}
            className="bg-[#CCFF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
          >
            <ArrowLeft size={20} color="#000" weight="bold" style={{ marginRight: 2 }} />
            <Text className="text-black text-[16px] font-semibold">Back to Membership</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
