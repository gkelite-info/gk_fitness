import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CaretLeft, List, MagnifyingGlass, Wallet, Receipt, TrendUp, CaretRight, Plus } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymPayments, useGymPaymentsPaginated } from '@/hooks/useGymPayments';

const PaymentMethodBadge = ({ method }: { method: string }) => {
  if (method === 'gpay') {
    return (
      <View className="bg-white px-2 py-0.5 rounded-sm items-center justify-center flex-row h-5 border border-gray-200">
        <Text className="text-[9px] font-semibold text-blue-600">G</Text>
        <Text className="text-[9px] font-semibold text-gray-800">Pay</Text>
      </View>
    );
  }
  if (method === 'phonepe') {
    return (
      <View className="bg-[#5f259f] px-2 py-0.5 rounded-sm items-center justify-center h-5">
        <Text className="text-[9px] font-semibold text-white tracking-widest">PhonePe</Text>
      </View>
    );
  }
  if (method === 'paytm') {
    return (
      <View className="bg-white px-1.5 py-0.5 rounded-sm items-center justify-center h-5 border border-blue-200">
        <Text className="text-[9px] font-semibold text-[#00b9f1]">Pay</Text>
        <Text className="text-[9px] font-semibold text-[#002e6e] mt-[-2px]">tm</Text>
      </View>
    );
  }
  if (method === 'qrscan') {
    return (
      <View className="border border-[#CCF200] px-1 py-0.5 rounded-sm items-center justify-center h-5">
        <Text className="text-[8px] font-semibold text-[#CCF200] uppercase tracking-wider">QR PAYMENT</Text>
      </View>
    );
  }
  if (method === 'upi') {
    return (
      <View className="border border-[#CCF200] px-1 py-0.5 rounded-sm items-center justify-center h-5">
        <Text className="text-[9px] font-semibold text-[#CCF200]">UPI</Text>
      </View>
    );
  }
  return (
    <View className="bg-gray-700 px-2 py-0.5 rounded-sm items-center justify-center h-5">
      <Text className="text-[9px] font-semibold text-white uppercase">{method}</Text>
    </View>
  );
};

export default function PaymentsListScreen() {
  const { userId } = useUser();
  const [activeTab, setActiveTab] = useState<'All' | 'Today' | 'This Month'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [accumulatedPayments, setAccumulatedPayments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 1000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setAccumulatedPayments([]);
  }, [activeTab, debouncedSearch]);

  const filters = { tab: activeTab, searchQuery: debouncedSearch };
  const { data: paginatedData, isLoading: isPaginatedLoading, refetch: refetchPaginated, isFetching } = useGymPaymentsPaginated(userId || null, page, limit, filters);

  const { data: allPayments = [], refetch: refetchAll } = useGymPayments(userId || null);

  const total = paginatedData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    if (paginatedData?.data) {
      if (page === 1) {
        setAccumulatedPayments(paginatedData.data);
      } else {
        setAccumulatedPayments((prev) => {
          const prevIds = new Set(prev.map((p) => p.gymPaymentId));
          const newUnique = paginatedData.data.filter((p: any) => !prevIds.has(p.gymPaymentId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [paginatedData, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([refetchPaginated(), refetchAll()]);
    setRefreshing(false);
  }, [refetchPaginated, refetchAll]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayStr = now.toLocaleDateString('en-CA');

  const thisMonthRevenue = allPayments.reduce((sum: number, payment: any) => {
    if (!payment.paymentDate) return sum;
    const pDate = new Date(payment.paymentDate);
    if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
      return sum + (payment.amountPaid || 0);
    }
    return sum;
  }, 0);

  const todaysPaymentsCount = allPayments.filter((payment: any) => {
    return payment.paymentDate === todayStr;
  }).length;

  const renderPaymentItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => (router as any).push(`/(owner)/dashboard/payments/${item.gymPaymentId}`)}
      className="flex-row items-center justify-between py-4 border-b border-[#1A1A1A] active:opacity-70 mx-5"
    >
      <View className="w-[30%]">
        <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1}>{item.gym_customers?.fullName || 'Unknown'}</Text>
        <Text className="text-[#888888] text-[10px] font-medium">{item.paymentTime}</Text>
      </View>
      <View className="w-[25%] items-start">
        <Text className="text-[#E4E4E7] text-xs font-medium mb-1" numberOfLines={1}>{item.gym_membership_plans?.planName || 'N/A'}</Text>
        <Text className="text-[#888888] text-[10px] font-medium">{item.gym_membership_plans?.durationMonths || ''}</Text>
      </View>
      <View className="w-[20%] items-start">
        <Text className="text-white text-sm font-semibold">₹{item.amountPaid?.toLocaleString()}</Text>
      </View>
      <View className="w-[20%] items-center flex-row justify-end">
        <PaymentMethodBadge method={item.paymentMethod?.toLowerCase()} />
        <CaretRight size={14} color="#555555" weight="bold" style={{ marginLeft: 8 }} />
      </View>
    </Pressable>
  );

  const hasMore = page < totalPages;

  const renderFooter = () => {
    if (isFetching && page > 1) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CCF200" />
        </View>
      );
    }
    if (!isPaginatedLoading && accumulatedPayments.length === 0) {
      return <Text className="text-[#888888] text-center mt-10">No payments found.</Text>;
    }
    return null;
  };

  const renderHeader = () => (
    <View>
      <View className="flex-row px-5 gap-3 mb-6 mt-2">
        <View className="flex-1 bg-[#141414] border border-[#27272A] rounded-2xl p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 items-center justify-center">
              <Wallet size={18} color="#CCF200" weight="fill" />
            </View>
            <View className="w-6 h-6 rounded-md bg-[#242611] items-center justify-center">
              <TrendUp size={14} color="#CCF200" weight="bold" />
            </View>
          </View>
          <Text className="text-[#A1A1AA] text-[10px] font-semibold mb-1 uppercase tracking-wider">
            Today's Revenue <Text className="text-[#555555]">(THIS MONTH)</Text>
          </Text>
          <Text className="text-white text-xl font-semibold">₹{thisMonthRevenue.toLocaleString()}</Text>
        </View>
        <View className="flex-1 bg-[#141414] border border-[#27272A] rounded-2xl p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 items-center justify-center">
              <Receipt size={18} color="#CCF200" weight="fill" />
            </View>
            <View className="w-6 h-6 rounded-md bg-[#242611] items-center justify-center">
              <TrendUp size={14} color="#CCF200" weight="bold" />
            </View>
          </View>
          <Text className="text-[#A1A1AA] text-[10px] font-semibold mb-1 uppercase tracking-wider">
            Today's Payments
          </Text>
          <Text className="text-white text-xl font-semibold">{todaysPaymentsCount}</Text>
        </View>
      </View>

      <View className="px-5 mb-5">
        <View className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl flex-row items-center px-4 py-3 h-12">
          <MagnifyingGlass size={18} color="#8E8E93" weight="bold" />
          <TextInput
            placeholder="Search member..."
            placeholderTextColor="#8E8E93"
            className="flex-1 text-white ml-3 text-sm font-medium h-full"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View className="flex-row border-b border-[#27272A] mx-5 mb-4">
        {['All', 'Today', 'This Month'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              className="flex-1 items-center pb-3"
            >
              <Text className={`text-sm font-semibold ${isActive ? 'text-[#CCF200]' : 'text-[#888888]'}`}>
                {tab}
              </Text>
              {isActive && (
                <View className="absolute bottom-[-1px] w-full h-[2px] bg-[#CCF200]" />
              )}
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row px-5 mb-2">
        <Text className="w-[30%] text-[#888888] text-[9px] font-semibold uppercase tracking-wider">MEMBER</Text>
        <Text className="w-[25%] text-[#888888] text-[9px] font-semibold uppercase tracking-wider">MEMBERSHIP</Text>
        <Text className="w-[20%] text-[#888888] text-[9px] font-semibold uppercase tracking-wider">AMOUNT</Text>
        <Text className="w-[20%] text-[#888888] text-[9px] font-semibold uppercase tracking-wider text-right pr-2">METHOD</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-[#1A1A1A] rounded-full items-center justify-center active:opacity-70">
            <CaretLeft size={20} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-semibold">Payments</Text>
        </View>
      </View>

      {isPaginatedLoading && page === 1 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#CCF200" />
        </View>
      ) : (
        <FlatList
          data={accumulatedPayments}
          keyExtractor={(item) => item.gymPaymentId}
          renderItem={renderPaymentItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          onEndReached={() => {
            if (hasMore && !isFetching) {
              setPage((prev) => prev + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      <View className="absolute right-5" style={{ bottom: 100 }}>
        <TouchableOpacity
          onPress={() => router.push('/(owner)/dashboard/payments/add')}
          className="bg-[#CCF200] rounded-full flex-row items-center px-4 py-3 shadow-lg shadow-black/50 active:opacity-80"
          style={{ elevation: 5 }}
        >
          <Plus size={16} color="#000000" weight="bold" />
          <Text className="text-black font-semibold text-sm ml-2">Add Payment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
