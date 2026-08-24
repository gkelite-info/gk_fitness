import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, TextInput, Platform, UIManager, Modal, ScrollView } from 'react-native';
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
  Buildings
} from 'phosphor-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useGymLeads } from '@/hooks/gymLeads/useGymLeads';
import { updateGymLeadStatus } from '@/helpers/gymLeads/gymLeadsHelper';
import { toast } from '@/lib/toast';
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

const LeadCard = ({ item, onStatusPress }: { item: any; onStatusPress: (item: any) => void }) => {
  return (
    <View className="bg-[#1C1C1E] rounded-2xl p-4 mb-4">
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

        <Pressable
          onPress={() => onStatusPress(item)}
          className="px-2 py-1 rounded-md active:opacity-70"
          style={{ backgroundColor: `${getStatusColor(item.status)}20` }}
        >
          <Text
            className="text-[10px] font-semibold"
            style={{ color: getStatusColor(item.status) }}
          >
            {getStatusLabel(item.status).toUpperCase()}
          </Text>
        </Pressable>
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
    </View>
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
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

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
          const newDataMap = new Map(data.data.map((l: any) => [l.gymLeadId, l]));
          const updatedPrev = prev.map(l => newDataMap.has(l.gymLeadId) ? newDataMap.get(l.gymLeadId) : l);
          const prevIds = new Set(prev.map(l => l.gymLeadId));
          const newUnique = data.data.filter((l: any) => !prevIds.has(l.gymLeadId));
          return [...updatedPrev, ...newUnique];
        });
      }
    }
  }, [data, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setAccumulatedLeads([]);
    if (page === 1) {
      await refetch();
    } else {
      setPage(1);
    }
    setRefreshing(false);
  }, [page, refetch]);

  const handleStatusPress = (lead: any) => {
    setSelectedLead(lead);
    setStatusModalVisible(true);
  };

  const handleBack = () => {
    router.push('/(superadmin)/dashboard');
  }

  const changeStatus = async (newStatus: 'submitted' | 'underreview' | 'approved' | 'rejected') => {
    if (!selectedLead) return;
    setIsUpdating(true);
    try {
      await updateGymLeadStatus(selectedLead.gymLeadId, newStatus);
      toast.success(`Status updated to ${getStatusLabel(newStatus)}`);

      setAccumulatedLeads([]);
      setPage(1);

      await queryClient.resetQueries({ queryKey: ['gymLeads'] });
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
      setStatusModalVisible(false);
    }
  };

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between px-4 pb-4 pt-2">
        <View className="flex-row items-center flex-1 pt-5">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 bg-[#1C1C1E] rounded-full items-center justify-center mr-3 active:opacity-70"
          >
            <CaretLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text className="text-white text-xl font-semibold">Gym Owners Leads</Text>
            <Text className="text-[#8E8E93] text-xs mt-0.5">Manage incoming applications</Text>
          </View>
        </View>
      </View>

      <View className="px-4 pb-4">
        <View className="flex-row items-center bg-[#1C1C1E] rounded-xl px-3 h-12">
          <MagnifyingGlass size={20} color="#8E8E93" />
          <TextInput
            className="flex-1 text-white ml-2 text-[15px]"
            placeholder="Search gym, name, email or mobile..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
          />
        </View>

        <View className="mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {statuses.map((status) => (
              <Pressable
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full mr-2 ${statusFilter === status ? 'bg-[#BEF227]' : 'bg-[#1C1C1E]'}`}
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
        renderItem={({ item }) => <LeadCard item={item} onStatusPress={handleStatusPress} />}
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

      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/60"
          onPress={() => setStatusModalVisible(false)}
        >
          <Pressable
            className="bg-[#1C1C1E] rounded-t-3xl p-6 pb-10"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-[#2A2A2D] rounded-full mb-4" />
              <Text className="text-white text-lg font-semibold">Change Status</Text>
              <Text className="text-[#8E8E93] text-sm mt-1">
                {selectedLead?.gymName} ({selectedLead?.fullName})
              </Text>
            </View>

            <View className="gap-3">
              {[
                { id: 'submitted', label: 'Submitted', color: '#3B82F6' },
                { id: 'underreview', label: 'Under Review', color: '#FBBF24' },
                { id: 'approved', label: 'Approve', color: '#84CC16' },
                { id: 'rejected', label: 'Reject', color: '#EF4444' },
              ].map((s) => {
                const isDisabled = isUpdating || selectedLead?.status === s.id || s.id === 'submitted';
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => changeStatus(s.id as any)}
                    disabled={isDisabled}
                    className={`flex-row items-center justify-between p-4 rounded-xl border ${selectedLead?.status === s.id ? 'border-white/20 bg-[#2A2A2D]' : 'border-[#2A2A2D] bg-[#121212]'} ${isDisabled ? 'opacity-50' : 'active:opacity-70'}`}
                  >
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: s.color }} />
                      <Text className={`text-base font-semibold ${selectedLead?.status === s.id ? 'text-white' : 'text-[#E0E0E0]'}`}>
                        {s.label}
                      </Text>
                    </View>
                    {selectedLead?.status === s.id && (
                      <Text className="text-[#8E8E93] text-xs">Current</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
