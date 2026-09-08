import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, Image, Pressable, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { CaretLeft, MagnifyingGlass, User, Users, Phone, CaretRight, ArrowsClockwise } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { usePaginatedAssignedCustomersByTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function PTCustomersScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [accumulatedCustomers, setAccumulatedCustomers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 1000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, refetch, isFetching } = usePaginatedAssignedCustomersByTrainer(userId ?? undefined, page, limit, debouncedSearch);

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedCustomers(data.data);
      } else {
        setAccumulatedCustomers((prev) => {
          const prevIds = new Set(prev.map((c: any) => c.customerTrainerId));
          const newUnique = data.data.filter((c: any) => !prevIds.has(c.customerTrainerId));
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

  const expiringSoonCount = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    return accumulatedCustomers.filter((assignment: any) => {
      if (!assignment.expiryOn) return false;
      const expiryDate = new Date(assignment.expiryOn);
      return expiryDate >= now && expiryDate <= sevenDaysFromNow;
    }).length;
  }, [accumulatedCustomers]);

  const renderFooter = () => {
    if (isFetching && page > 1) {
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
            className="flex-row items-center gap-x-2 bg-[#141414] border border-[#2A2A2A] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#CCFF00" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedCustomers.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#666666] text-xs font-sans">You've reached the end</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="flex-row items-center px-5 pt-5 pb-4">
        <Pressable onPress={() => router.replace('/(trainer)/home' as any)} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#CCFF00" />
        </Pressable>
        <Text className="flex-1 text-white text-xl font-semibold text-center mr-6">PT Customers</Text>
      </View>

      <View className="flex-1">
        <FlatList
          data={accumulatedCustomers}
          keyExtractor={(item) => item.customerTrainerId}
          refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListHeaderComponent={
            <>
              <View className="bg-[#18181B] rounded-[24px] p-5 border border-[#27272A] flex-row mb-6">
                <View className="flex-1 flex-row items-center border-r border-[#27272A] pr-4">
                  <View className="w-14 h-14 rounded-full border border-[#CCFF00] items-center justify-center mr-4">
                    <User size={28} color="#CCFF00" />
                  </View>
                  <View>
                    <Text className="text-[#A3A3A3] text-sm">Total PT Customers</Text>
                    <Text className="text-white text-3xl font-semibold mt-1 mb-1">{total}</Text>
                    <Text className="text-[#A3A3A3] text-xs">Assigned to you</Text>
                  </View>
                </View>

                <View className="pl-6 items-center justify-center min-w-[90px]">
                  <Users size={24} color="#A3A3A3" style={{ marginBottom: 2 }} />
                  <Text className="text-white text-2xl font-semibold">{expiringSoonCount}</Text>
                  <Text className="text-[#A3A3A3] text-[10px] mt-1">Expiring soon</Text>
                </View>
              </View>

              <View className="flex-row items-center bg-[#18181B] rounded-xl px-4 py-1 mb-6 border border-[#27272A]">
                <MagnifyingGlass size={20} color="#A3A3A3" />
                <TextInput
                  placeholder="Search customers..."
                  placeholderTextColor="#A3A3A3"
                  className="flex-1 text-white ml-3 text-base font-sans"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            isLoading && page === 1 ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#CCFF00" />
              </View>
            ) : (
              <View className="py-10 items-center justify-center">
                <Text className="text-[#A3A3A3] text-sm">No customers found.</Text>
              </View>
            )
          }
          renderItem={({ item: assignment }) => {
            const customer = assignment.customer;
            if (!customer) return null;

            const profilePic = customer.users?.profilePhoto || null;
            const formattedDate = assignment.assignedOn ? new Date(assignment.assignedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown';

            const now = new Date();
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(now.getDate() + 7);

            let isExpiring = false;
            if (assignment.expiryOn) {
              const expiryDate = new Date(assignment.expiryOn);
              isExpiring = expiryDate >= now && expiryDate <= sevenDaysFromNow;
            }

            return (
              <CustomerCard
                key={assignment.customerTrainerId}
                customerId={customer.customerId || assignment.customerId}
                name={customer.fullName || 'Unknown'}
                id={customer.customId || 'No ID'}
                phone={customer.phone || 'No Phone'}
                status={isExpiring ? "Expiring Soon" : "Active"}
                dateText="Assigned on"
                date={formattedDate}
                image={profilePic}
                isExpiring={isExpiring}
              />
            );
          }}
        />
      </View>
    </View>
  );
}

function CustomerCard({ customerId, name, id, phone, status, dateText, date, image, isExpiring }: any) {
  const router = useRouter();

  const handlePress = () => {
    if (customerId) {
      router.push({
        pathname: '/(trainer)/weeklyWorkoutPlan',
        params: { customerId }
      } as any);
    }
  };

  return (
    <Pressable onPress={handlePress} className="bg-[#18181B] rounded-[24px] p-4 border border-[#27272A] mb-4 flex-row items-center active:opacity-80">
      <View className="w-16 h-16 bg-gray-700 rounded-full mr-4 overflow-hidden items-center justify-center">
        {image ? (
          <Image source={{ uri: image }} className="w-full h-full" />
        ) : (
          <User size={24} color="#A3A3A3" weight="fill" />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-start justify-between mb-1">
          <View>
            <Text className="text-white text-lg font-semibold">{name}</Text>
            <View className="bg-[#09090B] px-2 py-1 rounded-md self-start mt-1.5 border border-[#27272A]/50">
              <Text className="text-[#A3A3A3] text-[10px] font-medium">{id}</Text>
            </View>
          </View>
          <View className={`px-2 py-1 rounded-md border ${isExpiring ? 'bg-[#09090B] border-[#F59E0B]/20' : 'bg-[#09090B] border-[#CCFF00]/20'}`}>
            <Text className={`text-[10px] font-semibold ${isExpiring ? 'text-[#F59E0B]' : 'text-[#CCFF00]'}`}>{status}</Text>
          </View>
        </View>

        <View className="flex-row items-end justify-between mt-2">
          <View className="flex-row items-center">
            <Phone size={14} color="#A3A3A3" style={{ marginRight: 1.5 }} />
            <Text className="text-[#A3A3A3] text-xs font-medium">{phone}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="items-end mr-3">
              <Text className="text-[#A3A3A3] text-[10px] mb-0.5">{dateText}</Text>
              <Text className="text-white text-xs font-semibold">{date}</Text>
            </View>
            <CaretRight size={16} color="#A3A3A3" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
