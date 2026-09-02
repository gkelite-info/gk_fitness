import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useGymAttendanceToday } from '@/hooks/attendance/useGymAttendanceToday';
import { useGymPayments } from '@/hooks/useGymPayments';
import { useGymCustomerMembershipPlans } from '@/hooks/useGymCustomerMembershipPlans';
import { useCustomerTrainersByGym } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  { id: 'active-members', icon: Users, label: 'ACTIVE MEMBERS', value: '0' },
  { id: 'check-ins', icon: CheckCircle, label: 'CHECK-INS', value: '0' },
  { id: 'revenue-today', icon: CurrencyInr, label: 'REVENUE TODAY', value: '₹-' },
  { id: 'monthly-growth', icon: TrendUp, label: 'MONTHLY GROWTH', value: '0%' },
];

const QUICK_ACTIONS = [
  { id: 'add-member', icon: UserPlus, label: 'Add Member' },
  { id: 'create-announcement', icon: Megaphone, label: 'Create Announcement' },
  { id: 'open-qr', icon: QrCode, label: 'Open Check-In QR' },
  { id: 'manage-inventory', icon: Package, label: 'Manage Inventory' },
  { id: 'record-payment', icon: Wallet, label: 'Record Payment' },
  { id: 'manage-biometric', icon: Fingerprint, label: 'Manage Biometric' },
];

const OPERATIONS = [
  { id: 'pt-sessions', icon: Barbell, value: '0', label: 'PT SESSIONS' },
  { id: 'group-classes', icon: UsersThree, value: '0', label: 'GROUP CLASSES' },
  { id: 'renewals', icon: CalendarCheck, value: '0', label: 'RENEWALS' },
];


export default function OwnerDashboardScreen() {
  const { name, gymId, userId } = useUser();
  const chartScrollViewRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatDateString = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDateStr = getYYYYMMDD(selectedDate);

  const { data: customers, refetch: refetchCustomers } = useGymCustomers(gymId ?? undefined);
  const { data: attendances, refetch: refetchAttendances, error: attendanceError } = useGymAttendanceToday(gymId ?? undefined, selectedDateStr);
  const { data: payments, refetch: refetchPayments } = useGymPayments(userId ?? null);
  const { data: customerPlans, refetch: refetchCustomerPlans } = useGymCustomerMembershipPlans(userId ?? null);
  const { data: gymCustomerTrainers, refetch: refetchTrainers } = useCustomerTrainersByGym(gymId ?? undefined);
  const { data: gymTrainers, refetch: refetchGymTrainers } = useGymTrainers(gymId ?? undefined);

  const activeCustomersCount = customerPlans?.filter((plan: any) => {
    if (!plan.startDate || !plan.endDate) return false;
    return plan.startDate <= selectedDateStr && plan.endDate >= selectedDateStr;
  }).reduce((acc: Set<string>, plan: any) => {
    acc.add(plan.customerId);
    return acc;
  }, new Set<string>()).size || 0;

  const activeTrainersCount = gymTrainers?.filter((t: any) => t.is_Active !== false).length || 0;

  const checkInsCount = attendances
    ? new Set(attendances.map((att: any) => att.customerId)).size
    : 0;

  const getTomorrowYYYYMMDD = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const tomorrowStr = getTomorrowYYYYMMDD();
  const expiringCount = customerPlans
    ? new Set(customerPlans.filter((p: any) => p.endDate === tomorrowStr).map((p: any) => p.customerId)).size
    : 0;

  const ALERTS = [
    {
      id: 'expiring',
      icon: Warning,
      iconColor: '#EF4444',
      bg: '#2B0E10',
      title: `${expiringCount} Customership${expiringCount === 1 ? '' : 's'} expiring tomorrow`,
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

  const activePtSessionsCount = gymCustomerTrainers?.filter((ct: any) => ct.isActive).length || 0;

  const revenueToday = payments?.reduce((sum, payment) => {
    if (payment.paymentDate === selectedDateStr) {
      return sum + Number(payment.amountPaid || 0);
    }
    return sum;
  }, 0) || 0;

  const calculateMonthlyGrowth = () => {
    if (!payments || payments.length === 0) return '0%';

    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth();
    const currentDay = selectedDate.getDate();

    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth - 1, currentDay);

    let currentMonthRevenue = 0;
    let prevMonthRevenue = 0;

    payments.forEach(payment => {
      if (payment.paymentDate) {
        const pDate = new Date(payment.paymentDate);
        if (pDate >= currentMonthStart && pDate <= selectedDate) {
          currentMonthRevenue += Number(payment.amountPaid || 0);
        } else if (pDate >= prevMonthStart && pDate <= prevMonthEnd) {
          prevMonthRevenue += Number(payment.amountPaid || 0);
        }
      }
    });

    if (prevMonthRevenue === 0) {
      return currentMonthRevenue > 0 ? '+100%' : '0%';
    }
    const growth = ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  const growthValue = calculateMonthlyGrowth();

  const formatCurrency = (val: number) => {
    if (val === 0) return '₹0';
    if (val >= 100000) return `₹${Math.round((val / 100000) * 10) / 10}L`;
    if (val >= 1000) return `₹${Math.round((val / 1000) * 10) / 10}K`;
    return `₹${Math.round(val)}`;
  };

  const monthlyRevenueData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Only show months up to and including the current month
    const monthsToShow = monthNames.slice(0, currentMonthIndex + 1);

    const monthlyRev: Record<string, number> = {};
    monthsToShow.forEach(m => { monthlyRev[m] = 0; });

    if (payments) {
      payments.forEach((payment: any) => {
        const amount = Number(payment.amountPaid || 0);
        if (amount > 0 && payment.paymentDate) {
          const pDate = new Date(payment.paymentDate);
          if (pDate.getFullYear() === currentYear) {
            const monthKey = monthNames[pDate.getMonth()];
            if (monthlyRev[monthKey] !== undefined) {
              monthlyRev[monthKey] += amount;
            }
          }
        }
      });
    }

    const chartData = monthsToShow.map(month => ({
      month,
      value: monthlyRev[month],
    }));

    const maxVal = Math.max(...chartData.map(d => d.value), 1);

    return chartData.map((d, i) => ({
      month: d.month,
      value: d.value,
      height: `${Math.max((d.value / maxVal) * 100, d.value > 0 ? 5 : 2)}%`,
      active: i === chartData.length - 1,
      isPrevious: i === chartData.length - 2,
      formattedValue: d.value > 0 ? formatCurrency(d.value) : undefined,
    }));
  }, [payments]);

  const onRefresh = useCallback(async () => {
    triggerMediumHaptic();
    setRefreshing(true);
    try {
      await Promise.all([
        refetchCustomers(),
        refetchAttendances(),
        refetchPayments(),
        refetchCustomerPlans(),
        refetchTrainers(),
        refetchGymTrainers()
      ]);
    } catch (error) {
      console.error('[Dashboard] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCustomers, refetchAttendances, refetchPayments, refetchCustomerPlans, refetchTrainers, refetchGymTrainers]);

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
          {getGreeting()}, {name || 'User'} 👋
        </Text>
        <Text className="text-sm font-medium" style={{ color: '#C5C9AC' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-white">
          {isToday(selectedDate) ? "Today's Overview" : "Overview"}
        </Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161616] border border-[#242424] active:opacity-75"
        >
          <Text className="text-xs text-[#A1A1AA] font-medium">
            {isToday(selectedDate) ? 'Today' : formatDateString(selectedDate)}
          </Text>
          <CaretDown size={12} color="#A1A1AA" />
        </Pressable>
      </View>

      {showDatePicker && Platform.OS === 'ios' && (
        <View className="bg-[#1c1c1e] p-3 items-center border border-[#2A2A2A] rounded-xl mb-4">
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="inline"
            themeVariant="dark"
            onChange={(event, date) => {
              if (date) {
                setSelectedDate(date);
              }
            }}
          />
          <Pressable onPress={() => setShowDatePicker(false)} className="mt-2 py-1.5 px-4 bg-[#CCF200] rounded-lg">
            <Text className="text-black font-semibold text-xs">Done</Text>
          </Pressable>
        </View>
      )}

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
        />
      )}

      <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-3 flex-row justify-between mb-6">
        {OVERVIEW_ITEMS.map((item, index) => {
          const IconComp = item.icon;
          let displayValue = item.value;
          if (item.id === 'active-members' || item.id === 'active-customers') {
            displayValue = (activeCustomersCount + activeTrainersCount).toString();
          } else if (item.id === 'check-ins') {
            displayValue = checkInsCount.toString();
          } else if (item.id === 'revenue-today') {
            displayValue = `₹${revenueToday.toLocaleString('en-IN')}`;
          } else if (item.id === 'monthly-growth') {
            displayValue = growthValue;
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
                if (action.id === 'add-member') {
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

      <Text className="text-base font-semibold text-white mb-3">Today&apos;s Operations</Text>
      <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 flex-row justify-between mb-6">
        {OPERATIONS.map((op, index) => {
          const IconComp = op.icon;
          let displayValue = op.value;
          if (op.id === 'pt-sessions') {
            displayValue = activePtSessionsCount.toString();
          }

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
                  {displayValue}
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
        {/* <Pressable className="active:opacity-70">
          <Text className="text-xs font-semibold" style={{ color: '#CCF200' }}>
            View All
          </Text>
        </Pressable> */}
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
        <ScrollView
          ref={chartScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => {
            chartScrollViewRef.current?.scrollToEnd({ animated: false });
          }}
          onLayout={() => {
            setTimeout(() => {
              chartScrollViewRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }}
        >
          <View>
            <View style={{ height: 176, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4, paddingTop: 24, paddingBottom: 8 }}>
              {monthlyRevenueData.map((item) => (
                <View key={item.month} style={{ alignItems: 'center', width: 44, justifyContent: 'flex-end', height: '100%', marginRight: 4 }}>
                  {item.active && item.formattedValue && (
                    <View className="bg-[#CCF200] px-2 py-0.5 rounded-md mb-2">
                      <Text className="text-[10px] font-semibold text-black">{item.formattedValue}</Text>
                    </View>
                  )}
                  {!item.active && item.formattedValue && (
                    <Text className="text-[8px] font-bold mb-1" style={{ color: '#888888', width: 50, textAlign: 'center' }} numberOfLines={1}>
                      {item.formattedValue}
                    </Text>
                  )}
                  <View
                    className="rounded-t-lg"
                    style={{
                      width: 24,
                      height: item.height as `${number}%`,
                      backgroundColor: (item.active || item.isPrevious) ? '#CCF200' : '#343535',
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(31,41,61,0.5)' }}>
              {monthlyRevenueData.map((item) => (
                <Text
                  key={item.month}
                  style={{ width: 44, textAlign: 'center', marginRight: 4, fontSize: 10, fontWeight: '600', color: (item.active || item.isPrevious) ? '#CCF200' : '#888888' }}>
                  {item.month}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

    </ScrollView>
  );
}
