import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useGymAttendanceToday } from '@/hooks/attendance/useGymAttendanceToday';
import { useGymPayments } from '@/hooks/useGymPayments';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { router } from 'expo-router';
import {
  Users,
  CheckCircle,
  CurrencyInr,
  TrendUp,
  UserPlus,
  Megaphone,
  Package,
  Wallet,
  Barbell,
  UsersThree,
  CalendarCheck,
  Warning,
  UserMinus,
  EnvelopeSimple,
  CaretRight,
  CaretDown,
  QrCode,
  Fingerprint,
} from 'phosphor-react-native';
import { triggerMediumHaptic } from '@/lib/haptics';

const OVERVIEW_ITEMS = [
  { id: 'active-customers', icon: Users, label: 'ACTIVE CUSTOMERS', value: '1,036' },
  { id: 'check-ins', icon: CheckCircle, label: 'CHECK-INS', value: '286' },
  { id: 'revenue-today', icon: CurrencyInr, label: 'REVENUE TODAY', value: '₹8,450' },
  { id: 'monthly-growth', icon: TrendUp, label: 'MONTHLY GROWTH', value: '+8.4%' },
];

const QUICK_ACTIONS = [
  { id: 'add-customer', icon: UserPlus, label: 'Add Customer' },
  { id: 'create-announcement', icon: Megaphone, label: 'Create Announcement' },
  { id: 'open-qr', icon: QrCode, label: 'Open Check-In QR' },
  { id: 'manage-inventory', icon: Package, label: 'Manage Inventory' },
  { id: 'record-payment', icon: Wallet, label: 'Record Payment' },
  { id: 'manage-biometric', icon: Fingerprint, label: 'Manage Biometric' },
];

const OPERATIONS = [
  { id: 'pt-sessions', icon: Barbell, value: '18', label: 'PT SESSIONS' },
  { id: 'group-classes', icon: UsersThree, value: '6', label: 'GROUP CLASSES' },
  { id: 'renewals', icon: CalendarCheck, value: '5', label: 'RENEWALS' },
];

const ALERTS = [
  {
    id: 'expiring',
    icon: Warning,
    iconColor: '#EF4444',
    bg: '#2B0E10',
    title: '8 Customerships expiring tomorrow',
  },
  {
    id: 'leave',
    icon: UserMinus,
    iconColor: '#888888',
    bg: '#242424',
    title: 'Trainer leave pending approval',
  },
  {
    id: 'ticket',
    icon: EnvelopeSimple,
    iconColor: '#CCF200',
    bg: '#242810',
    title: 'New support ticket received',
  },
];

const MONTHLY_DATA = [
  { month: 'JAN', height: '35%', active: false },
  { month: 'FEB', height: '55%', active: false },
  { month: 'MAR', height: '45%', active: false },
  { month: 'APR', height: '70%', active: false },
  { month: 'MAY', height: '40%', active: false },
  { month: 'JUN', height: '85%', active: false },
  { month: 'JUL', height: '75%', active: true, value: '₹42K' },
];

export default function OwnerDashboardScreen() {
  const { name, gymId, userId } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const { data: customers, refetch: refetchCustomers } = useGymCustomers(gymId ?? undefined);
  const { data: attendances, refetch: refetchAttendances } = useGymAttendanceToday(gymId ?? undefined);
  const { data: payments, refetch: refetchPayments } = useGymPayments(userId ?? null);

  const activeCustomersCount = customers?.filter((c: any) => c.is_Active === true).length || 0;
  const checkInsCount = attendances?.length || 0;

  const localNow = new Date();
  const tzOffset = localNow.getTimezoneOffset() * 60000;
  const localDate = new Date(Date.now() - tzOffset).toISOString().slice(0, 10);

  const revenueToday = payments?.reduce((sum, payment) => {
    if (payment.paymentDate === localDate) {
      return sum + Number(payment.amountPaid || 0);
    }
    return sum;
  }, 0) || 0;

  const onRefresh = useCallback(async () => {
    triggerMediumHaptic();
    setRefreshing(true);
    try {
      await Promise.all([
        refetchCustomers(),
        refetchAttendances(),
        refetchPayments()
      ]);
    } catch (error) {
      console.error('[Dashboard] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCustomers, refetchAttendances, refetchPayments]);

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      refreshControl={
        <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>

      <View className="mb-6">
        <Text className="text-2xl font-semibold text-white mb-0.5">
          Good Morning, {name || 'User'} 👋
        </Text>
        <Text className="text-sm font-medium" style={{ color: '#C5C9AC' }}>
          Monday, 20 July
        </Text>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-white">Today's Overview</Text>
        <Pressable className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161616] border border-[#242424] active:opacity-75">
          <Text className="text-xs text-[#A1A1AA] font-medium">Today</Text>
          <CaretDown size={12} color="#A1A1AA" />
        </Pressable>
      </View>

      <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-3 flex-row justify-between mb-6">
        {OVERVIEW_ITEMS.map((item, index) => {
          const IconComp = item.icon;
          let displayValue = item.value;
          if (item.id === 'active-customers') {
            displayValue = activeCustomersCount.toString();
          } else if (item.id === 'check-ins') {
            displayValue = checkInsCount.toString();
          } else if (item.id === 'revenue-today') {
            displayValue = `₹${revenueToday.toLocaleString('en-IN')}`;
          }

          return (
            <React.Fragment key={item.id}>
              {index > 0 && <View className="w-[1px] bg-[#1F293D] my-1" />}
              <View className="flex-1 items-start px-1.5 py-1">
                <IconComp size={20} color="#CCF200" weight="bold" />
                <Text className="text-[9px] font-semibold text-[#888888] tracking-wider mt-2 mb-1" numberOfLines={1}>
                  {item.label}
                </Text>
                <Text className="text-base font-semibold text-white" numberOfLines={1}>
                  {displayValue}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <Text className="text-base font-semibold text-white mb-3">Quick Actions</Text>
      <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
        {QUICK_ACTIONS.map((action) => {
          const IconComp = action.icon;
          return (
            <Pressable
              key={action.id}
              onPress={() => {
                if (action.id === 'add-customer') {
                  router.push('/(owner)/dashboard/customers');
                } else if (action.id === 'open-qr') {
                  router.push('/(owner)/dashboard/qr');
                } else if (action.id === 'manage-inventory') {
                  router.push('/(owner)/dashboard/manage-inventory');
                } else if (action.id === 'record-payment') {
                  router.push('/(owner)/dashboard/payments' as any);
                } else if (action.id === 'create-announcement') {
                  router.push('/(owner)/announcements' as any);
                } else if (action.id === 'manage-biometric') {
                  router.push('/(owner)/dashboard/biometric' as any);
                }
              }}
              className="w-[48.5%] bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 items-center justify-center active:opacity-80 min-h-[120px]">
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: '#373F0E' }}>
                <IconComp size={22} color="#CCF200" weight="bold" />
              </View>
              <Text className="text-sm font-semibold text-white text-center">
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-base font-semibold text-white mb-3">Today's Operations</Text>
      <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 flex-row justify-between mb-6">
        {OPERATIONS.map((op, index) => {
          const IconComp = op.icon;
          return (
            <React.Fragment key={op.id}>
              {index > 0 && <View className="w-[1px] bg-[#1F293D] my-1" />}
              <Pressable
                onPress={() => {
                  triggerMediumHaptic();
                  if (op.id === 'pt-sessions') {
                    router.push('/(owner)/dashboard/pt-sessions' as any);
                  } else if (op.id === 'renewals') {
                    router.push('/(owner)/dashboard/renewals');
                  }
                }}
                className="flex-1 items-center px-1 active:opacity-70"
              >
                <IconComp size={22} color="#CCF200" weight="bold" />
                <Text className="text-xl font-semibold text-white mt-2 mb-0.5">
                  {op.value}
                </Text>
                <Text className="text-[10px] font-semibold text-[#888888] tracking-wider text-center">
                  {op.label}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-white">Alerts & Reminders</Text>
        <Pressable className="active:opacity-70">
          <Text className="text-xs font-semibold" style={{ color: '#CCF200' }}>
            View All
          </Text>
        </Pressable>
      </View>

      <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-3 mb-6 gap-y-3">
        {ALERTS.map((alert, index) => {
          const IconComp = alert.icon;
          return (
            <React.Fragment key={alert.id}>
              {index > 0 && <View className="h-[1px] bg-[#1F293D]" />}
              <Pressable className="flex-row items-center justify-between py-1 active:opacity-70">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: alert.bg }}>
                    <IconComp size={20} color={alert.iconColor} weight="bold" />
                  </View>
                  <Text className="text-sm font-medium text-white flex-1 leading-5">
                    {alert.title}
                  </Text>
                </View>
                <CaretRight size={18} color="#888888" />
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-white">Revenue Trend</Text>
        <Pressable className="active:opacity-70">
          <Text className="text-xs font-semibold" style={{ color: '#CCF200' }}>
            Monthly Chart
          </Text>
        </Pressable>
      </View>

      <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4">
        <View className="h-44 flex-row items-end justify-between px-1 pt-6 pb-2">
          {MONTHLY_DATA.map((item) => (
            <View key={item.month} className="items-center flex-1 h-full justify-end px-1">
              {item.active && item.value && (
                <View className="bg-[#CCF200] px-2 py-0.5 rounded-md mb-2">
                  <Text className="text-[10px] font-semibold text-black">{item.value}</Text>
                </View>
              )}
              <View
                className="w-full rounded-t-lg"
                style={{
                  height: item.height as `${number}%`,
                  backgroundColor: item.active ? '#CCF200' : '#343535',
                }}
              />
            </View>
          ))}
        </View>

        {/* Month Labels */}
        <View className="flex-row justify-between px-1 pt-2 border-t border-[#1F293D]/50">
          {MONTHLY_DATA.map((item) => (
            <Text
              key={item.month}
              className="flex-1 text-center text-[10px] font-semibold"
              style={{ color: item.active ? '#CCF200' : '#888888' }}>
              {item.month}
            </Text>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}
