import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, Image, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, CaretDown, Users, MagnifyingGlass, CaretRight, ArrowsClockwise, User } from 'phosphor-react-native';

import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlansPaginated } from '@/hooks/useGymCustomerMembershipPlans';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

type CustomerMembershipPlan = {
  GymCustomerMembershipPlanId: string;
  customerId: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  gym_customers?: {
    fullName?: string;
    phone?: string;
    users?: {
      profilePhoto?: string;
    };
  };
  gym_membership_plans?: {
    planName?: string;
  };
};

function CustomerRow({ user }: { user: CustomerMembershipPlan }) {
  const [expanded, setExpanded] = useState(false);

  const customer = user.gym_customers || {};
  const name = customer.fullName || 'Unknown';
  const phone = customer.phone || 'No phone';
  const profilePhoto = customer.users?.profilePhoto;
  const idStr = user.customerId ? user.customerId.slice(0, 8).toUpperCase() : 'N/A';

  const planInfo = user.gym_membership_plans || {};
  const planName = planInfo.planName || 'No Plan';

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const joined = formatDate(user.startDate || user.createdAt);
  const valid = formatDate(user.endDate);

  return (
    <Animated.View layout={LinearTransition.duration(250)} className="bg-[#121214] rounded-2xl mb-3 overflow-hidden border border-[#27272A] mx-5">
      <Pressable onPress={() => setExpanded(!expanded)} className="p-4 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1">
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} className="w-12 h-12 rounded-full mr-4 bg-[#27272A]" />
          ) : (
            <View className="w-12 h-12 rounded-full mr-4 bg-[#27272A] items-center justify-center">
              <User size={24} color="#8E8E93" weight="fill" />
            </View>
          )}
          <View>
            <Text className="text-white font-semibold text-sm mb-0.5" numberOfLines={1}>{name}</Text>
            <Text className="text-[#8E8E93] text-[10px]">ID: {idStr}</Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View className={`px-2 py-1 rounded-md mr-3 ${planName.includes('Gold') ? 'bg-[#713F12]/30' :
            planName.includes('Premium') ? 'bg-[#4C1D95]/30' :
              'bg-[#27272A]'
            }`}>
            <Text className={`text-[10px] font-semibold ${planName.includes('Gold') ? 'text-[#EAB308]' :
              planName.includes('Premium') ? 'text-[#A855F7]' :
                'text-[#D4D4D8]'
              }`}>{planName}</Text>
          </View>
          {expanded ? <CaretDown size={14} color="#8E8E93" /> : <CaretRight size={14} color="#8E8E93" />}
        </View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} className="px-4 pb-4 pt-2 border-t border-[#27272A]/50 flex-row justify-between">
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Phone</Text>
            <Text className="text-[#D4D4D8] text-xs">{phone}</Text>
          </View>
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Joined</Text>
            <Text className="text-[#D4D4D8] text-xs">{joined}</Text>
          </View>
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Valid Till</Text>
            <Text className="text-[#D4D4D8] text-xs">{valid}</Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  )
}

export default function CustomersScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [accumulatedCustomers, setAccumulatedCustomers] = useState<CustomerMembershipPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortOrder]);

  const { data, isLoading, refetch, isFetching } = useGymCustomerMembershipPlansPaginated(userId ?? null, page, limit, debouncedSearch, sortOrder);

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedCustomers(data.data);
      } else {
        setAccumulatedCustomers((prev) => {
          const prevIds = new Set(prev.map((c) => c.GymCustomerMembershipPlanId));
          const newUnique = data.data.filter((c: CustomerMembershipPlan) => !prevIds.has(c.GymCustomerMembershipPlanId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [data, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (page === 1) {
      await refetch();
    } else {
      setPage(1);
    }
    setRefreshing(false);
  }, [page, refetch]);

  const renderFooter = () => {
    if (isFetching && page > 1) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#C4EF00" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View className="py-4 items-center">
          <Pressable
            onPress={() => setPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#121214] border border-[#27272A] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#C4EF00" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedCustomers.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#666666] text-xs font-sans">You&apos;ve reached the end of the list</Text>
        </View>
      );
    }
    return null;
  };

  const renderHeader = () => (
    <View>
      <View className="px-5 mt-6 mb-6">
        <View className="bg-[#121214] rounded-3xl p-6">
          <View className="flex-row items-center ">
            <View className="w-8 h-8 rounded-full bg-[#166534]/30 items-center justify-center mr-3">
              <Users size={16} color="#C4EF00" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider">TOTAL ACTIVE CUSTOMERS</Text>
          </View>

          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-white text-4xl font-semibold tracking-tight mb-2">{total}</Text>
              <Text className="text-[#22C55E] text-xs font-semibold">↑ +6.3% <Text className="text-[#8E8E93] text-xs font-normal">vs last month</Text></Text>
            </View>

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

      <View className="px-5 mb-6">
        <View className="flex-row items-center bg-[#121214] rounded-2xl px-4 py-4">
          <MagnifyingGlass size={20} color="#8E8E93" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, phone or membership ID"
            placeholderTextColor="#8E8E93"
            className="flex-1 ml-3 text-white text-sm font-sans"
          />
        </View>
      </View>

      <View className="px-5 mb-4 flex-row justify-between items-center">
        <Text className="text-white font-semibold text-sm">Active Members <Text className="text-[#8E8E93] font-normal">({total})</Text></Text>
        <Pressable onPress={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')} className="flex-row items-center bg-[#18181B] px-3 py-1.5 rounded-full border border-[#27272A]">
          <Text className="text-[#8E8E93] text-[10px] mr-1">Sort:</Text>
          <Text className="text-white text-[10px] font-semibold mr-1.5">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
          <CaretDown size={10} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="flex-row items-center px-5 py-4 border-b border-[#27272A]">
        <Pressable onPress={() => router.back()} className="mr-4">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-semibold text-white tracking-wide">Total Customers</Text>
      </View>

      <FlatList
        data={accumulatedCustomers}
        keyExtractor={(item) => item.GymCustomerMembershipPlanId}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter()}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <CustomerRow user={item} />}
        onEndReached={() => {
          if (hasMore && !isFetching) {
            setPage(p => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View className="py-10 items-center">
              <Text className="text-[#8E8E93]">No customers found</Text>
            </View>
          ) : (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#C4EF00" />
            </View>
          )
        }
      />
    </View>
  );
}
