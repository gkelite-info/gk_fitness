import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CaretLeft, CaretDown, MagnifyingGlass, CaretRight, DotsThreeVertical, Funnel, Crown, Users, CurrencyInr, CalendarBlank, Star, SketchLogo, Medal, Diamond, ArrowsClockwise } from 'phosphor-react-native';
import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';
import { useUser } from '@/context/UserContext';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useGymPayments } from '@/hooks/useGymPayments';
import { useGymCustomerMembershipPlansPaginated } from '@/hooks/useGymCustomerMembershipPlans';

function MemberRow({ user }: { user: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View layout={LinearTransition.duration(250)} className="border-b border-[#27272A] last:border-b-0 overflow-hidden">
      <Pressable onPress={() => setExpanded(!expanded)} className="py-4 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1">
          <View className="mr-3">
            {user.img ? (
              <Image source={{ uri: user.img }} className="w-10 h-10 rounded-full bg-[#27272A]" />
            ) : (
              <View className="w-10 h-10 rounded-full bg-[#27272A] items-center justify-center">
                <Users size={20} color="#8E8E93" />
              </View>
            )}
          </View>
          <View className="flex-1 pr-2">
            <Text className="text-white font-semibold text-sm" numberOfLines={1}>{user.name}</Text>
            <Text className="text-[#8E8E93] text-[10px] mt-0.5">Member ID: {user.id}</Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View className="bg-[#166534]/20 px-2 py-1 rounded-full mr-3 border border-[#22C55E]/30">
            <Text className="text-[#22C55E] font-semibold text-[9px] tracking-widest">Active</Text>
          </View>
          {expanded ? <CaretDown size={14} color="#8E8E93" /> : <CaretRight size={14} color="#8E8E93" />}
        </View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} className="pb-4 pt-1 flex-row justify-between pl-[52px] pr-2">
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Joined Date</Text>
            <Text className="text-[#D4D4D8] text-[11px]">{user.joined}</Text>
          </View>
          <View>
            <Text className="text-[#8E8E93] text-[10px] mb-1">Expiry Date</Text>
            <Text className="text-[#D4D4D8] text-[11px]">{user.expires}</Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  )
}

export default function MembershipPlanDetail() {
  const router = useRouter();
  const { id, colorIndex } = useLocalSearchParams();
  const { userId, gymId } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [accumulatedMembers, setAccumulatedMembers] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on new search
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: plans } = useMembershipPlans(gymId ?? null);
  const { data: allCustomerPlans } = useGymCustomerMembershipPlans(gymId ?? undefined);
  const { data: allPayments } = useGymPayments(userId);
  const { data: paginatedMembers, isLoading: membersLoading, isFetching: membersFetching } = useGymCustomerMembershipPlansPaginated(
    userId ?? null,
    page,
    limit,
    debouncedSearch,
    'newest',
    id as string
  );

  useEffect(() => {
    if (paginatedMembers?.data) {
      if (page === 1) {
        setAccumulatedMembers(paginatedMembers.data);
      } else {
        setAccumulatedMembers((prev) => {
          const prevIds = new Set(prev.map((m: any) => m.GymCustomerMembershipPlanId));
          const newUnique = paginatedMembers.data.filter((m: any) => !prevIds.has(m.GymCustomerMembershipPlanId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [paginatedMembers, page]);

  const totalPaginatedMembers = paginatedMembers?.total || 0;
  const totalPages = Math.ceil(totalPaginatedMembers / limit) || 1;
  const hasMore = page < totalPages;

  const planId = id as string;
  const cIndex = parseInt(colorIndex as string) || 0;

  const colors = ['#CCFF00', '#C084FC', '#60A5FA', '#FACC15', '#33401D'];
  const baseColor = colors[cIndex % colors.length];
  const iconColor = '#09090B';

  const getIcon = () => {
    const props = { size: 32, color: iconColor, weight: "fill" as any };
    switch (cIndex % 4) {
      case 0: return <Crown {...props} />;
      case 1: return <Star {...props} />;
      case 2: return <Diamond {...props} />;
      default: return <Medal {...props} />;
    }
  };

  const planDetails = plans?.find(p => p.id === planId);
  const title = planDetails?.name || 'Loading...';

  const { totalMembers, revenueThisMonth, renewalsThisMonth, recentPurchases } = useMemo(() => {
    let totalMembers = 0;
    let revenueThisMonth = 0;
    let renewalsThisMonth = 0;
    const recentTx: any[] = [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (allCustomerPlans) {
      const activePlans = allCustomerPlans.filter(cp => {
        if (cp.planId !== planId || cp.is_deleted) return false;
        if (!cp.is_Active) return false;
        const customer = (cp as any).gym_customers;
        if (!customer || customer.is_Active === false) return false;
        const user = customer.users;
        if (!user || user.status !== 'active') return false;
        return true;
      });
      totalMembers = activePlans.length;

      activePlans.forEach(cp => {
        if (cp.createdAt) {
          const createdDate = new Date(cp.createdAt);
          if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
            renewalsThisMonth++;
          }
        }
      });
    }

    if (allPayments) {
      const planPayments = allPayments.filter((p: any) => p.planId === planId);

      planPayments.forEach((payment: any) => {
        const amount = payment.amountPaid || 0;

        let txDate = new Date(payment.paymentDate);
        if (payment.paymentDate && payment.paymentTime) {
          txDate = new Date(`${payment.paymentDate}T${payment.paymentTime}`);
        }

        if (!isNaN(txDate.getTime())) {
          if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            revenueThisMonth += amount;
          }

          if (amount > 0) {
            const cp = allCustomerPlans?.find(cp => cp.customerId === payment.customerId);

            recentTx.push({
              id: payment.gymPaymentId,
              name: cp?.gym_customers?.fullName || 'Unknown Customer',
              price: amount,
              time: txDate,
              img: cp?.gym_customers?.users?.profilePhoto,
            });
          }
        }
      });

      recentTx.sort((a, b) => b.time.getTime() - a.time.getTime());
    }

    const formattedRecentTx = recentTx.slice(0, 5).map(tx => {
      const timeStr = tx.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dateStr = tx.time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return {
        ...tx,
        displayTime: `${dateStr} • ${timeStr}`,
        displayPrice: `₹${Math.round(tx.price).toLocaleString('en-IN')}`
      };
    });

    return {
      totalMembers,
      revenueThisMonth,
      renewalsThisMonth,
      recentPurchases: formattedRecentTx
    };
  }, [planId, allCustomerPlans, allPayments]);

  const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#27272A]">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4">
            <CaretLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xl font-semibold text-white tracking-wide">{title}</Text>
        </View>
        {/* <Pressable>
          <DotsThreeVertical size={24} color="#FFFFFF" />
        </Pressable> */}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="px-5 mt-6 mb-8">
          <View className="bg-[#121214] rounded-3xl p-6">
            <View className="flex-row items-center mb-6">
              <View className="w-16 h-16 rounded-2xl items-center justify-center mr-5" style={{ backgroundColor: baseColor }}>
                {getIcon()}
              </View>
              <View>
                <Text className="text-white text-lg font-semibold mb-1">{title}</Text>
                <View className="bg-[#166534]/30 px-2 py-0.5 rounded border border-[#22C55E]/30 self-start">
                  <Text className="text-[#22C55E] text-[10px] font-semibold tracking-widest">Active Plan</Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-start border-t border-[#27272A] pt-6">
              <View className="flex-[0.8] border-r border-[#27272A]">
                <View className="flex-row items-center mb-2">
                  <View className="w-5 h-5 rounded-full bg-[#166534]/30 items-center justify-center mr-2">
                    <Users size={10} color="#22C55E" weight="fill" />
                  </View>
                  <Text className="text-[#8E8E93] text-[10px] flex-1">Active</Text>
                </View>
                <Text className="text-white text-lg font-semibold mb-1">{totalMembers}</Text>
                <Text className="text-[#8E8E93] text-[9px]">Total Members</Text>
              </View>

              <View className="flex-[1.4] px-4 border-r border-[#27272A]">
                <View className="flex-row items-start mb-2">
                  <View className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 items-center justify-center mr-2 mt-0.5">
                    <CurrencyInr size={10} color="#A855F7" weight="bold" />
                  </View>
                  <Text className="text-[#8E8E93] text-[10px] flex-1 leading-[14px]">Revenue This Month</Text>
                </View>
                <Text className="text-white text-lg font-semibold mb-1">{formatCurrency(revenueThisMonth)}</Text>
                <Text className="text-[#8E8E93] text-[9px]">Calculated from payments</Text>
              </View>

              <View className="flex-[0.8] pl-4">
                <View className="flex-row items-center mb-2">
                  <View className="w-5 h-5 rounded-full bg-[#3B82F6]/20 items-center justify-center mr-2">
                    <CalendarBlank size={10} color="#3B82F6" weight="bold" />
                  </View>
                  <Text className="text-[#8E8E93] text-[10px] flex-1">Renewals</Text>
                </View>
                <Text className="text-white text-lg font-semibold mb-1">{renewalsThisMonth}</Text>
                <Text className="text-[#8E8E93] text-[9px]">This Month</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-semibold text-sm">Recent Purchases</Text>
            <Pressable onPress={() => router.push('/(owner)/dashboard/payments')}>
              <Text className="text-[#C4EF00] text-xs font-semibold">View All</Text>
            </Pressable>
          </View>

          <View className="bg-[#121214] rounded-3xl p-1">
            {recentPurchases.length > 0 ? (
              recentPurchases.map((tx, idx, arr) => (
                <View key={idx} className={`flex-row justify-between items-center p-4 ${idx !== arr.length - 1 ? 'border-b border-[#27272A]' : ''}`}>
                  <View className="flex-row items-center flex-1 mr-2">
                    {tx.img ? (
                      <Image source={{ uri: tx.img }} className="w-10 h-10 rounded-full mr-3 bg-[#27272A]" />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-[#27272A] items-center justify-center mr-3">
                        <Users size={16} color="#8E8E93" />
                      </View>
                    )}
                    <View className="flex-1 pr-2">
                      <Text className="text-white font-semibold text-sm" numberOfLines={1}>{tx.name}</Text>
                      <Text className="text-[#8E8E93] text-[10px] mt-0.5" numberOfLines={1}>{tx.displayTime}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-white font-semibold text-sm mr-2">{tx.displayPrice}</Text>
                    <CaretRight size={14} color="#8E8E93" />
                  </View>
                </View>
              ))
            ) : (
              <View className="p-5 items-center">
                <Text className="text-[#8E8E93] text-sm">No recent purchases found</Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-5 mb-8">
          <View className="bg-[#121214] rounded-3xl p-5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-semibold text-sm">Active Members <Text className="font-normal text-[#8E8E93]">({totalPaginatedMembers})</Text></Text>
            </View>
            <View className="flex-row flex-1 justify-end gap-2">
              <View className="flex-row flex-1 items-center bg-[#09090B] rounded-lg px-3 py-1 border border-[#27272A]">
                <MagnifyingGlass size={14} color="#8E8E93" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search members..."
                  placeholderTextColor="#8E8E93"
                  className="flex-1 ml-2 text-white text-xs"
                />
              </View>
              <Pressable className="bg-[#09090B] w-10 h-full rounded-lg border border-[#27272A] items-center justify-center">
                <Funnel size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            <View className="mb-2">
              {membersLoading && page === 1 ? (
                <View className="py-10">
                  <ActivityIndicator color="#C4EF00" />
                </View>
              ) : accumulatedMembers.length > 0 ? (
                <>
                  {accumulatedMembers.map((cp: any, idx: number) => {
                  const customer = cp.gym_customers || {};

                  let joinedDate = 'Unknown';
                  if (cp.startDate) joinedDate = new Date(cp.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                  let expiresDate = 'Unknown';
                  if (cp.endDate) expiresDate = new Date(cp.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                  return (
                    <MemberRow
                      key={cp.GymCustomerMembershipPlanId || idx}
                      user={{
                        name: customer.fullName || 'Unknown Customer',
                        id: cp.customerId?.slice(-6).toUpperCase() || 'Unknown',
                        joined: joinedDate,
                        expires: expiresDate,
                        img: customer.users?.profilePhoto
                      }}
                    />
                  );
                })}

                {membersFetching && page > 1 && (
                  <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#C4EF00" />
                  </View>
                )}

                  {hasMore && !membersFetching && (
                    <View className="py-4 items-center">
                      <Pressable
                        onPress={() => setPage((p) => p + 1)}
                        className="flex-row items-center gap-x-2 bg-[#121214] border border-[#27272A] px-4 py-2.5 rounded-xl active:opacity-70"
                      >
                        <ArrowsClockwise size={16} color="#C4EF00" />
                        <Text className="text-white text-sm font-semibold">Load More</Text>
                      </Pressable>
                    </View>
                  )}
                  
                  {!hasMore && accumulatedMembers.length > 0 && (
                    <View className="py-6 items-center">
                      <Text className="text-[#8E8E93] text-xs font-sans">You've reached the end of the list</Text>
                    </View>
                  )}
                </>
              ) : (
                <View className="py-10 items-center">
                  <Text className="text-[#8E8E93] text-sm">No members found</Text>
                </View>
              )}
            </View>

            <View className="border-t border-[#27272A] pt-4 items-center">
              <Pressable className="flex-row items-center" onPress={() => router.push('/(owner)/finance/customers')}>
                <Text className="text-[#C4EF00] text-xs font-semibold mr-1">View All Members</Text>
                <CaretRight size={12} color="#C4EF00" weight="bold" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
