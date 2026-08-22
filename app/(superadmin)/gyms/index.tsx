import React, { useState, useMemo } from 'react';
import { View, FlatList, Pressable, Image, ActivityIndicator, TextInput, ScrollView, Platform, UIManager, LayoutAnimation } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  MagnifyingGlass, 
  Plus, 
  MapPin, 
  CalendarBlank,
  Users,
  CaretRight
} from 'phosphor-react-native';
import { useGyms } from '@/hooks/gyms/useGyms';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GymCard = ({ item, stats, router }: { item: any, stats: any, router: any }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const totalMembers = stats.total;
  const activeMembers = stats.active;
  const inactiveMembers = stats.inactive;
  const isGymActive = item.isActive !== false;

  return (
    <Pressable 
      onPress={toggleExpand}
      className="bg-[#1C1C1E] rounded-2xl p-4 mb-4 active:opacity-90 overflow-hidden"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-2">
          {item.logo ? (
            <Image source={{ uri: item.logo }} className="w-[56px] h-[56px] rounded-xl bg-white mr-3 shrink-0" />
          ) : (
            <View className="w-[56px] h-[56px] rounded-xl bg-[#2A2A2D] items-center justify-center mr-3 shrink-0">
               <Text className="text-[#8E8E93] text-[9px] font-bold text-center">NO{'\n'}LOGO</Text>
            </View>
          )}
          
          <View className="flex-1 justify-center">
            <Text className="text-white text-base font-bold mb-1" numberOfLines={1}>{item.gymName || 'Unknown Gym'}</Text>
            
            <View className="flex-row items-center">
              <MapPin size={12} color="#8E8E93" />
              <Text className="text-[#8E8E93] text-xs ml-1 flex-1" numberOfLines={1}>{item.city || 'Unknown'}, {item.state || 'India'}</Text>
            </View>
          </View>
        </View>

        <View className="w-8 h-8 rounded-full bg-[#2A2A2D] items-center justify-center shrink-0">
          {expanded ? (
            <CaretRight size={14} color="#FFFFFF" weight="bold" style={{ transform: [{ rotate: '-90deg' }] }} />
          ) : (
            <CaretRight size={14} color="#FFFFFF" weight="bold" style={{ transform: [{ rotate: '90deg' }] }} />
          )}
        </View>
      </View>

      {expanded && (
        <View className="mt-4 pt-4 border-t border-[#2A2A2D]">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <View className="flex-row items-center mb-1.5">
                <CalendarBlank size={12} color="#8E8E93" />
                <Text className="text-[#8E8E93] text-xs ml-1.5" numberOfLines={1}>
                  Since {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Jan 2024'}
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isGymActive ? 'bg-[#CCFF00]' : 'bg-[#EF4444]'}`} />
                <Text className="text-white text-[11px] font-bold">{isGymActive ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            
            <View className="items-end">
              <View className="flex-row items-center mb-1">
                <View className="mr-1.5 opacity-80"><Users size={14} color="#FFFFFF" /></View>
                <Text className="text-white text-base font-bold">{totalMembers} Members</Text>
              </View>
              <Text className="text-[10px] text-right">
                <Text className="text-[#CCFF00] font-bold">{activeMembers} </Text>
                <Text className="text-[#8E8E93]">Active • </Text>
                <Text className="text-[#EF4444] font-bold">{inactiveMembers} </Text>
                <Text className="text-[#8E8E93]">Inactive</Text>
              </Text>
            </View>
          </View>

          <Pressable 
            onPress={() => router.push(`/(superadmin)/dashboard/gym/${item.gymId || item.id}` as any)}
            className="w-full bg-[#CCFF00] rounded-xl py-3 flex-row items-center justify-center active:opacity-80"
          >
            <Text className="text-black font-bold text-sm">Manage Gym Dashboard</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
};

export default function TotalGymsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: gyms, isLoading } = useGyms();
  const { data: allCustomers } = useGymCustomers();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isSearching, setIsSearching] = useState(false);

  // Derive counts
  const allCount = gyms?.length || 0;
  const activeCount = gyms?.filter(g => g.isActive !== false).length || 0;
  const inactiveCount = allCount - activeCount;

  // Filter & Search
  const filteredGyms = gyms?.filter(gym => {
    const nameStr = gym.gymName || '';
    const cityStr = gym.city || '';
    const matchesSearch = nameStr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cityStr.toLowerCase().includes(searchQuery.toLowerCase());
    const isGymActive = gym.isActive !== false;
    const matchesFilter = filter === 'all' || 
                          (filter === 'active' && isGymActive) || 
                          (filter === 'inactive' && !isGymActive);
    return matchesSearch && matchesFilter;
  });

  const gymStats = useMemo(() => {
    const stats: Record<string, { total: number, active: number, inactive: number }> = {};
    if (!allCustomers) return stats;
    allCustomers.forEach((c: any) => {
      const gId = c.gymId;
      if (!gId) return;
      if (!stats[gId]) stats[gId] = { total: 0, active: 0, inactive: 0 };
      stats[gId].total++;
      
      const isItemActive = c.isActive !== false && c.is_Active !== false && c.status !== 'INACTIVE';
      if (isItemActive) {
        stats[gId].active++;
      } else {
        stats[gId].inactive++;
      }
    });
    return stats;
  }, [allCustomers]);

  const renderFilterChip = (id: 'all' | 'active' | 'inactive', label: string, count: number) => {
    const isSelected = filter === id;
    return (
      <Pressable 
        onPress={() => setFilter(id)}
        className={`px-3 py-2 rounded-full border flex-row items-center gap-2 ${
          isSelected ? 'border-[#CCFF00]' : 'border-[#2A2A2D]'
        }`}
      >
        <Text className={`text-sm ${isSelected ? 'text-[#CCFF00]' : 'text-[#8E8E93]'}`}>{label}</Text>
        <View className="px-2 py-0.5 rounded-full bg-[#1C1C1E] border border-[#2A2A2D]">
          <Text className="text-[#8E8E93] text-[10px] font-bold">{count}</Text>
        </View>
      </Pressable>
    );
  };

  const renderCard = ({ item }: { item: any }) => {
    const stats = gymStats[item.gymId || item.id] || { total: 0, active: 0, inactive: 0 };
    return <GymCard item={item} stats={stats} router={router} />;
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="px-5 pt-4 pb-2">
        {/* Header */}
        <View className="flex-row justify-between items-center mt-2 mb-2">
          <Text className="text-2xl font-bold text-white">Total Gyms</Text>
          <Pressable onPress={() => setIsSearching(!isSearching)} className="active:opacity-70">
            <MagnifyingGlass size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {isSearching && (
          <View className="flex-row gap-2 mb-4">
            <View className="flex-1 bg-[#1C1C1E] rounded-xl px-4 py-3 flex-row items-center border border-[#2A2A2D]">
              <MagnifyingGlass size={18} color="#8E8E93" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search Gyms by name or city"
                placeholderTextColor="#6B7280"
                className="flex-1 text-white text-sm ml-2 py-0"
              />
            </View>
          </View>
        )}

        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-[#8E8E93] text-sm">View and manage all registered gyms.</Text>
          <Pressable 
            onPress={() => router.push('/(superadmin)/dashboard/register')}
            className="bg-[#CCFF00] rounded-lg px-3 py-1.5 flex-row items-center active:opacity-80"
          >
            <View className="mr-1">
              <Plus size={12} color="#000000" weight="bold" />
            </View>
            <Text className="text-black text-xs font-bold">Add Gym</Text>
          </Pressable>
        </View>

        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="flex-row mb-4"
          contentContainerStyle={{ gap: 10 }}
        >
          {renderFilterChip('all', 'All Gyms', allCount)}
          {renderFilterChip('active', 'Active', activeCount)}
          {renderFilterChip('inactive', 'Inactive', inactiveCount)}
        </ScrollView>
      </View>

      {/* Gym List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      ) : (
        <FlatList
          data={filteredGyms}
          keyExtractor={(item) => item.gymId || item.id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-[#8E8E93] text-base">No gyms found matching your criteria.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
