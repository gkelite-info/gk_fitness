import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, FlatList, Image } from 'react-native';
import { ArrowLeft, MagnifyingGlass, Funnel, CalendarBlank, ArrowRight, User } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { usePaginatedAssignedCustomersByTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function CreateWorkoutPlanScreen() {
  const router = useRouter();
  const { userId } = useUser();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [accumulatedCustomers, setAccumulatedCustomers] = useState<any[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching, refetch } = usePaginatedAssignedCustomersByTrainer(userId ?? undefined, page, limit, debouncedSearch);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (page === 1) {
      await refetch();
    } else {
      setPage(1);
    }
    setRefreshing(false);
  }, [page, refetch]);

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedCustomers(data.data);
      } else {
        setAccumulatedCustomers((prev) => {
          const prevIds = new Set(prev.map((a: any) => a.customerTrainerId));
          const newUnique = data.data.filter((a: any) => !prevIds.has(a.customerTrainerId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [data, page]);

  const hasMore = page < totalPages;

  const renderHeader = () => (
    <>
      <View className="flex-row items-center mb-8 pt-10">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full border border-[#2A2A2A] items-center justify-center mr-4 active:opacity-70 bg-[#1A1A1A]"
        >
          <ArrowLeft size={20} color="#CCFF00" />
        </Pressable>
        <View>
          <Text className="text-white text-2xl font-semibold">Create Workout Plan</Text>
          <Text className="text-[#6B7280] text-[11px] mt-1">Select a PT customer to create a workout plan for.</Text>
        </View>
      </View>

      <View className="flex-row items-center mb-6">
        <View className="flex-1 flex-row items-center bg-[#1A1A1A] rounded-2xl px-4 py-1.5 border border-[#2A2A2A] mr-3">
          <MagnifyingGlass size={20} color="#6B7280" />
          <TextInput
            placeholder="Search assigned customers.."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white ml-3 text-sm font-sans"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable className="w-[52px] h-[52px] rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] items-center justify-center active:opacity-70">
          <Funnel size={20} color="#CCFF00" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-base font-medium">Assigned PT Customers</Text>
        <Text className="text-[#CCFF00] text-xs font-semibold">{total} Customers</Text>
      </View>

      {!isLoading && accumulatedCustomers.length === 0 && (
        <View className="py-10 items-center justify-center">
          <Text className="text-[#6B7280] text-sm">No customers found.</Text>
        </View>
      )}
    </>
  );

  const renderFooter = () => {
    if (isFetching) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CCFF00" />
        </View>
      );
    }
    if (!hasMore && accumulatedCustomers.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#6B7280] text-xs font-medium">You've reached the end of the list</Text>
        </View>
      );
    }
    return null;
  };

  const renderItem = ({ item }: { item: any }) => {
    const customer = item.customer;
    if (!customer) return null;

    const isSelected = selectedCustomerId === customer.customerId;
    const profilePic = customer.users?.profilePhoto;

    return (
      <Pressable
        onPress={() => setSelectedCustomerId(customer.customerId)}
        className={`bg-[#1A1A1A] rounded-[20px] p-4 mb-3 flex-row items-center border active:opacity-80 ${isSelected ? 'border-[#CCFF00]' : 'border-[#1A1A1A]'}`}
      >
        <View className="w-14 h-14 bg-[#2A2A2A] rounded-full items-center justify-center mr-4 overflow-hidden border border-[#3A3A3A]">
          {profilePic ? (
            <Image source={{ uri: profilePic }} className="w-full h-full" />
          ) : (
            <User size={24} color="#6B7280" weight="fill" />
          )}
        </View>

        <View className="flex-1">
          <Text className="text-white text-[17px] font-semibold mb-1">{customer.fullName || 'Unknown'}</Text>
          <View className="bg-[#2A2A2A] self-start px-2 py-0.5 rounded-md mb-2">
            <Text className="text-[#6B7280] text-[10px] font-medium">{customer.customId || 'No ID'}</Text>
          </View>
          <View className="flex-row items-center">
            <CalendarBlank size={12} color="#CCFF00" weight="regular" />
            <Text className="text-[#CCFF00] text-[11px] ml-1.5 font-medium">No workout plan yet</Text>
          </View>
        </View>

        <View className={`w-[22px] h-[22px] rounded-full border-[2px] items-center justify-center ${isSelected ? 'border-[#CCFF00]' : 'border-[#6B7280]'}`}>
          {isSelected && <View className="w-[12px] h-[12px] rounded-full bg-[#CCFF00]" />}
        </View>
      </Pressable>
    );
  };

  const handleContinue = () => {
    if (!selectedCustomerId) return;
    const selectedCustomer = accumulatedCustomers.find((c: any) => c.customer?.customerId === selectedCustomerId)?.customer;
    const customerName = selectedCustomer?.fullName || 'Customer';
    
    router.push({
      pathname: '/(trainer)/workoutPlan' as any,
      params: { targetUserId: selectedCustomerId, customerName },
    });
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <FlatList
        data={accumulatedCustomers}
        keyExtractor={(item) => item.customerTrainerId}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          if (hasMore && !isFetching) {
            setPage((p) => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
      />
      <View className="absolute bottom-28 left-5 right-5">
        <Pressable
          onPress={handleContinue}
          disabled={!selectedCustomerId}
          className={`rounded-[24px] flex-row items-center justify-center py-4 active:opacity-80 ${
            selectedCustomerId ? 'bg-[#CCFF00]' : 'bg-[#2A2A2A] opacity-50'
          }`}
        >
          <Text className={`text-[17px] font-semibold mr-2 ${selectedCustomerId ? 'text-black' : 'text-[#6B7280]'}`}>
            Continue
          </Text>
          <ArrowRight size={20} color={selectedCustomerId ? '#000' : '#6B7280'} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}
