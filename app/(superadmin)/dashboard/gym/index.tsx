import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, TextInput, Image, ActivityIndicator, FlatList, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MagnifyingGlass,
  Funnel,
  Plus,
  CaretDown,
  MapPin,
  Calendar,
  CaretRight,
  ArrowLeft,
  ArrowsClockwise
} from 'phosphor-react-native';
import { fetchGymOwners } from '@/helpers/gymOwners/gymOwnersHelper';
import { fetchGymCustomers } from '@/helpers/customers/customerHelper';
import { fetchTrainers } from '@/helpers/trainers/trainerHelper';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useGymsPaginated } from '@/hooks/gyms/useGymsPaginated';

export default function GymsListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>(
    (params.filter as 'all' | 'active' | 'inactive') || 'all'
  );

  const [accumulatedGyms, setAccumulatedGyms] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [owners, setOwners] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const fetchRelations = async () => {
      try {
        const [o, t, c] = await Promise.all([
          fetchGymOwners(),
          fetchTrainers(),
          fetchGymCustomers(),
        ]);
        setOwners(o);
        setTrainers(t);
        setCustomers(c);
      } catch (err) {
        console.error('Failed to fetch relations:', err);
      }
    };
    fetchRelations();
  }, []);

  useEffect(() => {
    if (params.filter && ['all', 'active', 'inactive'].includes(params.filter)) {
      setSelectedFilter(params.filter as 'all' | 'active' | 'inactive');
      setPage(1);
    }
  }, [params.filter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 1000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [selectedFilter, sortOrder]);

  const { data, isLoading, refetch, isFetching } = useGymsPaginated(
    page,
    limit,
    debouncedSearch || undefined,
    selectedFilter,
    undefined,
    sortOrder
  );

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedGyms(data.data);
      } else {
        setAccumulatedGyms((prev) => {
          const prevIds = new Set(prev.map((g) => g.gymId));
          const newUnique = data.data.filter((g: any) => !prevIds.has(g.gymId));
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

  const hasMore = page < totalPages;

  const renderFooter = () => {
    if (isFetching) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CCFF00" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View className="py-4 items-center">
          <Pressable
            onPress={() => setPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#111622] border border-[#1F293D] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#CCFF00" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedGyms.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#888888] text-xs font-sans">You've reached the end of the list</Text>
        </View>
      );
    }
    return null;
  };

  const renderHeader = () => (
    <View className="pb-2">
      <View className="mb-4">
        <View className="flex-row items-center gap-2 mb-1">
          {router.canGoBack() && (
            <Pressable
              onPress={() => router.back()}
              className="w-8 h-8 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center">
              <ArrowLeft size={16} color="#FFFFFF" />
            </Pressable>
          )}
          <Text className="text-2xl font-semibold text-white">Registered Gyms</Text>
        </View>
        <Text className={`text-sm text-[#888888] ${router.canGoBack() ? 'ml-10' : ''}`}>
          View and manage all registered gyms.
        </Text>
      </View>

      <View className="flex-row items-center gap-2 mb-4">
        <View className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl px-3.5 py-2.5 flex-row items-center gap-2">
          <MagnifyingGlass size={18} color="#888888" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search gym by name, owner or city..."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white text-sm py-0 font-sans"
          />
        </View>

        <Pressable className="bg-[#111622] border border-[#1F293D] rounded-xl px-3.5 py-2.5 flex-row items-center gap-2 active:opacity-70">
          <Funnel size={16} color="#888888" />
          <Text className="text-white text-sm font-medium">Filter</Text>
          <CaretDown size={12} color="#888888" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between gap-2 mb-4">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-full flex-row items-center justify-center ${selectedFilter === 'all'
              ? 'bg-[#CCFF00]'
              : 'bg-[#111622] border border-[#1F293D]'
              }`}>
            <Text
              className={`text-xs font-semibold ${selectedFilter === 'all' ? 'text-black' : 'text-white'
                }`}>
              All
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('active')}
            className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 ${selectedFilter === 'active'
              ? 'bg-[#CCFF00]'
              : 'bg-[#111622] border border-[#1F293D]'
              }`}>
            <View className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <Text
              className={`text-xs font-medium ${selectedFilter === 'active' ? 'text-black font-semibold' : 'text-white'
                }`}>
              Active
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('inactive')}
            className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 ${selectedFilter === 'inactive'
              ? 'bg-[#CCFF00]'
              : 'bg-[#111622] border border-[#1F293D]'
              }`}>
            <View className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <Text
              className={`text-xs font-medium ${selectedFilter === 'inactive' ? 'text-black font-semibold' : 'text-white'
                }`}>
              Inactive
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(superadmin)/dashboard/register')}
          className="border border-[#CCFF00] bg-[#111622] px-3 py-2 rounded-full flex-row items-center gap-1.5 active:opacity-80">
          <View className="w-4 h-4 rounded-full border border-[#CCFF00] items-center justify-center">
            <Plus size={10} color="#CCFF00" weight="bold" />
          </View>
          <Text className="text-[#CCFF00] font-semibold text-[11px] tracking-wide">
            REGISTER GYM
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xs text-white font-medium">
          Total Gyms: <Text className="text-[#CCFF00] font-semibold">{total}</Text>
        </Text>

        <Pressable 
          onPress={() => setIsSortModalVisible(true)}
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <Text className="text-xs text-[#888888]">Sort by: </Text>
          <Text className="text-xs text-white font-semibold">
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </Text>
          <CaretDown
            size={12}
            color="#FFFFFF"
            style={{ transform: [{ rotate: sortOrder === 'oldest' ? '180deg' : '0deg' }] }}
          />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <FlatList
        data={accumulatedGyms}
        keyExtractor={(gym) => gym.gymId}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={() => (
          isLoading && page === 1 ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#CCFF00" />
            </View>
          ) : (
            <View className="py-12 items-center justify-center">
              <Text className="text-[#888888] text-sm">No gyms registered yet.</Text>
            </View>
          )
        )}
        renderItem={({ item: g }) => {
          const owner = owners.find((o: any) => o.gymId === g.gymId);
          const gymTrainersCount = trainers.filter((t: any) => t.gymId === g.gymId).length;
          const gymCustomersCount = customers.filter((c: any) => c.gymId === g.gymId).length;

          const name = g.gymName;
          const ownerName = owner ? owner.ownerFullname : 'Unknown Owner';
          const location = `${g.city}, ${g.state}`;
          const registeredDate = new Date(g.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          const status = g.isActive ? 'ACTIVE' : 'INACTIVE';
          const members = gymTrainersCount + gymCustomersCount;

          return (
            <Pressable
              onPress={() => router.push(`/(superadmin)/dashboard/gym/${g.gymId}` as any)}
              className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-start gap-3 flex-1 pr-2">
                  {g.logo ? (
                    <Image source={{ uri: g.logo }} className="w-14 h-14 rounded-xl bg-[#111622] border border-[#1F293D]" resizeMode="cover" />
                  ) : (
                    <View className="w-14 h-14 rounded-xl bg-[#111622] border border-[#1F293D] items-center justify-center">
                      <Text className="text-[#888888] text-xs font-semibold">LOGO</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-white leading-5">{name}</Text>
                    <Text className="text-xs text-[#888888] mt-0.5">Owner: {ownerName}</Text>

                    <View className="flex-row items-center gap-1 mt-1.5">
                      <MapPin size={14} color="#888888" />
                      <Text className="text-xs text-[#888888]">{location}</Text>
                    </View>

                    <View className="flex-row items-center gap-1 mt-1">
                      <Calendar size={14} color="#888888" />
                      <Text className="text-xs text-[#888888]">
                        Registered: {registeredDate}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className={`px-2.5 py-1 rounded-full flex-row items-center gap-1.5 ${status === 'ACTIVE'
                  ? 'bg-[#064E3B]/40 border border-[#059669]/30'
                  : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                  <View className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-[#10B981]' : 'bg-red-500'}`} />
                  <Text className={`text-[10px] font-semibold tracking-wider ${status === 'ACTIVE' ? 'text-[#10B981]' : 'text-red-500'}`}>
                    {status}
                  </Text>
                </View>
              </View>

              <View className="h-[1px] bg-[#1F293D] my-3.5" />

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-8">
                  <View>
                    <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mb-0.5">
                      MEMBERS
                    </Text>
                    <Text className="text-white text-lg font-semibold">{members}</Text>
                  </View>

                  <View>
                    <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mb-0.5">
                      TRAINERS
                    </Text>
                    <Text className="text-white text-lg font-semibold">{gymTrainersCount}</Text>
                  </View>
                </View>

                <CaretRight size={18} color="#888888" />
              </View>
            </Pressable>
          );
        }}
      />

      <Modal
        visible={isSortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setIsSortModalVisible(false)}
        >
          <View className="bg-[#111622] rounded-t-3xl p-6 border-t border-[#1F293D]">
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-[#2C3854] rounded-full" />
            </View>

            <Text className="text-white text-lg font-bold mb-4">Sort By</Text>

            <Pressable
              onPress={() => {
                setSortOrder('newest');
                setIsSortModalVisible(false);
              }}
              className="py-4 border-b border-[#1F293D] flex-row items-center justify-between"
            >
              <Text className={`text-base ${sortOrder === 'newest' ? 'text-[#CCFF00] font-bold' : 'text-white'}`}>
                Newest First
              </Text>
              {sortOrder === 'newest' && <View className="w-2 h-2 rounded-full bg-[#CCFF00]" />}
            </Pressable>

            <Pressable
              onPress={() => {
                setSortOrder('oldest');
                setIsSortModalVisible(false);
              }}
              className="py-4 flex-row items-center justify-between mb-4"
            >
              <Text className={`text-base ${sortOrder === 'oldest' ? 'text-[#CCFF00] font-bold' : 'text-white'}`}>
                Oldest First
              </Text>
              {sortOrder === 'oldest' && <View className="w-2 h-2 rounded-full bg-[#CCFF00]" />}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

