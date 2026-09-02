import React, { useState, useEffect } from 'react';
import { View, Pressable, Image, ActivityIndicator, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { User, ArrowRight, ArrowsClockwise, MagnifyingGlass, Funnel, Users, CalendarBlank, Clock, CaretDown, CaretUp, CaretRight } from 'phosphor-react-native';
import { useGymCustomersPaginated } from '@/hooks/customers/useGymCustomers';
import { useCustomerTrainersByGym } from '@/hooks/customerTrainers/useCustomerTrainers';
import { usePersonalTrainerRequestsByGym } from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import { AnimatedShimmer } from './AnimatedShimmer';

const formatDaysRange = (daysRaw: any) => {
  if (!daysRaw) return '-';
  let daysArray: string[] = [];
  if (Array.isArray(daysRaw)) {
    daysArray = daysRaw;
  } else if (typeof daysRaw === 'string') {
    try {
      const parsed = JSON.parse(daysRaw);
      if (Array.isArray(parsed)) daysArray = parsed;
      else daysArray = daysRaw.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      daysArray = daysRaw.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  if (daysArray.length === 0) return '-';
  if (daysArray.length === 1) return daysArray[0].substring(0, 3);

  const firstDay = daysArray[0].substring(0, 3);
  const lastDay = daysArray[daysArray.length - 1].substring(0, 3);
  return `${firstDay}-${lastDay}`;
};

export const AssignTrainerTab = ({ gymId, refreshing, onRefreshComplete }: { gymId?: string; refreshing: boolean; onRefreshComplete: () => void }) => {
  const router = useRouter();
  const [assignPage, setAssignPage] = useState(1);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [debouncedAssignSearch, setDebouncedAssignSearch] = useState('');
  const [assignFilter, setAssignFilter] = useState<'all' | 'without_trainer' | 'active_pt'>('all');
  const [accumulatedCustomers, setAccumulatedCustomers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAssignSearch(assignSearchQuery);
      setAssignPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [assignSearchQuery]);

  const { data: assignData, isLoading: isAssignLoading, refetch: assignRefetch, isFetching: isAssignFetching } = useGymCustomersPaginated(gymId ?? undefined, assignPage, 10, debouncedAssignSearch);
  const { data: gymCustomerTrainers, refetch: refetchTrainers, isLoading: isTrainersLoading } = useCustomerTrainersByGym(gymId);
  const { data: ptRequestsData, refetch: refetchPtRequests } = usePersonalTrainerRequestsByGym(gymId, 1, 1000);

  const activeAssignments = gymCustomerTrainers?.filter(ct => ct.isActive) || [];
  const assignedCustomerMap = new Map(activeAssignments.map(ct => [ct.customerId, ct.trainer]));

  const assignTotal = assignData?.total || 0;
  const assignTotalPages = Math.ceil(assignTotal / 10) || 1;
  const assignHasMore = assignPage < assignTotalPages;

  useEffect(() => {
    if (assignData?.data) {
      if (assignPage === 1) {
        setAccumulatedCustomers(assignData.data);
      } else {
        setAccumulatedCustomers((prev) => {
          const prevIds = new Set(prev.map((c) => c.customerId));
          const newUnique = assignData.data.filter((c: any) => !prevIds.has(c.customerId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [assignData, assignPage]);

  useEffect(() => {
    if (refreshing) {
      const handleRefresh = async () => {
        setIsRefreshing(true);
        if (assignPage === 1) {
          await assignRefetch();
        } else {
          setAssignPage(1);
        }
        await refetchTrainers();
        await refetchPtRequests();
        setIsRefreshing(false);
        onRefreshComplete();
      };
      handleRefresh();
    }
  }, [refreshing]);

  const [expandedTrainers, setExpandedTrainers] = useState<Record<string, boolean>>({});

  let displayedCustomers = accumulatedCustomers;
  if (assignFilter === 'without_trainer') {
    displayedCustomers = accumulatedCustomers.filter(c => !assignedCustomerMap.has(c.customerId));
  } else if (assignFilter === 'active_pt') {
    const ptCustomers = activeAssignments.map(ct => ct.customer).filter(Boolean);
    const uniquePtCustomers = Array.from(new Map(ptCustomers.map(c => [c.customerId, c])).values());

    if (debouncedAssignSearch) {
      displayedCustomers = uniquePtCustomers.filter(c =>
        c.fullName?.toLowerCase().includes(debouncedAssignSearch.toLowerCase()) ||
        c.customId?.toLowerCase().includes(debouncedAssignSearch.toLowerCase())
      );
    } else {
      displayedCustomers = uniquePtCustomers;
    }
  }

  const activeTrainersMap = new Map<string, { trainer: any, assignments: any[] }>();
  activeAssignments.forEach(ct => {
    if (ct.trainer && ct.customer) {
      if (!activeTrainersMap.has(ct.trainer.gymTrainerId)) {
        activeTrainersMap.set(ct.trainer.gymTrainerId, { trainer: ct.trainer, assignments: [] });
      }
      activeTrainersMap.get(ct.trainer.gymTrainerId)!.assignments.push(ct);
    }
  });

  let groupedTrainers = Array.from(activeTrainersMap.values());
  const totalActiveTrainers = groupedTrainers.length;
  const totalActivePT = new Set(activeAssignments.map(ct => ct.customerId)).size;

  if (assignFilter === 'active_pt' && debouncedAssignSearch) {
    const lowerSearch = debouncedAssignSearch.toLowerCase();
    groupedTrainers = groupedTrainers.map(group => ({
      trainer: group.trainer,
      assignments: group.assignments.filter(a =>
        a.customer.fullName?.toLowerCase().includes(lowerSearch) ||
        a.customer.customId?.toLowerCase().includes(lowerSearch)
      )
    })).filter(group =>
      group.trainer.fullName?.toLowerCase().includes(lowerSearch) ||
      group.assignments.length > 0
    );
  }

  const ptRequestsMap = new Map<string, any>();
  if (ptRequestsData?.data) {
    // Sort so approved requests take precedence, or latest requests
    [...ptRequestsData.data].reverse().forEach((req: any) => {
      if (req.requestedBy) {
        ptRequestsMap.set(req.requestedBy, req);
      }
    });
  }

  const activePtPageSize = 5;
  const activePtTotalPages = Math.ceil(groupedTrainers.length / activePtPageSize) || 1;
  const activePtHasMore = assignPage < activePtTotalPages;
  const paginatedGroupedTrainers = groupedTrainers.slice(0, assignPage * activePtPageSize);

  const renderAssignFooter = () => {
    if (assignFilter === 'active_pt') {
      if (activePtHasMore) {
        return (
          <View className="py-4 items-center pb-8">
            <Pressable
              onPress={() => setAssignPage((p) => p + 1)}
              className="flex-row items-center gap-x-2 bg-[#1A1A1A] border border-[#222222] px-4 py-2.5 rounded-xl active:opacity-70"
            >
              <ArrowsClockwise size={16} color="#B4ED35" />
              <Text className="text-white text-sm font-semibold">Load More</Text>
            </Pressable>
          </View>
        );
      }
      if (paginatedGroupedTrainers.length > 0) {
        return (
          <View className="py-6 items-center pb-8">
            <Text className="text-[#A1A1AA] text-xs font-sans">You've reached the end of the list</Text>
          </View>
        );
      }
      return null;
    }

    if (isAssignFetching && !isRefreshing) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CCFF00" />
        </View>
      );
    }
    if (assignHasMore) {
      return (
        <View className="py-4 items-center pb-8">
          <Pressable
            onPress={() => setAssignPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#1A1A1A] border border-[#222222] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#CCFF00" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedCustomers.length > 0) {
      return (
        <View className="py-6 items-center pb-8">
          <Text className="text-[#A1A1AA] text-xs font-sans">You've reached the end of the list</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <>
      <View className="flex-row gap-x-2 mb-4">
        <View className="flex-1 flex-row items-center bg-[#1A1A1A] rounded-xl px-4 py-2 border border-[#222222]">
          <MagnifyingGlass size={20} color="#A1A1AA" />
          <TextInput
            className="flex-1 text-white ml-2 text-sm font-sans"
            placeholder="Search customer..."
            placeholderTextColor="#A1A1AA"
            value={assignSearchQuery}
            onChangeText={setAssignSearchQuery}
          />
        </View>
        <Pressable className="bg-[#1A1A1A] border border-[#222222] p-3 rounded-xl justify-center items-center active:opacity-70">
          <Funnel size={20} color="#A1A1AA" />
        </Pressable>
      </View>

      <View className="flex-row gap-x-2 mb-6">
        <Pressable
          onPress={() => { setAssignFilter('all'); setAssignPage(1); }}
          className={`flex-1 py-2 rounded-lg items-center ${assignFilter === 'all' ? 'bg-[#1A1A1A] border border-[#333333]' : 'bg-[#1A1A1A] border border-transparent'}`}
        >
          <Text className={`font-semibold text-xs ${assignFilter === 'all' ? 'text-white' : 'text-[#A1A1AA]'}`}>All</Text>
        </Pressable>
        <Pressable
          onPress={() => { setAssignFilter('without_trainer'); setAssignPage(1); }}
          className={`flex-1 py-2 rounded-lg items-center ${assignFilter === 'without_trainer' ? 'bg-[#1A1A1A] border border-[#CCFF00]' : 'bg-[#1A1A1A] border border-[#222222]'}`}
        >
          <Text className={`font-semibold text-xs ${assignFilter === 'without_trainer' ? 'text-[#CCFF00]' : 'text-[#A1A1AA]'}`}>Without Trainer</Text>
        </Pressable>
        <Pressable
          onPress={() => { setAssignFilter('active_pt'); setAssignPage(1); }}
          className={`flex-1 py-2 rounded-lg items-center ${assignFilter === 'active_pt' ? 'bg-[#1A1A1A] border border-[#222222]' : 'bg-[#1A1A1A] border border-transparent'}`}
        >
          <Text className={`font-semibold text-xs ${assignFilter === 'active_pt' ? 'text-white' : 'text-[#A1A1AA]'}`}>Active PT</Text>
        </Pressable>
      </View>

      {((!assignData && assignPage === 1) || isTrainersLoading) ? (
        <>
          <View className="bg-[#1A1A1A] rounded-2xl p-4 flex-row items-center mb-3">
            <AnimatedShimmer className="w-12 h-12 rounded-full mr-3" />
            <View className="flex-1 justify-center">
              <AnimatedShimmer className="w-32 h-4 rounded mb-1.5" />
              <AnimatedShimmer className="w-20 h-4 rounded-full mb-1.5" />
              <AnimatedShimmer className="w-24 h-3 rounded" />
            </View>
            <AnimatedShimmer className="w-10 h-10 rounded-full ml-2" />
          </View>
          <View className="bg-[#1A1A1A] rounded-2xl p-4 flex-row items-center mb-3">
            <AnimatedShimmer className="w-12 h-12 rounded-full mr-3" />
            <View className="flex-1 justify-center">
              <AnimatedShimmer className="w-32 h-4 rounded mb-1.5" />
              <AnimatedShimmer className="w-20 h-4 rounded-full mb-1.5" />
              <AnimatedShimmer className="w-24 h-3 rounded" />
            </View>
            <AnimatedShimmer className="w-10 h-10 rounded-full ml-2" />
          </View>
        </>
      ) : assignFilter === 'active_pt' ? (
        <View>
          <View className="flex-row gap-x-4 mb-6">
            <View className="flex-1 bg-[#1A1A1A] p-4 rounded-xl border border-[#222222]">
              <View className="flex-row items-center mb-2">
                <Users size={16} color="#B4ED35" weight="fill" />
                <Text className="text-[#A0A0A0] text-xs ml-2">Total Active PT</Text>
              </View>
              <Text className="text-white text-2xl font-semibold">{totalActivePT}</Text>
              <Text className="text-[#B4ED35] text-[10px] mt-1">Customers</Text>
            </View>
            <View className="flex-1 bg-[#1A1A1A] p-4 rounded-xl border border-[#222222]">
              <View className="flex-row items-center mb-2">
                <User size={16} color="#B4ED35" weight="fill" />
                <Text className="text-[#A0A0A0] text-xs ml-2">Total Trainers</Text>
              </View>
              <Text className="text-white text-2xl font-semibold">{totalActiveTrainers}</Text>
              <Text className="text-[#A0A0A0] text-[10px] mt-1">Active Trainers</Text>
            </View>
          </View>

          {paginatedGroupedTrainers.length === 0 ? (
            <Text className="text-[#A0A0A0] text-center mt-4">No active PTs found.</Text>
          ) : (
            paginatedGroupedTrainers.map((group) => {
              const { trainer, assignments } = group;
              const isExpanded = expandedTrainers[trainer.gymTrainerId] ?? true;

              return (
                <View key={trainer.gymTrainerId} className="bg-[#1A1A1A] rounded-xl mb-4 border border-[#222222] overflow-hidden">
                  <Pressable
                    onPress={() => setExpandedTrainers(prev => ({ ...prev, [trainer.gymTrainerId]: !isExpanded }))}
                    className="p-4 flex-row items-center justify-between active:opacity-70"
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="w-12 h-12 rounded-full bg-[#2D3117] overflow-hidden mr-3 items-center justify-center">
                        {trainer.users?.profilePhoto || trainer.profilePicture ? (
                          <Image source={{ uri: trainer.users?.profilePhoto || trainer.profilePicture }} className="w-full h-full" />
                        ) : (
                          <User size={20} color="#B4ED35" weight="fill" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-[15px] mb-1">{trainer.fullName}</Text>
                        <Text className="text-[#B4ED35] text-[11px]">{trainer.specialization || 'Fitness Coach'}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <View className="bg-[#2A2A2A] px-3 py-1.5 rounded-md mr-3">
                        <Text className="text-[#A0A0A0] text-[11px]">{assignments.length} Clients</Text>
                      </View>
                      {isExpanded ? <CaretUp size={16} color="#B4ED35" /> : <CaretDown size={16} color="#B4ED35" />}
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View className="border-t border-[#222222]">
                      <View className="flex-row items-center px-4 py-3 bg-[#1A1A1A]">
                        <Text className="flex-1 text-[#A0A0A0] text-[11px]">Customer</Text>
                        <View className="w-20 flex-row items-center">
                          <View className="mr-1"><CalendarBlank size={12} color="#B4ED35" /></View>
                          <Text className="text-[#A0A0A0] text-[11px]">Days</Text>
                        </View>
                        <View className="w-20 flex-row items-center">
                          <View className="mr-1"><Clock size={12} color="#B4ED35" /></View>
                          <Text className="text-[#A0A0A0] text-[11px]">Time</Text>
                        </View>
                        <View className="w-4" />
                      </View>

                      {assignments.map((assignment, idx) => {
                        const cust = assignment.customer;
                        const rawDays = assignment.weekDays && assignment.weekDays.length > 0 ? assignment.weekDays : null;
                        const days = formatDaysRange(rawDays);
                        const time = assignment.timings || '-';

                        return (
                          <Pressable
                            key={cust.customerId}
                            onPress={() => router.push(`/(owner)/profile/assign-trainer?customerId=${cust.customerId}` as any)}
                            className={`flex-row items-center px-4 py-3 ${idx !== assignments.length - 1 ? 'border-b border-[#222222]' : ''} active:bg-[#2A2A2A]`}
                          >
                            <View className="flex-1 flex-row items-center mr-2">
                              <View className="w-8 h-8 rounded-full bg-[#2D3117] overflow-hidden mr-3 items-center justify-center">
                                {cust.profilePicture || cust.profilePhoto ? (
                                  <Image source={{ uri: cust.profilePicture || cust.profilePhoto }} className="w-full h-full" />
                                ) : (
                                  <User size={14} color="#B4ED35" weight="fill" />
                                )}
                              </View>
                              <View className="flex-1">
                                <Text className="text-white text-[13px] font-semibold mb-0.5" numberOfLines={1}>{cust.fullName}</Text>
                                <Text className="text-[#A0A0A0] text-[10px]">
                                  {cust.customId || `CUST-${(cust.customerId || '').slice(0, 4).toUpperCase()}`}
                                </Text>
                              </View>
                            </View>
                            <View className="w-20">
                              <Text className="text-white text-[11px]" numberOfLines={1}>{days}</Text>
                            </View>
                            <View className="w-16">
                              <Text className="text-white text-[11px]" numberOfLines={1}>{time}</Text>
                            </View>
                            <View className="w-8 items-end">
                              <CaretRight size={14} color="#B4ED35" />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : displayedCustomers.length === 0 ? (
        <Text className="text-[#A1A1AA] text-center mt-4">No customers found.</Text>
      ) : displayedCustomers.map((cust, index) => {
        const assignedTrainer = assignedCustomerMap.get(cust.customerId);
        return (
          <View key={cust.customerId || index} className="bg-[#1A1A1A] rounded-2xl p-4 flex-row items-center mb-3">
            <View className="w-12 h-12 rounded-full bg-[#2D3117] overflow-hidden mr-3 items-center justify-center">
              {cust.profilePicture || cust.profilePhoto ? (
                <Image source={{ uri: cust.profilePicture || cust.profilePhoto }} className="w-full h-full" />
              ) : (
                <User size={20} color="#CCFF00" weight="fill" />
              )}
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-white font-semibold text-[15px] mb-1">{cust.fullName}</Text>
              <View className="bg-[#2A2A2A] self-start px-2 py-0.5 rounded-full mb-1">
                <Text className="text-[#A1A1AA] text-[10px] font-semibold uppercase tracking-wider">
                  {cust.customId || `CUST-${(cust.customerId || '').slice(0, 4).toUpperCase()}`}
                </Text>
              </View>
              <View className="flex-row items-center mt-0.5">
                <View className="mr-1">
                  <User size={12} color="#CCFF00" weight="fill" />
                </View>
                <Text className="text-[#A1A1AA] text-[11px]">
                  {assignedTrainer ? `Trainer: ${assignedTrainer.fullName}` : 'No trainer assigned'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push(`/(owner)/profile/assign-trainer?customerId=${cust.customerId}` as any)}
              className="w-10 h-10 rounded-full border border-[#333333] justify-center items-center active:opacity-70 ml-2"
            >
              <ArrowRight size={16} color="#CCFF00" />
            </Pressable>
          </View>
        );
      })}

      {renderAssignFooter()}
    </>
  );
};
