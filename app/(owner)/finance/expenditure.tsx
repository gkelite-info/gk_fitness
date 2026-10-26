import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  MagnifyingGlass,
  X,
  CaretDown,
  CaretLeft,
  CaretRight,
  DotsThree,
  CreditCard,
  ChartBar,
  Tag,
  FileText,
  Check,
  CalendarBlank,
  ArrowsClockwise,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import {
  useGymExpenses,
  useGymExpensesPaginated,
  useDeleteGymExpense,
} from '@/hooks/gymExpenses/useGymExpenses';
import { GymExpenseAttributes } from '@/helpers/gymExpenses/gymExpensesHelper';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import AddExpenseModal, { ExpenseData } from '@/components/expenditure/AddExpenseModal';
import ExpenseDetailsModal from '@/components/expenditure/ExpenseDetailsModal';
import ExpenseSuccessModal from '@/components/expenditure/ExpenseSuccessModal';
import { toast } from '@/lib/toast';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEMS_PER_PAGE = 10;

const CATEGORY_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  rent: { bg: '#382811', border: '#784315', color: '#FBBF24', label: 'Rent' },
  salaries: { bg: '#2B1B47', border: '#552782', color: '#C084FC', label: 'Staff Salaries' },
  maintenance: { bg: '#0A2E2C', border: '#135A52', color: '#2DD4BF', label: 'Maintenance' },
  utilities: { bg: '#0F2942', border: '#184E7A', color: '#38BDF8', label: 'Utilities' },
  marketing: { bg: '#38162D', border: '#691F51', color: '#F472B6', label: 'Marketing' },
  equipment: { bg: '#38161E', border: '#691F30', color: '#FB7185', label: 'Equipment' },
  supplies: { bg: '#1D3216', border: '#385C22', color: '#A3E635', label: 'Supplies' },
  others: { bg: '#1E293B', border: '#334155', color: '#94A3B8', label: 'Other' },
};

const CATEGORY_FILTER_OPTIONS = [
  { label: 'All Categories', value: 'all' },
  { label: 'Rent', value: 'rent' },
  { label: 'Staff Salaries', value: 'salaries' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Utilities', value: 'utilities' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Supplies', value: 'supplies' },
  { label: 'Other', value: 'others' },
];

const METHOD_FILTER_OPTIONS = [
  { label: 'All Methods', value: 'all' },
  { label: 'UPI', value: 'upi' },
  { label: 'Bank Transfer', value: 'bank' },
  { label: 'Cash', value: 'cash' },
  { label: 'Credit Card', value: 'creditcard' },
  { label: 'Debit Card', value: 'debitcard' },
];

const DATE_FILTER_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
];

export default function ExpenditureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, gymId } = useUser();

  // Queries - full dataset for KPI stats
  const { data: expenses = [], refetch: refetchKpiExpenses } = useGymExpenses(gymId);
  const deleteExpenseMutation = useDeleteGymExpense();

  // State
  const [page, setPage] = useState(1);
  const [limit] = useState(ITEMS_PER_PAGE);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('this_month');
  const [accumulatedExpenses, setAccumulatedExpenses] = useState<GymExpenseAttributes[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Debouncing for 600ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page to 1 when filters or debounced search change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedMethod, selectedDateFilter, debouncedSearch]);

  const filters = useMemo(() => ({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    paymentMethod: selectedMethod !== 'all' ? selectedMethod : undefined,
    dateFilter: selectedDateFilter !== 'all' ? selectedDateFilter : undefined,
    searchQuery: debouncedSearch.trim() || undefined,
  }), [selectedCategory, selectedMethod, selectedDateFilter, debouncedSearch]);

  const {
    data: paginatedData,
    isLoading: isListLoading,
    refetch: refetchExpenses,
    isFetching,
  } = useGymExpensesPaginated(gymId ?? undefined, page, limit, filters);

  const total = paginatedData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  useEffect(() => {
    if (paginatedData?.data) {
      if (page === 1) {
        setAccumulatedExpenses(paginatedData.data);
      } else {
        setAccumulatedExpenses((prev) => {
          const prevIds = new Set(prev.map((l) => l.gymExpenseId));
          const newUnique = paginatedData.data.filter((l) => !prevIds.has(l.gymExpenseId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [paginatedData, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerLightHaptic();
    try {
      await Promise.allSettled([refetchExpenses(), refetchKpiExpenses()]);
    } catch (err) {
      console.error('[ExpenditureScreen] Error refreshing expenses:', err);
    }
    if (page !== 1) {
      setPage(1);
    }
    setRefreshing(false);
  }, [page, refetchExpenses, refetchKpiExpenses]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editExpenseData, setEditExpenseData] = useState<ExpenseData | null>(null);
  const [viewExpenseData, setViewExpenseData] = useState<ExpenseData | null>(null);
  const [successExpenseData, setSuccessExpenseData] = useState<ExpenseData | null>(null);

  const [activePicker, setActivePicker] = useState<'category' | 'method' | 'date' | null>(null);

  const [actionMenuExpense, setActionMenuExpense] = useState<any | null>(null);

  const {
    todayTotal,
    monthTotal,
    todayTrend,
    monthTrend,
    highestCategory,
    highestCategoryAmount,
    totalEntries,
  } = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastMonthDate = new Date(today);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let tTotal = 0;
    let yTotal = 0;
    let mTotal = 0;
    let lmTotal = 0;
    const categoryTotals: Record<string, number> = {};

    expenses.forEach((item) => {
      if (item.is_deleted || item.deletedAt) return;
      const amount = Number(item.amount) || 0;
      const d = new Date(item.date || item.createdAt || new Date());

      if (
        d.getDate() === today.getDate() &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      ) {
        tTotal += amount;
      }

      if (
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear()
      ) {
        yTotal += amount;
      }

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        mTotal += amount;
        const cat = (item.category || 'others').toLowerCase();
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      }

      if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        lmTotal += amount;
      }
    });

    let tTrend = '-28.4% vs yesterday';
    if (yTotal > 0) {
      const diff = ((tTotal - yTotal) / yTotal) * 100;
      tTrend = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs yesterday`;
    } else if (tTotal > 0) {
      tTrend = 'Live today';
    }

    let mTrend = '+8.6% vs last month';
    if (lmTotal > 0) {
      const diff = ((mTotal - lmTotal) / lmTotal) * 100;
      mTrend = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs last month`;
    } else if (mTotal > 0) {
      mTrend = 'Current cycle';
    }

    let topCat = 'None';
    let topAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topAmount) {
        topAmount = amt;
        topCat = cat;
      }
    });

    return {
      todayTotal: tTotal,
      monthTotal: mTotal,
      todayTrend: tTrend,
      monthTrend: mTrend,
      highestCategory: topCat.charAt(0).toUpperCase() + topCat.slice(1),
      highestCategoryAmount: topAmount,
      totalEntries: expenses.length,
    };
  }, [expenses]);

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
            onPress={() => {
              triggerLightHaptic();
              setPage((p) => p + 1);
            }}
            className="flex-row items-center gap-x-2 bg-[#11161D] border border-[#1D2631] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#CCFF00" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedExpenses.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#9CA3AF] text-xs font-sans">You've reached the end of expenses</Text>
        </View>
      );
    }
    return null;
  };

  // Helper formatting for labels
  const getCategoryBadge = (catKey: string) => {
    const key = (catKey || 'others').toLowerCase();
    const style = CATEGORY_STYLES[key] || {
      bg: '#1E293B',
      border: '#334155',
      color: '#94A3B8',
      label: catKey || 'Other',
    };
    return (
      <View
        style={{ backgroundColor: style.bg, borderColor: style.border }}
        className="px-2.5 py-1 rounded-full border self-start"
      >
        <Text style={{ color: style.color }} className="text-[11px] font-semibold capitalize">
          {style.label}
        </Text>
      </View>
    );
  };

  const formatPaymentMethod = (pm: string) => {
    if (!pm) return 'Bank Transfer';
    const clean = pm.toLowerCase();
    if (clean === 'upi') return 'UPI';
    if (clean.includes('bank')) return 'Bank Transfer';
    if (clean.includes('cash')) return 'Cash';
    if (clean.includes('credit')) return 'Credit Card';
    if (clean.includes('debit')) return 'Debit Card';
    return pm;
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      triggerMediumHaptic();
      await deleteExpenseMutation.mutateAsync(expenseId);
      toast.success('Expense deleted successfully!');
      setViewExpenseData(null);
      setActionMenuExpense(null);
    } catch (err: any) {
      triggerErrorHaptic();
      console.error('[ExpenditureScreen] Delete Error:', err);
      toast.error('Failed to delete expense.');
    }
  };

  const getCategoryFilterLabel = () => {
    const found = CATEGORY_FILTER_OPTIONS.find((o) => o.value === selectedCategory);
    return found ? found.label : 'All Categories';
  };

  const getMethodFilterLabel = () => {
    const found = METHOD_FILTER_OPTIONS.find((o) => o.value === selectedMethod);
    return found ? found.label : 'All Methods';
  };

  const getDateFilterLabel = () => {
    const found = DATE_FILTER_OPTIONS.find((o) => o.value === selectedDateFilter);
    return found ? found.label : 'This Month';
  };

  return (
    <View className="flex-1 bg-[#0A0D14] pt-8">
      <View
        className="flex-row items-center justify-between px-5 pb-3.5 border-b border-[#1A232C]/60 bg-[#0A0D14]"
        style={{ paddingTop: Math.max(insets.top, 14) }}
      >
        <View className="flex-row items-center gap-3 flex-1 mr-3">
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(owner)/finance');
              }
            }}
            hitSlop={12}
            className="p-1 -ml-1 active:opacity-70"
          >
            <CaretLeft size={24} color="#FFFFFF" weight="bold" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-white text-xl font-semibold tracking-tight">
              Expenditure
            </Text>
            <Text className="text-[#9CA3AF] text-xs">
              Track and manage all gym expenses.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            triggerMediumHaptic();
            setEditExpenseData(null);
            setIsAddModalOpen(true);
          }}
          className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#CCFF00] shadow-md shadow-[#CCFF00]/25 active:opacity-85"
        >
          <Plus size={16} color="#000000" weight="bold" />
          <Text className="text-black text-xs font-semibold">Add Expense</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >

        {/* 3. SUMMARY KPI CARDS (Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 12 }}
          className="shrink-0"
        >
          {/* Card 1: Today's Expenditure */}
          <View
            style={{ width: SCREEN_WIDTH * 0.44 }}
            className="bg-[#11161D] border border-[#1D2631] rounded-2xl p-4 justify-between"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#9CA3AF] text-[11px] font-medium flex-1 mr-1" numberOfLines={1}>
                Today&apos;s Expenditure
              </Text>
              <View className="w-8 h-8 rounded-lg bg-[#2A1B1A] border border-[#3E2422] items-center justify-center">
                <CreditCard size={18} color="#EF5350" weight="fill" />
              </View>
            </View>
            <View>
              <Text className="text-white text-[20px] font-semibold leading-6 tracking-tight">
                ₹{todayTotal.toLocaleString('en-IN')}
              </Text>
              <Text className="text-[#4ADE80] text-[10px] font-semibold mt-1">
                {todayTrend}
              </Text>
            </View>
          </View>

          {/* Card 2: This Month */}
          <View
            style={{ width: SCREEN_WIDTH * 0.44 }}
            className="bg-[#11161D] border border-[#1D2631] rounded-2xl p-4 justify-between"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#9CA3AF] text-[11px] font-medium flex-1 mr-1" numberOfLines={1}>
                This Month
              </Text>
              <View className="w-8 h-8 rounded-lg bg-[#142336] border border-[#1C324E] items-center justify-center">
                <ChartBar size={18} color="#38BDF8" weight="fill" />
              </View>
            </View>
            <View>
              <Text className="text-white text-[20px] font-semibold leading-6 tracking-tight">
                ₹{monthTotal.toLocaleString('en-IN')}
              </Text>
              <Text className="text-[#F87171] text-[10px] font-semibold mt-1">
                {monthTrend}
              </Text>
            </View>
          </View>

          {/* Card 3: Highest Expense Category */}
          <View
            style={{ width: SCREEN_WIDTH * 0.44 }}
            className="bg-[#11161D] border border-[#1D2631] rounded-2xl p-4 justify-between"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#9CA3AF] text-[11px] font-medium flex-1 mr-1" numberOfLines={1}>
                Top Category
              </Text>
              <View className="w-8 h-8 rounded-lg bg-[#231A38] border border-[#372658] items-center justify-center">
                <Tag size={18} color="#C084FC" weight="fill" />
              </View>
            </View>
            <View>
              <Text className="text-white text-[16px] font-semibold leading-5" numberOfLines={1}>
                {highestCategory}
              </Text>
              <Text className="text-[#9CA3AF] text-[10px] font-medium mt-1">
                ₹{highestCategoryAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Card 4: Total Expense Entries */}
          <View
            style={{ width: SCREEN_WIDTH * 0.44 }}
            className="bg-[#11161D] border border-[#1D2631] rounded-2xl p-4 justify-between"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#9CA3AF] text-[11px] font-medium flex-1 mr-1" numberOfLines={1}>
                Total Entries
              </Text>
              <View className="w-8 h-8 rounded-lg bg-[#14261D] border border-[#1C3A2C] items-center justify-center">
                <FileText size={18} color="#4ADE80" weight="fill" />
              </View>
            </View>
            <View>
              <Text className="text-white text-[20px] font-semibold leading-6 tracking-tight">
                {totalEntries}
              </Text>
              <Text className="text-[#CCFF00] text-[10px] font-semibold mt-1">
                Active records
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* 4. SEARCH & FILTER SECTION */}
        <View className="px-5 pt-2 pb-3 gap-2.5">
          {/* Search bar */}
          <View className="flex-row items-center bg-[#11161D] border border-[#1D2631] rounded-xl px-3.5 py-2.5">
            <View className="mr-2">
              <MagnifyingGlass size={16} color="#6B7280" />
            </View>
            <TextInput
              value={search}
              onChangeText={(t) => {
                setSearch(t);
              }}
              placeholder="Search expenses by name, category..."
              placeholderTextColor="#6B7280"
              className="flex-1 text-xs text-white p-0 font-medium"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                hitSlop={8}
                className="w-5 h-5 rounded-full bg-[#1E293B] items-center justify-center ml-1"
              >
                <X size={12} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* 3 Filter Dropdown Buttons */}
          <View className="flex-row gap-2">
            {/* Category Dropdown */}
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setActivePicker('category');
              }}
              className="flex-1 flex-row items-center justify-between bg-[#11161D] border border-[#1D2631] rounded-xl px-2.5 py-2.5 active:opacity-75"
            >
              <Text numberOfLines={1} className="text-[#D1D5DB] text-[11px] font-medium flex-1 mr-1">
                {getCategoryFilterLabel()}
              </Text>
              <CaretDown size={12} color="#9CA3AF" />
            </Pressable>

            {/* Methods Dropdown */}
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setActivePicker('method');
              }}
              className="flex-1 flex-row items-center justify-between bg-[#11161D] border border-[#1D2631] rounded-xl px-2.5 py-2.5 active:opacity-75"
            >
              <Text numberOfLines={1} className="text-[#D1D5DB] text-[11px] font-medium flex-1 mr-1">
                {getMethodFilterLabel()}
              </Text>
              <CaretDown size={12} color="#9CA3AF" />
            </Pressable>

            {/* Date Dropdown */}
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setActivePicker('date');
              }}
              className="flex-1 flex-row items-center justify-between bg-[#11161D] border border-[#1D2631] rounded-xl px-2.5 py-2.5 active:opacity-75"
            >
              <Text numberOfLines={1} className="text-[#D1D5DB] text-[11px] font-medium flex-1 mr-1">
                {getDateFilterLabel()}
              </Text>
              <CaretDown size={12} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>

        {/* 5. EXPENSES LIST */}
        <View className="px-5 pt-2">
          {isListLoading && page === 1 ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#CCFF00" />
              <Text className="text-[#9CA3AF] text-xs mt-3">Loading expenses...</Text>
            </View>
          ) : accumulatedExpenses.length === 0 ? (
            <View className="py-16 px-4 bg-[#11161D] border border-[#1D2631] rounded-2xl items-center justify-center">
              <View className="w-14 h-14 rounded-full bg-[#1A2E05] items-center justify-center mb-3">
                <FileText size={24} color="#CCFF00" weight="fill" />
              </View>
              <Text className="text-white font-semibold text-base mb-1">
                No Expenses Found
              </Text>
              <Text className="text-[#9CA3AF] text-xs text-center max-w-[240px] mb-4">
                {search || selectedCategory !== 'all' || selectedMethod !== 'all' || selectedDateFilter !== 'this_month'
                  ? 'No records match your selected filters. Try clearing filters.'
                  : 'Get started by recording your first gym expenditure.'}
              </Text>
              <Pressable
                onPress={() => {
                  triggerMediumHaptic();
                  setEditExpenseData(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#CCFF00] rounded-xl"
              >
                <Text className="text-black text-xs font-semibold">+ Add Expense</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {total > 0 && (
                <View className="mb-3 px-1 flex-row items-center justify-between">
                  <Text className="text-[#9CA3AF] text-xs font-medium">
                    Showing <Text className="text-white font-semibold">{accumulatedExpenses.length}</Text> of{' '}
                    <Text className="text-white font-semibold">{total}</Text> expenses
                  </Text>
                  {(search || selectedCategory !== 'all' || selectedMethod !== 'all' || selectedDateFilter !== 'this_month') && (
                    <Pressable
                      onPress={() => {
                        triggerLightHaptic();
                        setSearch('');
                        setSelectedCategory('all');
                        setSelectedMethod('all');
                        setSelectedDateFilter('this_month');
                        setPage(1);
                      }}
                    >
                      <Text className="text-[#CCFF00] text-xs font-semibold">Reset Filters</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {accumulatedExpenses.map((expense) => {
                const amountNumber = Number(expense.amount) || 0;
                const dateFormatted = expense.date
                  ? new Date(expense.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  : 'Jul 1, 2024';

                return (
                  <Pressable
                    key={expense.gymExpenseId}
                    onPress={() => {
                      triggerLightHaptic();
                      setViewExpenseData({
                        id: expense.gymExpenseId,
                        name: expense.expenseTitle,
                        category: expense.category,
                        amount: expense.amount.toString(),
                        date: expense.date,
                        paymentMethod: expense.paymentMethod,
                        notes: expense.notes || '',
                        receiptUrl: expense.receiptUrl,
                        addedBy: expense.createdBy_user?.name || 'Owner',
                      });
                    }}
                    className="bg-[#11161D] border border-[#1D2631] rounded-2xl p-4 mb-3 active:opacity-85"
                  >
                    {/* Top Row: Title & Amount */}
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        numberOfLines={1}
                        className="text-white text-[15px] font-semibold flex-1 mr-3"
                      >
                        {expense.expenseTitle}
                      </Text>
                      <Text className="text-white text-base font-semibold">
                        ₹{amountNumber.toLocaleString('en-IN')}
                      </Text>
                    </View>

                    {/* Mid Row: Category Badge & Date */}
                    <View className="flex-row items-center justify-between mb-3">
                      {getCategoryBadge(expense.category)}
                      <Text className="text-[#9CA3AF] text-xs font-medium">
                        {dateFormatted}
                      </Text>
                    </View>

                    {/* Bottom Row: Payment Method Pill & Three Dots Menu */}
                    <View className="flex-row items-center justify-between pt-2 border-t border-[#1E293B]/40">
                      <View className="bg-[#090D13] border border-[#1E293B] px-3 py-1 rounded-full self-start">
                        <Text className="text-[#CBD5E1] text-[11px] font-medium capitalize">
                          {formatPaymentMethod(expense.paymentMethod)}
                        </Text>
                      </View>

                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          triggerLightHaptic();
                          setActionMenuExpense(expense);
                        }}
                        hitSlop={12}
                        className="w-8 h-8 rounded-lg items-center justify-center bg-white/[0.03] active:bg-white/10"
                      >
                        <DotsThree size={20} color="#9CA3AF" weight="bold" />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}

              {renderFooter()}
            </>
          )}
        </View>
      </ScrollView>

      {/* FILTER BOTTOM SHEET MODAL */}
      <Modal
        visible={activePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/70">
          <Pressable className="flex-1" onPress={() => setActivePicker(null)} />
          <View className="bg-[#0F141C] border-t border-[#1E293B] rounded-t-[32px] p-5 pb-8 gap-3">
            <View className="items-center pb-2">
              <View className="w-10 h-1 rounded-full bg-[#334155]" />
            </View>

            <Text className="text-white text-base font-semibold mb-1">
              {activePicker === 'category'
                ? 'Select Category'
                : activePicker === 'method'
                  ? 'Select Payment Method'
                  : 'Select Date Range'}
            </Text>

            <ScrollView className="max-h-[300px]">
              {(activePicker === 'category'
                ? CATEGORY_FILTER_OPTIONS
                : activePicker === 'method'
                  ? METHOD_FILTER_OPTIONS
                  : DATE_FILTER_OPTIONS
              ).map((opt) => {
                const isSelected =
                  activePicker === 'category'
                    ? selectedCategory === opt.value
                    : activePicker === 'method'
                      ? selectedMethod === opt.value
                      : selectedDateFilter === opt.value;

                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      triggerLightHaptic();
                      if (activePicker === 'category') setSelectedCategory(opt.value);
                      else if (activePicker === 'method') setSelectedMethod(opt.value);
                      else if (activePicker === 'date') setSelectedDateFilter(opt.value);
                      setPage(1);
                      setActivePicker(null);
                    }}
                    className={`flex-row items-center justify-between p-3.5 rounded-xl mb-1.5 ${isSelected
                      ? 'bg-[#1A2E05] border border-[#CCFF00]/40'
                      : 'bg-[#11161D] border border-transparent active:bg-white/5'
                      }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${isSelected ? 'text-[#CCFF00]' : 'text-white'
                        }`}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={18} color="#CCFF00" weight="bold" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* THREE-DOTS ACTION SHEET MODAL */}
      <Modal
        visible={actionMenuExpense !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenuExpense(null)}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/70">
          <Pressable className="flex-1" onPress={() => setActionMenuExpense(null)} />
          <View className="bg-[#0F141C] border-t border-[#1E293B] rounded-t-[32px] p-5 pb-8 gap-2.5">
            <View className="items-center pb-2">
              <View className="w-10 h-1 rounded-full bg-[#334155]" />
            </View>

            <Text className="text-white text-base font-semibold mb-2">
              {actionMenuExpense?.expenseTitle || 'Expense Actions'}
            </Text>

            <Pressable
              onPress={() => {
                const exp = actionMenuExpense;
                setActionMenuExpense(null);
                setViewExpenseData({
                  id: exp.gymExpenseId,
                  name: exp.expenseTitle,
                  category: exp.category,
                  amount: exp.amount.toString(),
                  date: exp.date,
                  paymentMethod: exp.paymentMethod,
                  notes: exp.notes || '',
                  receiptUrl: exp.receiptUrl,
                  addedBy: exp.createdBy_user?.name || 'Owner',
                });
              }}
              className="p-3.5 rounded-xl bg-[#11161D] border border-[#1D2631] active:bg-white/10"
            >
              <Text className="text-white text-sm font-semibold">View Details</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const exp = actionMenuExpense;
                setActionMenuExpense(null);
                setEditExpenseData({
                  id: exp.gymExpenseId,
                  name: exp.expenseTitle,
                  category: exp.category,
                  amount: exp.amount.toString(),
                  date: exp.date,
                  paymentMethod: exp.paymentMethod,
                  notes: exp.notes || '',
                  receiptUrl: exp.receiptUrl,
                  addedBy: exp.createdBy_user?.name || 'Owner',
                });
                setIsAddModalOpen(true);
              }}
              className="p-3.5 rounded-xl bg-[#11161D] border border-[#1D2631] active:bg-white/10"
            >
              <Text className="text-white text-sm font-semibold">Edit Expense</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const expId = actionMenuExpense?.gymExpenseId;
                setActionMenuExpense(null);
                if (expId) handleDeleteExpense(expId);
              }}
              className="p-3.5 rounded-xl bg-[#E11D48]/15 border border-[#E11D48]/40 active:opacity-75"
            >
              <Text className="text-[#FB7185] text-sm font-semibold">Delete Expense</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ADD / EDIT EXPENSE MODAL */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditExpenseData(null);
        }}
        initialData={editExpenseData}
        onSuccess={(savedData) => {
          setIsAddModalOpen(false);
          setEditExpenseData(null);
          setSuccessExpenseData(savedData);
          if (page !== 1) setPage(1);
        }}
      />

      {/* EXPENSE DETAILS MODAL */}
      <ExpenseDetailsModal
        isOpen={viewExpenseData !== null}
        onClose={() => setViewExpenseData(null)}
        expenseData={viewExpenseData}
        onEdit={() => {
          const current = viewExpenseData;
          setViewExpenseData(null);
          setEditExpenseData(current);
          setIsAddModalOpen(true);
        }}
        onDelete={() => {
          if (viewExpenseData?.id) {
            handleDeleteExpense(viewExpenseData.id);
          }
        }}
      />

      {/* EXPENSE SUCCESS MODAL */}
      <ExpenseSuccessModal
        isOpen={successExpenseData !== null}
        onClose={() => setSuccessExpenseData(null)}
        expenseData={successExpenseData}
        onAddAnother={() => {
          setSuccessExpenseData(null);
          setEditExpenseData(null);
          setIsAddModalOpen(true);
        }}
      />
    </View>
  );
}
