import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerMediumHaptic } from '@/lib/haptics';
import {
  Buildings,
  CheckCircle,
  PlusCircle,
  Users,
  List,
  UserPlus,
  Headphones,
  Calendar,
  MapPin,
  CaretRight,
  Globe,
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
  { id: 'create-owner', icon: UserPlus, label: 'Create Owner Account' },
  { id: 'support-requests', icon: Headphones, label: 'Support\nRequests' },
];

const LEADS_DATA = [
  { id: 'gym-owners', icon: Buildings, label: 'Gym Owners' },
  { id: 'global-trainers', icon: Globe, label: 'Global Trainers' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { name, userId } = useUser();
  const insets = useSafeAreaInsets();
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
    triggerMediumHaptic();
    setRefreshing(true);
    try {
      await Promise.all([refetchGyms(), refetchUsers()]);
    } catch (error) {
      console.error('[Superadmin Dashboard] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
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
    if (id === 'register-gym') {
      router.push('/(superadmin)/dashboard/register');
    } else if (id === 'view-gyms') {
      router.push('/(superadmin)/gyms');
    } else if (id === 'gym-owners') {
      router.push('/(superadmin)/leads/gym-owners');
    }
  };

  const recentGyms = gyms
    ? [...gyms].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 3)
    : [];

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 120 }}
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
            <Pressable
              key={item.id}
              onPress={() => item.id === 'total-gyms' ? router.push('/(superadmin)/gyms') : null}
              className="flex-1 bg-[#0F0F0F] border border-[#111827] rounded-2xl p-3 items-center justify-center min-h-[130px] active:opacity-70">
              <Icon size={28} color="#BEF227" weight="fill" />
              <Text className="text-2xl font-semibold text-white mt-2">{item.value}</Text>
              <Text className="text-[11px] font-normal text-[#888888] text-center mt-1 leading-3">
                {item.label}
              </Text>
            </Pressable>
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
              <Icon size={28} color="#BEF227" weight={(item as any).iconWeight || 'fill'} />
              <Text className="text-[11px] font-medium text-white text-center mt-3 leading-3">
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-lg font-semibold text-white mt-6 mb-3">Leads</Text>

      <View className="flex-row justify-between gap-2">
        {LEADS_DATA.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleQuickAction(item.id)}
              className="flex-1 bg-[#0F0F0F] border border-[#111827] rounded-2xl p-3 items-center justify-center min-h-[130px] active:opacity-70">
              <Icon size={28} color="#BEF227" weight="fill" />
              <Text className="text-[11px] font-medium text-white text-center mt-3 leading-3">
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row items-center justify-between mt-6 mb-3">
        <Text className="text-lg font-semibold text-white">Recently Registered Gyms</Text>
        <Pressable className="flex-row items-center gap-1" onPress={() => router.push('/(superadmin)/gyms')}>
          <Text className="text-xs font-semibold text-[#BEF227]">View All</Text>
          <CaretRight size={12} color="#BEF227" weight="bold" />
        </Pressable>
      </View>

      <View className="gap-3">
        {recentGyms.map((gym) => (
          <Pressable
            key={gym.gymId || gym.id}
            className="flex-row items-center bg-[#0F0F0F] border border-[#111827] rounded-2xl p-3"
            onPress={() => router.push(`/(superadmin)/dashboard/gym/${gym.gymId || gym.id}` as any)}
          >
            {gym.logo ? (
              <Image source={{ uri: gym.logo }} className="w-12 h-12 rounded-xl bg-white mr-3" />
            ) : (
              <View className="w-12 h-12 rounded-xl bg-[#1C1C1E] items-center justify-center mr-3 border border-[#2A2A2D]"><Text className="text-[10px] font-bold text-[#888888] text-center">NO{'\n'}LOGO</Text></View>
            )}
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">{gym.gymName}</Text>
              <Text className="text-[#888888] text-xs mt-0.5">Owner: {gym.ownerName || 'Unknown Owner'}</Text>
              <View className="flex-row items-center mt-1">
                <MapPin size={10} color="#888888" />
                <Text className="text-[#888888] text-[10px] ml-1">{gym.city || 'City'}, {gym.state || 'State'}</Text>
              </View>
            </View>
            <View className="items-end justify-between h-full py-1">
              <View className="flex-row items-center mb-3">
                <Calendar size={10} color="#888888" />
                <Text className="text-[#888888] text-[10px] ml-1">
                  {gym.createdAt ? new Date(gym.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date'}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="bg-[#064E3B]/40 border border-[#059669]/30 px-3 py-1 rounded-full">
                  <Text className="text-[#10B981] text-[11px] font-bold tracking-wider">{gym.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
                <CaretRight size={14} color="#888888" />
              </View>
            </View>
          </Pressable>
        ))}
        {recentGyms.length === 0 && (
          <Text className="text-[#888888] text-sm text-center py-4">No recent gyms found</Text>
        )}
      </View>

      <View className="flex-row items-center justify-between mt-6 mb-3">
        <Text className="text-lg font-semibold text-white">Support Requests</Text>
        <Pressable className="flex-row items-center gap-1" onPress={() => router.push('/(superadmin)/support')}>
          <Text className="text-xs font-semibold text-[#BEF227]">View All</Text>
        </Pressable>
      </View>

      <View className="bg-[#0F0F0F] border border-[#111827] rounded-2xl p-4 gap-4">
        <Pressable className="flex-row items-center justify-between active:opacity-70">
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-full bg-[#BEF227]/10 items-center justify-center">
              <Headphones size={16} color="#BEF227" weight="fill" />
            </View>
            <View>
              <Text className="text-white font-bold text-sm">3</Text>
              <Text className="text-[#888888] text-[10px]">Open Requests</Text>
            </View>
          </View>
          <CaretRight size={14} color="#888888" />
        </Pressable>

        <View className="h-[1px] bg-[#111827]" />

        <Pressable className="flex-row items-center justify-between active:opacity-70">
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-full bg-[#A855F7]/10 items-center justify-center">
              <CheckCircle size={16} color="#A855F7" weight="bold" />
            </View>
            <View>
              <Text className="text-white font-bold text-sm">12</Text>
              <Text className="text-[#888888] text-[10px]">Resolved</Text>
            </View>
          </View>
          <CaretRight size={14} color="#888888" />
        </Pressable>
      </View>
    </ScrollView>
  );
}
