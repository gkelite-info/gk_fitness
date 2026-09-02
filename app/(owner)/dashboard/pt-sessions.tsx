import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  CaretLeft,
  CalendarBlank,
  Clock,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  CaretRight,
  User
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useUser } from '@/context/UserContext';
import { useCustomerTrainersByGym } from '@/hooks/customerTrainers/useCustomerTrainers';
import { usePersonalTrainerRequestsByGym } from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import { ActivityIndicator } from 'react-native';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

function StatCard({ icon: Icon, color, title, count, sub }: { icon: any, color: string, title: string, count: string, sub: string }) {
  return (
    <View
      className="bg-[#121214] rounded-xl p-3 border-l-2 mr-3"
      style={{ borderLeftColor: color, minWidth: 100 }}
    >
      <Icon size={16} color={color} style={{ marginBottom: 6 }} />
      <Text className="text-[#8E8E93] text-[9px] mb-0.5 font-medium">{title}</Text>
      <Text className="text-white text-xl font-semibold tracking-tight mb-0.5">{count}</Text>
      <Text className="text-[#8E8E93] text-[8px] font-medium">{sub}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = '#8E8E93';
  let Icon = Clock;

  if (status === 'Completed') {
    color = '#22C55E';
    Icon = CheckCircle;
  } else if (status === 'Upcoming') {
    color = '#EAB308';
    Icon = Clock;
  } else if (status === 'Cancelled') {
    color = '#EF4444';
    Icon = XCircle;
  }

  return (
    <View
      className="px-2.5 py-1 rounded-full border flex-row items-center"
      style={{ backgroundColor: color + '1A', borderColor: color + '4D' }}
    >
      <Icon size={12} color={color} weight="regular" />
      <Text className="text-[10px] font-semibold ml-1.5" style={{ color }}>{status}</Text>
    </View>
  );
}

function SessionRow({ item, onPress }: { item: any; onPress: () => void }) {
  let color = '#8E8E93';
  if (item.status === 'Completed') color = '#22C55E';
  if (item.status === 'Upcoming') color = '#EAB308';
  if (item.status === 'Cancelled') color = '#EF4444';

  return (
    <Pressable onPress={onPress} className="bg-[#121214] rounded-2xl mb-3 flex-row items-center py-3 pl-0 pr-4 border border-[#27272A] active:opacity-70">
      <View className="flex-row items-center w-[85px]">
        <View className="w-[3px] h-[32px] rounded-r-full mr-4" style={{ backgroundColor: color }} />
        <View>
          <Text className="text-white font-semibold text-[15px]">{item.time}</Text>
          <Text className="text-[#8E8E93] text-xs font-semibold tracking-wider mt-0.5">{item.ampm}</Text>
        </View>
      </View>

      <View className="flex-1 flex-row items-center ml-1">
        {item.img ? (
          <Image source={{ uri: item.img }} className="w-10 h-10 rounded-full mr-3 bg-[#27272A]" />
        ) : (
          <View className="w-10 h-10 rounded-full mr-3 bg-[#27272A] items-center justify-center border border-[#333333]">
            <User size={20} color="#FFFFFF" weight="regular" />
          </View>
        )}
        <View className="flex-1 justify-center">
          <Text className="text-white font-semibold text-xs mb-1" numberOfLines={1}>{item.member}</Text>
          <Text className="text-[#8E8E93] text-[10px]" numberOfLines={1}>{item.type}</Text>
        </View>
      </View>

      <View className="items-end justify-center ml-2">
        <View className="flex-row items-center mb-1.5">
          <StatusBadge status={item.status} />
          <CaretRight size={14} color="#8E8E93" style={{ marginLeft: 8 }} />
        </View>
        <Text className="text-[#8E8E93] text-[9px] mr-6">
          Trainer: <Text className="text-[#C4EF00] text-[10px] font-semibold">{item.trainer}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

export default function PTSessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: gymCustomerTrainers, isLoading: isLoadingTrainers, refetch: refetchTrainers } = useCustomerTrainersByGym(gymId ?? undefined);
  const { data: ptRequestsData, isLoading: isLoadingReqs, refetch: refetchReqs } = usePersonalTrainerRequestsByGym(gymId ?? undefined, 1, 1000);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchTrainers(),
        refetchReqs()
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTrainers, refetchReqs]);

  const ptRequestsMap = React.useMemo(() => {
    const map = new Map<string, any>();
    if (ptRequestsData?.data) {
      ptRequestsData.data.forEach((req: any) => {
        map.set(req.customerId, req);
      });
    }
    return map;
  }, [ptRequestsData]);

  const sessions = React.useMemo(() => {
    if (!gymCustomerTrainers) return [];

    return gymCustomerTrainers
      .filter(ct => ct.isActive)
      .map(ct => {
        const cust = ct.customer;
        const train = ct.trainer;

        const ptReq = ptRequestsMap.get(ct.customerId);
        let timeStr = ct.timings || ptReq?.preferredWorkoutTime || cust?.preferredWorkoutTime || '-';
        let time = timeStr;
        let ampm = '';

        if (timeStr !== '-') {
          if (timeStr.toUpperCase().includes('AM')) {
            time = timeStr.replace(/AM/i, '').trim();
            ampm = 'AM';
          } else if (timeStr.toUpperCase().includes('PM')) {
            time = timeStr.replace(/PM/i, '').trim();
            ampm = 'PM';
          }
        }

        const status = 'Upcoming';
        const img = cust?.profilePicture || cust?.profilePhoto || null;

        return {
          id: ct.customerTrainerId,
          time,
          ampm,
          member: cust?.fullName || 'Unknown Member',
          trainer: train?.fullName || 'Unknown Trainer',
          type: train?.specialization || 'General Fitness',
          status,
          img
        };
      })
      .filter(s =>
        s.member.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.trainer.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
  }, [gymCustomerTrainers, debouncedSearch]);

  const visibleSessions = sessions.slice(0, page * limit);
  const hasMore = visibleSessions.length < sessions.length;

  const headerElement = React.useMemo(() => (
    <>
      <View className="mt-4 mb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <StatCard icon={CalendarBlank} color="#A855F7" title="Today's Sessions" count={sessions.length.toString()} sub="All scheduled" />
          <StatCard icon={Clock} color="#EAB308" title="Upcoming" count={sessions.filter(s => s.status === 'Upcoming').length.toString()} sub="Yet to start" />
          <StatCard icon={CheckCircle} color="#22C55E" title="Completed" count={sessions.filter(s => s.status === 'Completed').length.toString()} sub="Sessions done" />
          <StatCard icon={XCircle} color="#EF4444" title="Cancelled" count={sessions.filter(s => s.status === 'Cancelled').length.toString()} sub="Not happening" />
        </ScrollView>
      </View>

      <View className="px-5 mb-8">
        <View className="flex-row items-center bg-[#18181B] rounded-2xl px-4 py-2">
          <MagnifyingGlass size={20} color="#8E8E93" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search member or trainer..."
            placeholderTextColor="#8E8E93"
            className="flex-1 ml-3 text-white text-sm font-sans"
          />
        </View>
      </View>

      <View className="px-5 mb-4 flex-row justify-between items-center">
        <Text className="text-white font-semibold text-sm">Today <Text className="text-[#8E8E93] font-normal">• {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</Text></Text>
        <Text className="text-[#8E8E93] text-xs">{sessions.length} Sessions</Text>
      </View>
    </>
  ), [sessions, searchQuery]);

  const renderFooter = () => {
    if (isLoadingTrainers || isLoadingReqs) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#C4EF00" />
        </View>
      );
    }
    if (sessions.length > 0 && hasMore) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CCF200" />
        </View>
      );
    }
    if (sessions.length > 0 && !hasMore) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#666666] text-xs font-sans">You've reached the end of the sessions</Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (isLoadingTrainers || isLoadingReqs) return null;
    return (
      <View className="px-5">
        <Text className="text-[#8E8E93] text-center mt-4 text-sm">No sessions found.</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center flex-1">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#18181B] items-center justify-center mr-3 active:opacity-70"
          >
            <CaretLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text className="text-xl font-semibold text-white tracking-wide">PT Sessions</Text>
            <Text className="text-[#8E8E93] text-[11px] mt-0.5">Manage personal training sessions for today.</Text>
          </View>
        </View>
        <Pressable className="w-10 h-10 items-center justify-center bg-[#18181B] rounded-full ml-3">
          <CalendarBlank size={20} color="#C4EF00" />
        </Pressable>
      </View>

      <FlatList
        data={visibleSessions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={headerElement}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View className="px-5">
            <SessionRow
              item={item}
              onPress={() => router.push({
                pathname: `/(owner)/dashboard/pt-sessions/${item.id}` as any,
                params: { itemData: JSON.stringify(item) }
              })}
            />
          </View>
        )}
        onEndReached={() => {
          if (hasMore) {
            setPage(p => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
