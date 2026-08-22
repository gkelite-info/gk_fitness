import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  MagnifyingGlass,
  Funnel,
  CaretRight,
  Users,
  Barbell,
  User,
  Phone
} from 'phosphor-react-native';
import { useGyms } from '@/hooks/gyms/useGyms';
import { useGymOwners } from '@/hooks/gymOwners/useGymOwners';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

type Tab = 'customers' | 'trainers' | 'owners';

export default function GymDetailsTabsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: gyms, isLoading: isLoadingGyms } = useGyms();
  const { data: owners, isLoading: isLoadingOwners } = useGymOwners();
  const { data: trainers, isLoading: isLoadingTrainers } = useGymTrainers(id);
  const { data: customers, isLoading: isLoadingCustomers } = useGymCustomers(id);

  const gym = gyms?.find((g) => g.gymId === id || g.id === id);

  if (isLoadingGyms || isLoadingOwners || isLoadingTrainers || isLoadingCustomers) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  // Current active dataset
  let currentData: any[] = [];
  if (activeTab === 'customers') currentData = customers || [];
  if (activeTab === 'trainers') currentData = trainers || [];
  if (activeTab === 'owners') {
    // Owners might just be the gym.owner string in the basic schema, or fetched via useGymOwners
    currentData = owners?.filter(o => o.gymId === id) || [];
    // If empty, let's mock one for the UI demonstration if gym has an owner string
    if (currentData.length === 0 && gym?.owner) {
      currentData = [{ id: 'owner-1', name: gym.owner, phone: '+91 98765 00000', isActive: true, role: 'Owner' }];
    }
  }

  // Filter & Search
  const filteredData = currentData.filter(item => {
    let name = '';
    let phone = '';
    let isItemActive = false;
    
    if (activeTab === 'owners') {
      name = item.ownerFullname || '';
      phone = item.ownerPhone || '';
      isItemActive = item.isActive !== false && item.is_deleted !== true;
    } else {
      name = item.fullName || '';
      phone = item.phone || '';
      isItemActive = item.isActive !== false && item.is_Active !== false && item.status !== 'INACTIVE' && item.is_deleted !== true;
    }

    const nameMatch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = phone.includes(searchQuery);
    
    const filterMatch = filter === 'all' || 
                       (filter === 'active' && isItemActive) || 
                       (filter === 'inactive' && !isItemActive);
    
    return (nameMatch || phoneMatch) && filterMatch;
  });

  const activeCount = filteredData.filter(item => {
    if (activeTab === 'owners') return item.isActive !== false && item.is_deleted !== true;
    return item.isActive !== false && item.is_Active !== false && item.status !== 'INACTIVE' && item.is_deleted !== true;
  }).length;
  const inactiveCount = filteredData.length - activeCount;

  const renderTab = (tabId: Tab, icon: React.ReactNode, label: string, count: number) => {
    const isActive = activeTab === tabId;
    return (
      <Pressable 
        onPress={() => {
          setActiveTab(tabId);
          setSearchQuery('');
          setFilter('all');
        }}
        className={`flex-1 flex-row items-center justify-center py-4 border-b-2 ${isActive ? 'border-[#CCFF00]' : 'border-transparent'}`}
      >
        <View className="mr-2 opacity-80">{icon}</View>
        <Text className={`text-sm ${isActive ? 'text-[#CCFF00] font-semibold' : 'text-[#8E8E93]'}`}>
          {label} ({count})
        </Text>
      </Pressable>
    );
  };

  const renderFilterChip = (id: 'all' | 'active' | 'inactive', label: string, count: number) => {
    const isSelected = filter === id;
    return (
      <Pressable 
        onPress={() => setFilter(id)}
        className={`px-4 py-2 rounded-full border ${isSelected ? 'border-[#CCFF00]' : 'border-[#2A2A2D]'}`}
      >
        <Text className={`text-xs ${isSelected ? 'text-[#CCFF00] font-semibold' : 'text-white'}`}>
          {label} ({count})
        </Text>
      </Pressable>
    );
  };

  const handleCardPress = (item: any) => {
    if (activeTab === 'customers' && item.customerId) {
      router.push(`/(superadmin)/customers/${item.customerId}`);
    } else if (activeTab === 'trainers' && item.gymTrainerId) {
      router.push(`/(superadmin)/trainers/${item.gymTrainerId}`);
    } else if (activeTab === 'owners') {
      // Owners view doesn't exist uniquely yet, could route to owners list or similar
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    let name = '';
    let phone = '';
    let isItemActive = false;
    let subText = '';
    let avatarUrl = item.profilePhoto;

    if (activeTab === 'owners') {
      name = item.ownerFullname || 'Unknown Owner';
      phone = item.ownerPhone || 'No phone';
      isItemActive = item.isActive !== false && item.is_deleted !== true;
      subText = 'Gym Owner';
    } else if (activeTab === 'trainers') {
      name = item.fullName || 'Unknown Trainer';
      phone = item.phone || 'No phone';
      isItemActive = item.isActive !== false && item.is_Active !== false && item.status !== 'INACTIVE' && item.is_deleted !== true;
      subText = item.specialization || 'Fitness Trainer';
    } else {
      name = item.fullName || 'Unknown Customer';
      phone = item.phone || 'No phone';
      isItemActive = item.isActive !== false && item.is_Active !== false && item.status !== 'INACTIVE' && item.is_deleted !== true;
      subText = item.membershipType || 'Active Member';
    }

    return (
      <Pressable 
        onPress={() => handleCardPress(item)}
        className="bg-[#1C1C1E] rounded-2xl p-4 mb-3 flex-row items-center active:opacity-80"
      >
        <StaticAvatar uri={avatarUrl} name={name} size={48} className="w-12 h-12 rounded-full mr-4" />
        
        <View className="flex-1">
          <Text className="text-white text-base font-bold mb-0.5">{name}</Text>
          <Text className="text-[#CCFF00] text-[10px] font-bold mb-1">{subText}</Text>
          <View className="flex-row items-center">
            <View className="mr-1"><Phone size={12} color="#8E8E93" /></View>
            <Text className="text-[#8E8E93] text-xs">{phone}</Text>
          </View>
        </View>

        <View className="items-end justify-center">
          <View className={`px-2 py-1 rounded-full flex-row items-center border ${isItemActive ? 'border-[#CCFF00]/20 bg-[#CCFF00]/10' : 'border-[#EF4444]/20 bg-[#EF4444]/10'} mb-2`}>
            <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isItemActive ? 'bg-[#CCFF00]' : 'bg-[#EF4444]'}`} />
            <Text className={`text-[10px] font-bold ${isItemActive ? 'text-[#CCFF00]' : 'text-[#EF4444]'}`}>
              {isItemActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <View className="ml-3"><CaretRight size={16} color="#8E8E93" /></View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-[#2A2A2D]">
        <View className="flex-row items-center flex-1">
          <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <View className="w-10 h-10 rounded-xl bg-[#1C1C1E] items-center justify-center mr-3 border border-[#2A2A2D]">
            <Text className="text-[#CCFF00] text-[10px] font-bold text-center">GK</Text>
          </View>
          <View className="flex-1 pr-2">
            <Text className="text-white text-lg font-bold" numberOfLines={1}>{gym?.gymName || 'Unknown Gym'}</Text>
            <View className="flex-row items-center">
              <View className="mr-1"><MapPin size={12} color="#8E8E93" /></View>
              <Text className="text-[#8E8E93] text-xs" numberOfLines={1}>{gym?.city || 'Unknown'}, {gym?.state || 'Unknown'}</Text>
            </View>
          </View>
        </View>
        
        <View className={`px-2 py-1 rounded-full flex-row items-center border ${gym?.isActive !== false ? 'border-[#CCFF00]/20 bg-[#CCFF00]/10' : 'border-[#EF4444]/20 bg-[#EF4444]/10'}`}>
          <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${gym?.isActive !== false ? 'bg-[#CCFF00]' : 'bg-[#EF4444]'}`} />
          <Text className={`text-[10px] font-bold ${gym?.isActive !== false ? 'text-[#CCFF00]' : 'text-[#EF4444]'}`}>
            {gym?.isActive !== false ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-[#1C1C1E] rounded-xl mx-4 mt-4">
        {renderTab('customers', <Users size={16} color={activeTab === 'customers' ? '#CCFF00' : '#8E8E93'} weight="fill" />, 'Customers', customers?.length || 0)}
        {renderTab('trainers', <Barbell size={16} color={activeTab === 'trainers' ? '#CCFF00' : '#8E8E93'} weight="fill" />, 'Trainers', trainers?.length || 0)}
        {renderTab('owners', <User size={16} color={activeTab === 'owners' ? '#CCFF00' : '#8E8E93'} weight="regular" />, 'Owners', owners?.filter(o => o.gymId === id).length || 0)}
      </View>

      {/* Search & Filters */}
      <View className="px-4 mt-4">
        <View className="flex-row items-center mb-4 gap-3">
          <View className="flex-1 bg-[#1C1C1E] rounded-xl px-4 py-3 flex-row items-center border border-[#2A2A2D]">
            <MagnifyingGlass size={18} color="#8E8E93" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${activeTab} by name or phone`}
              placeholderTextColor="#6B7280"
              className="flex-1 text-white text-sm ml-2 py-0"
            />
          </View>
          <Pressable className="bg-[#1C1C1E] border border-[#2A2A2D] rounded-xl w-12 h-[46px] items-center justify-center">
            <Funnel size={18} color="#FFFFFF" weight="fill" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4" contentContainerStyle={{ gap: 10 }}>
          {renderFilterChip('all', 'All', currentData.length)}
          {renderFilterChip('active', 'Active', activeCount)}
          {renderFilterChip('inactive', 'Inactive', inactiveCount)}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => item.id || item.customerId || item.trainerId || index.toString()}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-[#8E8E93] text-base">No {activeTab} found.</Text>
          </View>
        }
      />
    </View>
  );
}
