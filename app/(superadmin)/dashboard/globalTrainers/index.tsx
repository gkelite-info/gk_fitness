import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, TextInput, ActivityIndicator, FlatList, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MagnifyingGlass,
  Funnel,
  Plus,
  CaretDown,
  MapPin,
  Calendar,
  ArrowLeft,
  ArrowsClockwise
} from 'phosphor-react-native';
import { toggleGlobalTrainerActiveStatus } from '@/helpers/globalTrainer/globalTrainerHelper';
import { fetchUserByEmail, toggleUserStatus } from '@/helpers/user/userHelper';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from '@/lib/toast';
import { useGlobalTrainersPaginated } from '@/hooks/globalTrainers/useGlobalTrainersPaginated';
import { useQueryClient } from '@tanstack/react-query';

export default function GlobalTrainersListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ filter?: string }>();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>(
    (params.filter as 'all' | 'active' | 'inactive') || 'all'
  );

  const [accumulatedTrainers, setAccumulatedTrainers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (params.filter && ['all', 'active', 'inactive'].includes(params.filter)) {
      setSelectedFilter(params.filter as 'all' | 'active' | 'inactive');
      setPage(1);
    }
  }, [params.filter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 1000); // 1s debounce
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [selectedFilter, sortOrder]);

  const { data, isLoading, refetch, isFetching } = useGlobalTrainersPaginated(
    page,
    limit,
    debouncedSearch || undefined,
    selectedFilter,
    sortOrder
  );

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    if (data?.data) {
      const mapped = data.data.map((t: any) => ({
        id: t.globalTrainerId,
        name: t.fullName,
        email: t.email,
        specialization: t.specialization,
        experience: t.experience,
        location: `${t.city}, ${t.state}`,
        registeredDate: new Date(t.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        status: t.isActive ? 'ACTIVE' : 'INACTIVE',
      }));

      if (page === 1) {
        setAccumulatedTrainers(mapped);
      } else {
        setAccumulatedTrainers((prev) => {
          const prevIds = new Set(prev.map((l) => l.id));
          const newUnique = mapped.filter((l: any) => !prevIds.has(l.id));
          return [...prev, ...newUnique];
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

  const handleToggleStatus = async () => {
    if (!selectedTrainer) return;
    setIsUpdatingStatus(true);
    try {
      const currentActive = selectedTrainer.status === 'ACTIVE';

      const trainerRes = await toggleGlobalTrainerActiveStatus(selectedTrainer.id, currentActive);
      if (!trainerRes) {
        throw new Error('Failed to update global trainer status in database.');
      }

      if (selectedTrainer.email) {
        const user = await fetchUserByEmail(selectedTrainer.email);
        if (user && user.userId) {
          const userRes = await toggleUserStatus(user.userId, currentActive ? 'active' : 'inactive');
          if (!userRes) {
            console.error('Failed to update user status in users table.');
          }
        } else {
          console.error('No matching user found in users table for email:', selectedTrainer.email);
        }
      }

      toast.success(`${selectedTrainer.name}'s status changed to ${currentActive ? 'INACTIVE' : 'ACTIVE'}`);

      setAccumulatedTrainers([]);
      if (page === 1) {
        await refetch();
      } else {
        setPage(1);
      }
      await queryClient.invalidateQueries({ queryKey: ['globalTrainersPaginated'] });
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      toast.error('Failed to change trainer status.');
    } finally {
      setIsUpdatingStatus(false);
      setStatusModalVisible(false);
      setSelectedTrainer(null);
    }
  };

  const hasMore = page < totalPages;

  const renderFooter = () => {
    if (isFetching) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CCFF00" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View className="py-4 items-center">
          <Pressable
            onPress={() => setPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#111622] border border-[#1F293D] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#CCFF00" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedTrainers.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#888888] text-xs font-sans">You've reached the end of the list</Text>
        </View>
      );
    }
    return null;
  };

  const renderHeader = () => (
    <View className="pb-2">
      <View className="mb-4">
        <View className="flex-row items-center gap-2 mb-1">
          {router.canGoBack() && (
            <Pressable
              onPress={() => router.back()}
              className="w-8 h-8 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center">
              <ArrowLeft size={16} color="#FFFFFF" />
            </Pressable>
          )}
          <Text className="text-2xl font-semibold text-white">Global Trainers</Text>
        </View>
        <Text className={`text-sm text-[#888888] ${router.canGoBack() ? 'ml-10' : ''}`}>
          View and manage all global trainers.
        </Text>
      </View>

      <View className="flex-row items-center gap-2 mb-4">
        <View className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl px-3.5 py-2.5 flex-row items-center gap-2">
          <MagnifyingGlass size={18} color="#888888" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, spec or city..."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white text-sm py-0 font-sans"
          />
        </View>

        <Pressable className="bg-[#111622] border border-[#1F293D] rounded-xl px-3.5 py-2.5 flex-row items-center gap-2 active:opacity-70">
          <Funnel size={16} color="#888888" />
          <Text className="text-white text-sm font-medium">Filter</Text>
          <CaretDown size={12} color="#888888" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between gap-2 mb-4">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-full flex-row items-center justify-center ${selectedFilter === 'all'
                ? 'bg-[#CCFF00]'
                : 'bg-[#111622] border border-[#1F293D]'
              }`}>
            <Text
              className={`text-xs font-semibold ${selectedFilter === 'all' ? 'text-black' : 'text-white'
                }`}>
              All
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('active')}
            className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 ${selectedFilter === 'active'
                ? 'bg-[#CCFF00]'
                : 'bg-[#111622] border border-[#1F293D]'
              }`}>
            <View className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <Text
              className={`text-xs font-medium ${selectedFilter === 'active' ? 'text-black font-semibold' : 'text-white'
                }`}>
              Active
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedFilter('inactive')}
            className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 ${selectedFilter === 'inactive'
                ? 'bg-[#CCFF00]'
                : 'bg-[#111622] border border-[#1F293D]'
              }`}>
            <View className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <Text
              className={`text-xs font-medium ${selectedFilter === 'inactive' ? 'text-black font-semibold' : 'text-white'
                }`}>
              Inactive
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(superadmin)/dashboard/globalTrainers/register' as any)}
          className="border border-[#CCFF00] bg-[#111622] px-3 py-2 rounded-full flex-row items-center gap-1.5 active:opacity-80">
          <View className="w-4 h-4 rounded-full border border-[#CCFF00] items-center justify-center">
            <Plus size={10} color="#CCFF00" weight="bold" />
          </View>
          <Text className="text-[#CCFF00] font-semibold text-[11px] tracking-wide uppercase">
            New Trainer
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xs text-white font-medium">
          Total Trainers: <Text className="text-[#CCFF00] font-semibold">{total}</Text>
        </Text>

        <Pressable
          onPress={() => setIsSortModalVisible(true)}
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <Text className="text-xs text-[#888888]">Sort by: </Text>
          <Text className="text-xs text-white font-semibold">
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </Text>
          <CaretDown size={12} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <FlatList
        data={accumulatedTrainers}
        keyExtractor={(trainer) => trainer.id}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={() => (
          isLoading && page === 1 ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#CCFF00" />
            </View>
          ) : (
            <View className="py-12 items-center justify-center">
              <Text className="text-[#888888] text-sm">No global trainers found.</Text>
            </View>
          )
        )}
        renderItem={({ item: trainer }) => (
          <Pressable className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-start gap-3 flex-1 pr-2">
                <View className="w-14 h-14 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center">
                  <Text className="text-[#888888] text-lg font-semibold">{trainer.name?.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-white leading-5">{trainer.name}</Text>
                  <Text className="text-xs text-[#BEF227] mt-0.5 capitalize">{trainer.specialization} Trainer</Text>

                  <View className="flex-row items-center gap-1 mt-1.5">
                    <MapPin size={14} color="#888888" />
                    <Text className="text-xs text-[#888888]">{trainer.location}</Text>
                  </View>

                  <View className="flex-row items-center gap-1 mt-1">
                    <Calendar size={14} color="#888888" />
                    <Text className="text-xs text-[#888888]">
                      Joined: {trainer.registeredDate}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  setSelectedTrainer(trainer);
                  setStatusModalVisible(true);
                }}
                disabled={isUpdatingStatus}
                className={`px-2.5 py-1 rounded-full flex-row items-center gap-1.5 active:opacity-70 ${trainer.status === 'ACTIVE'
                    ? 'bg-[#064E3B]/40 border border-[#059669]/30'
                    : 'bg-red-500/10 border border-red-500/20'
                  }`}
              >
                <View className={`w-1.5 h-1.5 rounded-full ${trainer.status === 'ACTIVE' ? 'bg-[#10B981]' : 'bg-red-500'}`} />
                <Text className={`text-[10px] font-semibold tracking-wider ${trainer.status === 'ACTIVE' ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {trainer.status}
                </Text>
              </Pressable>
            </View>

            <View className="h-[1px] bg-[#1F293D] my-3.5" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-8">
                <View>
                  <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mb-0.5">
                    EXPERIENCE
                  </Text>
                  <Text className="text-white text-lg font-semibold">{trainer.experience} yrs</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />

      <ConfirmModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        onConfirm={handleToggleStatus}
        title={selectedTrainer?.status === 'ACTIVE' ? 'Deactivate Trainer' : 'Activate Trainer'}
        description={`Are you sure you want to ${selectedTrainer?.status === 'ACTIVE' ? 'deactivate' : 'activate'
          } ${selectedTrainer?.name || 'this trainer'}?`}
        confirmText={isUpdatingStatus ? 'Updating...' : selectedTrainer?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        confirmButtonColor={selectedTrainer?.status === 'ACTIVE' ? 'bg-red-500' : 'bg-[#10B981]'}
        confirmTextColor={selectedTrainer?.status === 'ACTIVE' ? 'text-white' : 'text-white'}
      />

      <Modal
        visible={isSortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setIsSortModalVisible(false)}
        >
          <View className="bg-[#111622] rounded-t-3xl p-6 border-t border-[#1F293D]">
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-[#2C3854] rounded-full" />
            </View>

            <Text className="text-white text-lg font-bold mb-4">Sort By</Text>

            <Pressable
              onPress={() => {
                setSortOrder('newest');
                setIsSortModalVisible(false);
              }}
              className="py-4 border-b border-[#1F293D] flex-row items-center justify-between"
            >
              <Text className={`text-base ${sortOrder === 'newest' ? 'text-[#CCFF00] font-bold' : 'text-white'}`}>
                Newest First
              </Text>
              {sortOrder === 'newest' && <View className="w-2 h-2 rounded-full bg-[#CCFF00]" />}
            </Pressable>

            <Pressable
              onPress={() => {
                setSortOrder('oldest');
                setIsSortModalVisible(false);
              }}
              className="py-4 flex-row items-center justify-between mb-4"
            >
              <Text className={`text-base ${sortOrder === 'oldest' ? 'text-[#CCFF00] font-bold' : 'text-white'}`}>
                Oldest First
              </Text>
              {sortOrder === 'oldest' && <View className="w-2 h-2 rounded-full bg-[#CCFF00]" />}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
