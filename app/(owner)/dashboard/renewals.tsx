import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { 
  CaretLeft, 
  MagnifyingGlass, 
  ArrowsClockwise,
  Calendar,
  CreditCard,
  CaretRight,
  Triangle,
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RECENT_RENEWALS = [
  { 
    id: '1', 
    name: 'Rahul Sharma', 
    plan: 'Gold Membership', 
    planColor: '#C4EF00',
    time: 'Renewed Today • 10:24 AM', 
    validTill: '31 Aug 2026', 
    paymentMethod: 'Paid via UPI',
    paymentIconType: 'upi',
    img: 'https://i.pravatar.cc/150?u=11' 
  },
  { 
    id: '2', 
    name: 'Priya Singh', 
    plan: 'Silver Membership', 
    planColor: '#A1A1AA',
    time: 'Renewed Yesterday • 04:15 PM', 
    validTill: '15 Aug 2026', 
    paymentMethod: 'Paid via Card',
    paymentIconType: 'card',
    img: 'https://i.pravatar.cc/150?u=12' 
  },
  { 
    id: '3', 
    name: 'Arjun Kumar', 
    plan: 'Platinum Membership', 
    planColor: '#C084FC',
    time: 'Renewed 2 Days Ago • 11:32 AM', 
    validTill: '10 Aug 2026', 
    paymentMethod: 'Paid via UPI',
    paymentIconType: 'upi',
    img: 'https://i.pravatar.cc/150?u=13' 
  },
];

const UPCOMING_RENEWALS = [
  { id: '1', name: 'Rahul Verma', plan: 'Gold Membership', planColor: '#C4EF00', expires: 'Today', expiresColor: '#EF4444' },
  { id: '2', name: 'Sneha Patel', plan: 'Platinum Membership', planColor: '#C084FC', expires: '2 Days', expiresColor: '#F59E0B' },
  { id: '3', name: 'Ankit Mishra', plan: 'Silver Membership', planColor: '#A1A1AA', expires: '5 Days', expiresColor: '#F59E0B' },
  { id: '4', name: 'Neha Sharma', plan: 'Gold Membership', planColor: '#C4EF00', expires: '7 Days', expiresColor: '#A1A1AA' },
  { id: '5', name: 'Vikram Reddy', plan: 'Silver Membership', planColor: '#A1A1AA', expires: '8 Days', expiresColor: '#A1A1AA' },
];

export default function MembershipRenewalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center flex-1">
          <Pressable 
            onPress={() => router.back()} 
            className="w-10 h-10 rounded-full bg-[#18181B] items-center justify-center mr-3 active:opacity-70"
          >
            <CaretLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-white tracking-wide">Membership Renewals</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Search Bar */}
        <View className="flex-row items-center bg-[#161616] rounded-2xl px-4 py-3.5 mb-6">
          <MagnifyingGlass size={20} color="#71717A" />
          <TextInput
            placeholder="Search member..."
            placeholderTextColor="#71717A"
            className="flex-1 ml-3 text-white text-[15px]"
            value={search}
            onChangeText={setSearch}
            selectionColor="#C4EF00"
          />
        </View>

        {/* Top Stats */}
        <View className="flex-row justify-between mb-8 gap-3 items-stretch">
          <View className="flex-1 bg-[#161616] rounded-2xl p-4 items-center justify-center min-h-[120px]">
            <View className="w-10 h-10 rounded-xl bg-[#22C55E1A] items-center justify-center mb-3">
              <ArrowsClockwise size={20} color="#22C55E" weight="bold" />
            </View>
            <Text className="text-[#8E8E93] text-[9px] font-medium mb-1.5 text-center" numberOfLines={1} adjustsFontSizeToFit>Renewed Today</Text>
            <Text className="text-white text-xl font-bold" numberOfLines={1} adjustsFontSizeToFit>18</Text>
          </View>

          <View className="flex-1 bg-[#161616] rounded-2xl p-4 items-center justify-center min-h-[120px]">
            <View className="w-10 h-10 rounded-xl bg-[#3B82F61A] items-center justify-center mb-3">
              <Calendar size={20} color="#3B82F6" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[9px] font-medium mb-1.5 text-center" numberOfLines={1} adjustsFontSizeToFit>Renewed This Week</Text>
            <Text className="text-white text-xl font-bold" numberOfLines={1} adjustsFontSizeToFit>64</Text>
          </View>

          <View className="flex-1 bg-[#161616] rounded-2xl p-4 items-center justify-center min-h-[120px]">
            <View className="w-10 h-10 rounded-xl bg-[#A855F71A] items-center justify-center mb-3">
              <CreditCard size={20} color="#A855F7" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[9px] font-medium mb-1.5 text-center" numberOfLines={1} adjustsFontSizeToFit>Revenue from Renewals</Text>
            <Text className="text-white text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>₹1,24,800</Text>
          </View>
        </View>

        {/* Recent Renewals Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-white">Recent Renewals</Text>
          <Pressable className="flex-row items-center active:opacity-70">
            <Text className="text-[#8E8E93] text-xs font-medium mr-1">View All</Text>
            <CaretRight size={12} color="#8E8E93" weight="bold" />
          </Pressable>
        </View>

        {/* Recent Renewals List */}
        <View className="mb-8">
          {RECENT_RENEWALS.map((item) => (
            <View key={item.id} className="bg-[#161616] rounded-2xl p-4 flex-row items-center justify-between mb-3">
              {/* Left Side: Avatar + Details */}
              <View className="flex-row items-center flex-1">
                <Image source={{ uri: item.img }} className="w-[46px] h-[46px] rounded-full mr-3 bg-[#27272A]" />
                <View>
                  <Text className="text-white font-bold text-base mb-0.5">{item.name}</Text>
                  <Text className="text-[11px] font-bold mb-1" style={{ color: item.planColor }}>{item.plan}</Text>
                  <Text className="text-[#8E8E93] text-[10px]">{item.time}</Text>
                </View>
              </View>

              {/* Right Side: Validation & Payment */}
              <View className="items-end justify-center border-l border-[#27272A] pl-4 py-1">
                <Text className="text-[#8E8E93] text-[9px] mb-0.5">Valid Till</Text>
                <Text className="text-white font-bold text-xs mb-2.5">{item.validTill}</Text>
                <View className="flex-row items-center">
                  {item.paymentIconType === 'upi' ? (
                    <Triangle size={10} color="#EAB308" weight="fill" style={{ marginRight: 4 }} />
                  ) : (
                    <CreditCard size={12} color="#A1A1AA" weight="regular" style={{ marginRight: 4 }} />
                  )}
                  <Text className="text-[#A1A1AA] text-[10px] font-medium">{item.paymentMethod}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Upcoming Renewals Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-white">Upcoming Renewals</Text>
          <Pressable className="flex-row items-center active:opacity-70">
            <Text className="text-[#8E8E93] text-xs font-medium mr-1">View All</Text>
            <CaretRight size={12} color="#8E8E93" weight="bold" />
          </Pressable>
        </View>

        {/* Upcoming Renewals Table */}
        <View className="bg-[#161616] rounded-2xl overflow-hidden border border-[#27272A]">
          {/* Table Header */}
          <View className="flex-row items-center p-4 border-b border-[#27272A] bg-[#121214]">
            <Text className="text-[#8E8E93] text-xs font-medium flex-[2]">Member</Text>
            <Text className="text-[#8E8E93] text-xs font-medium flex-[2]">Plan</Text>
            <Text className="text-[#8E8E93] text-xs font-medium flex-1 text-right">Expires In</Text>
          </View>
          
          {/* Table Rows */}
          {UPCOMING_RENEWALS.map((item, index) => (
            <View 
              key={item.id} 
              className={`flex-row items-center p-4 ${index !== UPCOMING_RENEWALS.length - 1 ? 'border-b border-[#27272A]' : ''}`}
            >
              <Text className="text-white font-semibold text-[13px] flex-[2] pr-2" numberOfLines={1}>{item.name}</Text>
              
              <View className="flex-[2] pr-2">
                <Text className="font-bold text-[10px] leading-4" style={{ color: item.planColor }}>
                  {item.plan.replace(' ', '\n')}
                </Text>
              </View>

              <Text 
                className="font-bold text-xs flex-1 text-right" 
                style={{ color: item.expiresColor }}
              >
                {item.expires}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
