import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, CaretDown, Users, MagnifyingGlass, CaretRight } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

function CustomerRow({ user }: { user: any }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Animated.View layout={LinearTransition.duration(250)} className="bg-[#121214] rounded-2xl mb-3 overflow-hidden border border-[#27272A]">
      <Pressable onPress={() => setExpanded(!expanded)} className="p-4 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1">
          <Image source={{ uri: user.img }} className="w-12 h-12 rounded-full mr-4 bg-[#27272A]" />
          <View>
            <Text className="text-white font-bold text-sm mb-0.5" numberOfLines={1}>{user.name}</Text>
            <Text className="text-[#8E8E93] text-[10px]">ID: {user.id}</Text>
          </View>
        </View>
        
        <View className="flex-row items-center">
          <View className={`px-2 py-1 rounded-md mr-3 ${
            user.plan === 'Gold' ? 'bg-[#713F12]/30' : 
            user.plan === 'Premium' ? 'bg-[#4C1D95]/30' : 
            'bg-[#27272A]'
          }`}>
            <Text className={`text-[10px] font-bold ${
              user.plan === 'Gold' ? 'text-[#EAB308]' : 
              user.plan === 'Premium' ? 'text-[#A855F7]' : 
              'text-[#D4D4D8]'
            }`}>{user.plan}</Text>
          </View>
          {expanded ? <CaretDown size={14} color="#8E8E93" /> : <CaretRight size={14} color="#8E8E93" />}
        </View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} className="px-4 pb-4 pt-2 border-t border-[#27272A]/50 flex-row justify-between">
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Phone</Text>
            <Text className="text-[#D4D4D8] text-xs">{user.phone}</Text>
          </View>
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Joined</Text>
            <Text className="text-[#D4D4D8] text-xs">{user.joined}</Text>
          </View>
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Valid Till</Text>
            <Text className="text-[#D4D4D8] text-xs">{user.valid}</Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  )
}

export default function CustomersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View className="flex-1 bg-[#09090B]">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#27272A]">
        <Pressable onPress={() => router.back()} className="mr-4">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide">Total Customers</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* KPI Card */}
        <View className="px-5 mt-6 mb-6">
          <View className="bg-[#121214] rounded-3xl p-6">
            <View className="flex-row items-center ">
              <View className="w-8 h-8 rounded-full bg-[#166534]/30 items-center justify-center mr-3">
                <Users size={16} color="#C4EF00" weight="fill" />
              </View>
              <Text className="text-[#8E8E93] text-xs font-bold tracking-wider">TOTAL ACTIVE CUSTOMERS</Text>
            </View>

            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-white text-4xl font-bold tracking-tight mb-2">1,036</Text>
                <Text className="text-[#22C55E] text-xs font-bold">↑ +6.3% <Text className="text-[#8E8E93] text-xs font-normal">vs last month</Text></Text>
              </View>

              {/* Sparkline Graph */}
              <View style={{ width: '55%', height: 80 }}>
                <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 110 40">
                  <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#C4EF00" stopOpacity="0.4" />
                      <Stop offset="1" stopColor="#C4EF00" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Path
                    d="M0,40 L0,35 L15,25 L25,32 L35,18 L45,30 L55,18 L65,32 L75,25 L80,27 L85,22 L90,28 L95,5 L100,28 L110,28 L110,40 Z"
                    fill="url(#grad)"
                  />
                  <Path
                    d="M0,35 L15,25 L25,32 L35,18 L45,30 L55,18 L65,32 L75,25 L80,27 L85,22 L90,28 L95,5 L100,28 L110,28"
                    fill="none"
                    stroke="#C4EF00"
                    strokeWidth="1.5"
                  />
                </Svg>
              </View>
            </View>
          </View>
        </View>

        {/* Search */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center bg-[#121214] rounded-2xl px-4 py-4">
            <MagnifyingGlass size={20} color="#8E8E93" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, phone or membership ID"
              placeholderTextColor="#8E8E93"
              className="flex-1 ml-3 text-white text-sm"
            />
          </View>
        </View>

        {/* Active Members Header */}
        <View className="px-5 mb-4 flex-row justify-between items-center">
          <Text className="text-white font-bold text-sm">Active Members <Text className="text-[#8E8E93] font-normal">(1,036)</Text></Text>
          <Pressable className="flex-row items-center bg-[#18181B] px-3 py-1.5 rounded-full border border-[#27272A]">
            <Text className="text-[#8E8E93] text-[10px] mr-1">Sort:</Text>
            <Text className="text-white text-[10px] font-bold mr-1.5">Newest</Text>
            <CaretDown size={10} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Members List */}
        <View className="px-5">
          {[
            { name: 'Rahul Sharma', id: 'M00123', phone: '+91 9876543210', joined: '12 Jul 2026', valid: '12/07/2026', plan: 'Gold', img: 'https://i.pravatar.cc/150?u=rahul' },
            { name: 'Sneha Patel', id: 'M00124', phone: '+91 9876543211', joined: '11 Jul 2026', valid: '12/07/2026', plan: 'Premium', img: 'https://i.pravatar.cc/150?u=sneha' },
            { name: 'Arjun Kumar', id: 'M00125', phone: '+91 9876543212', joined: '10 Jul 2026', valid: '12/07/2026', plan: 'Gold', img: 'https://i.pravatar.cc/150?u=arjun' },
            { name: 'Priya Singh', id: 'M00126', phone: '+91 9876543213', joined: '10 Jul 2026', valid: '12/07/2026', plan: 'Silver', img: 'https://i.pravatar.cc/150?u=priya' },
            { name: 'Vikram Mehta', id: 'M00127', phone: '+91 9876543214', joined: '09 Jul 2026', valid: '12/07/2026', plan: 'Premium', img: 'https://i.pravatar.cc/150?u=vikram' },
            { name: 'Neha Kapoor', id: 'M00128', phone: '+91 9876543215', joined: '08 Jul 2026', valid: '12/07/2026', plan: 'Gold', img: 'https://i.pravatar.cc/150?u=neha' },
          ].map((user, idx) => (
            <CustomerRow key={idx} user={user} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
