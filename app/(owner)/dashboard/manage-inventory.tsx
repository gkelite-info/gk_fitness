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

import { useState, useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useOwnerGymId } from '@/hooks/auth/useOwnerGymId';
import { useGymInventoryList } from '@/hooks/inventory/useGymInventory';

export default function ManageInventoryScreen() {
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: gymId } = useOwnerGymId(userId);
  const { data: equipmentList = [], isLoading: loading, refetch } = useGymInventoryList(gymId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const totalEquipment = equipmentList.length;
  const totalUnits = equipmentList.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const underMaint = equipmentList.reduce((acc, item) => acc + (item.underMaint || 0), 0);
  const outOfService = equipmentList.reduce((acc, item) => acc + (item.outOfService || 0), 0);

  const summaryCards = [
    { id: '1', title: 'Total\nEquipment', value: totalEquipment.toString(), icon: Package, iconColor: '#D4F129' },
    { id: '2', title: 'Total\nUnits', value: totalUnits.toString(), icon: Package, iconColor: '#D4F129' },
    { id: '3', title: 'Under\nMaintenance', value: underMaint.toString(), icon: Wrench, iconColor: '#F59E0B' },
    { id: '4', title: 'Out of\nService', value: outOfService.toString(), icon: WarningCircle, iconColor: '#EF4444' },
  ];

  const filteredList = equipmentList.filter((item) =>
    item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Just now';
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="px-5 pt-6 pb-4 flex-row items-center border-b border-[#161616]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#161616] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-xl font-semibold text-white mb-0.5">Manage Inventory</Text>
          <Text className="text-xs text-[#888]">Track and manage your gym equipment</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row justify-between mb-6">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <View key={card.id} className="w-[23%] bg-[#161616] rounded-2xl p-3 items-center justify-center border border-[#242424]">
                <View className="mb-2">
                  <Icon size={24} color={card.iconColor} weight="regular" />
                </View>
                <Text className="text-[10px] text-[#888] text-center mb-1 leading-3 h-6">{card.title}</Text>
                <Text className="text-lg font-semibold text-white">{card.value}</Text>
              </View>
            );
          })}
        </View>

        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-[#161616] flex-row items-center px-4 py-3.5 rounded-xl border border-[#242424]">
            <MagnifyingGlass size={20} color="#666" />
            <TextInput
              placeholder="Search equipment..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white ml-2"
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-white">All Equipment</Text>
          <Pressable
            onPress={() => router.push('/(owner)/dashboard/add-equipment')}
            className="bg-[#D4F129] flex-row items-center px-4 py-2 rounded-full active:opacity-80"
          >
            <PlusCircle size={16} color="#000" weight="regular" />
            <Text className="text-black font-semibold text-xs ml-1.5">Add Equipment</Text>
          </Pressable>
        </View>

        <View className="gap-4">
          {loading && filteredList.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator color="#D4F129" size="large" />
            </View>
          ) : filteredList.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text className="text-[#666] text-sm">No equipment found</Text>
            </View>
          ) : (
            filteredList.map((item) => (
              <Pressable 
                key={item.gymInventoryId} 
                className="bg-[#161616] rounded-2xl p-4 border border-[#242424] active:opacity-80"
                onPress={() => router.push({ pathname: '/(owner)/dashboard/equipment/[id]', params: { id: item.gymInventoryId } })}
              >
                <View className="flex-row mb-4">
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      className="w-20 h-20 rounded-xl bg-[#242424]"
                    />
                  ) : (
                    <View className="w-20 h-20 rounded-xl bg-[#242424] items-center justify-center">
                      <Package size={32} color="#666" />
                    </View>
                  )}
                  <View className="flex-1 ml-4 justify-center">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-semibold text-white">{item.equipmentName}</Text>
                      <CaretRight size={16} color="#666" />
                    </View>
                    <Text className="text-xs text-[#666] mt-0.5">ID: {item.gymInventoryId.substring(0, 8).toUpperCase()}</Text>
                  </View>
                </View>

                <View className="flex-row border-t border-b border-[#242424] py-3 mb-3">
                  <View className="flex-1 items-center border-r border-[#242424]">
                    <Text className="text-[10px] text-[#666] mb-1 text-center">Total Units</Text>
                    <Text className="text-base font-semibold text-white">{item.quantity}</Text>
                  </View>
                  <View className="flex-1 items-center border-r border-[#242424]">
                    <Text className="text-[10px] text-[#666] mb-1 text-center">Available</Text>
                    <Text className="text-base font-semibold text-[#22C55E]">{item.available ?? item.quantity}</Text>
                  </View>
                  <View className="flex-1 items-center border-r border-[#242424]">
                    <Text className="text-[10px] text-[#666] mb-1 text-center">Under Maint.</Text>
                    <Text className="text-base font-semibold text-[#F59E0B]">{item.underMaint ?? 0}</Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-[10px] text-[#666] mb-1 text-center">Out of Service</Text>
                    <Text className="text-base font-semibold text-[#EF4444]">{item.outOfService ?? 0}</Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <CalendarBlank size={12} color="#666" />
                  <Text className="text-[10px] text-[#666] ml-1.5">Last updated: {formatLastUpdated(item.updatedAt)}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
