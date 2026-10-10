import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Pressable,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MagnifyingGlass,
  ArrowsClockwise,
  CalendarBlank,
  CreditCard,
  CaretRight,
  Triangle,
  User,
  X,
  Phone,
  WhatsappLogo,
  CheckCircle,
  Clock,
  CurrencyInr,
  Crown,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlans } from '@/hooks/useGymCustomerMembershipPlans';
import { useGymPayments } from '@/hooks/useGymPayments';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerLightHaptic, triggerMediumHaptic } from '@/lib/haptics';

// Helpers for Plan Color
const getPlanColor = (planName?: string) => {
  if (!planName) return '#94A3B8';
  const lower = planName.toLowerCase();
  if (lower.includes('gold')) return '#FBBF24'; // Gold
  if (lower.includes('platinum')) return '#C084FC'; // Platinum
  if (lower.includes('silver')) return '#CBD5E1'; // Silver
  if (lower.includes('diamond')) return '#38BDF8'; // Diamond
  if (lower.includes('bronze')) return '#F97316'; // Bronze
  return '#CCF200'; // Default Brand Lime
};

// Helper for Urgency Color & Text
const getExpiryUrgency = (daysLeft: number) => {
  if (daysLeft < 0) return { text: 'Expired', color: '#EF4444' };
  if (daysLeft === 0) return { text: 'Today', color: '#EF4444' };
  if (daysLeft === 1) return { text: '1 Day', color: '#F87171' };
  if (daysLeft <= 3) return { text: `${daysLeft} Days`, color: '#F97316' };
  if (daysLeft <= 7) return { text: `${daysLeft} Days`, color: '#F59E0B' };
  return { text: `${daysLeft} Days`, color: '#94A3B8' };
};

// Helper for Relative Time
const getRelativeTimeString = (dateInput: string | Date | undefined) => {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (dateStr === todayStr) {
    return `Renewed Today • ${timeStr}`;
  }
  if (dateStr === yesterdayStr) {
    return `Renewed Yesterday • ${timeStr}`;
  }

  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays < 7) {
    return `Renewed ${diffDays} Days Ago • ${timeStr}`;
  }

  return `Renewed on ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • ${timeStr}`;
};

export default function MembershipRenewalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, gymId } = useUser();

  // Data Queries
  const {
    data: allPlans,
    isLoading: isLoadingPlans,
    refetch: refetchPlans,
  } = useGymCustomerMembershipPlans(userId ?? null);

  const {
    data: allPayments,
    isLoading: isLoadingPayments,
    refetch: refetchPayments,
  } = useGymPayments(userId ?? null);

  const {
    data: allCustomers,
    refetch: refetchCustomers,
  } = useGymCustomers(gymId ?? undefined);

  // States
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'next3' | 'next7'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showRecentAllModal, setShowRecentAllModal] = useState(false);
  const [showUpcomingAllModal, setShowUpcomingAllModal] = useState(false);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerLightHaptic();
    await Promise.all([refetchPlans(), refetchPayments(), refetchCustomers()]);
    setRefreshing(false);
  }, [refetchPlans, refetchPayments, refetchCustomers]);

  // Date constants
  const now = useMemo(() => new Date(), []);
  const todayZero = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, [now]);

  const startOfWeekStr = useMemo(() => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [now]);

  const startOfMonthStr = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }, [now]);

  // Derived: Customer lookup map
  const customerMap = useMemo(() => {
    const map = new Map<string, any>();
    (allCustomers || []).forEach((c: any) => {
      map.set(c.customerId, c);
    });
    return map;
  }, [allCustomers]);

  // KPI Calculations
  const stats = useMemo(() => {
    let renewedToday = 0;
    let renewedThisWeek = 0;
    let revenueFromRenewals = 0;

    // From Payments
    if (allPayments && allPayments.length > 0) {
      allPayments.forEach((p: any) => {
        const pDate = p.paymentDate || (p.createdAt ? p.createdAt.split('T')[0] : '');
        const amount = Number(p.amountPaid || 0);

        if (pDate === todayStr) {
          renewedToday++;
        }
        if (pDate >= startOfWeekStr && pDate <= todayStr) {
          renewedThisWeek++;
        }
        if (pDate >= startOfMonthStr) {
          revenueFromRenewals += amount;
        }
      });
    } else if (allPlans && allPlans.length > 0) {
      // Fallback from plans
      allPlans.forEach((p: any) => {
        const cDate = p.createdAt ? p.createdAt.split('T')[0] : '';
        const price = Number(p.gym_membership_plans?.price || p.customAmount || 0);

        if (cDate === todayStr) {
          renewedToday++;
        }
        if (cDate >= startOfWeekStr && cDate <= todayStr) {
          renewedThisWeek++;
        }
        if (cDate >= startOfMonthStr) {
          revenueFromRenewals += price;
        }
      });
    }

    return {
      renewedToday,
      renewedThisWeek,
      revenueFromRenewals,
    };
  }, [allPayments, allPlans, todayStr, startOfWeekStr, startOfMonthStr]);

  // Derived: Recent Renewals List
  const recentRenewals = useMemo(() => {
    if (allPayments && allPayments.length > 0) {
      return allPayments.map((p: any) => {
        const cust = p.gym_customers || customerMap.get(p.customerId);
        const planName = p.gym_membership_plans?.planName || 'Standard Membership';
        const method = p.paymentMethod || 'UPI';
        const isUpi = method.toLowerCase().includes('upi') || method.toLowerCase().includes('gpay') || method.toLowerCase().includes('phonepe') || method.toLowerCase().includes('paytm');
        const isCard = method.toLowerCase().includes('card');

        // Match end date from plans
        const matchingPlan = (allPlans || []).find((plan: any) => plan.customerId === p.customerId);
        const validTillStr = matchingPlan?.endDate
          ? new Date(matchingPlan.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : p.paymentDate
          ? new Date(new Date(p.paymentDate).setMonth(new Date(p.paymentDate).getMonth() + 1)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'N/A';

        const paymentDateTime = p.paymentDate && p.paymentTime ? `${p.paymentDate}T${p.paymentTime}` : p.createdAt;

        return {
          id: p.gymPaymentId || String(Math.random()),
          customerId: p.customerId,
          name: cust?.fullName || 'Unknown Member',
          phone: cust?.phone || '',
          plan: planName,
          planColor: getPlanColor(planName),
          time: getRelativeTimeString(paymentDateTime),
          rawDate: paymentDateTime,
          validTill: validTillStr,
          paymentMethod: isUpi ? 'Paid via UPI' : isCard ? 'Paid via Card' : `Paid via ${method}`,
          paymentIconType: isUpi ? 'upi' : isCard ? 'card' : 'cash',
          img: cust?.users?.profilePhoto || null,
        };
      }).sort((a: any, b: any) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());
    }

    // Fallback: build from allPlans
    return (allPlans || [])
      .filter((p: any) => p.gym_customers)
      .map((p: any) => {
        const cust = p.gym_customers;
        const planName = p.gym_membership_plans?.planName || 'Standard Membership';
        return {
          id: p.GymCustomerMembershipPlanId || String(Math.random()),
          customerId: p.customerId,
          name: cust?.fullName || 'Unknown Member',
          phone: cust?.phone || '',
          plan: planName,
          planColor: getPlanColor(planName),
          time: getRelativeTimeString(p.createdAt),
          rawDate: p.createdAt,
          validTill: p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          paymentMethod: 'Paid via UPI',
          paymentIconType: 'upi',
          img: cust?.users?.profilePhoto || null,
        };
      })
      .sort((a: any, b: any) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());
  }, [allPayments, allPlans, customerMap]);

  // Derived: Upcoming Renewals List
  const upcomingRenewals = useMemo(() => {
    if (!allPlans) return [];

    return allPlans
      .filter((plan: any) => plan.endDate && plan.gym_customers)
      .map((plan: any) => {
        const endDate = new Date(plan.endDate);
        endDate.setHours(0, 0, 0, 0);
        const diffTime = endDate.getTime() - todayZero.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const customer = plan.gym_customers;
        const planName = plan.gym_membership_plans?.planName || 'Standard Membership';

        return {
          id: plan.GymCustomerMembershipPlanId || plan.customerId,
          customerId: plan.customerId,
          name: customer?.fullName || 'Unknown Member',
          phone: customer?.phone || '',
          email: customer?.email || '',
          plan: planName,
          planColor: getPlanColor(planName),
          expiryDate: endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          daysLeft,
          urgency: getExpiryUrgency(daysLeft),
          img: customer?.users?.profilePhoto || null,
        };
      })
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
  }, [allPlans, todayZero]);

  // Counts for upcoming filters
  const upcomingTodayCount = useMemo(() => upcomingRenewals.filter((m) => m.daysLeft === 0).length, [upcomingRenewals]);
  const upcomingNext3Count = useMemo(() => upcomingRenewals.filter((m) => m.daysLeft > 0 && m.daysLeft <= 3).length, [upcomingRenewals]);
  const upcomingNext7Count = useMemo(() => upcomingRenewals.filter((m) => m.daysLeft > 3 && m.daysLeft <= 7).length, [upcomingRenewals]);

  // Search filter
  const filteredRecentRenewals = useMemo(() => {
    if (!search.trim()) return recentRenewals;
    const q = search.toLowerCase();
    return recentRenewals.filter((item) =>
      item.name.toLowerCase().includes(q) || item.plan.toLowerCase().includes(q) || (item.phone && item.phone.includes(q))
    );
  }, [recentRenewals, search]);

  const filteredUpcomingRenewals = useMemo(() => {
    let list = upcomingRenewals;

    if (activeFilter === 'today') {
      list = list.filter((m) => m.daysLeft === 0);
    } else if (activeFilter === 'next3') {
      list = list.filter((m) => m.daysLeft > 0 && m.daysLeft <= 3);
    } else if (activeFilter === 'next7') {
      list = list.filter((m) => m.daysLeft > 3 && m.daysLeft <= 7);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) =>
        item.name.toLowerCase().includes(q) || item.plan.toLowerCase().includes(q) || (item.phone && item.phone.includes(q))
      );
    }

    return list;
  }, [upcomingRenewals, activeFilter, search]);

  // Action Helpers
  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const text = encodeURIComponent(`Hi ${name || 'Member'}, your gym membership is expiring soon. Please let us know if you would like to renew today!`);
      Linking.openURL(`whatsapp://send?phone=${fullPhone}&text=${text}`);
    }
  };

  const handleRecordPayment = (member: any) => {
    setSelectedMember(null);
    router.push({
      pathname: '/(owner)/dashboard/payments/add' as any,
      params: { customerId: member.customerId },
    });
  };

  const handleViewProfile = (member: any) => {
    setSelectedMember(null);
    router.push(`/(owner)/dashboard/customers` as any);
  };

  // Header Component for FlatList
  const renderHeader = () => (
    <View className="mb-2">
      {/* Top Bar: Back & Title */}
      <View className="flex-row items-center mb-5">
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            router.back();
          }}
          className="w-10 h-10 rounded-full bg-[#161616] border border-[#27272A] items-center justify-center mr-3 active:opacity-70"
        >
          <ArrowLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-tight">
          Membership Renewals
        </Text>
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center bg-[#131926] border border-[#1F293D] rounded-2xl px-4 py-3 mb-5">
        <MagnifyingGlass size={18} color="#717E95" weight="bold" />
        <TextInput
          placeholder="Search member..."
          placeholderTextColor="#717E95"
          className="flex-1 ml-3 text-white text-sm font-medium p-0"
          value={search}
          onChangeText={setSearch}
          selectionColor="#CCF200"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} className="p-1">
            <X size={16} color="#717E95" />
          </Pressable>
        )}
      </View>

      {/* 3 KPI Metric Cards */}
      <View className="flex-row justify-between mb-7 gap-x-2.5">
        {/* Renewed Today */}
        <View className="flex-1 bg-[#131926] border border-[#1F293D] rounded-2xl p-3.5 items-center justify-center min-h-[118px]">
          <View className="w-10 h-10 rounded-xl bg-[#22C55E]/15 items-center justify-center mb-2.5">
            <ArrowsClockwise size={20} color="#22C55E" weight="bold" />
          </View>
          <Text className="text-[#717E95] text-[10px] font-semibold mb-1 text-center" numberOfLines={1}>
            Renewed Today
          </Text>
          <Text className="text-white text-2xl font-bold" numberOfLines={1}>
            {stats.renewedToday}
          </Text>
        </View>

        {/* Renewed This Week */}
        <View className="flex-1 bg-[#131926] border border-[#1F293D] rounded-2xl p-3.5 items-center justify-center min-h-[118px]">
          <View className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 items-center justify-center mb-2.5">
            <CalendarBlank size={20} color="#3B82F6" weight="fill" />
          </View>
          <Text className="text-[#717E95] text-[10px] font-semibold mb-1 text-center" numberOfLines={1}>
            Renewed This Week
          </Text>
          <Text className="text-white text-2xl font-bold" numberOfLines={1}>
            {stats.renewedThisWeek}
          </Text>
        </View>

        {/* Revenue from Renewals */}
        <View className="flex-1 bg-[#131926] border border-[#1F293D] rounded-2xl p-3.5 items-center justify-center min-h-[118px]">
          <View className="w-10 h-10 rounded-xl bg-[#A855F7]/15 items-center justify-center mb-2.5">
            <CreditCard size={20} color="#A855F7" weight="fill" />
          </View>
          <Text className="text-[#717E95] text-[9.5px] font-semibold mb-1 text-center" numberOfLines={1}>
            Revenue from Renewals
          </Text>
          <Text className="text-white text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>
            ₹{stats.revenueFromRenewals.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Section 1: Recent Renewals */}
      <View className="flex-row items-center justify-between mb-3.5">
        <Text className="text-lg font-bold text-white tracking-tight">Recent Renewals</Text>
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setShowRecentAllModal(true);
          }}
          className="flex-row items-center py-1 pl-2 active:opacity-70"
        >
          <Text className="text-[#8E8E93] text-xs font-semibold mr-1">View All</Text>
          <CaretRight size={13} color="#8E8E93" weight="bold" />
        </Pressable>
      </View>

      {/* Recent Renewals Cards */}
      <View className="mb-6">
        {filteredRecentRenewals.length === 0 ? (
          <View className="bg-[#131926] border border-[#1F293D] rounded-2xl p-5 items-center">
            <Text className="text-[#717E95] text-xs font-medium">No recent renewals found.</Text>
          </View>
        ) : (
          filteredRecentRenewals.slice(0, 3).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                triggerLightHaptic();
                setSelectedMember(item);
              }}
              className="bg-[#131926] border border-[#1F293D] rounded-2xl p-3.5 flex-row items-center justify-between mb-3 active:bg-[#1A2234]"
            >
              {/* Left Column: Avatar + Name + Plan + Time */}
              <View className="flex-row items-center flex-1 pr-2">
                {item.img ? (
                  <Image
                    source={{ uri: item.img }}
                    className="w-11 h-11 rounded-full mr-3 bg-[#1F293D]"
                  />
                ) : (
                  <View className="w-11 h-11 rounded-full mr-3 bg-[#1F293D] items-center justify-center">
                    <User size={20} color="#717E95" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm mb-0.5" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: item.planColor }}
                    numberOfLines={1}
                  >
                    {item.plan}
                  </Text>
                  <Text className="text-[#717E95] text-[10px]" numberOfLines={1}>
                    {item.time}
                  </Text>
                </View>
              </View>

              {/* Right Column: Valid Till + Expiry + Payment Mode */}
              <View className="items-end justify-center pl-2">
                <Text className="text-[#717E95] text-[10px] mb-0.5 font-medium">Valid Till</Text>
                <Text className="text-white font-bold text-xs mb-1.5">{item.validTill}</Text>
                <View className="flex-row items-center">
                  {item.paymentIconType === 'upi' ? (
                    <Triangle size={10} color="#F59E0B" weight="fill" style={{ marginRight: 4 }} />
                  ) : (
                    <CreditCard size={11} color="#94A3B8" weight="regular" style={{ marginRight: 4 }} />
                  )}
                  <Text className="text-[#94A3B8] text-[10px] font-medium">{item.paymentMethod}</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>

      {/* Section 2: Upcoming Renewals */}
      <View className="flex-row items-center justify-between mb-3.5">
        <Text className="text-lg font-bold text-white tracking-tight">Upcoming Renewals</Text>
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setShowUpcomingAllModal(true);
          }}
          className="flex-row items-center py-1 pl-2 active:opacity-70"
        >
          <Text className="text-[#8E8E93] text-xs font-semibold mr-1">View All</Text>
          <CaretRight size={13} color="#8E8E93" weight="bold" />
        </Pressable>
      </View>

      {/* Filter Tabs / Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3.5"
        contentContainerStyle={{ gap: 8 }}
      >
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setActiveFilter('all');
          }}
          className={`px-3.5 py-1.5 rounded-xl border ${
            activeFilter === 'all'
              ? 'bg-[#FBBF24]/15 border-[#FBBF24]'
              : 'bg-[#131926] border-[#1F293D]'
          }`}
        >
          <Text
            className={`text-xs ${
              activeFilter === 'all' ? 'text-[#FBBF24] font-bold' : 'text-[#717E95] font-medium'
            }`}
          >
            All ({upcomingRenewals.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setActiveFilter('today');
          }}
          className={`px-3.5 py-1.5 rounded-xl border ${
            activeFilter === 'today'
              ? 'bg-[#EF4444]/15 border-[#EF4444]'
              : 'bg-[#131926] border-[#1F293D]'
          }`}
        >
          <Text
            className={`text-xs ${
              activeFilter === 'today' ? 'text-[#F87171] font-bold' : 'text-[#717E95] font-medium'
            }`}
          >
            Today ({upcomingTodayCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setActiveFilter('next3');
          }}
          className={`px-3.5 py-1.5 rounded-xl border ${
            activeFilter === 'next3'
              ? 'bg-[#F59E0B]/15 border-[#F59E0B]'
              : 'bg-[#131926] border-[#1F293D]'
          }`}
        >
          <Text
            className={`text-xs ${
              activeFilter === 'next3' ? 'text-[#FBBF24] font-bold' : 'text-[#717E95] font-medium'
            }`}
          >
            Next 3 Days ({upcomingNext3Count})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setActiveFilter('next7');
          }}
          className={`px-3.5 py-1.5 rounded-xl border ${
            activeFilter === 'next7'
              ? 'bg-[#10B981]/15 border-[#10B981]'
              : 'bg-[#131926] border-[#1F293D]'
          }`}
        >
          <Text
            className={`text-xs ${
              activeFilter === 'next7' ? 'text-[#34D399] font-bold' : 'text-[#717E95] font-medium'
            }`}
          >
            Next 7 Days ({upcomingNext7Count})
          </Text>
        </Pressable>
      </ScrollView>

      {/* Table Header */}
      <View className="flex-row items-center px-4 py-3 bg-[#131926] rounded-t-2xl border-t border-l border-r border-[#1F293D]">
        <Text className="text-[#717E95] text-xs font-semibold flex-[2.2]">Member</Text>
        <Text className="text-[#717E95] text-xs font-semibold flex-[2.2]">Plan</Text>
        <Text className="text-[#717E95] text-xs font-semibold flex-[1.4] text-right">Expires In</Text>
      </View>
    </View>
  );

  // Table Row Item
  const renderUpcomingRow = ({ item, index }: { item: any; index: number }) => {
    const isLast = index === filteredUpcomingRenewals.length - 1;

    return (
      <Pressable
        onPress={() => {
          triggerLightHaptic();
          setSelectedMember(item);
        }}
        className={`flex-row items-center px-4 py-3.5 bg-[#131926] border-l border-r border-[#1F293D] active:bg-[#1A2234] ${
          isLast ? 'border-b rounded-b-2xl mb-6' : 'border-b border-[#1F293D]'
        }`}
      >
        {/* Member Name */}
        <View className="flex-[2.2] pr-2">
          <Text className="text-white font-semibold text-xs" numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        {/* Plan Name */}
        <View className="flex-[2.2] pr-2">
          <Text
            className="font-semibold text-xs"
            style={{ color: item.planColor }}
            numberOfLines={1}
          >
            {item.plan}
          </Text>
        </View>

        {/* Urgency / Expires In */}
        <View className="flex-[1.4] items-end">
          <Text
            className="font-bold text-xs"
            style={{ color: item.urgency.color }}
          >
            {item.urgency.text}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: Math.max(insets.top, 16) }}>
      <FlatList
        data={filteredUpcomingRenewals}
        renderItem={renderUpcomingRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 40,
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !isLoadingPlans && !isLoadingPayments ? (
            <View className="bg-[#131926] border-b border-l border-r border-[#1F293D] rounded-b-2xl p-6 items-center mb-6">
              <Text className="text-[#717E95] text-xs font-medium">No upcoming renewals matching criteria.</Text>
            </View>
          ) : (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#CCF200" />
            </View>
          )
        }
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Member Details Bottom Sheet Modal */}
      <Modal
        visible={!!selectedMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <Pressable className="flex-1" onPress={() => setSelectedMember(null)} />
          <View
            className="bg-[#131926] border-t border-[#232936] rounded-t-3xl p-5"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-[#1F293D] mb-4">
              <View className="flex-row items-center gap-3">
                {selectedMember?.img ? (
                  <Image
                    source={{ uri: selectedMember.img }}
                    className="w-12 h-12 rounded-full bg-[#1F293D]"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-full bg-[#1F293D] items-center justify-center">
                    <User size={24} color="#717E95" />
                  </View>
                )}
                <View>
                  <Text className="text-white font-bold text-base">{selectedMember?.name}</Text>
                  <Text className="text-xs font-semibold" style={{ color: selectedMember?.planColor }}>
                    {selectedMember?.plan}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setSelectedMember(null)}
                className="w-8 h-8 rounded-full bg-[#1F293D] items-center justify-center"
              >
                <X size={16} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Quick Info */}
            <View className="bg-[#0E121D] rounded-2xl p-3.5 mb-4 border border-[#1F293D] gap-y-2">
              {selectedMember?.phone ? (
                <View className="flex-row justify-between items-center">
                  <Text className="text-[#717E95] text-xs font-medium">Phone</Text>
                  <Text className="text-white text-xs font-semibold">{selectedMember.phone}</Text>
                </View>
              ) : null}

              {selectedMember?.expiryDate || selectedMember?.validTill ? (
                <View className="flex-row justify-between items-center">
                  <Text className="text-[#717E95] text-xs font-medium">Expiry / Valid Till</Text>
                  <Text className="text-white text-xs font-semibold">
                    {selectedMember.expiryDate || selectedMember.validTill}
                  </Text>
                </View>
              ) : null}

              {selectedMember?.daysLeft !== undefined ? (
                <View className="flex-row justify-between items-center">
                  <Text className="text-[#717E95] text-xs font-medium">Status</Text>
                  <Text className="text-xs font-bold" style={{ color: selectedMember.urgency?.color || '#F59E0B' }}>
                    {selectedMember.urgency?.text || `${selectedMember.daysLeft} Days Left`}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View className="gap-y-2.5">
              <View className="flex-row gap-2.5">
                {selectedMember?.phone ? (
                  <>
                    <Pressable
                      onPress={() => handleCall(selectedMember.phone)}
                      className="flex-1 flex-row items-center justify-center bg-[#1F293D] py-3 rounded-xl gap-2 active:opacity-75"
                    >
                      <Phone size={18} color="#FFFFFF" weight="bold" />
                      <Text className="text-white text-xs font-bold">Call</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleWhatsApp(selectedMember.phone, selectedMember.name)}
                      className="flex-1 flex-row items-center justify-center bg-[#25D366]/20 border border-[#25D366]/40 py-3 rounded-xl gap-2 active:opacity-75"
                    >
                      <WhatsappLogo size={18} color="#25D366" weight="fill" />
                      <Text className="text-[#25D366] text-xs font-bold">WhatsApp</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>

              <Pressable
                onPress={() => handleRecordPayment(selectedMember)}
                className="flex-row items-center justify-center bg-[#CCF200] py-3.5 rounded-xl gap-2 active:opacity-85"
              >
                <CurrencyInr size={18} color="#000000" weight="bold" />
                <Text className="text-black text-sm font-bold">Record Renewal Payment</Text>
              </Pressable>

              <Pressable
                onPress={() => handleViewProfile(selectedMember)}
                className="flex-row items-center justify-center bg-[#1F293D] py-3 rounded-xl active:opacity-75"
              >
                <Text className="text-[#94A3B8] text-xs font-semibold">View Member Directory</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: View All Recent Renewals */}
      <Modal
        visible={showRecentAllModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecentAllModal(false)}
      >
        <View className="flex-1 bg-[#09090B]" style={{ paddingTop: Math.max(insets.top, 16) }}>
          <View className="px-4 py-3 border-b border-[#1F293D] flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setShowRecentAllModal(false)}
                className="w-9 h-9 rounded-full bg-[#131926] border border-[#1F293D] items-center justify-center"
              >
                <ArrowLeft size={18} color="#FFFFFF" weight="bold" />
              </Pressable>
              <Text className="text-lg font-bold text-white">All Recent Renewals</Text>
            </View>
            <Text className="text-[#717E95] text-xs font-semibold">
              {filteredRecentRenewals.length} Total
            </Text>
          </View>

          <FlatList
            data={filteredRecentRenewals}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setShowRecentAllModal(false);
                  setSelectedMember(item);
                }}
                className="bg-[#131926] border border-[#1F293D] rounded-2xl p-4 flex-row items-center justify-between mb-3 active:bg-[#1A2234]"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  {item.img ? (
                    <Image source={{ uri: item.img }} className="w-11 h-11 rounded-full mr-3 bg-[#1F293D]" />
                  ) : (
                    <View className="w-11 h-11 rounded-full mr-3 bg-[#1F293D] items-center justify-center">
                      <User size={20} color="#717E95" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm mb-0.5">{item.name}</Text>
                    <Text className="text-xs font-semibold mb-0.5" style={{ color: item.planColor }}>
                      {item.plan}
                    </Text>
                    <Text className="text-[#717E95] text-[10px]">{item.time}</Text>
                  </View>
                </View>

                <View className="items-end justify-center pl-2">
                  <Text className="text-[#717E95] text-[10px] mb-0.5">Valid Till</Text>
                  <Text className="text-white font-bold text-xs mb-1.5">{item.validTill}</Text>
                  <View className="flex-row items-center">
                    {item.paymentIconType === 'upi' ? (
                      <Triangle size={10} color="#F59E0B" weight="fill" style={{ marginRight: 4 }} />
                    ) : (
                      <CreditCard size={11} color="#94A3B8" weight="regular" style={{ marginRight: 4 }} />
                    )}
                    <Text className="text-[#94A3B8] text-[10px] font-medium">{item.paymentMethod}</Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Modal: View All Upcoming Renewals */}
      <Modal
        visible={showUpcomingAllModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpcomingAllModal(false)}
      >
        <View className="flex-1 bg-[#09090B]" style={{ paddingTop: Math.max(insets.top, 16) }}>
          <View className="px-4 py-3 border-b border-[#1F293D] flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setShowUpcomingAllModal(false)}
                className="w-9 h-9 rounded-full bg-[#131926] border border-[#1F293D] items-center justify-center"
              >
                <ArrowLeft size={18} color="#FFFFFF" weight="bold" />
              </Pressable>
              <Text className="text-lg font-bold text-white">All Upcoming Renewals</Text>
            </View>
            <Text className="text-[#717E95] text-xs font-semibold">
              {upcomingRenewals.length} Total
            </Text>
          </View>

          <FlatList
            data={upcomingRenewals}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setShowUpcomingAllModal(false);
                  setSelectedMember(item);
                }}
                className="bg-[#131926] border border-[#1F293D] rounded-2xl p-4 flex-row items-center justify-between mb-3 active:bg-[#1A2234]"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  {item.img ? (
                    <Image source={{ uri: item.img }} className="w-11 h-11 rounded-full mr-3 bg-[#1F293D]" />
                  ) : (
                    <View className="w-11 h-11 rounded-full mr-3 bg-[#1F293D] items-center justify-center">
                      <User size={20} color="#717E95" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm mb-0.5">{item.name}</Text>
                    <Text className="text-xs font-semibold mb-0.5" style={{ color: item.planColor }}>
                      {item.plan}
                    </Text>
                    <Text className="text-[#717E95] text-[10px]">Expires: {item.expiryDate}</Text>
                  </View>
                </View>

                <View className="items-end justify-center pl-2">
                  <View
                    className="px-2.5 py-1 rounded-lg border"
                    style={{
                      backgroundColor: `${item.urgency.color}15`,
                      borderColor: item.urgency.color,
                    }}
                  >
                    <Text className="text-xs font-bold" style={{ color: item.urgency.color }}>
                      {item.urgency.text}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
