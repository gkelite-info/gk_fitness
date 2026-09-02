import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, FlatList, Pressable, Dimensions, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretDown, Crown, Star, SketchLogo, Medal, CaretRight, CalendarBlank, User, CurrencyInr, Users, ChartLine } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useGymPayments, useGymPaymentsPaginated } from '@/hooks/useGymPayments';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

const { width } = Dimensions.get('window');

const PLAN_STYLES = [
  { Icon: Crown, color: "#EAB308", bg: "bg-[#EAB308]/20" },
  { Icon: Star, color: "#8B5CF6", bg: "bg-[#8B5CF6]/20" },
  { Icon: SketchLogo, color: "#3B82F6", bg: "bg-[#3B82F6]/20" },
  { Icon: Medal, color: "#A1A1AA", bg: "bg-[#52525B]/40" },
];

export default function FinanceDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { userId, gymId } = useUser();

  const { data: customersData, refetch: refetchCustomers } = useGymCustomers(gymId ?? undefined);
  const { data: membershipPlans, refetch: refetchPlans } = useMembershipPlans(gymId ?? null);
  const { data: customerPlans, refetch: refetchCustomerPlans } = useGymCustomerMembershipPlans(gymId ?? undefined);
  const { data: allPayments, refetch: refetchPayments } = useGymPayments(userId);

  const limit = 10;
  const [page, setPage] = useState(1);
  const { data: paginatedTransactions, isFetching, refetch: refetchPaginated } = useGymPaymentsPaginated(userId, page, limit);
  const [accumulatedTransactions, setAccumulatedTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const availableYears = useMemo(() => {
    if (!allPayments) return [new Date().getFullYear()];
    const years = new Set(allPayments.map((p: any) => new Date(p.paymentDate).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a); // descending
  }, [allPayments]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([
      refetchCustomers(),
      refetchPlans(),
      refetchCustomerPlans(),
      refetchPayments(),
      refetchPaginated()
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (paginatedTransactions?.data) {
      if (page === 1) {
        setAccumulatedTransactions(paginatedTransactions.data);
      } else {
        setAccumulatedTransactions(prev => {
          const newItems = paginatedTransactions.data.filter(
            (newItem: any) => !prev.some((existingItem: any) => existingItem.gymPaymentId === newItem.gymPaymentId)
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [paginatedTransactions, page]);

  const totalPages = Math.ceil((paginatedTransactions?.total || 0) / limit) || 1;

  const handleEndReached = () => {
    if (page < totalPages && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  const { todaysRevenue, todaysGrowth, monthlyGrowth, revenueByPlan, monthlyRevenueChart, maxRevenue, totalCustomers, customerGrowth } = useMemo(() => {
    let todaysRev = 0;
    let yesterdayRev = 0;
    let currentMonthRev = 0;
    let lastMonthRev = 0;

    let thisMonthNewCustomers = 0;
    let lastMonthNewCustomers = 0;

    const planRevenues: Record<string, number> = {};
    const planMembers: Record<string, number> = {};
    const monthlyRev: Record<string, number> = {};

    if (membershipPlans) {
      membershipPlans.forEach(plan => {
        planRevenues[plan.id] = 0;
        planMembers[plan.id] = 0;
      });
    }

    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    const monthsToRender = selectedYear === currentYear
      ? monthNames.slice(0, currentMonthIndex + 1)
      : monthNames;

    monthsToRender.forEach(m => {
      monthlyRev[m] = 0;
    });

    if (allPayments) {
      allPayments.forEach((payment: any) => {
        const amount = payment.amountPaid || 0;
        if (amount > 0) {
          const pDate = new Date(payment.paymentDate);

          if (pDate.toDateString() === todayStr) {
            todaysRev += amount;
          } else if (pDate.toDateString() === yesterdayStr) {
            yesterdayRev += amount;
          }

          if (pDate >= startOfCurrentMonth) {
            currentMonthRev += amount;
          } else if (pDate >= startOfLastMonth && pDate <= endOfLastMonth) {
            lastMonthRev += amount;
          }

          if (pDate.getFullYear() === selectedYear) {
            const monthKey = monthNames[pDate.getMonth()];
            if (monthlyRev[monthKey] !== undefined) {
              monthlyRev[monthKey] += amount;
            }
          }

          if (payment.planId) {
            if (planRevenues[payment.planId] === undefined) planRevenues[payment.planId] = 0;
            planRevenues[payment.planId] += amount;
          }
        }
      });
    }

    if (customerPlans) {
      customerPlans.forEach((plan: any) => {
        if (plan.planId) {
          if (planMembers[plan.planId] === undefined) planMembers[plan.planId] = 0;
          planMembers[plan.planId] += 1;
        }
      });
    }

    if (customersData) {
      customersData.forEach((c: any) => {
        const createdAt = new Date(c.createdAt || c.joiningDate || new Date());
        if (createdAt >= startOfCurrentMonth) {
          thisMonthNewCustomers++;
        } else if (createdAt >= startOfLastMonth && createdAt <= endOfLastMonth) {
          lastMonthNewCustomers++;
        }
      });
    }

    const tGrowth = yesterdayRev === 0 ? (todaysRev > 0 ? 100 : 0) : ((todaysRev - yesterdayRev) / yesterdayRev) * 100;
    const mGrowth = lastMonthRev === 0 ? (currentMonthRev > 0 ? 100 : 0) : ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100;
    const cGrowth = lastMonthNewCustomers === 0 ? (thisMonthNewCustomers > 0 ? 100 : 0) : ((thisMonthNewCustomers - lastMonthNewCustomers) / lastMonthNewCustomers) * 100;

    const formattedRevenueByPlan = Object.keys(planRevenues).map(planId => {
      const planInfo = membershipPlans?.find(p => p.id === planId);
      return {
        planId,
        planName: planInfo?.name || 'Unknown Plan',
        revenue: planRevenues[planId],
        members: planMembers[planId],
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const formattedMonthlyChart = Object.keys(monthlyRev).map(month => ({
      month,
      value: monthlyRev[month]
    }));

    const rawMax = Math.max(...formattedMonthlyChart.map(d => d.value), 1000);
    const mRev = rawMax * 1.1;

    return {
      todaysRevenue: todaysRev,
      todaysGrowth: tGrowth.toFixed(1),
      monthlyGrowth: mGrowth.toFixed(1),
      revenueByPlan: formattedRevenueByPlan,
      monthlyRevenueChart: formattedMonthlyChart,
      maxRevenue: mRev,
      totalCustomers: customersData?.length || 0,
      customerGrowth: cGrowth.toFixed(1),
    };
  }, [customerPlans, allPayments, membershipPlans, customersData, selectedYear]);

  const formatCurrency = (val: number) => {
    if (val === 0) return '0';
    if (val >= 100000) return `₹${Math.round((val / 100000) * 10) / 10}L`;
    if (val >= 1000) return `₹${Math.round((val / 1000) * 10) / 10}k`;
    return `₹${Math.round(val)}`;
  };

  const renderHeader = () => (
    <View className="mb-6">
      <View className="px-5 mb-6 flex-row justify-between items-center mt-4">
        <Text className="text-3xl font-semibold text-white tracking-wide">Finances</Text>
        <Pressable className="flex-row items-center bg-[#18181B] px-3 py-2 rounded-xl border border-[#27272A]">
          <CalendarBlank size={14} color="#8E8E93" />
          <Text className="text-white text-xs mx-2">This Month</Text>
          <CaretDown size={14} color="#8E8E93" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        className="mb-8"
      >
        <Pressable
          onPress={() => router.push('/(owner)/finance/revenue')}
          className="bg-[#09090B] p-4 rounded-[24px] border border-[#27272A]"
          style={{ width: width * 0.38 }}
        >
          <View className="w-12 h-12 rounded-[16px] bg-[#14532D4D] mb-6 items-center justify-center">
            <CurrencyInr size={22} color="#4ADE80" weight="bold" />
          </View>
          <View className="gap-2">
            <Text className="text-[#8E8E93] text-xs">Today&apos;s Revenue</Text>
            <Text className="text-white text-[24px] leading-[28px] font-semibold tracking-tight">₹{todaysRevenue.toLocaleString('en-IN')}</Text>
            <View className="flex-row items-center">
              <Text className={`text-[13px] mr-1.5 ${Number(todaysGrowth) >= 0 ? 'text-[#D4F01E]' : 'text-[#EF4444]'}`}>
                {Number(todaysGrowth) > 0 ? '+' : ''}{todaysGrowth}%
              </Text>
              <Text className="text-[#8E8E93] text-[11px] flex-1" numberOfLines={1}>vs yesterday</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(owner)/finance/customers')}
          className="bg-[#09090B] p-4 rounded-[24px] border border-[#27272A]"
          style={{ width: width * 0.38 }}
        >
          <View className="w-12 h-12 rounded-[16px] bg-[#7C2D124D] mb-6 items-center justify-center">
            <Users size={22} color="#FB923C" weight="bold" />
          </View>
          <View className="gap-2">
            <Text className="text-[#8E8E93] text-xs">Total Customers</Text>
            <Text className="text-white text-[24px] leading-[28px] font-semibold tracking-tight">{totalCustomers}</Text>
            <View className="flex-row items-center">
              <Text className={`text-[13px] mr-1.5 ${Number(customerGrowth) >= 0 ? 'text-[#FB923C]' : 'text-[#EF4444]'}`}>
                {Number(customerGrowth) > 0 ? '+' : ''}{customerGrowth}%
              </Text>
              <Text className="text-[#8E8E93] text-[11px] flex-1" numberOfLines={1}>this month</Text>
            </View>
          </View>
        </Pressable>

        <View
          className="bg-[#09090B] p-4 rounded-[24px] border border-[#27272A]"
          style={{ width: width * 0.38 }}
        >
          <View className="w-12 h-12 rounded-[16px] bg-[#1E3A8A4D] mb-6 items-center justify-center">
            <ChartLine size={22} color="#3B82F6" weight="bold" />
          </View>
          <View className="gap-2">
            <Text className="text-[#8E8E93] text-xs">Monthly Growth</Text>
            <Text className="text-white text-[24px] leading-[28px] font-semibold tracking-tight">{Number(monthlyGrowth) > 0 ? '+' : ''}{monthlyGrowth}%</Text>
            <View className="flex-row items-center">
              <Text className="text-[#3B82F6] text-[11px] flex-1" numberOfLines={1}>vs last month</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 mb-8">
        <Text className="text-white font-semibold text-base mb-4">Revenue by Membership Plan</Text>
        <View className="bg-[#121214] rounded-3xl p-1">
          {revenueByPlan.length > 0 ? revenueByPlan.map((plan, index) => {
            const style = PLAN_STYLES[index % PLAN_STYLES.length];
            const isLast = index === revenueByPlan.length - 1;
            const PlanIcon = style.Icon;

            return (
              <Pressable
                key={plan.planId}
                onPress={() => router.push(`/(owner)/finance/membership-plan/${plan.planId}` as any)}
                className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-[#27272A]' : ''}`}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className={`w-10 h-10 rounded-xl ${style.bg} items-center justify-center mr-4`}>
                    <PlanIcon size={20} color={style.color} weight="fill" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-sm" numberOfLines={1}>{plan.planName}</Text>
                    <Text className="text-[#8E8E93] text-xs">{plan.members} Members</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-white font-semibold text-sm mr-2">₹{plan.revenue.toLocaleString('en-IN')}</Text>
                  <CaretRight size={14} color="#8E8E93" />
                </View>
              </Pressable>
            );
          }) : (
            <View className="p-4 items-center justify-center py-8">
              <Text className="text-[#8E8E93] text-sm">No revenue data found for plans.</Text>
            </View>
          )}
        </View>
      </View>

      <View className="px-5 mb-8 z-50">
        <View className="bg-[#121214] rounded-3xl p-5 z-50 relative">
          <View className="flex-row justify-between items-center mb-8 relative z-50">
            <Text className="text-white font-semibold text-base">Monthly Revenue</Text>

            <View className="relative z-50">
              <Pressable
                onPress={() => setShowYearDropdown(!showYearDropdown)}
                className="flex-row items-center bg-[#18181B] px-3 py-1.5 rounded-xl border border-[#27272A]"
              >
                <Text className="text-white text-xs font-semibold mr-2">{selectedYear}</Text>
                <CaretDown size={12} color="#8E8E93" weight="bold" />
              </Pressable>

              {showYearDropdown && (
                <View className="absolute top-10 right-0 bg-[#18181B] border border-[#27272A] rounded-xl overflow-hidden min-w-[80px] z-50 shadow-lg shadow-black/50">
                  {availableYears.map(year => (
                    <Pressable
                      key={year}
                      onPress={() => {
                        setSelectedYear(year);
                        setShowYearDropdown(false);
                      }}
                      className={`px-4 py-3 border-b border-[#27272A] ${selectedYear === year ? 'bg-[#27272A]/50' : ''}`}
                    >
                      <Text className={`text-center text-xs ${selectedYear === year ? 'text-[#C4EF00] font-bold' : 'text-white'}`}>{year}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={{ height: 220, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', flex: 1 }}>
              {/* Fixed Y-axis labels */}
              <View style={{ width: 40, justifyContent: 'space-between', paddingBottom: 30 }}>
                <Text className="text-[#52525B] text-[10px]">{formatCurrency(maxRevenue)}</Text>
                <Text className="text-[#52525B] text-[10px]">{formatCurrency(maxRevenue * 0.66)}</Text>
                <Text className="text-[#52525B] text-[10px]">{formatCurrency(maxRevenue * 0.33)}</Text>
                <Text className="text-[#52525B] text-[10px]">0</Text>
              </View>

              {/* Scrollable bars + month labels */}
              <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
                style={{ flex: 1 }}
                onLayout={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }, 100);
                }}
              >
                <View>
                  <View style={{ height: 160, flexDirection: 'row', alignItems: 'flex-end' }}>
                    {monthlyRevenueChart.map((d, i) => {
                      const barHeight = maxRevenue > 0 ? (d.value / maxRevenue) * 100 : 0;
                      return (
                        <View key={i} style={{ alignItems: 'center', width: 44, height: '100%', justifyContent: 'flex-end', marginRight: 6 }}>
                          {d.value > 0 && (
                            <Text className="text-[#C4EF00] text-[8px] font-bold" style={{ marginBottom: 2, width: 50, textAlign: 'center' }} numberOfLines={1}>
                              {formatCurrency(d.value)}
                            </Text>
                          )}
                          <View
                            className="bg-[#C4EF00] rounded-t-sm"
                            style={{ width: 20, height: `${barHeight}%` }}
                          />
                        </View>
                      );
                    })}
                  </View>

                  {/* X-axis month labels */}
                  <View style={{ flexDirection: 'row', marginTop: 6, height: 20, alignItems: 'center' }}>
                    {monthlyRevenueChart.map((d, i) => (
                      <Text key={i} className="text-[#52525B] text-[10px]" style={{ width: 44, textAlign: 'center', marginRight: 6 }}>{d.month}</Text>
                    ))}
                  </View>

                  {/* Bottom line */}
                  <View style={{ height: 1, backgroundColor: '#27272A', marginTop: 4 }} />
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </View>

      <View className="px-5">
        <View className="flex-row justify-between items-center">
          <Text className="text-white font-semibold text-base">Recent Transactions</Text>
          {/* <Pressable className="flex-row items-center">
            <Text className="text-[#C4EF00] text-xs font-semibold mr-1">View All</Text>
            <CaretRight size={12} color="#C4EF00" weight="bold" />
          </Pressable> */}
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isLast = index === accumulatedTransactions.length - 1;
    const profilePic = item.gym_customers?.users?.profilePhoto;

    const txDate = new Date(item.paymentDate);
    const dateFormatted = `${txDate.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][txDate.getMonth()]}, ${txDate.getFullYear()}`;

    return (
      <View className={`px-5 ${isLast ? 'mb-4' : ''}`}>
        <View className={`bg-[#121214] p-4 ${index === 0 ? 'rounded-t-3xl' : ''} ${isLast ? 'rounded-b-3xl' : ''} border-l border-r border-[#27272A] ${index === 0 ? 'border-t' : ''} ${isLast ? 'border-b' : 'border-b border-[#27272A]/50'}`}>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1 mr-2">
              {profilePic ? (
                <Image source={{ uri: profilePic }} className="w-10 h-10 rounded-full mr-3 bg-[#27272A]" />
              ) : (
                <View className="w-10 h-10 rounded-full mr-3 bg-[#27272A] items-center justify-center">
                  <User size={20} color="#8E8E93" weight="fill" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm" numberOfLines={1}>{item.gym_customers?.fullName || 'Unknown Customer'}</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5" numberOfLines={1}>{item.gym_membership_plans?.planName || 'Unknown Plan'}</Text>
              </View>
            </View>
            <View className="items-end flex-row items-center">
              <View className="items-end mr-2">
                <Text className="text-white font-semibold text-sm">₹{item.amountPaid.toLocaleString('en-IN')}</Text>
                <Text className="text-[#8E8E93] text-[10px] mt-0.5">{dateFormatted}</Text>
              </View>
              <CaretRight size={14} color="#52525B" />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (isFetching) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#C4EF00" />
        </View>
      );
    }
    if (page < totalPages) {
      return (
        <View className="py-6 items-center">
          <Pressable onPress={() => setPage(prev => prev + 1)} className="bg-[#161616] border border-[#27272A] px-6 py-2 rounded-full active:opacity-70">
            <Text className="text-white text-xs font-medium">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedTransactions.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#8E8E93] text-xs font-medium">You&apos;ve reached the end of transactions</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <FlatList
        data={accumulatedTransactions}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.gymPaymentId || index.toString()}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter()}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isFetching ? (
            <View className="px-5 mb-8">
              <View className="p-8 border border-[#27272A] bg-[#121214] rounded-3xl items-center">
                <Text className="text-[#A1A1AA] text-center">No recent transactions found.</Text>
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}
