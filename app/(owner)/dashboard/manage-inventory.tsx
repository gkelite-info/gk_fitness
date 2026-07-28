import React from 'react';
import { View, ScrollView, TextInput, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import {
  CaretLeft,
  MagnifyingGlass,
  Package,
  Wrench,
  WarningCircle,
  PlusCircle,
  CaretRight,
  CalendarBlank
} from 'phosphor-react-native';

const SUMMARY_CARDS = [
  { id: '1', title: 'Total\nEquipment', value: '128', icon: Package, iconColor: '#D4F129' },
  { id: '2', title: 'Total\nUnits', value: '324', icon: Package, iconColor: '#D4F129' },
  { id: '3', title: 'Under\nMaintenance', value: '18', icon: Wrench, iconColor: '#F59E0B' },
  { id: '4', title: 'Out of\nService', value: '6', icon: WarningCircle, iconColor: '#EF4444' },
];

const EQUIPMENT_LIST = [
  {
    id: 'EQ-001',
    name: 'Treadmill',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop',
    total: 5,
    available: 4,
    underMaint: 1,
    outOfService: 0,
    lastUpdated: 'Today, 09:20 AM',
  },
  {
    id: 'EQ-002',
    name: 'Adjustable Bench',
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2070&auto=format&fit=crop',
    total: 10,
    available: 8,
    underMaint: 1,
    outOfService: 1,
    lastUpdated: 'Today, 08:45 AM',
  },
  {
    id: 'EQ-003',
    name: 'Cable Crossover',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
    total: 2,
    available: 2,
    underMaint: 0,
    outOfService: 0,
    lastUpdated: 'Yesterday, 06:30 PM',
  },
  {
    id: 'EQ-004',
    name: 'Spin Bike',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop',
    total: 6,
    available: 5,
    underMaint: 1,
    outOfService: 0,
    lastUpdated: 'Today, 10:15 AM',
  },
];

export default function ManageInventoryScreen() {
  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="px-5 pt-6 pb-4 flex-row items-center border-b border-[#161616]">
        <Pressable 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#161616] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-xl font-bold text-white mb-0.5">Manage Inventory</Text>
          <Text className="text-xs text-[#888]">Track and manage your gym equipment</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View className="flex-row justify-between mb-6">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <View key={card.id} className="w-[23%] bg-[#161616] rounded-2xl p-3 items-center justify-center border border-[#242424]">
                <View className="mb-2">
                  <Icon size={24} color={card.iconColor} weight="regular" />
                </View>
                <Text className="text-[10px] text-[#888] text-center mb-1 leading-3 h-6">{card.title}</Text>
                <Text className="text-lg font-bold text-white">{card.value}</Text>
              </View>
            );
          })}
        </View>

        {/* Search */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-[#161616] flex-row items-center px-4 py-3.5 rounded-xl border border-[#242424]">
            <MagnifyingGlass size={20} color="#666" />
            <TextInput
              placeholder="Search equipment..."
              placeholderTextColor="#666"
              className="flex-1 text-white ml-2"
            />
          </View>
        </View>

        {/* List Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-white">All Equipment</Text>
          <Pressable 
            onPress={() => router.push('/(owner)/dashboard/add-equipment')}
            className="bg-[#D4F129] flex-row items-center px-4 py-2 rounded-full active:opacity-80"
          >
            <PlusCircle size={16} color="#000" weight="regular" />
            <Text className="text-black font-semibold text-xs ml-1.5">Add Equipment</Text>
          </Pressable>
        </View>

        {/* Equipment List */}
        <View className="gap-4">
          {EQUIPMENT_LIST.map((item) => (
            <Pressable key={item.id} className="bg-[#161616] rounded-2xl p-4 border border-[#242424] active:opacity-80">
              <View className="flex-row mb-4">
                <Image 
                  source={{ uri: item.image }} 
                  className="w-20 h-20 rounded-xl bg-[#242424]"
                />
                <View className="flex-1 ml-4 justify-center">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-white">{item.name}</Text>
                    <CaretRight size={16} color="#666" />
                  </View>
                  <Text className="text-xs text-[#666] mt-0.5">ID: {item.id}</Text>
                </View>
              </View>
              
              <View className="flex-row border-t border-b border-[#242424] py-3 mb-3">
                <View className="flex-1 items-center border-r border-[#242424]">
                  <Text className="text-[10px] text-[#666] mb-1 text-center">Total Units</Text>
                  <Text className="text-base font-bold text-white">{item.total}</Text>
                </View>
                <View className="flex-1 items-center border-r border-[#242424]">
                  <Text className="text-[10px] text-[#666] mb-1 text-center">Available</Text>
                  <Text className="text-base font-bold text-[#22C55E]">{item.available}</Text>
                </View>
                <View className="flex-1 items-center border-r border-[#242424]">
                  <Text className="text-[10px] text-[#666] mb-1 text-center">Under Maint.</Text>
                  <Text className="text-base font-bold text-[#F59E0B]">{item.underMaint}</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-[10px] text-[#666] mb-1 text-center">Out of Service</Text>
                  <Text className="text-base font-bold text-[#EF4444]">{item.outOfService}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <CalendarBlank size={12} color="#666" />
                <Text className="text-[10px] text-[#666] ml-1.5">Last updated: {item.lastUpdated}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
