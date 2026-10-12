import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, TextInput, Platform, UIManager, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MagnifyingGlass,
  CaretLeft,
  MapPin,
  CalendarBlank,
  Phone,
  EnvelopeSimple,
  Buildings,
} from 'phosphor-react-native';
import { useGymLeads } from '@/hooks/gymLeads/useGymLeads';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved': return '#84CC16';
    case 'underreview': return '#FBBF24';
    case 'rejected': return '#EF4444';
    case 'submitted':
    default: return '#3B82F6';
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'Approved';
    case 'underreview': return 'Under Review';
    case 'rejected': return 'Rejected';
    case 'submitted':
    default: return 'Submitted';
  }
};

const LeadCard = ({ item, router }: { item: any; router: any }) => {
  return (
    <Pressable
      onPress={() => router.push(`/(superadmin)/leads/${item.gymLeadId}`)}
      className="bg-[#1C1C1E] rounded-2xl p-4 mb-4 active:opacity-90"
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1 pr-2">
          <View className="w-10 h-10 rounded-full bg-[#2A2A2D] items-center justify-center mr-3 shrink-0">
            <Buildings size={20} color="#BEF227" />
          </View>

          <View className="flex-1 justify-center">
            <Text className="text-white text-base font-semibold mb-1" numberOfLines={1}>{item.gymName || 'Unknown Gym'}</Text>
            <View className="flex-row items-center">
              <MapPin size={12} color="#8E8E93" />
              <Text className="text-[#8E8E93] text-xs ml-1 flex-1" numberOfLines={1}>{item.gymCity || 'City'}, {item.gymState || 'State'}</Text>
            </View>
          </View>
        </View>

        <View
          className="px-2 py-1 rounded-md"
          style={{ backgroundColor: `${getStatusColor(item.status)}20` }}
        >
          <Text
            className="text-[10px] font-semibold"
            style={{ color: getStatusColor(item.status) }}
          >
            {getStatusLabel(item.status).toUpperCase()}
          </Text>
        </View>
      </View>

      <View className="bg-[#2A2A2D] rounded-xl p-3 mb-3">
        <Text className="text-white font-medium mb-2">{item.fullName}</Text>
        <View className="flex-row items-center mb-1.5">
          <Phone size={12} color="#8E8E93" />
          <Text className="text-[#8E8E93] text-[11px] ml-1.5">{item.mobile}</Text>
        </View>
        <View className="flex-row items-center">
          <EnvelopeSimple size={12} color="#8E8E93" />
          <Text className="text-[#8E8E93] text-[11px] ml-1.5">{item.email}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-[#2A2A2D] pt-3">
        <View className="flex-row items-center">
          <CalendarBlank size={12} color="#8E8E93" />
          <Text className="text-[#8E8E93] text-xs ml-1.5" numberOfLines={1}>
            Applied: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const LeadCardSkeleton = () => (
  <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4 animate-pulse">
    <View className="flex-row items-start justify-between mb-3">
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 bg-[#2A2A2D] rounded-full mr-3" />
        <View className="flex-1">
          <View className="h-5 w-32 bg-[#2A2A2D] rounded-md mb-2" />
          <View className="h-4 w-24 bg-[#2A2A2D] rounded-md" />
        </View>
      </View>
      <View className="h-6 w-20 bg-[#2A2A2D] rounded-full" />
    </View>
    <View className="flex-row items-center mt-2 pt-3 border-t border-[#2A2A2D]">
      <View className="h-4 w-32 bg-[#2A2A2D] rounded-md" />
    </View>
  </View>
);

export default function GymOwnerLeadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const statuses = ['all', 'submitted', 'underreview', 'approved', 'rejected'];

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [accumulatedLeads, setAccumulatedLeads] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 2000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setAccumulatedLeads([]);
  }, [debouncedSearch, statusFilter]);

  const { data, isLoading, refetch, isFetching } = useGymLeads(page, limit, debouncedSearch, statusFilter);

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedLeads(data.data);
      } else {
        setAccumulatedLeads((prev) => {
          const newItems = data.data.filter(
            (item: any) => !prev.some((p: any) => p.gymLeadId === item.gymLeadId)
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [data, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (page === 1) {
      await refetch();
    } else {
      setPage(1);
    }
    setRefreshing(false);
  }, [page, refetch]);

  const handleBack = () => {
    router.push('/(superadmin)/dashboard');
  };

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between px-4 pb-4 pt-2">
        <View className="flex-row items-center flex-1 pt-5">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 bg-[#1C1C1E] rounded-full items-center justify-center mr-4 active:opacity-70"
          >
            <CaretLeft size={20} color="#8E8E93" />
          </Pressable>
          <View>
            <Text className="text-[#BEF227] text-2xl font-semibold">Gym Owner <Text className="text-white font-semibold">Leads</Text></Text>
            <Text className="text-[#8E8E93] text-sm mt-0.5">Manage Gym Registration Requests</Text>
          </View>
        </View>
      </View>

      <View className="px-4 pb-4">
        <View className="flex-row items-center bg-[#1C1C1E] rounded-xl px-3 py-2.5 mb-3 border border-[#2A2A2D]">
          <MagnifyingGlass size={16} color="#8E8E93" />
          <TextInput
            placeholder="Search by name, gym, phone, email..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-white ml-2 text-sm"
          />
        </View>

        <View className="overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {statuses.map((status) => (
              <Pressable
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl mr-2 ${statusFilter === status ? 'bg-[#BEF227]' : 'bg-[#1C1C1E]'}`}
              >
                <Text className={`text-sm font-semibold ${statusFilter === status ? 'text-black' : 'text-white'}`}>
                  {status === 'all' ? 'All Leads' : getStatusLabel(status)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={accumulatedLeads}
        keyExtractor={(item) => item.gymLeadId || Math.random().toString()}
        renderItem={({ item }) => <LeadCard item={item} router={router} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (data?.total && accumulatedLeads.length > 0 && accumulatedLeads.length < data.total && !isFetching) {
            setPage(p => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          isFetching ? (
            <View>
              {[1, 2, 3, 4, 5].map((i) => (
                <LeadCardSkeleton key={i} />
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-10 mt-10">
              <View className="w-16 h-16 rounded-full bg-[#1C1C1E] items-center justify-center mb-4">
                <EnvelopeSimple size={32} color="#8E8E93" />
              </View>
              <Text className="text-white text-lg font-semibold text-center mb-1">
                No Leads Found
              </Text>
              <Text className="text-[#8E8E93] text-sm text-center">
                {searchQuery ? "Try adjusting your search terms" : "There are no gym owner applications yet"}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetching && page > 1 ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#BEF227" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
