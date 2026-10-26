import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, TouchableOpacity, FlatList, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  CaretLeft,
  MagnifyingGlass,
  Wallet,
  Receipt,
  TrendUp,
  CaretRight,
  Plus,
  CalendarBlank,
  CaretDown,
  Lightning,
  CreditCard,
  Money,
  Buildings,
  Check,
  X
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymPayments, useGymPaymentsPaginated } from '@/hooks/useGymPayments';
import { DatePickerModal } from '@/components/DatePickerModal';
import { format } from 'date-fns';

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

type DateFilterType = 'today' | 'month' | '3months' | '6months' | 'year' | 'custom' | 'all';

const DATE_OPTIONS: { id: DateFilterType; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'month', label: 'This Month' },
  { id: '3months', label: '3 Months' },
  { id: '6months', label: '6 Months' },
  { id: 'year', label: '1 Year' },
  { id: 'custom', label: 'Pick a Date' },
  { id: 'all', label: 'All Time' },
];

export default function PaymentsListScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const flatListRef = useRef<FlatList>(null);
  const [dateRange, setDateRange] = useState<DateFilterType>('today');
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [accumulatedPayments, setAccumulatedPayments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setAccumulatedPayments([]);
  }, [dateRange, customDate, debouncedSearch]);

  const currentRangeLabel = useMemo(() => {
    if (dateRange === 'custom') {
      try {
        return format(new Date(customDate), 'dd MMM yyyy');
      } catch {
        return customDate;
      }
    }
    const found = DATE_OPTIONS.find((o) => o.id === dateRange);
    return found ? found.label : 'Today';
  }, [dateRange, customDate]);

  const filters = useMemo(() => ({
    searchQuery: debouncedSearch,
    dateRange: dateRange,
    customDate: dateRange === 'custom' ? customDate : undefined,
  }), [debouncedSearch, dateRange, customDate]);

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

  const filteredAllPayments = useMemo(() => {
    if (!allPayments || allPayments.length === 0) return [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return allPayments.filter((p: any) => {
      if (!p.paymentDate) return false;
      const pDateStr = p.paymentDate.split('T')[0];

      if (dateRange === 'today') {
        return pDateStr === todayStr;
      }
      if (dateRange === 'month') {
        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        return pDateStr >= firstDay;
      }
      if (dateRange === '3months') {
        const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        return pDateStr >= dateStr;
      }
      if (dateRange === '6months') {
        const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        return pDateStr >= dateStr;
      }
      if (dateRange === 'year') {
        const firstDayOfYear = `${now.getFullYear()}-01-01`;
        return pDateStr >= firstDayOfYear;
      }
      if (dateRange === 'custom') {
        return pDateStr === customDate;
      }
      return true;
    });
  }, [allPayments, dateRange, customDate]);

  const periodRevenue = useMemo(() => {
    return filteredAllPayments.reduce((sum: number, payment: any) => {
      return sum + (Number(payment.amountPaid) || 0);
    }, 0);
  }, [filteredAllPayments]);

  const periodPaymentsCount = filteredAllPayments.length;

  const methodRevenues = useMemo(() => {
    const revs = { upi: 0, card: 0, cash: 0, netBanking: 0 };
    filteredAllPayments.forEach((p: any) => {
      const amount = Number(p.amountPaid) || 0;
      const method = (p.paymentMethod || '').toLowerCase().trim();

      if (['upi', 'gpay', 'phonepe', 'paytm', 'qrscan', 'qr'].includes(method)) {
        revs.upi += amount;
      } else if (['card', 'credit_card', 'debit_card', 'pos'].includes(method)) {
        revs.card += amount;
      } else if (['cash'].includes(method)) {
        revs.cash += amount;
      } else if (['netbanking', 'net_banking', 'net banking', 'bank_transfer', 'neft', 'imps', 'rtgs'].includes(method)) {
        revs.netBanking += amount;
      } else {
        if (method.includes('upi') || method.includes('pay')) {
          revs.upi += amount;
        } else if (method.includes('card')) {
          revs.card += amount;
        } else if (method.includes('bank')) {
          revs.netBanking += amount;
        } else {
          revs.cash += amount;
        }
      }
    });
    return revs;
  }, [filteredAllPayments]);

  const formatCurrency = (val: number) => {
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

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
      return <Text className="text-[#888888] text-center mt-10 font-sans">No payments found.</Text>;
    }
    return null;
  };

  const renderHeader = () => (
    <View>
      <View className="flex-row px-5 gap-3 mb-5 mt-2">
        <View className="flex-1 bg-[#141414] border border-[#27272A] rounded-2xl p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 items-center justify-center">
              <Wallet size={18} color="#CCF200" weight="fill" />
            </View>
            <View className="w-6 h-6 rounded-md bg-[#242611] items-center justify-center">
              <TrendUp size={14} color="#CCF200" weight="bold" />
            </View>
          </View>
          <Text className="text-[#A1A1AA] text-[10px] font-semibold mb-1 uppercase tracking-wider" numberOfLines={1}>
            Revenue ({currentRangeLabel})
          </Text>
          <Text className="text-white text-xl font-semibold">{formatCurrency(periodRevenue)}</Text>
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
          <Text className="text-[#A1A1AA] text-[10px] font-semibold mb-1 uppercase tracking-wider" numberOfLines={1}>
            Payments ({currentRangeLabel})
          </Text>
          <Text className="text-white text-xl font-semibold">{periodPaymentsCount}</Text>
        </View>
      </View>

      <View className="px-5 mb-5">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => setShowDateDropdown(true)}
            className="flex-row items-center bg-[#18181B] px-3.5 py-2.5 rounded-xl border border-[#27272A] active:opacity-75"
          >
            <CalendarBlank size={14} color="#8E8E93" />
            <Text className="text-white text-xs mx-2 font-medium">{currentRangeLabel}</Text>
            <CaretDown size={14} color="#8E8E93" />
          </Pressable>

          <TouchableOpacity
            onPress={() => router.push('/(owner)/dashboard/payments/add')}
            className="bg-[#CCF200] rounded-xl flex-row items-center px-4 py-2.5 active:opacity-80 shadow-md shadow-black/40"
          >
            <Plus size={16} color="#000000" weight="bold" />
            <Text className="text-black font-semibold text-xs ml-2">Add Payment</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-1">
          <Text className="text-[#8E8E93] font-medium text-xs mb-3 uppercase tracking-wider">Payment Methods</Text>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            <View className="w-[48%] bg-[#121214] rounded-2xl p-3.5 items-center border border-[#1F1F23]">
              <Lightning size={22} color="#22C55E" weight="bold" style={{ marginBottom: 6 }} />
              <Text className="text-[#8E8E93] text-[11px] mb-1 font-sans">UPI</Text>
              <Text className="text-white font-semibold text-sm">{formatCurrency(methodRevenues.upi)}</Text>
            </View>

            <View className="w-[48%] bg-[#121214] rounded-2xl p-3.5 items-center border border-[#1F1F23]">
              <CreditCard size={22} color="#A855F7" weight="bold" style={{ marginBottom: 6 }} />
              <Text className="text-[#8E8E93] text-[11px] mb-1 font-sans">Card</Text>
              <Text className="text-white font-semibold text-sm">{formatCurrency(methodRevenues.card)}</Text>
            </View>

            <View className="w-[48%] bg-[#121214] rounded-2xl p-3.5 items-center border border-[#1F1F23]">
              <Money size={22} color="#F97316" weight="bold" style={{ marginBottom: 6 }} />
              <Text className="text-[#8E8E93] text-[11px] mb-1 font-sans">Cash</Text>
              <Text className="text-white font-semibold text-sm">{formatCurrency(methodRevenues.cash)}</Text>
            </View>

            <View className="w-[48%] bg-[#121214] rounded-2xl p-3.5 items-center border border-[#1F1F23]">
              <Buildings size={22} color="#3B82F6" weight="bold" style={{ marginBottom: 6 }} />
              <Text className="text-[#8E8E93] text-[11px] mb-1 font-sans">Net Banking</Text>
              <Text className="text-white font-semibold text-sm">{formatCurrency(methodRevenues.netBanking)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-5 mb-4">
        <View className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl flex-row items-center px-4 h-12">
          <MagnifyingGlass size={18} color="#8E8E93" weight="bold" />
          <TextInput
            placeholder="Search member..."
            placeholderTextColor="#8E8E93"
            className="flex-1 ml-3 text-sm font-medium"
            style={{ color: '#FFFFFF', paddingVertical: 0 }}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 280, animated: true });
              }, 150);
            }}
            autoCorrect={false}
            selectionColor="#CCF200"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <X size={16} color="#8E8E93" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View className="flex-row px-5 mb-2 pt-2 border-t border-[#1C1C1E]">
        <Text className="w-[30%] text-[#888888] text-[9px] font-semibold uppercase tracking-wider">MEMBER</Text>
        <Text className="w-[25%] text-[#888888] text-[9px] font-semibold uppercase tracking-wider">MEMBERSHIP</Text>
        <Text className="w-[20%] text-[#888888] text-[9px] font-semibold uppercase tracking-wider">AMOUNT</Text>
        <Text className="w-[20%] text-[#888888] text-[9px] font-semibold uppercase tracking-wider text-right pr-2">METHOD</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#09090B] pt-5"
    >
      <View
        className="flex-row items-center justify-between px-5 pb-4"
        style={{ paddingTop: Math.max(insets.top, 14) }}
      >
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
          ref={flatListRef}
          data={accumulatedPayments}
          keyExtractor={(item) => item.gymPaymentId}
          renderItem={renderPaymentItem}
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter}
          keyboardShouldPersistTaps="handled"
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

      {showDateDropdown && (
        <Modal
          transparent
          animationType="fade"
          visible={showDateDropdown}
          onRequestClose={() => setShowDateDropdown(false)}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-end"
            onPress={() => setShowDateDropdown(false)}
          >
            <View className="bg-[#121214] border-t border-[#27272A] rounded-t-3xl p-5 pb-8">
              <View className="w-10 h-1 bg-[#2C2C2E] rounded-full self-center mb-4" />
              <Text className="text-white font-semibold text-lg mb-4">Select Time Period</Text>
              {DATE_OPTIONS.map((opt) => {
                const isSelected = dateRange === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setShowDateDropdown(false);
                      if (opt.id === 'custom') {
                        setTimeout(() => setShowDatePicker(true), 250);
                      } else {
                        setDateRange(opt.id);
                      }
                    }}
                    className={`flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-1.5 ${isSelected ? 'bg-[#CCF200]/10 border border-[#CCF200]/30' : 'active:bg-[#1A1A1E]'
                      }`}
                  >
                    <View className="flex-row items-center gap-3">
                      {opt.id === 'custom' ? (
                        <CalendarBlank size={18} color={isSelected ? '#CCF200' : '#8E8E93'} />
                      ) : (
                        <View className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#CCF200]' : 'bg-[#555555]'}`} />
                      )}
                      <Text className={`text-sm ${isSelected ? 'text-[#CCF200] font-semibold' : 'text-white font-sans'}`}>
                        {opt.label}
                      </Text>
                    </View>
                    {isSelected && <Check size={16} color="#CCF200" weight="bold" />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      )}

      <DatePickerModal
        visible={showDatePicker}
        title="Select Payment Date"
        initialDate={customDate}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(dateStr) => {
          setShowDatePicker(false);
          setCustomDate(dateStr);
          setDateRange('custom');
        }}
        minYear={2020}
        maxYear={new Date().getFullYear() + 2}
      />
    </KeyboardAvoidingView>
  );
}
