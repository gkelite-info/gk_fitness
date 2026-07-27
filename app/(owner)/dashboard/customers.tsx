import React, { useState } from 'react';
import { View, TextInput, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  MagnifyingGlass,
  FadersHorizontal,
  Plus,
  Users,
  Barbell,
  FirstAidKit,
  Phone,
  Medal,
  CalendarBlank,
  CaretRight
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { triggerMediumHaptic, triggerSelectionHaptic } from '@/lib/haptics';
import { AnimatedTabs } from '@/components/AnimatedTabs';

export default function CustomersScreen() {
  const [activeTab, setActiveTab] = useState('customers');
  const [filter, setFilter] = useState('all');

  return (
    <KeyboardDismissView className="flex-1 bg-[#0A0A0A]" contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Top Tabs with Native Reanimated Gliding Selection */}
      <AnimatedTabs
        tabs={[
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'trainers', label: 'Trainers', icon: Barbell },
          { id: 'doctors', label: 'Doctors', icon: FirstAidKit, disabled: true },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id);
        }}
        containerClassName="mb-6"
      />

      {/* Search and Filter */}
      <View className="flex-row mb-6 gap-3">
        <View className="flex-1 flex-row items-center bg-[#161616] border border-[#242424] rounded-xl px-3 py-3">
          <MagnifyingGlass size={20} color="#A1A1AA" />
          <TextInput
            placeholder="Search by name, phone or ID..."
            placeholderTextColor="#A1A1AA"
            clearButtonMode="while-editing"
            className="flex-1 text-white ml-2"
          />
        </View>
        <Pressable className="flex-row items-center bg-[#161616] border border-[#242424] rounded-xl px-4 py-3 active:opacity-70">
          <FadersHorizontal size={20} color="#E5E5E5" />
          <Text className="text-white ml-2 font-medium">Filter</Text>
        </Pressable>
      </View>

      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-[#A1A1AA] text-[10px] font-semibold tracking-wider mb-1 uppercase">TOTAL CUSTOMERS</Text>
          <Text className="text-[#CCF200] text-3xl font-semibold">324</Text>
        </View>
        <Pressable 
          onPress={() => {
            triggerMediumHaptic();
            router.push('/(owner)/dashboard/add-customer');
          }}
          className="flex-row items-center bg-[#CCF200] px-5 py-3 rounded-full active:opacity-80">
          <Plus size={18} color="#000" weight="bold" />
          <Text className="text-black font-semibold ml-1">Register Customer</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-3 mb-6">
        <Pressable
          className={`px-5 py-2 rounded-full border ${filter === 'all' ? 'bg-[#CCF200] border-[#CCF200]' : 'bg-[#161616] border-[#242424]'}`}
          onPress={() => {
            if (filter !== 'all') {
              triggerSelectionHaptic();
              setFilter('all');
            }
          }}
        >
          <Text className={`font-semibold ${filter === 'all' ? 'text-black' : 'text-white'}`}>All</Text>
        </Pressable>
        <Pressable
          className={`flex-row items-center px-4 py-2 rounded-full border bg-[#161616] border-[#242424]`}
          onPress={() => {
            if (filter !== 'active') {
              triggerSelectionHaptic();
              setFilter('active');
            }
          }}
        >
          <View className="w-2 h-2 rounded-full bg-[#CCF200] mr-2" />
          <Text className="text-[#E5E5E5] font-medium">Active</Text>
        </Pressable>
        <Pressable
          className={`flex-row items-center px-4 py-2 rounded-full border bg-[#161616] border-[#242424]`}
          onPress={() => {
            if (filter !== 'expired') {
              triggerSelectionHaptic();
              setFilter('expired');
            }
          }}
        >
          <View className="w-2 h-2 rounded-full bg-[#FFB6C1] mr-2" />
          <Text className="text-[#E5E5E5] font-medium">Expired</Text>
        </Pressable>
      </View>

      {/* Customer List Card */}
      <View className="bg-[#161616] border border-[#242424] rounded-2xl p-4">
        {/* User Info Row */}
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row">
            <View className="relative">
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=11' }}
                className="w-14 h-14 rounded-full bg-[#242424]"
              />
              <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#CCF200] border-2 border-[#161616] rounded-full" />
            </View>
            <View className="ml-3 justify-center">
              <Text className="text-white text-lg font-semibold mb-0.5">Arjun Mehta</Text>
              <Text className="text-[#A1A1AA] text-xs">CUST-1001</Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <View className="bg-[#373F0E] px-3 py-1 rounded-md mr-2">
              <Text className="text-[#CCF200] text-xs font-semibold">Active</Text>
            </View>
            <CaretRight size={20} color="#fff" />
          </View>
        </View>

        <View className="h-[1px] bg-[#242424] w-full mb-4" />

        {/* Details */}
        <View className="gap-y-3 pl-1">
          <View className="flex-row items-center">
            <Phone size={18} color="#A1A1AA" />
            <Text className="text-[#D1D5DB] ml-3 text-sm">+91 98765 43210</Text>
          </View>

          <View className="flex-row items-center">
            <Medal size={18} color="#CCF200" />
            <Text className="text-[#CCF200] ml-3 text-sm font-semibold">Platinum Plan</Text>
          </View>

          <View className="flex-row items-center">
            <CalendarBlank size={18} color="#A1A1AA" />
            <Text className="text-[#D1D5DB] ml-3 text-sm">Joined 12 May 2026</Text>
          </View>
        </View>

        <View className="mt-4 pl-1">
          <Text className="text-[#A1A1AA] text-sm">
            Valid till <Text className="text-white font-semibold">12 Aug 2026</Text>
          </Text>
        </View>
      </View>
    </KeyboardDismissView>
  );
}
