import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, TextInput, Dimensions, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CaretLeft, CaretDown, MagnifyingGlass, CaretRight, DotsThreeVertical, Funnel, Crown, Users, CurrencyInr, CalendarBlank, Star, SketchLogo, Medal } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';

function MemberRow({ user }: { user: any }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Animated.View layout={LinearTransition.duration(250)} className="border-b border-[#27272A] last:border-b-0 overflow-hidden">
      <Pressable onPress={() => setExpanded(!expanded)} className="py-4 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1">
          <Image source={{ uri: user.img }} className="w-10 h-10 rounded-full mr-3 bg-[#27272A]" />
          <View>
            <Text className="text-white font-bold text-sm" numberOfLines={1}>{user.name}</Text>
            <Text className="text-[#8E8E93] text-[10px] mt-0.5">Member ID: {user.id}</Text>
          </View>
        </View>
        
        <View className="flex-row items-center">
          <View className="bg-[#166534]/20 px-2 py-1 rounded-full mr-3">
            <Text className="text-[#C4EF00] font-bold text-[9px]">Active</Text>
          </View>
          {expanded ? <CaretDown size={14} color="#8E8E93" /> : <CaretRight size={14} color="#8E8E93" />}
        </View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} className="pb-4 pt-1 flex-row justify-between pl-[52px] pr-2">
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Joined Date</Text>
            <Text className="text-[#D4D4D8] text-[11px]">{user.joined}</Text>
          </View>
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Expiry Date</Text>
            <Text className="text-[#D4D4D8] text-[11px]">{user.expires}</Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  )
}

export default function MembershipPlanDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const isGold = id === 'gold';
  const isPremium = id === 'premium';
  const isElite = id === 'elite';
  const title = isGold ? 'Gold Membership' : isPremium ? 'Premium Membership' : isElite ? 'Elite Membership' : 'Silver Membership';
  
  const iconBg = isGold ? 'bg-[#EAB308]' : isPremium ? 'bg-[#8B5CF6]' : isElite ? 'bg-[#3B82F6]' : 'bg-[#71717A]';
  const iconColor = '#FFFFFF';

  return (
    <View className="flex-1 bg-[#09090B]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#27272A]">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4">
            <CaretLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xl font-bold text-white tracking-wide">{title}</Text>
        </View>
        <Pressable>
          <DotsThreeVertical size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Top Card Section */}
        <View className="px-5 mt-6 mb-8">
          <View className="bg-[#121214] rounded-3xl p-6">
            <View className="flex-row items-center mb-6">
              <View className={`w-16 h-16 rounded-2xl ${iconBg} items-center justify-center mr-5`}>
                {isGold ? <Crown size={32} color={iconColor} weight="fill" /> :
                 isPremium ? <Star size={32} color={iconColor} weight="regular" /> :
                 isElite ? <SketchLogo size={32} color={iconColor} weight="fill" /> :
                 <Medal size={32} color={iconColor} weight="regular" />}
              </View>
              <View>
                <Text className="text-white text-lg font-bold mb-1">{title}</Text>
                <View className="bg-[#166534]/30 px-2 py-0.5 rounded border border-[#22C55E]/30 self-start">
                  <Text className="text-[#22C55E] text-[10px] font-bold tracking-widest">Active Plan</Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-start border-t border-[#27272A] pt-6">
              <View className="flex-[0.8]  border-r border-[#27272A]">
                <View className="flex-row items-center mb-2">
                  <View className="w-5 h-5 rounded-full bg-[#166534]/30 items-center justify-center mr-2">
                    <Users size={10} color="#22C55E" weight="fill" />
                  </View>
                  <Text className="text-[#8E8E93] text-[10px] flex-1">Active</Text>
                </View>
                <Text className="text-white text-lg font-bold mb-1">412</Text>
                <Text className="text-[#8E8E93] text-[9px]">Total Members</Text>
              </View>

              <View className="flex-[1.4] px-4 border-r border-[#27272A]">
                <View className="flex-row items-start mb-2">
                  <View className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 items-center justify-center mr-2 mt-0.5">
                    <CurrencyInr size={10} color="#A855F7" weight="bold" />
                  </View>
                  <Text className="text-[#8E8E93] text-[10px] flex-1 leading-[14px]">Revenue This Month</Text>
                </View>
                <Text className="text-white text-lg font-bold mb-1">₹1,85,000</Text>
                <Text className="text-[#8E8E93] text-[9px]">74 Purchases</Text>
              </View>

              <View className="flex-[0.8] pl-4">
                <View className="flex-row items-center mb-2">
                  <View className="w-5 h-5 rounded-full bg-[#3B82F6]/20 items-center justify-center mr-2">
                    <CalendarBlank size={10} color="#3B82F6" weight="bold" />
                  </View>
                  <Text className="text-[#8E8E93] text-[10px] flex-1">Renewals</Text>
                </View>
                <Text className="text-white text-lg font-bold mb-1">96</Text>
                <Text className="text-[#8E8E93] text-[9px]">This Month</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Purchases */}
        <View className="px-5 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-bold text-sm">Recent Purchases</Text>
            <Pressable>
              <Text className="text-[#C4EF00] text-xs font-bold">View All</Text>
            </Pressable>
          </View>
          
          <View className="bg-[#121214] rounded-3xl p-1">
            {[
              { name: 'Rahul Sharma', time: 'Today • 09:45 AM', price: '₹2,499', img: 'https://i.pravatar.cc/150?u=rahul' },
              { name: 'Sneha Patel', time: 'Today • 08:20 AM', price: '₹2,499', img: 'https://i.pravatar.cc/150?u=sneha' },
              { name: 'Amit Kumar', time: 'Yesterday • 07:15 PM', price: '₹2,499', img: 'https://i.pravatar.cc/150?u=amit' },
              { name: 'Neha Kapoor', time: 'Yesterday • 06:30 PM', price: '₹2,499', img: 'https://i.pravatar.cc/150?u=neha' },
              { name: 'Vikram Singh', time: '29 Jul 2026 • 05:10 PM', price: '₹2,499', img: 'https://i.pravatar.cc/150?u=vikram' },
            ].map((tx, idx, arr) => (
              <View key={idx} className={`flex-row justify-between items-center p-4 ${idx !== arr.length - 1 ? 'border-b border-[#27272A]' : ''}`}>
                <View className="flex-row items-center flex-1 mr-2">
                  <Image source={{ uri: tx.img }} className="w-10 h-10 rounded-full mr-3 bg-[#27272A]" />
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>{tx.name}</Text>
                    <Text className="text-[#8E8E93] text-[10px] mt-0.5" numberOfLines={1}>{tx.time}</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-white font-bold text-sm mr-2">{tx.price}</Text>
                  <CaretRight size={14} color="#8E8E93" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Active Members List */}
        <View className="px-5 mb-8">
          <View className="bg-[#121214] rounded-3xl p-5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-bold text-sm">Active Members</Text>
              <View className="flex-row flex-1 justify-end ml-4 gap-2">
                <View className="flex-row flex-1 items-center bg-[#09090B] rounded-lg px-3 py-2 border border-[#27272A]">
                  <MagnifyingGlass size={14} color="#8E8E93" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search members..."
                    placeholderTextColor="#8E8E93"
                    className="flex-1 ml-2 text-white text-xs"
                  />
                </View>
                <Pressable className="bg-[#09090B] w-10 h-10 rounded-lg border border-[#27272A] items-center justify-center">
                  <Funnel size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

              <View className="mb-2">
                {[
                  { name: 'Rahul Sharma', id: 'GM1023', joined: '12 Jul 2026', expires: '12 Aug 2026', img: 'https://i.pravatar.cc/150?u=rahul' },
                  { name: 'Sneha Patel', id: 'GM0987', joined: '10 Jul 2026', expires: '10 Aug 2026', img: 'https://i.pravatar.cc/150?u=sneha' },
                  { name: 'Amit Kumar', id: 'GM0954', joined: '08 Jul 2026', expires: '08 Aug 2026', img: 'https://i.pravatar.cc/150?u=amit' },
                  { name: 'Neha Kapoor', id: 'GM0890', joined: '05 Jul 2026', expires: '05 Aug 2026', img: 'https://i.pravatar.cc/150?u=neha' },
                  { name: 'Vikram Singh', id: 'GM0832', joined: '03 Jul 2026', expires: '03 Aug 2026', img: 'https://i.pravatar.cc/150?u=vikram' },
                ].map((user, idx) => (
                  <MemberRow key={idx} user={user} />
                ))}
              </View>
            
            <View className="border-t border-[#27272A] pt-4 items-center">
              <Pressable className="flex-row items-center">
                <Text className="text-[#C4EF00] text-xs font-bold mr-1">View All Members</Text>
                <CaretRight size={12} color="#C4EF00" weight="bold" />
              </Pressable>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
