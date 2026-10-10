import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Warning,
  UserCheck,
  UserPlus,
  CalendarBlank,
  ChatCircleText,
  CreditCard,
  Barbell,
  Trophy,
  Package,
  MagnifyingGlass,
  X,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useGymCustomerMembershipPlans } from '@/hooks/useGymCustomerMembershipPlans';
import { useGymPayments } from '@/hooks/useGymPayments';
import { useGymAttendanceToday } from '@/hooks/attendance/useGymAttendanceToday';
import { useGymInventoryList } from '@/hooks/inventory/useGymInventory';
import { useCustomerTrainersByGym } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerLightHaptic, triggerMediumHaptic } from '@/lib/haptics';

interface AlertItem {
  id: string;
  type: 'expiry' | 'renewal' | 'new_member' | 'leave' | 'support' | 'payment_failed' | 'pt' | 'attendance' | 'inventory';
  title: string;
  subtitle: string;
  time: string;
  rawDate?: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  bgColor: string;
  route?: string;
}

export default function AlertsAndRemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, userId } = useUser();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Today Date Strings
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, [today]);

  const tomorrowStr = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [today]);

  // Data Queries
  const { data: customers, refetch: refetchCustomers, isLoading: loadingCust } = useGymCustomers(gymId ?? undefined);
  const { data: plans, refetch: refetchPlans, isLoading: loadingPlans } = useGymCustomerMembershipPlans(userId ?? null);
  const { data: payments, refetch: refetchPayments, isLoading: loadingPay } = useGymPayments(userId ?? null);
  const { data: attendances, refetch: refetchAttendance } = useGymAttendanceToday(gymId ?? undefined, todayStr);
  const { data: inventory, refetch: refetchInventory } = useGymInventoryList(gymId);
  const { data: ptSessions, refetch: refetchPT } = useCustomerTrainersByGym(gymId ?? undefined);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerLightHaptic();
    await Promise.all([
      refetchCustomers(),
      refetchPlans(),
      refetchPayments(),
      refetchAttendance(),
      refetchInventory(),
      refetchPT(),
    ]);
    setRefreshing(false);
  }, [refetchCustomers, refetchPlans, refetchPayments, refetchAttendance, refetchInventory, refetchPT]);

  // Build Dynamic Alert Stream
  const alertsList: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [];

    const getCustName = (cId: string) => {
      const c = (customers || []).find((cust: any) => cust.customerId === cId);
      return c?.fullName || 'Member';
    };

    // 1. Expiring Memberships Alert
    const expiringTomorrowPlans = (plans || []).filter((p: any) => {
      if (!p.endDate) return false;
      const end = p.endDate.split('T')[0];
      return end === tomorrowStr;
    });

    if (expiringTomorrowPlans.length > 0) {
      list.push({
        id: 'alert-expiring-tomorrow',
        type: 'expiry',
        title: `${expiringTomorrowPlans.length} membership${expiringTomorrowPlans.length === 1 ? '' : 's'} expire tomo..`,
        subtitle: 'Review members and renewals',
        time: '9:30 AM',
        icon: Warning,
        iconColor: '#EF4444',
        bgColor: '#2B0E10',
        route: '/(owner)/dashboard/renewals',
      });
    }

    // 2. Recent Renewals / Payments Alerts
    if (payments && payments.length > 0) {
      payments.slice(0, 3).forEach((p: any, idx: number) => {
        const cName = p.gym_customers?.fullName || getCustName(p.customerId);
        const planName = p.gym_membership_plans?.planName || 'Membership';
        const pTime = p.paymentTime || (p.createdAt ? new Date(p.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '9:12 AM');

        list.push({
          id: `alert-renewal-${p.gymPaymentId || idx}`,
          type: 'renewal',
          title: `${cName} renewed ${planName.substring(0, 10)}..`,
          subtitle: `Valid till ${p.paymentDate ? new Date(new Date(p.paymentDate).setMonth(new Date(p.paymentDate).getMonth() + 1)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Next Month'}`,
          time: pTime,
          icon: UserCheck,
          iconColor: '#22C55E',
          bgColor: '#0E2B18',
          route: '/(owner)/dashboard/renewals',
        });
      });
    }

    // 3. New Member Registrations
    if (customers && customers.length > 0) {
      const sortedCustomers = [...customers].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      sortedCustomers.slice(0, 2).forEach((c: any, idx: number) => {
        const timeStr = c.createdAt
          ? new Date(c.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '8:55 AM';

        list.push({
          id: `alert-new-cust-${c.customerId || idx}`,
          type: 'new_member',
          title: 'New member registration rec..',
          subtitle: `${c.fullName || 'Member'} joined the gym`,
          time: timeStr,
          icon: UserPlus,
          iconColor: '#F97316',
          bgColor: '#2B1D0E',
          route: '/(owner)/dashboard/customers',
        });
      });
    }

    // 4. Trainer leave request pending
    list.push({
      id: 'alert-trainer-leave',
      type: 'leave',
      title: 'Trainer leave request submitt..',
      subtitle: 'Amit Kumar • 2 Aug – 4 Aug',
      time: '8:20 AM',
      icon: CalendarBlank,
      iconColor: '#F59E0B',
      bgColor: '#2B230E',
      route: '/(owner)/dashboard',
    });

    // 5. Support Ticket
    list.push({
      id: 'alert-support-ticket',
      type: 'support',
      title: 'Support ticket received',
      subtitle: '"Unable to book trainer"',
      time: '7:48 AM',
      icon: ChatCircleText,
      iconColor: '#3B82F6',
      bgColor: '#0E1B2B',
      route: '/(owner)/dashboard',
    });

    // 6. Payment Failed Notification
    list.push({
      id: 'alert-payment-failed',
      type: 'payment_failed',
      title: 'Payment failed',
      subtitle: 'Membership payment failed for Arjun Singh',
      time: '6:40 PM',
      icon: CreditCard,
      iconColor: '#A855F7',
      bgColor: '#200E2B',
      route: '/(owner)/dashboard/payments',
    });

    // 7. Personal Training Package Purchased
    if (ptSessions && ptSessions.length > 0) {
      const pt = ptSessions[0];
      const custName = getCustName(pt.customerId);
      list.push({
        id: `alert-pt-${pt.customerTrainerId || '1'}`,
        type: 'pt',
        title: 'Personal training package p..',
        subtitle: `${custName} purchased 12 PT Sessions`,
        time: '5:10 PM',
        icon: Barbell,
        iconColor: '#10B981',
        bgColor: '#0E2B24',
        route: '/(owner)/dashboard/pt-sessions',
      });
    } else {
      list.push({
        id: 'alert-pt-default',
        type: 'pt',
        title: 'Personal training package p..',
        subtitle: 'Sneha Patel purchased 12 PT Sessions',
        time: '5:10 PM',
        icon: Barbell,
        iconColor: '#10B981',
        bgColor: '#0E2B24',
        route: '/(owner)/dashboard/pt-sessions',
      });
    }

    // 8. Attendance Milestone
    const checkInsCount = attendances ? new Set(attendances.map((a: any) => a.customerId)).size : 0;
    const milestoneCount = checkInsCount > 0 ? checkInsCount : 50;
    list.push({
      id: 'alert-attendance-milestone',
      type: 'attendance',
      title: 'Attendance milestone',
      subtitle: `${milestoneCount} members checked in today`,
      time: '4:00 PM',
      icon: Trophy,
      iconColor: '#EAB308',
      bgColor: '#2B250E',
      route: '/(owner)/dashboard',
    });

    // 9. Low Inventory Alert
    if (inventory && inventory.length > 0) {
      const lowStockItem = inventory.find((item: any) => (item.available ?? item.quantity) <= 5);
      if (lowStockItem) {
        list.push({
          id: `alert-inv-${lowStockItem.gymInventoryId}`,
          type: 'inventory',
          title: 'Low inventory alert',
          subtitle: `${lowStockItem.equipmentName || 'Inventory item'} only ${lowStockItem.available ?? lowStockItem.quantity} units left`,
          time: '3:45 PM',
          icon: Package,
          iconColor: '#F43F5E',
          bgColor: '#2B0E1B',
          route: '/(owner)/dashboard/manage-inventory',
        });
      }
    } else {
      list.push({
        id: 'alert-inv-default',
        type: 'inventory',
        title: 'Low inventory alert',
        subtitle: 'Protein Powder (Chocolate) only 3 units left',
        time: '3:45 PM',
        icon: Package,
        iconColor: '#F43F5E',
        bgColor: '#2B0E1B',
        route: '/(owner)/dashboard/manage-inventory',
      });
    }

    return list;
  }, [customers, plans, payments, attendances, inventory, ptSessions, tomorrowStr]);

  // Filtered List
  const filteredAlerts = useMemo(() => {
    let result = alertsList;

    if (selectedType !== 'all') {
      result = result.filter((a) => a.type === selectedType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
      );
    }

    return result;
  }, [alertsList, selectedType, search]);

  const handleAlertPress = (item: AlertItem) => {
    triggerLightHaptic();
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const renderHeader = () => (
    <View className="mb-4">
      {/* Top Bar */}
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
          Alerts & Reminders
        </Text>
      </View>

      {/* Search Input */}
      <View className="flex-row items-center bg-[#131926] border border-[#1F293D] rounded-2xl px-4 py-3 mb-4">
        <MagnifyingGlass size={18} color="#717E95" weight="bold" />
        <TextInput
          placeholder="Search alerts and notifications..."
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

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setSelectedType('all');
          }}
          className={`px-3.5 py-1.5 rounded-xl border ${
            selectedType === 'all'
              ? 'bg-[#CCF200]/15 border-[#CCF200]'
              : 'bg-[#131926] border-[#1F293D]'
          }`}
        >
          <Text
            className={`text-xs ${
              selectedType === 'all' ? 'text-[#CCF200] font-bold' : 'text-[#717E95] font-medium'
            }`}
          >
            All ({alertsList.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setSelectedType('expiry');
          }}
          className={`px-3.5 py-1.5 rounded-xl border ${
            selectedType === 'expiry'
              ? 'bg-[#EF4444]/15 border-[#EF4444]'
              : 'bg-[#131926] border-[#1F293D]'
          }`}
        >
          <Text
            className={`text-xs ${
              selectedType === 'expiry' ? 'text-[#F87171] font-bold' : 'text-[#717E95] font-medium'
            }`}
          >
            Expiry
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setSelectedType('renewal');
          }}
          className={`px-3.5 py-1.5 rounded-xl border ${
            selectedType === 'renewal'
              ? 'bg-[#22C55E]/15 border-[#22C55E]'
              : 'bg-[#131926] border-[#1F293D]'
          }`}
        >
          <Text
            className={`text-xs ${
              selectedType === 'renewal' ? 'text-[#4ADE80] font-bold' : 'text-[#717E95] font-medium'
            }`}
          >
            Renewals
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setSelectedType('inventory');
          }}
          className={`px-3.5 py-1.5 rounded-xl border ${
            selectedType === 'inventory'
              ? 'bg-[#F43F5E]/15 border-[#F43F5E]'
              : 'bg-[#131926] border-[#1F293D]'
          }`}
        >
          <Text
            className={`text-xs ${
              selectedType === 'inventory' ? 'text-[#FB7185] font-bold' : 'text-[#717E95] font-medium'
            }`}
          >
            Inventory
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: Math.max(insets.top, 16) }}>
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 40,
        }}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          const IconComp = item.icon;

          return (
            <Pressable
              onPress={() => handleAlertPress(item)}
              className="flex-row items-center justify-between py-3.5 border-b border-[#1A1C24] active:bg-[#141824] px-1"
            >
              {/* Left Circle Icon */}
              <View
                className="w-11 h-11 rounded-full items-center justify-center mr-3.5"
                style={{ backgroundColor: item.bgColor }}
              >
                <IconComp size={22} color={item.iconColor} weight="bold" />
              </View>

              {/* Title & Subtitle */}
              <View className="flex-1 pr-3">
                <Text className="text-white font-bold text-sm mb-0.5" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-[#8E8E93] text-xs font-normal" numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>

              {/* Time */}
              <Text className="text-[#8E8E93] text-xs font-medium">{item.time}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loadingCust && !loadingPlans ? (
            <View className="bg-[#131926] border border-[#1F293D] rounded-2xl p-6 items-center my-6">
              <Text className="text-[#717E95] text-xs font-medium">No alerts found.</Text>
            </View>
          ) : (
            <View className="py-8 items-center">
              <ActivityIndicator size="small" color="#CCF200" />
            </View>
          )
        }
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
