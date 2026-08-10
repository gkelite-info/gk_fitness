import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, FlatList, ActivityIndicator, Animated, ScrollView, Modal, TouchableOpacity } from 'react-native';
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
  CaretRight,
  Briefcase,
  CaretDown
} from 'phosphor-react-native';
import { router, useFocusEffect } from 'expo-router';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { triggerMediumHaptic, triggerSelectionHaptic } from '@/lib/haptics';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import { useUser } from '@/context/UserContext';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';
import { LinearGradient } from 'expo-linear-gradient';
import { useCustomers } from '@/hooks/users/useCustomers';
import { useTrainers } from '@/hooks/users/useTrainers';
import { useGymMembershipPlans } from '@/hooks/useGymMembershipPlans';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

const ShimmerCard = () => {
  const animValue = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animValue, {
        toValue: 2,
        duration: 1500,
        useNativeDriver: true
      })
    ).start();
  }, [animValue]);

  const translateX = animValue.interpolate({
    inputRange: [-1, 2],
    outputRange: [-300, 600]
  });

  return (
    <View className="bg-[#161616] border border-[#242424] rounded-2xl p-4 mb-4 relative overflow-hidden">
      {/* Base Skeleton layout */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row">
          <View className="w-14 h-14 rounded-full bg-[#242424]" />
          <View className="ml-3 justify-center gap-2">
            <View className="w-32 h-5 bg-[#242424] rounded" />
            <View className="w-20 h-3 bg-[#242424] rounded" />
          </View>
        </View>
        <View className="w-16 h-6 bg-[#242424] rounded-md" />
      </View>
      <View className="h-[1px] bg-[#242424] w-full mb-4" />
      <View className="gap-y-3 pl-1">
        <View className="w-40 h-4 bg-[#242424] rounded" />
        <View className="w-32 h-4 bg-[#242424] rounded" />
        <View className="w-48 h-4 bg-[#242424] rounded" />
      </View>

      {/* Sweeping Gradient Overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '50%',
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.08)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

export default function CustomersScreen() {
  const { userId } = useUser();
  const [activeTab, setActiveTab] = useState<'customers' | 'trainers'>('customers');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [planFilter, setPlanFilter] = useState('All');
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch gym ID
  useEffect(() => {
    if (userId) {
      getOwnerGymId(userId).then(setGymId);
    }
  }, [userId]);

  const { data: membershipPlans = [] } = useGymMembershipPlans(userId);

  const customersQuery = useCustomers(gymId, filter, debouncedSearch, planFilter);
  const trainersQuery = useTrainers(gymId, filter, debouncedSearch);

  const currentQuery = activeTab === 'customers' ? customersQuery : trainersQuery;

  const displayData = currentQuery.data?.pages.flatMap(page => page.data) || [];
  const totalCount = currentQuery.data?.pages[0]?.count || 0;

  // For Initial loading state
  const loading = currentQuery.isLoading;
  // For infinite scroll
  const loadingMore = currentQuery.isFetchingNextPage;
  // For pull to refresh
  const [refreshing, setRefreshing] = useState(false);

  const handleLoadMore = () => {
    if (currentQuery.hasNextPage && !currentQuery.isFetchingNextPage) {
      currentQuery.fetchNextPage();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await currentQuery.refetch();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View>
      {/* Top Tabs */}
      <AnimatedTabs
        tabs={[
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'trainers', label: 'Trainers', icon: Barbell },
          { id: 'doctors', label: 'Doctors', icon: FirstAidKit, disabled: true },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id as any);
        }}
        containerClassName="mb-6"
      />

      <View className="flex-row mb-6 gap-3">
        <View className="flex-1 flex-row items-center bg-[#161616] border border-[#242424] rounded-xl px-3 py-3">
          <MagnifyingGlass size={20} color="#A1A1AA" />
          <TextInput
            placeholder="Search by name, phone..."
            placeholderTextColor="#A1A1AA"
            clearButtonMode="while-editing"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-white ml-2 font-sans"
          />
        </View>
        <Pressable className="flex-row items-center bg-[#161616] border border-[#242424] rounded-xl px-4 py-3 active:opacity-70">
          <FadersHorizontal size={20} color="#E5E5E5" />
          <Text className="text-white ml-2 font-medium">Filter</Text>
        </Pressable>
      </View>

      {/* Header Action */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-[#A1A1AA] text-[10px] font-semibold tracking-wider mb-1 uppercase">
            TOTAL {activeTab.toUpperCase()}
          </Text>
          <Text className="text-[#CCF200] text-3xl font-semibold">
            {loading ? '-' : totalCount}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            triggerMediumHaptic();
            router.push({ pathname: '/(owner)/dashboard/add-customer', params: { tab: activeTab } });
          }}
          className="flex-row items-center bg-[#CCF200] px-5 py-3 rounded-full active:opacity-80"
        >
          <Plus size={18} color="#000" weight="bold" />
          <Text className="text-black font-semibold ml-1">
            Register {activeTab === 'customers' ? 'Customer' : 'Trainer'}
          </Text>
        </Pressable>
      </View>

      {/* Pills and Dropdown */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row gap-3 flex-1">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <Pressable
              className={`px-4 py-1.5 rounded-full border ${filter === 'all' ? 'bg-[#CCF200] border-[#CCF200]' : 'bg-[#161616] border-[#242424]'}`}
              onPress={() => {
                if (filter !== 'all') {
                  triggerSelectionHaptic();
                  setFilter('all');
                }
              }}
            >
              <Text className={`font-semibold text-xs ${filter === 'all' ? 'text-black' : 'text-white'}`}>All</Text>
            </Pressable>
            <Pressable
              className={`flex-row items-center px-3.5 py-1.5 rounded-full border ${filter === 'active' ? 'bg-[#CCF200] border-[#CCF200]' : 'bg-[#161616] border-[#242424]'}`}
              onPress={() => {
                if (filter !== 'active') {
                  triggerSelectionHaptic();
                  setFilter('active');
                }
              }}
            >
              <View className={`w-1.5 h-1.5 rounded-full mr-2 ${filter === 'active' ? 'bg-black' : 'bg-[#CCF200]'}`} />
              <Text className={`font-medium text-xs ${filter === 'active' ? 'text-black' : 'text-[#E5E5E5]'}`}>Active</Text>
            </Pressable>
            <Pressable
              className={`flex-row items-center px-3.5 py-1.5 rounded-full border ${filter === 'expired' ? 'bg-[#CCF200] border-[#CCF200]' : 'bg-[#161616] border-[#242424]'}`}
              onPress={() => {
                if (filter !== 'expired') {
                  triggerSelectionHaptic();
                  setFilter('expired');
                }
              }}
            >
              <View className={`w-1.5 h-1.5 rounded-full mr-2 ${filter === 'expired' ? 'bg-[#FF3366]' : 'bg-[#FFB6C1]'}`} />
              <Text className={`font-medium text-xs ${filter === 'expired' ? 'text-black' : 'text-[#E5E5E5]'}`}>Inactive</Text>
            </Pressable>
          </ScrollView>
        </View>

        {activeTab === 'customers' && (
          <Pressable 
            className="px-3 py-1.5 rounded-xl bg-[#CCF200] flex-row items-center gap-1 active:opacity-80 ml-2"
            onPress={() => {
              triggerSelectionHaptic();
              setPlanModalVisible(true);
            }}
          >
            <Text className="text-black font-semibold text-xs max-w-[100px]" numberOfLines={1}>
              {planFilter === 'All' ? 'All' : (membershipPlans.find((p: any) => p.planId === planFilter)?.planName || 'Unknown')}
            </Text>
            <CaretDown size={12} color="#000" weight="bold" />
          </Pressable>
        )}
      </View>

      {/* Initial Loading Shimmer */}
      {loading && (
        <View>
          <ShimmerCard />
          <ShimmerCard />
          <ShimmerCard />
        </View>
      )}

      {/* Empty State */}
      {!loading && displayData.length === 0 && (
        <View className="mt-4 items-center justify-center py-10 bg-[#161616] border border-[#242424] rounded-3xl">
          <Users size={48} color="#242424" weight="fill" />
          <Text className="text-white text-lg font-semibold mt-4">No records found</Text>
          <Text className="text-[#888] text-sm mt-1 text-center px-8">
            {search
              ? 'No matching records for your search query.'
              : `You haven't added any ${activeTab} yet. Tap the register button to get started.`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4 items-center justify-center">
        <ActivityIndicator size="small" color="#CCF200" />
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isActive = item.is_Active;
    const joinedDate = item.dateOfJoining || item.createdAt;
    const formattedJoinedDate = joinedDate ? new Date(joinedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    return (
      <View className="bg-[#161616] border border-[#242424] rounded-2xl p-4 mb-4">
        {/* User Info Row */}
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row">
            <View className="relative">
              <View className="w-14 h-14 rounded-full bg-[#242424] items-center justify-center border border-[#333]">
                <Text className="text-white text-lg font-bold">
                  {item.fullName ? item.fullName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <View className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-[#161616] rounded-full ${isActive ? 'bg-[#CCF200]' : 'bg-[#FFB6C1]'}`} />
            </View>
            <View className="ml-3 justify-center">
              <Text className="text-white text-lg font-semibold mb-0.5">{item.fullName}</Text>
              <Text className="text-[#A1A1AA] text-xs">
                {activeTab === 'customers' ? `CUST-${String(index + 1).padStart(4, '0')}` : `TRN-${String(index + 1).padStart(4, '0')}`}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <View className={`px-3 py-1 rounded-md mr-2 ${isActive ? 'bg-[#373F0E]' : 'bg-[#4A1D1D]'}`}>
              <Text className={`text-xs font-semibold ${isActive ? 'text-[#CCF200]' : 'text-[#FFB6C1]'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <CaretRight size={20} color="#fff" />
          </View>
        </View>

        <View className="h-[1px] bg-[#242424] w-full mb-4" />

        <View className="gap-y-3 pl-1">
          <View className="flex-row items-center">
            <Phone size={18} color="#A1A1AA" />
            <Text className="text-[#D1D5DB] ml-3 text-sm">{item.phone || 'No phone'}</Text>
          </View>

          {activeTab === 'customers' ? (
            <View className="flex-row items-center">
              <Medal size={18} color="#CCF200" />
              <Text className="text-[#CCF200] ml-3 text-sm font-semibold">Platinum Plan</Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Briefcase size={18} color="#CCF200" />
              <Text className="text-[#CCF200] ml-3 text-sm font-semibold">{item.specialization || 'General Fitness'}</Text>
            </View>
          )}

          <View className="flex-row items-center">
            <CalendarBlank size={18} color="#A1A1AA" />
            <Text className="text-[#D1D5DB] ml-3 text-sm">Joined {formattedJoinedDate}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardDismissView className="flex-1 bg-[#0A0A0A]" scrollable={false}>
      <FlatList
        data={loading ? [] : displayData}
        keyExtractor={(item, index) => item.customerId || item.gymTrainerId || `item-${index}`}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        keyboardShouldPersistTaps="handled"
      />
      <Modal visible={planModalVisible} transparent animationType="fade" onRequestClose={() => setPlanModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setPlanModalVisible(false)} />
          <View className="bg-[#121214] rounded-t-3xl overflow-hidden pb-10" style={{ minHeight: 250 }}>
            <View className="w-12 h-1.5 bg-[#27272A] rounded-full self-center mt-3 mb-6" />
            <Text className="text-white text-xl font-bold px-6 mb-4">Select Plan Filter</Text>
            
            <ScrollView className="max-h-80 px-4">
              <Pressable
                className={`flex-row items-center justify-between p-4 rounded-2xl mb-2 ${planFilter === 'All' ? 'bg-[#18181B] border border-[#27272A]' : ''}`}
                onPress={() => {
                  triggerSelectionHaptic();
                  setPlanFilter('All');
                  setPlanModalVisible(false);
                }}
              >
                <Text className={`text-base font-medium ${planFilter === 'All' ? 'text-white' : 'text-[#8E8E93]'}`}>All Plans</Text>
                {planFilter === 'All' && (
                  <View className="w-5 h-5 rounded-full bg-[#C4EF00] items-center justify-center">
                    <View className="w-2.5 h-2.5 rounded-full bg-black" />
                  </View>
                )}
              </Pressable>
              
              {membershipPlans.map((plan: any) => (
                <Pressable
                  key={plan.planId}
                  className={`flex-row items-center justify-between p-4 rounded-2xl mb-2 ${planFilter === plan.planId ? 'bg-[#18181B] border border-[#27272A]' : ''}`}
                  onPress={() => {
                    triggerSelectionHaptic();
                    setPlanFilter(plan.planId);
                    setPlanModalVisible(false);
                  }}
                >
                  <Text className={`text-base font-medium ${planFilter === plan.planId ? 'text-white' : 'text-[#8E8E93]'}`}>
                    {plan.planName}
                  </Text>
                  {planFilter === plan.planId && (
                    <View className="w-5 h-5 rounded-full bg-[#C4EF00] items-center justify-center">
                      <View className="w-2.5 h-2.5 rounded-full bg-black" />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardDismissView>
  );
}
