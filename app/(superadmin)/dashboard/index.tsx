import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import {
  Buildings,
  CheckCircle,
  PlusCircle,
  Users,
  List,
  UserPlus,
  Headphones,
  Calendar,
} from 'phosphor-react-native';
import { useGyms } from '@/hooks/gyms/useGyms';
import { useUsers } from '@/hooks/users/useUsers';
import { useUser } from '@/context/UserContext';

const OVERVIEW_DATA = [
  { id: 'total-gyms', icon: Buildings, value: '0', label: 'Total Gyms' },
  { id: 'active-gyms', icon: CheckCircle, value: '0', label: 'Active Gyms' },
  { id: 'new-gyms', icon: PlusCircle, value: '0', label: 'New Gyms\nThis Month' },
  { id: 'total-users', icon: Users, value: '0', label: 'Total Users' },
];

const QUICK_ACTIONS_DATA = [
  { id: 'register-gym', icon: Buildings, label: 'Register\nNew Gym' },
  { id: 'view-gyms', icon: List, label: 'View Registered\nGyms', iconWeight: 'bold' as const },
  { id: 'create-owner', icon: UserPlus, label: 'Create\nOwner Account' },
  { id: 'support-requests', icon: Headphones, label: 'Support\nRequests' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { name, userId } = useUser();
  const [refreshing, setRefreshing] = React.useState(false);
  const { data: gyms, isLoading: isLoadingGyms, refetch: refetchGyms } = useGyms();
  const { data: users, refetch: refetchUsers } = useUsers();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGyms(), refetchUsers()]);
    setRefreshing(false);
  }, [refetchGyms, refetchUsers]);

  const overviewData = OVERVIEW_DATA.map((item) => {
    if (item.id === 'total-gyms') {
      return { ...item, value: gyms ? gyms.length.toString() : '0' };
    }
    if (item.id === 'active-gyms') {
      const activeCount = gyms ? gyms.filter((g) => g.isActive).length : 0;
      return { ...item, value: activeCount.toString() };
    }
    if (item.id === 'new-gyms') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newGymsCount = gyms ? gyms.filter((g) => {
        if (!g.createdAt) return false;
        const createdDate = new Date(g.createdAt);
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
      }).length : 0;
      return { ...item, value: newGymsCount.toString() };
    }
    if (item.id === 'total-users') {
      const otherUsersCount = users ? users.filter((u) => u.userId !== userId).length : 0;
      return { ...item, value: otherUsersCount.toString() };
    }
    return item;
  });

  const handleQuickAction = (id: string) => {
    if (id === 'register-gym' || id === 'view-gyms') {
      router.push('/(superadmin)/dashboard/register');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View className="flex-row items-start justify-between mb-6">
        <View className="flex-1 pr-2">
          <Text className="text-2xl font-semibold text-white mb-1">
            {getGreeting()}, {name} 👋
          </Text>
          <Text className="text-sm text-[#888888] leading-5">
            {"Here's"} what{"'"}s happening on your{'\n'}platform today.
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111622] border border-[#1F293D]">
          <Calendar size={16} color="#888888" weight="regular" />
          <Text className="text-xs font-medium text-white">20 July 2026</Text>
        </View>
      </View>

      <Text className="text-lg font-semibold text-white mb-3">Platform Overview</Text>

      <View className="flex-row justify-between gap-2 mb-6">
        {overviewData.map((item) => {
          const Icon = item.icon;
          return (
            <View
              key={item.id}
              className="flex-1 bg-[#0F0F0F] border border-[#111827] rounded-2xl p-3 items-center justify-center min-h-[130px]">
              <Icon size={28} color="#BEF227" weight="fill" />
              <Text className="text-2xl font-semibold text-white mt-2">{item.value}</Text>
              <Text className="text-[11px] font-normal text-[#888888] text-center mt-1 leading-3">
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="text-lg font-semibold text-white mb-3">Quick Actions</Text>

      <View className="flex-row justify-between gap-2">
        {QUICK_ACTIONS_DATA.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleQuickAction(item.id)}
              className="flex-1 bg-[#0F0F0F] border border-[#111827] rounded-2xl p-3 items-center justify-center min-h-[130px] active:opacity-70">
              <Icon size={28} color="#BEF227" weight={item.iconWeight || 'fill'} />
              <Text className="text-[11px] font-medium text-white text-center mt-3 leading-3">
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
