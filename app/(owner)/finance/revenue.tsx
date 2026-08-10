import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, CaretDown, CurrencyInr, CaretRight, Lightning, CreditCard, Money, Buildings, CalendarBlank } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RevenueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#09090B]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#27272A]">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4">
            <CaretLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xl font-bold text-white tracking-wide">Today's Revenue</Text>
        </View>
        <Pressable className="flex-row items-center bg-[#18181B] px-3 py-2 rounded-xl border border-[#27272A]">
          <CalendarBlank size={14} color="#8E8E93" />
          <Text className="text-white text-xs mx-2">This Month</Text>
          <CaretDown size={14} color="#8E8E93" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Main Card */}
        <View className="px-5 mt-6 mb-8">
          <View className="bg-[#121214] rounded-3xl p-6 flex-row items-center">
            <View className="w-16 h-16 rounded-full bg-[#166534]/30 items-center justify-center mr-5">
              <CurrencyInr size={28} color="#22C55E" weight="bold" />
            </View>
            <View>
              <Text className="text-[#8E8E93] text-xs mb-1">Today's Revenue</Text>
              <Text className="text-white text-4xl font-bold">₹8,450</Text>
            </View>
          </View>
        </View>

        {/* Revenue by Membership Plan */}
        <View className="px-5 mb-8">
          <Text className="text-[#8E8E93] font-medium text-sm mb-4">Revenue by Membership Plan</Text>
          <View className="bg-[#121214] rounded-3xl">
            <View className="flex-row items-center justify-between p-5 border-b border-[#27272A]">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-[#84CC16] mr-4" />
                <Text className="text-white font-bold text-sm">Gold Membership</Text>
              </View>
              <Text className="text-white font-bold text-sm">₹5,100</Text>
            </View>
            
            <View className="flex-row items-center justify-between p-5 border-b border-[#27272A]">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-[#A855F7] mr-4" />
                <Text className="text-white font-bold text-sm">Premium Membership</Text>
              </View>
              <Text className="text-white font-bold text-sm">₹2,700</Text>
            </View>

            <View className="flex-row items-center justify-between p-5">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-[#71717A] mr-4" />
                <Text className="text-white font-bold text-sm">Silver Membership</Text>
              </View>
              <Text className="text-white font-bold text-sm">₹650</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View className="px-5 mb-8">
          <Text className="text-[#8E8E93] font-medium text-sm mb-4">Payment Methods</Text>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            <View className="w-[48%] bg-[#121214] rounded-3xl p-4 items-center">
              <Lightning size={24} color="#22C55E" weight="bold" style={{ marginBottom: 8 }} />
              <Text className="text-[#8E8E93] text-xs mb-1">UPI</Text>
              <Text className="text-white font-bold text-sm">₹5,200</Text>
            </View>
            
            <View className="w-[48%] bg-[#121214] rounded-3xl p-4 items-center">
              <CreditCard size={24} color="#A855F7" weight="bold" style={{ marginBottom: 8 }} />
              <Text className="text-[#8E8E93] text-xs mb-1">Card</Text>
              <Text className="text-white font-bold text-sm">₹2,300</Text>
            </View>

            <View className="w-[48%] bg-[#121214] rounded-3xl p-4 items-center">
              <Money size={24} color="#F97316" weight="bold" style={{ marginBottom: 8 }} />
              <Text className="text-[#8E8E93] text-xs mb-1">Cash</Text>
              <Text className="text-white font-bold text-sm">₹850</Text>
            </View>

            <View className="w-[48%] bg-[#121214] rounded-3xl p-4 items-center">
              <Buildings size={24} color="#3B82F6" weight="bold" style={{ marginBottom: 8 }} />
              <Text className="text-[#8E8E93] text-xs mb-1">Net Banking</Text>
              <Text className="text-white font-bold text-sm">₹100</Text>
            </View>
          </View>
        </View>

        {/* Recent Payments */}
        <View className="px-5 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[#8E8E93] font-medium text-sm">Recent Payments</Text>
            <Pressable className="flex-row items-center">
              <Text className="text-[#C4EF00] text-xs font-bold mr-1">View All</Text>
              <CaretRight size={12} color="#C4EF00" weight="bold" />
            </Pressable>
          </View>

          <View className="gap-6">
            {[
              { name: 'Rahul Sharma', plan: 'Gold Membership', price: '₹2,500', time: '09:45 AM', img: 'https://i.pravatar.cc/150?u=rahul' },
              { name: 'Sneha Patel', plan: 'Premium Membership', price: '₹2,999', time: '09:15 AM', img: 'https://i.pravatar.cc/150?u=sneha' },
              { name: 'Amit Kumar', plan: 'Gold Membership', price: '₹2,500', time: '08:40 AM', img: 'https://i.pravatar.cc/150?u=amit' },
              { name: 'Neha Kapoor', plan: 'Silver Membership', price: '₹650', time: '08:10 AM', img: 'https://i.pravatar.cc/150?u=neha' },
            ].map((tx, idx) => (
              <View key={idx} className="flex-row justify-between items-center">
                <View className="flex-row items-center flex-1 mr-2">
                  <Image source={{ uri: tx.img }} className="w-11 h-11 rounded-full mr-3 bg-[#27272A]" />
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>{tx.name}</Text>
                    <Text className="text-[#8E8E93] text-[10px] mt-0.5" numberOfLines={1}>{tx.plan}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-[#8E8E93] text-[10px] mb-0.5">{tx.time}</Text>
                  <Text className="text-white font-bold text-sm">{tx.price}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
