import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, User, Crown, CurrencyInr, QrCode, Money, CalendarBlank, Clock, FileText, CheckCircle } from 'phosphor-react-native';

export default function PaymentSuccessScreen() {
  const { method, member, plan, amount, date, time, reference } = useLocalSearchParams();

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 140 }}>

        {/* Success Icon */}
        <View className="items-center justify-center mb-8">
          <View
            className="w-28 h-28 rounded-full border-[3px] border-[#CCF200] items-center justify-center"
            style={{
              backgroundColor: 'rgba(204, 242, 0, 0.1)',
              shadowColor: '#CCF200',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 30,
              elevation: 10,
            }}
          >
            <Check size={48} color="#CCF200" weight="bold" />
          </View>
        </View>

        {/* Header Text */}
        <Text className="text-white text-2xl font-semibold text-center mb-2">Payment Added Successfully!</Text>
        <Text className="text-[#888888] text-sm text-center px-4 mb-8">The payment has been recorded and added to the history.</Text>

        {/* Payment Summary Card */}
        <View className="bg-[#121214] border border-[#27272A] rounded-3xl p-5 mb-5">
          <Text className="text-[#CCF200] text-sm font-semibold mb-5">Payment Summary</Text>

          {/* Member */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <User size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Member</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{member || 'N/A'}</Text>
          </View>

          {/* Membership Plan */}
          <View className="flex-row items-center justify-between mb-6 border-b border-[#27272A] pb-6">
            <View className="flex-row items-center gap-3">
              <Crown size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Membership Plan</Text>
            </View>
            <View className="items-end">
              <Text className="text-white text-sm font-semibold">{plan || 'N/A'}</Text>
            </View>
          </View>

          {/* Amount Paid */}
          <View className="flex-row items-center justify-between mb-6 border-b border-[#27272A] pb-6">
            <View className="flex-row items-center gap-3">
              <CurrencyInr size={18} color="#CCF200" weight="bold" />
              <Text className="text-[#888888] text-sm font-medium">Amount Paid</Text>
            </View>
            <Text className="text-white text-sm font-semibold">₹{amount || '0'}</Text>
          </View>

          {/* Payment Method */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              {method === 'cash' ? (
                <Money size={18} color="#CCF200" />
              ) : (
                <QrCode size={18} color="#CCF200" />
              )}
              <Text className="text-[#888888] text-sm font-medium">Payment Method</Text>
            </View>
            <View className="border border-[#CCF200] px-2 py-0.5 rounded-sm items-center justify-center">
              <Text className="text-[10px] font-semibold text-[#CCF200] uppercase tracking-wider">
                {method === 'cash' ? 'CASH PAYMENT' : 'QR PAYMENT'}
              </Text>
            </View>
          </View>

          {/* Payment Date */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <CalendarBlank size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Payment Date</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{date || 'N/A'}</Text>
          </View>

          {/* Payment Time */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <Clock size={18} color="#CCF200" />
              <Text className="text-[#888888] text-sm font-medium">Payment Time</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{time || 'N/A'}</Text>
          </View>

          {/* Reference ID */}
          {reference ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <FileText size={18} color="#CCF200" />
                <Text className="text-[#888888] text-sm font-medium">Reference ID</Text>
              </View>
              <Text className="text-white text-sm font-semibold">{reference}</Text>
            </View>
          ) : null}

        </View>

        {/* Info Alert */}
        <View className="flex-row items-center bg-[#181A0B] border border-[#242611] rounded-2xl p-4 mb-8">
          <CheckCircle size={24} color="#CCF200" weight="bold" />
          <Text className="flex-1 text-[#888888] text-xs font-medium ml-3 leading-5">
            The payment is now visible in the payments list.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          onPress={() => (router as any).replace('/(owner)/dashboard/payments')}
          className="bg-[#CCF200] rounded-xl py-4 items-center mb-4 active:opacity-80"
        >
          <Text className="text-black text-base font-semibold">View Payments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (router as any).replace('/(owner)/dashboard/payments/add')}
          className="bg-transparent border border-[#CCF200] rounded-xl py-4 items-center active:opacity-70 mb-4"
        >
          <Text className="text-[#CCF200] text-base font-semibold">Add Another Payment</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
