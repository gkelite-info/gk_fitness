import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  MagnifyingGlass,
  X,
  Check,
  CheckCircle,
  CheckSquare,
  Square,
  Phone,
  Crown,
  Clock,
  SortAscending,
  SortDescending,
  WarningCircle,
  Sparkle,
  Users,
  CalendarBlank,
  CaretLeft,
  CaretRight,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useGymCustomerMembershipPlans } from '@/hooks/useGymCustomerMembershipPlans';
import { useGymLatestAttendance } from '@/hooks/attendance/useGymLatestAttendance';
import {
  markOwnerManualAttendance,
  undoOwnerManualAttendance,
  bulkMarkOwnerManualAttendance,
} from '@/helpers/attendance/attendanceHelper';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { toast } from '@/lib/toast';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '@/lib/haptics';

export interface MobileCustomerAttendanceData {
  id: string;
  name: string;
  custId: string;
  phone: string;
  gender?: string;
  plan: string;
  planColor: string;
  planBg: string;
  planBorder: string;
  hasNoPlan: boolean;
  attendanceText: string;
  isPresentToday: boolean;
  attendanceId?: string;
}

function getPlanStyles(planName: string) {
  const lower = planName.toLowerCase();
  if (lower.includes('gold')) {
    return {
      color: '#FBBF24',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
    };
  }
  if (lower.includes('platinum') || lower.includes('elite') || lower.includes('diamond')) {
    return {
      color: '#22D3EE',
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.3)',
    };
  }
  if (lower.includes('premium')) {
    return {
      color: '#C084FC',
      bg: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.3)',
    };
  }
  if (lower.includes('silver') || lower.includes('standard')) {
    return {
      color: '#94A3B8',
      bg: 'rgba(100, 116, 139, 0.12)',
      border: 'rgba(100, 116, 139, 0.3)',
    };
  }
  if (lower === 'no plan') {
    return {
      color: '#64748B',
      bg: 'rgba(51, 65, 85, 0.2)',
      border: 'rgba(51, 65, 85, 0.4)',
    };
  }
  return {
    color: '#CCF200',
    bg: 'rgba(204, 242, 0, 0.12)',
    border: 'rgba(204, 242, 0, 0.3)',
  };
}

function formatAttendanceTime(dateString?: string) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${timeStr}`;
}

type FilterTab = 'all' | 'present' | 'unmarked' | 'no-plan';

export default function ManualAttendanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId, gymId: contextGymId } = useUser();

  const [resolvedGymId, setResolvedGymId] = useState<string | null>(contextGymId ?? null);

  // Fallback gymId resolution if not on UserContext
  React.useEffect(() => {
    if (!resolvedGymId && userId) {
      getOwnerGymId(userId).then((gId) => {
        if (gId) setResolvedGymId(gId);
      });
    }
  }, [userId, resolvedGymId]);

  const activeGymId = contextGymId || resolvedGymId || undefined;

  // Data fetching
  const {
    data: customersRaw,
    isLoading: isLoadingCustomers,
    refetch: refetchCustomers,
  } = useGymCustomers(activeGymId);

  const {
    data: plansRaw,
    isLoading: isLoadingPlans,
    refetch: refetchPlans,
  } = useGymCustomerMembershipPlans(userId ?? null);

  const {
    data: attendanceRaw,
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance,
  } = useGymLatestAttendance(activeGymId);

  const isInitialLoading = isLoadingCustomers || isLoadingPlans || isLoadingAttendance;

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [undoModalTarget, setUndoModalTarget] = useState<MobileCustomerAttendanceData | null>(null);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{ count: number; name?: string } | null>(null);

  // Invalidate queries on success
  const invalidateAttendanceQueries = useCallback(() => {
    if (activeGymId) {
      queryClient.invalidateQueries({ queryKey: ['gymLatestAttendance', activeGymId] });
      queryClient.invalidateQueries({ queryKey: ['attendanceToday', activeGymId] });
      queryClient.invalidateQueries({ queryKey: ['gymAttendanceToday', activeGymId] });
    }
  }, [activeGymId, queryClient]);

  // Mutations
  const markSingleMutation = useMutation({
    mutationFn: async ({ customerId }: { customerId: string }) => {
      if (!activeGymId) throw new Error('Gym ID not available');
      return await markOwnerManualAttendance(activeGymId, customerId);
    },
    onSuccess: (_, vars) => {
      triggerSuccessHaptic();
      invalidateAttendanceQueries();
      const cust = baseCustomers.find((c) => c.id === vars.customerId);
      setSuccessModalData({ count: 1, name: cust?.name });
    },
    onError: (err: any) => {
      triggerWarningHaptic();
      toast.error(err?.message || 'Failed to mark attendance.');
    },
  });

  const undoMutation = useMutation({
    mutationFn: async ({ attendanceId }: { attendanceId: string }) => {
      return await undoOwnerManualAttendance(attendanceId);
    },
    onSuccess: () => {
      triggerSuccessHaptic();
      invalidateAttendanceQueries();
      setUndoModalTarget(null);
      toast.success('Attendance removed.');
    },
    onError: (err: any) => {
      triggerWarningHaptic();
      toast.error(err?.message || 'Failed to remove attendance.');
    },
  });

  const bulkMarkMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!activeGymId) throw new Error('Gym ID not available');
      return await bulkMarkOwnerManualAttendance(activeGymId, ids);
    },
    onSuccess: (data, ids) => {
      triggerSuccessHaptic();
      invalidateAttendanceQueries();
      setShowBulkConfirmModal(false);
      setIsBulkMode(false);
      const count = ids.length;
      setSelectedIds(new Set());
      setSuccessModalData({ count });
    },
    onError: (err: any) => {
      triggerWarningHaptic();
      toast.error(err?.message || 'Failed to mark bulk attendance.');
    },
  });

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerLightHaptic();
    try {
      await Promise.all([refetchCustomers(), refetchPlans(), refetchAttendance()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCustomers, refetchPlans, refetchAttendance]);

  // Attendance Map: Latest attendance record per customer
  const latestAttendanceMap = useMemo(() => {
    const map: Record<string, { attendanceId: string; markedAt: string; date: string }> = {};
    if (attendanceRaw) {
      attendanceRaw.forEach((att) => {
        if (!map[att.customerId]) {
          map[att.customerId] = att;
        }
      });
    }
    return map;
  }, [attendanceRaw]);

  // Today Date String (YYYY-MM-DD)
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
  }, []);

  // Process Raw Customers into UI Model
  const baseCustomers: MobileCustomerAttendanceData[] = useMemo(() => {
    if (!customersRaw) return [];

    const activeList = customersRaw.filter((c: any) => c.is_Active !== false && !c.is_deleted);

    return activeList.map((c: any) => {
      // Find matching membership plan
      const planRecord = plansRaw?.find(
        (p: any) =>
          (p.customerId === c.customerId || p.gym_customers?.customerId === c.customerId) &&
          p.is_deleted !== true
      );

      const planName =
        planRecord?.plan?.planName ||
        planRecord?.gym_membership_plans?.planName ||
        'No Plan';

      const planStyles = getPlanStyles(planName);
      const lastAtt = latestAttendanceMap[c.customerId];

      let isPresentToday = false;
      let attendanceText = 'Never checked in';
      let attendanceId: string | undefined = undefined;

      if (lastAtt) {
        attendanceId = lastAtt.attendanceId;
        const formatted = formatAttendanceTime(lastAtt.markedAt);
        attendanceText = formatted;
        if (formatted.startsWith('Today') || lastAtt.date === todayDateStr) {
          isPresentToday = true;
        }
      }

      return {
        id: c.customerId,
        name: c.fullName || 'Unknown Member',
        custId: `CUST-${(c.customerId || '').slice(0, 4).toUpperCase()}`,
        phone: c.phone || '',
        gender: c.gender || 'male',
        plan: planName,
        planColor: planStyles.color,
        planBg: planStyles.bg,
        planBorder: planStyles.border,
        hasNoPlan: planName === 'No Plan',
        attendanceText,
        isPresentToday,
        attendanceId,
      };
    });
  }, [customersRaw, plansRaw, latestAttendanceMap, todayDateStr]);

  // Metrics summary
  const totalCount = baseCustomers.length;
  const presentCount = useMemo(
    () => baseCustomers.filter((c) => c.isPresentToday).length,
    [baseCustomers]
  );
  const unmarkedCount = totalCount - presentCount;
  const noPlanCount = useMemo(
    () => baseCustomers.filter((c) => c.hasNoPlan).length,
    [baseCustomers]
  );

  // Filtered & Sorted Customers
  const processedCustomers = useMemo(() => {
    let result = [...baseCustomers];

    // Filter by Tab
    if (activeTab === 'present') {
      result = result.filter((c) => c.isPresentToday);
    } else if (activeTab === 'unmarked') {
      result = result.filter((c) => !c.isPresentToday);
    } else if (activeTab === 'no-plan') {
      result = result.filter((c) => c.hasNoPlan);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.custId.toLowerCase().includes(q)
      );
    }

    // Sort Alphabetically
    result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });

    return result;
  }, [baseCustomers, activeTab, searchQuery, sortOrder]);

  // Pagination (8 items per page, matching Web)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset to page 1 when search query, filter tab, or sort order changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, sortOrder]);

  const totalPages = Math.ceil(processedCustomers.length / itemsPerPage) || 1;

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [processedCustomers, currentPage, itemsPerPage]);

  const startItem = processedCustomers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, processedCustomers.length);

  // Eligible for bulk marking (overall & on current page)
  const totalEligibleBulkCount = useMemo(() => {
    return processedCustomers.filter((c) => !c.hasNoPlan && !c.isPresentToday).length;
  }, [processedCustomers]);

  const eligibleBulkCustomersOnPage = useMemo(() => {
    return paginatedCustomers.filter((c) => !c.hasNoPlan && !c.isPresentToday);
  }, [paginatedCustomers]);

  // Bulk mode toggle
  const toggleBulkMode = () => {
    triggerMediumHaptic();
    if (isBulkMode) {
      setSelectedIds(new Set());
      setIsBulkMode(false);
    } else {
      setIsBulkMode(true);
    }
  };

  // Toggle select individual in bulk mode
  const handleToggleSelect = (id: string, hasNoPlan: boolean) => {
    if (hasNoPlan) return;
    triggerLightHaptic();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all eligible on current page
  const handleToggleSelectAll = () => {
    triggerMediumHaptic();
    const pageEligibleIds = eligibleBulkCustomersOnPage.map((c) => c.id);
    const allSelectedOnPage =
      pageEligibleIds.length > 0 && pageEligibleIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        pageEligibleIds.forEach((id) => next.delete(id));
      } else {
        pageEligibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Single Action: Mark or Undo
  const handleCustomerAction = (cust: MobileCustomerAttendanceData) => {
    if (cust.hasNoPlan) return;
    triggerMediumHaptic();

    if (cust.isPresentToday) {
      // Prompt to undo
      setUndoModalTarget(cust);
    } else {
      // Mark present
      markSingleMutation.mutate({ customerId: cust.id });
    }
  };

  // Render individual customer card
  const renderCustomerItem = ({ item }: { item: MobileCustomerAttendanceData }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <Pressable
        onPress={() => {
          if (isBulkMode) {
            handleToggleSelect(item.id, item.hasNoPlan);
          }
        }}
        className={`mb-3 p-3.5 rounded-2xl border ${
          isSelected
            ? 'bg-[#1D2412] border-[#CCF200]'
            : 'bg-[#14161F] border-[#222838]'
        }`}
      >
        <View className="flex-row items-center gap-3">
          {/* Checkbox for Bulk Mode */}
          {isBulkMode && (
            <Pressable
              onPress={() => handleToggleSelect(item.id, item.hasNoPlan)}
              disabled={item.hasNoPlan}
              className="pr-1"
            >
              {item.hasNoPlan ? (
                <View className="w-5 h-5 rounded-md border border-[#333C4E] bg-[#10141C] items-center justify-center opacity-40">
                  <Square size={16} color="#475569" />
                </View>
              ) : isSelected ? (
                <View className="w-5 h-5 rounded-md bg-[#CCF200] items-center justify-center">
                  <Check size={14} color="#000000" weight="bold" />
                </View>
              ) : (
                <View className="w-5 h-5 rounded-md border border-[#3A4358] bg-[#10141C] items-center justify-center">
                  <Square size={16} color="#64748B" />
                </View>
              )}
            </Pressable>
          )}

          {/* Member Avatar */}
          <StaticAvatar name={item.name} size={44} className="w-11 h-11 rounded-full" />

          {/* Member Details */}
          <View className="flex-1 justify-center">
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-bold text-sm tracking-tight" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-[#64748B] text-[11px] font-mono font-medium">
                {item.custId}
              </Text>
            </View>

            {/* Plan Badge & Phone */}
            <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
              <View
                className="flex-row items-center px-2 py-0.5 rounded-md border"
                style={{ backgroundColor: item.planBg, borderColor: item.planBorder }}
              >
                <View className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: item.planColor }} />
                <Text className="text-[11px] font-semibold" style={{ color: item.planColor }}>
                  {item.plan}
                </Text>
              </View>

              {item.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  className="flex-row items-center gap-1 bg-[#1A1F2C] px-2 py-0.5 rounded-md"
                >
                  <Phone size={10} color="#94A3B8" />
                  <Text className="text-[#94A3B8] text-[11px] font-medium">
                    {item.phone}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Attendance Status Row */}
            <View className="flex-row items-center gap-1.5 mt-2">
              <Clock size={12} color={item.isPresentToday ? '#CCF200' : '#64748B'} weight="bold" />
              <Text
                className={`text-[11px] font-medium ${
                  item.isPresentToday ? 'text-[#CCF200] font-semibold' : 'text-[#64748B]'
                }`}
              >
                {item.attendanceText}
              </Text>
            </View>
          </View>

          {/* Action Button (When not in bulk mode) */}
          {!isBulkMode && (
            <View className="items-end justify-center ml-1">
              {item.hasNoPlan ? (
                <View className="px-2.5 py-1.5 bg-[#1B202D] rounded-xl border border-[#273044] opacity-60">
                  <Text className="text-[#64748B] text-xs font-semibold">No Plan</Text>
                </View>
              ) : item.isPresentToday ? (
                <Pressable
                  onPress={() => handleCustomerAction(item)}
                  className="px-3 py-1.5 bg-[#CCF200]/15 rounded-xl border border-[#CCF200]/40 flex-row items-center gap-1 active:opacity-70"
                >
                  <Check size={13} color="#CCF200" weight="bold" />
                  <Text className="text-[#CCF200] text-xs font-bold">Present</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleCustomerAction(item)}
                  disabled={markSingleMutation.isPending}
                  className="px-3 py-1.5 bg-[#1F2636] rounded-xl border border-[#303B52] active:bg-[#2B354C] flex-row items-center gap-1"
                >
                  <Text className="text-white text-xs font-semibold">+ Mark</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const todayDisplay = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  return (
    <View className="flex-1 bg-[#0A0C10]">
      {/* Top Header */}
      <View
        className="px-4 pb-3 bg-[#0E1117] border-b border-[#1E2330]"
        style={{ paddingTop: Math.max(insets.top, 14) + 6 }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              router.back();
            }}
            className="w-10 h-10 rounded-xl bg-[#161B26] border border-[#232B3C] items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>

          <View className="items-center">
            <Text className="text-white text-base font-bold tracking-tight">Manual Attendance</Text>
            <Text className="text-[#94A3B8] text-[11px] font-medium">{todayDisplay}</Text>
          </View>

          {/* Bulk Mode Toggle */}
          <Pressable
            onPress={toggleBulkMode}
            className={`px-3 py-2 rounded-xl border flex-row items-center gap-1.5 active:opacity-75 ${
              isBulkMode
                ? 'bg-[#CCF200] border-[#CCF200]'
                : 'bg-[#161B26] border-[#232B3C]'
            }`}
          >
            {isBulkMode ? (
              <>
                <X size={14} color="#000000" weight="bold" />
                <Text className="text-black text-xs font-bold">Cancel</Text>
              </>
            ) : (
              <>
                <CheckSquare size={14} color="#CCF200" weight="bold" />
                <Text className="text-[#CCF200] text-xs font-bold">Bulk</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <FlatList
        data={paginatedCustomers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomerItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: isBulkMode ? 120 : 60,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View className="mb-4">
            {/* Quick Metrics Bar */}
            <View className="flex-row gap-2.5 mb-4">
              <View className="flex-1 bg-[#14161F] border border-[#222838] rounded-2xl p-3 items-center">
                <Text className="text-[#8E9BAC] text-[10px] font-bold uppercase tracking-wider">
                  Total
                </Text>
                <Text className="text-white text-lg font-bold mt-0.5">{totalCount}</Text>
              </View>

              <View className="flex-1 bg-[#172010] border border-[#CCF200]/30 rounded-2xl p-3 items-center">
                <Text className="text-[#CCF200] text-[10px] font-bold uppercase tracking-wider">
                  Present Today
                </Text>
                <Text className="text-[#CCF200] text-lg font-bold mt-0.5">{presentCount}</Text>
              </View>

              <View className="flex-1 bg-[#14161F] border border-[#222838] rounded-2xl p-3 items-center">
                <Text className="text-[#8E9BAC] text-[10px] font-bold uppercase tracking-wider">
                  Unmarked
                </Text>
                <Text className="text-white text-lg font-bold mt-0.5">{unmarkedCount}</Text>
              </View>
            </View>

            {/* Search Input Bar & Sort Button */}
            <View className="flex-row items-center gap-2.5 mb-3">
              <View className="flex-1 h-[46px] flex-row items-center bg-[#14161F] border border-[#222838] rounded-2xl px-3.5">
                <MagnifyingGlass size={18} color="#64748B" weight="bold" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by name, phone or ID..."
                  placeholderTextColor="#64748B"
                  className="flex-1 ml-2.5 text-white text-sm font-medium p-0"
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    className="w-5 h-5 rounded-full bg-[#273044] items-center justify-center ml-1"
                  >
                    <X size={12} color="#CBD5E1" />
                  </Pressable>
                )}
              </View>

              {/* Sort Toggle Button */}
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                }}
                className="w-[46px] h-[46px] rounded-2xl bg-[#14161F] border border-[#222838] items-center justify-center active:opacity-70"
              >
                {sortOrder === 'asc' ? (
                  <SortAscending size={20} color="#CCF200" weight="bold" />
                ) : (
                  <SortDescending size={20} color="#CCF200" weight="bold" />
                )}
              </Pressable>
            </View>

            {/* Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {[
                { key: 'all', label: `All (${totalCount})` },
                { key: 'present', label: `Present (${presentCount})` },
                { key: 'unmarked', label: `Unmarked (${unmarkedCount})` },
                { key: 'no-plan', label: `No Plan (${noPlanCount})` },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      triggerLightHaptic();
                      setActiveTab(tab.key as FilterTab);
                    }}
                    className={`px-3.5 py-1.5 rounded-full border ${
                      isActive
                        ? 'bg-[#CCF200] border-[#CCF200]'
                        : 'bg-[#14161F] border-[#222838]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? 'text-black' : 'text-[#8E9BAC]'
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Bulk Select Helper Row */}
            {isBulkMode && (
              <View className="flex-row items-center justify-between mt-3 px-1 py-1.5 bg-[#171D28] rounded-xl border border-[#242E40]">
                <Pressable
                  onPress={handleToggleSelectAll}
                  className="flex-row items-center gap-2 px-2.5 py-1"
                >
                  {eligibleBulkCustomersOnPage.length > 0 &&
                  eligibleBulkCustomersOnPage.every((c) => selectedIds.has(c.id)) ? (
                    <CheckSquare size={16} color="#CCF200" weight="fill" />
                  ) : (
                    <Square size={16} color="#94A3B8" />
                  )}
                  <Text className="text-white text-xs font-semibold">
                    Select All on Page ({eligibleBulkCustomersOnPage.length})
                  </Text>
                </Pressable>

                <Text className="text-[#CCF200] text-xs font-bold pr-3">
                  {selectedIds.size} Selected
                </Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View className="mt-4 pt-4 border-t border-[#1E2330] flex-col items-center gap-3">
              <Text className="text-[#8E9BAC] text-xs font-medium">
                Showing <Text className="text-white font-bold">{startItem}</Text> to{' '}
                <Text className="text-white font-bold">{endItem}</Text> of{' '}
                <Text className="text-white font-bold">{processedCustomers.length}</Text> members
              </Text>

              <View className="flex-row items-center justify-center gap-1.5">
                {/* Prev Button */}
                <Pressable
                  onPress={() => {
                    if (currentPage > 1) {
                      triggerLightHaptic();
                      setCurrentPage((p) => p - 1);
                    }
                  }}
                  disabled={currentPage === 1}
                  className={`flex-row items-center px-3 py-2 rounded-xl border ${
                    currentPage === 1
                      ? 'bg-[#14161F] border-[#222838] opacity-40'
                      : 'bg-[#14161F] border-[#222838] active:bg-[#1E2330]'
                  }`}
                >
                  <CaretLeft size={14} color="#CBD5E1" weight="bold" />
                  <Text className="text-[#CBD5E1] text-xs font-semibold ml-1">Prev</Text>
                </Pressable>

                {/* Page Number Buttons */}
                <View className="flex-row items-center gap-1 mx-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 5) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - currentPage) <= 1;
                    })
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (
                        idx > 0 &&
                        typeof arr[idx - 1] === 'number' &&
                        (p as number) - (arr[idx - 1] as number) > 1
                      ) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) => {
                      if (item === '...') {
                        return (
                          <Text key={`ellipsis-${idx}`} className="text-[#64748B] text-xs font-bold px-1">
                            ...
                          </Text>
                        );
                      }
                      const isCurr = item === currentPage;
                      return (
                        <Pressable
                          key={`page-${item}`}
                          onPress={() => {
                            triggerLightHaptic();
                            setCurrentPage(item as number);
                          }}
                          className={`w-8 h-8 rounded-xl items-center justify-center ${
                            isCurr
                              ? 'bg-[#CCF200]'
                              : 'bg-[#14161F] border border-[#222838]'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isCurr ? 'text-black' : 'text-[#8E9BAC]'
                            }`}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>

                {/* Next Button */}
                <Pressable
                  onPress={() => {
                    if (currentPage < totalPages) {
                      triggerLightHaptic();
                      setCurrentPage((p) => p + 1);
                    }
                  }}
                  disabled={currentPage === totalPages}
                  className={`flex-row items-center px-3 py-2 rounded-xl border ${
                    currentPage === totalPages
                      ? 'bg-[#14161F] border-[#222838] opacity-40'
                      : 'bg-[#14161F] border-[#222838] active:bg-[#1E2330]'
                  }`}
                >
                  <Text className="text-[#CBD5E1] text-xs font-semibold mr-1">Next</Text>
                  <CaretRight size={14} color="#CBD5E1" weight="bold" />
                </Pressable>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color="#CCF200" size="large" />
              <Text className="text-[#64748B] text-xs font-medium mt-3">
                Loading members and attendance...
              </Text>
            </View>
          ) : (
            <View className="items-center justify-center py-16 bg-[#14161F] rounded-2xl border border-[#222838] p-6 mt-4">
              <Users size={36} color="#475569" />
              <Text className="text-white text-base font-bold mt-3">No Members Found</Text>
              <Text className="text-[#64748B] text-xs text-center mt-1">
                {searchQuery
                  ? `No members match "${searchQuery}".`
                  : 'No active members under this filter.'}
              </Text>
              {searchQuery ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-[#222838] rounded-xl"
                >
                  <Text className="text-[#CCF200] text-xs font-bold">Clear Search</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
      />

      {/* Floating Bottom Action Bar for Bulk Mode */}
      {isBulkMode && (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          className="absolute bottom-0 left-0 right-0 bg-[#0E1117] border-t border-[#222838] p-4 flex-row items-center gap-3"
        >
          <View className="flex-1">
            <Text className="text-white text-xs font-bold">
              {selectedIds.size} of {totalEligibleBulkCount} selected
            </Text>
            <Text className="text-[#64748B] text-[11px]">Marking as present today</Text>
          </View>

          <Pressable
            onPress={() => {
              if (selectedIds.size === 0) return;
              triggerMediumHaptic();
              setShowBulkConfirmModal(true);
            }}
            disabled={selectedIds.size === 0 || bulkMarkMutation.isPending}
            className={`px-5 py-3 rounded-2xl flex-row items-center gap-2 ${
              selectedIds.size > 0 && !bulkMarkMutation.isPending
                ? 'bg-[#CCF200] shadow-lg shadow-[#CCF200]/20 active:opacity-85'
                : 'bg-[#222838] opacity-50'
            }`}
          >
            {bulkMarkMutation.isPending ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <>
                <Check size={16} color="#000000" weight="bold" />
                <Text className="text-black font-bold text-sm">
                  Mark {selectedIds.size} Present
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Undo Attendance Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!undoModalTarget}
        onRequestClose={() => setUndoModalTarget(null)}
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/75 justify-center items-center px-6">
          <View className="bg-[#14161F] border border-[#273044] w-full max-w-[340px] rounded-3xl p-6 items-center">
            <View className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center mb-4 border border-red-500/20">
              <WarningCircle size={28} color="#EF4444" weight="fill" />
            </View>
            <Text className="text-white text-lg font-bold mb-2">Undo Attendance</Text>
            <Text className="text-[#8E9BAC] text-sm text-center mb-6 leading-5">
              Are you sure you want to remove attendance for{' '}
              <Text className="text-white font-bold">{undoModalTarget?.name}</Text> marked today?
            </Text>

            <View className="flex-row gap-3 w-full">
              <Pressable
                onPress={() => setUndoModalTarget(null)}
                className="flex-1 bg-[#222838] rounded-2xl py-3.5 items-center active:opacity-80"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (undoModalTarget?.attendanceId) {
                    undoMutation.mutate({ attendanceId: undoModalTarget.attendanceId });
                  } else {
                    setUndoModalTarget(null);
                  }
                }}
                disabled={undoMutation.isPending}
                className="flex-1 bg-red-500 rounded-2xl py-3.5 items-center active:opacity-80 flex-row justify-center gap-2"
              >
                {undoMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-bold">Remove</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Attendance Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showBulkConfirmModal}
        onRequestClose={() => setShowBulkConfirmModal(false)}
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/75 justify-center items-center px-6">
          <View className="bg-[#14161F] border border-[#273044] w-full max-w-[340px] rounded-3xl p-6 items-center">
            <View className="w-12 h-12 rounded-full bg-[#CCF200]/15 items-center justify-center mb-4 border border-[#CCF200]/30">
              <CheckCircle size={28} color="#CCF200" weight="fill" />
            </View>
            <Text className="text-white text-lg font-bold mb-2">Mark Bulk Attendance</Text>
            <Text className="text-[#8E9BAC] text-sm text-center mb-6 leading-5">
              Are you sure you want to mark{' '}
              <Text className="text-[#CCF200] font-bold">{selectedIds.size} members</Text> as
              present for today?
            </Text>

            <View className="flex-row gap-3 w-full">
              <Pressable
                onPress={() => setShowBulkConfirmModal(false)}
                className="flex-1 bg-[#222838] rounded-2xl py-3.5 items-center active:opacity-80"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  bulkMarkMutation.mutate(Array.from(selectedIds));
                }}
                disabled={bulkMarkMutation.isPending}
                className="flex-1 bg-[#CCF200] rounded-2xl py-3.5 items-center active:opacity-80 flex-row justify-center gap-2"
              >
                {bulkMarkMutation.isPending ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text className="text-black font-bold">Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attendance Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!successModalData}
        onRequestClose={() => setSuccessModalData(null)}
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/75 justify-center items-center px-6">
          <View className="bg-[#14161F] border border-[#273044] w-full max-w-[320px] rounded-3xl p-6 items-center">
            <View className="w-16 h-16 rounded-full bg-[#CCF200] items-center justify-center mb-4">
              <Check size={28} color="#000000" weight="bold" />
            </View>
            <Text className="text-white text-lg font-bold mb-2 text-center">
              Attendance Marked
            </Text>
            <Text className="text-[#8E9BAC] text-sm text-center mb-6 leading-5">
              {successModalData?.count === 1 && successModalData.name
                ? `${successModalData.name} marked present successfully.`
                : `${successModalData?.count} member${(successModalData?.count ?? 0) > 1 ? 's' : ''} marked present successfully.`}
            </Text>

            <Pressable
              onPress={() => setSuccessModalData(null)}
              className="w-full bg-[#CCF200] rounded-2xl py-3.5 items-center active:opacity-85"
            >
              <Text className="text-black font-bold">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
