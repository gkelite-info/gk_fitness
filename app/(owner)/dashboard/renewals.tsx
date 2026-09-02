import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, TextInput, Image, FlatList, ActivityIndicator } from 'react-native';
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
  User,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlans, useGymCustomerMembershipPlansPaginated } from '@/hooks/useGymCustomerMembershipPlans';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function MembershipRenewalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  // Unpaginated stats hook
  const { data: allPlans, refetch: refetchStats } = useGymCustomerMembershipPlans(userId ?? null);

  // Pagination & Search States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [refreshing, setRefreshing] = useState(false);
  const [accumulatedPlans, setAccumulatedPlans] = useState<any[]>([]);

  // Search Debounce (600ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 600);
    return () => clearTimeout(handler);
  }, [search]);

  // Paginated list hook
  const { data: paginatedData, refetch: refetchPaginated, isFetching } = useGymCustomerMembershipPlansPaginated(
    userId ?? null,
    page,
    limit,
    debouncedSearch
  );

  const total = paginatedData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Accumulate Plans for Infinite Scroll
  useEffect(() => {
    if (paginatedData?.data) {
      if (page === 1) {
        setAccumulatedPlans(paginatedData.data);
      } else {
        setAccumulatedPlans((prev) => {
          const prevIds = new Set(prev.map((p) => p.GymCustomerMembershipPlanId));
          const newUnique = paginatedData.data.filter((p: any) => !prevIds.has(p.GymCustomerMembershipPlanId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [paginatedData, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (page === 1) {
      await Promise.all([refetchStats(), refetchPaginated()]);
    } else {
      setPage(1);
      await refetchStats();
    }
    setRefreshing(false);
  }, [page, refetchStats, refetchPaginated]);

  const handleEndReached = () => {
    if (page < totalPages && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  // Date Logic for Stats
  const today = new Date();
  const todayYYYYMMDD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfWeekYYYYMMDD = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;

  const currentMonthStartYYYYMMDD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  let renewedTodayCount = 0;
  let renewedThisWeekCount = 0;
  let revenueThisMonth = 0;

  const validPlans = (allPlans || []).filter((p: any) => p.gym_customers && p.gym_membership_plans);

  validPlans.forEach((plan: any) => {
    const createdAtStr = plan.createdAt ? plan.createdAt.split('T')[0] : '';
    if (createdAtStr === todayYYYYMMDD) {
      renewedTodayCount++;
    }
    if (createdAtStr >= startOfWeekYYYYMMDD && createdAtStr <= todayYYYYMMDD) {
      renewedThisWeekCount++;
    }
    if (createdAtStr >= currentMonthStartYYYYMMDD) {
      revenueThisMonth += (plan.gym_membership_plans?.price || 0);
    }
  });

  const getExpiresIn = (endDate: string) => {
    if (!endDate) return { text: 'Unknown', color: '#A1A1AA' };
    const end = new Date(endDate);
    const now = new Date();
    end.setHours(0, 0, 0, 0);
    const todayZero = new Date(now);
    todayZero.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - todayZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Expired', color: '#EF4444' };
    if (diffDays === 0) return { text: 'Today', color: '#EF4444' };
    if (diffDays <= 3) return { text: `${diffDays} Days`, color: '#F59E0B' };
    return { text: `${diffDays} Days`, color: '#A1A1AA' };
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (dateStr === todayYYYYMMDD) return `Renewed Today • ${timeStr}`;

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayYYYYMMDD = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (dateStr === yesterdayYYYYMMDD) return `Renewed Yesterday • ${timeStr}`;

    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `Renewed ${diffDays} Days Ago • ${timeStr}`;

    return `Renewed on ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • ${timeStr}`;
  };

  const getRandomColor = (name: string) => {
    const colors = ['#C4EF00', '#A1A1AA', '#C084FC', '#F59E0B', '#3B82F6'];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  const recentRenewals = validPlans
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((item: any) => {
      const planName = item.gym_membership_plans?.planName || 'Unknown Plan';
      return {
        id: item.GymCustomerMembershipPlanId,
        name: item.gym_customers?.fullName || 'Unknown',
        plan: planName,
        planColor: getRandomColor(planName),
        time: getRelativeTime(item.createdAt),
        validTill: item.endDate ? new Date(item.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        paymentMethod: 'Credit Card',
        paymentIconType: 'card',
        img: item.gym_customers?.users?.profilePhoto,
      };
    });
  const filteredRecent = recentRenewals.filter((item: any) => item.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const renderHeader = () => (
    <View>
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] rounded-full items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-2xl font-semibold text-white tracking-tight">Membership Renewals</Text>
      </View>

      <View className="flex-row items-center bg-[#161616] rounded-2xl px-4 py-3.5 mb-6 border border-[#27272A]">
        <MagnifyingGlass size={20} color="#8E8E93" weight="bold" />
        <TextInput
          placeholder="Search member..."
          placeholderTextColor="#8E8E93"
          className="flex-1 ml-3 text-white text-[15px] font-medium p-0"
          value={search}
          onChangeText={setSearch}
          selectionColor="#C4EF00"
        />
      </View>

      <View className="flex-row justify-between mb-8 gap-3 items-stretch">
        <View className="flex-1 bg-[#161616] rounded-2xl p-4 items-center justify-center min-h-[120px]">
          <View className="w-10 h-10 rounded-xl bg-[#22C55E1A] items-center justify-center mb-3">
            <ArrowsClockwise size={20} color="#22C55E" weight="bold" />
          </View>
          <Text className="text-[#8E8E93] text-[9px] font-medium mb-1.5 text-center" numberOfLines={1} adjustsFontSizeToFit>Renewed Today</Text>
          <Text className="text-white text-xl font-semibold" numberOfLines={1} adjustsFontSizeToFit>{renewedTodayCount}</Text>
        </View>

        <View className="flex-1 bg-[#161616] rounded-2xl p-4 items-center justify-center min-h-[120px]">
          <View className="w-10 h-10 rounded-xl bg-[#3B82F61A] items-center justify-center mb-3">
            <Calendar size={20} color="#3B82F6" weight="fill" />
          </View>
          <Text className="text-[#8E8E93] text-[9px] font-medium mb-1.5 text-center" numberOfLines={1} adjustsFontSizeToFit>Renewed This Week</Text>
          <Text className="text-white text-xl font-semibold" numberOfLines={1} adjustsFontSizeToFit>{renewedThisWeekCount}</Text>
        </View>

        <View className="flex-1 bg-[#161616] rounded-2xl p-4 items-center justify-center min-h-[120px]">
          <View className="w-10 h-10 rounded-xl bg-[#A855F71A] items-center justify-center mb-3">
            <CreditCard size={20} color="#A855F7" weight="fill" />
          </View>
          <Text className="text-[#8E8E93] text-[9px] font-medium mb-1.5 text-center" numberOfLines={1} adjustsFontSizeToFit>Revenue from Renewals</Text>
          <Text className="text-white text-lg font-semibold" numberOfLines={1} adjustsFontSizeToFit>{revenueThisMonth.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-white">Recent Renewals</Text>
        {/* <Pressable className="flex-row items-center active:opacity-70">
          <Text className="text-[#8E8E93] text-xs font-medium mr-1">View All</Text>
          <CaretRight size={12} color="#8E8E93" weight="bold" />
        </Pressable> */}
      </View>

      <View className="mb-8">
        {filteredRecent.length === 0 && <Text className="text-[#A1A1AA] text-center mt-4">No recent renewals found.</Text>}
        {filteredRecent.map((item: any) => (
          <View key={item.id} className="bg-[#161616] rounded-2xl p-4 flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              {item.img ? (
                <Image source={{ uri: item.img }} className="w-[46px] h-[46px] rounded-full mr-3 bg-[#27272A]" />
              ) : (
                <View className="w-[46px] h-[46px] rounded-full mr-3 bg-[#27272A] items-center justify-center">
                  <User size={20} color="#8E8E93" />
                </View>
              )}
              <View>
                <Text className="text-white font-semibold text-base mb-0.5">{item.name}</Text>
                <Text className="text-[11px] font-semibold mb-1" style={{ color: item.planColor }}>{item.plan}</Text>
                <Text className="text-[#8E8E93] text-[10px]">{item.time}</Text>
              </View>
            </View>

            <View className="items-end justify-center border-l border-[#27272A] pl-4 py-1">
              <Text className="text-[#8E8E93] text-[9px] mb-0.5">Valid Till</Text>
              <Text className="text-white font-semibold text-xs mb-2.5">{item.validTill}</Text>
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

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-white">Upcoming Renewals</Text>
        {/* <Pressable className="flex-row items-center active:opacity-70">
          <Text className="text-[#8E8E93] text-xs font-medium mr-1">View All</Text>
          <CaretRight size={12} color="#8E8E93" weight="bold" />
        </Pressable> */}
      </View>

      <View className="flex-row items-center p-4 border-b border-[#27272A] bg-[#121214] rounded-t-2xl border-t border-l border-r">
        <Text className="text-[#8E8E93] text-xs font-medium flex-[2]">Member</Text>
        <Text className="text-[#8E8E93] text-xs font-medium flex-[2]">Plan</Text>
        <Text className="text-[#8E8E93] text-xs font-medium flex-1 text-right">Expires In</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (isFetching) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#C4EF00" />
        </View>
      );
    }
    if (page < totalPages) {
      return (
        <View className="py-4 items-center">
          <Pressable
            onPress={() => setPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#161616] border border-[#27272A] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#C4EF00" weight="bold" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedPlans.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#8E8E93] text-xs font-medium">You've reached the end of the renewals</Text>
        </View>
      );
    }
    return null;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const planName = item.gym_membership_plans?.planName || 'Unknown Plan';
    const expiresInfo = getExpiresIn(item.endDate);

    return (
      <View
        className={`flex-row items-center p-4 bg-[#161616] border-l border-r border-[#27272A] ${index === accumulatedPlans.length - 1 ? 'border-b rounded-b-2xl mb-8' : 'border-b'
          }`}
      >
        <Text className="text-white font-semibold text-[13px] flex-[2] pr-2" numberOfLines={1}>
          {item.gym_customers?.fullName || 'Unknown'}
        </Text>

        <View className="flex-[2] pr-2">
          <Text className="font-semibold text-[10px] leading-4" style={{ color: getRandomColor(planName) }}>
            {planName.replace(' ', '\n')}
          </Text>
        </View>

        <Text
          className="font-semibold text-xs flex-1 text-right"
          style={{ color: expiresInfo.color }}
        >
          {expiresInfo.text}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top }}>
      <FlatList
        data={accumulatedPlans}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.GymCustomerMembershipPlanId || index.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter()}
        ListEmptyComponent={
          !isFetching ? (
            <View className="p-4 border-b border-l border-r border-[#27272A] bg-[#161616] rounded-b-2xl mb-8">
              <Text className="text-[#A1A1AA] text-center">No upcoming renewals found.</Text>
            </View>
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
