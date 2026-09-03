import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, ActivityIndicator, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, MagnifyingGlass, Faders, Star, CheckCircle, MapPin, Briefcase, CaretDown, CaretRight, ArrowsClockwise, UserCircle
} from 'phosphor-react-native';
import { useGlobalTrainersPaginated } from '@/hooks/globalTrainers/useGlobalTrainersPaginated';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

const TABS = ['ALL', 'STRENGTH', 'FAT LOSS', 'YOGA', 'ZUMBA', 'POWER LIFTING'];

export default function TrainersListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [accumulatedTrainers, setAccumulatedTrainers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab]);

  const { data, isLoading, isFetching, refetch } = useGlobalTrainersPaginated(
    page,
    limit,
    debouncedSearch,
    undefined,
    'newest'
  );

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedTrainers(data.data);
      } else {
        setAccumulatedTrainers((prev) => {
          const prevIds = new Set(prev.map((t) => t.globalTrainerId));
          const newUnique = data.data.filter((t) => !prevIds.has(t.globalTrainerId));
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

  const handleBack = () => {
    router.push("/(owner)/explore" as any);
  };

  const renderFooter = () => {
    if (isFetching && page > 1) {
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
            className="flex-row items-center gap-x-2 bg-[#141414] border border-[#2A2A2A] px-4 py-2.5 rounded-xl active:opacity-70"
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
          <Text className="text-[#8E8E93] text-xs font-sans">You've reached the end of the list</Text>
        </View>
      );
    }
    return null;
  };

  const filteredTrainers = accumulatedTrainers.filter(trainer => {
    if (activeTab === 'ALL') return true;
    const spec = (trainer.specialization || '').toLowerCase();
    const tabNorm = activeTab.toLowerCase().replace(/\s+/g, '');
    return spec.includes(tabNorm) || spec.includes(activeTab.toLowerCase());
  });

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="flex-row items-center px-4 py-4 border-b border-[#27272A]">
        <Pressable onPress={handleBack} className="mr-3">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View>
          <Text className="text-white text-xl font-semibold tracking-tight mb-0.5">Trainers</Text>
          <Text className="text-[#8E8E93] text-[11px]">Find the perfect trainer for your goals.</Text>
        </View>
      </View>

      <View className="flex-1">
        <View className="px-4 py-4 flex-row gap-3 items-center">
          <View className="flex-1 bg-[#1A1A1A] rounded-xl flex-row items-center px-4 h-12">
            <MagnifyingGlass size={18} color="#8E8E93" />
            <TextInput
              placeholder="Search trainers by name or expertise..."
              placeholderTextColor="#8E8E93"
              className="flex-1 text-white ml-2 text-[13px] h-full font-sans"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable className="bg-[#1A1A1A] w-12 h-12 rounded-xl items-center justify-center">
            <Faders size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="px-4 mb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
            <View className="flex-row gap-2">
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg border ${isActive ? 'bg-[#1F2937] border-[#374151]' : 'bg-[#121214] border-[#27272A]'}`}
                  >
                    <Text className={`text-[11px] font-semibold tracking-widest ${isActive ? 'text-white' : 'text-[#8E8E93]'}`}>
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="px-4 mb-4 flex-row justify-between items-end">
          <View className="flex-row items-baseline gap-2">
            <Text className="text-white text-lg font-semibold tracking-tight">All Trainers</Text>
            <Text className="text-[#8E8E93] text-xs">{total} Trainers</Text>
          </View>
          <Pressable className="flex-row items-center">
            <Text className="text-[#8E8E93] text-xs mr-1">Sort by: <Text className="text-[#CCFF00] font-semibold">Popular</Text></Text>
            <CaretDown size={12} color="#CCFF00" weight="bold" />
          </Pressable>
        </View>

        {isLoading && page === 1 ? (
          <View className="flex-1 py-10 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
          </View>
        ) : (
          <FlatList
            data={filteredTrainers}
            keyExtractor={(item) => item.globalTrainerId}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}
            refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <View className="py-10 items-center">
                <Text className="text-[#8E8E93] text-sm">No trainers found</Text>
              </View>
            }
            renderItem={({ item: trainer }) => (
              <Pressable className="bg-[#121214] rounded-2xl p-3 flex-row border border-[#27272A] active:opacity-80 mb-4">
                <View className="w-[110px] h-[140px] rounded-xl overflow-hidden mr-3">
                  {trainer.users?.profilePhoto ? (
                    <Image 
                      source={{ uri: trainer.users.profilePhoto }} 
                      className="w-full h-full" 
                      resizeMode="cover" 
                    />
                  ) : (
                    <View className="w-full h-full bg-[#1A1A1A] items-center justify-center">
                      <UserCircle size={48} color="#404040" weight="fill" />
                    </View>
                  )}
                  <View className="absolute inset-0 bg-black/10" />
                </View>

                <View className="flex-1 py-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <View>
                      <View className="bg-[#4D4D00] self-start rounded px-1.5 py-0.5 mb-1.5 flex-row items-center">
                        <Star size={8} color="#CCFF00" weight="fill" />
                        <Text className="text-[#CCFF00] text-[8px] font-semibold tracking-wider ml-1">FEATURED</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <Star size={12} color="#CCFF00" weight="fill" />
                      <Text className="text-white text-[13px] font-semibold ml-1">4.9</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mb-1">
                    <Text className="text-white text-[15px] font-semibold mr-1">{trainer.fullName}</Text>
                    <CheckCircle size={14} color="#CCFF00" weight="fill" />
                  </View>

                  <Text className="text-[#8E8E93] text-xs mb-2" numberOfLines={1}>{trainer.specialization}</Text>

                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="flex-row items-center">
                      <Briefcase size={10} color="#8E8E93" />
                      <Text className="text-[#8E8E93] text-[10px] ml-1">{trainer.experience} Years Exp.</Text>
                    </View>
                    <View className="flex-row items-center">
                      <MapPin size={10} color="#8E8E93" />
                      <Text className="text-[#8E8E93] text-[10px] ml-1">{trainer.city}</Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5 mb-3">
                    <View className="px-2 py-1 rounded-full bg-[#CCFF001A]">
                      <Text className="text-[9px] font-medium text-[#CCFF00]">{trainer.specialization}</Text>
                    </View>
                  </View>

                  <View className="absolute bottom-1 right-0 w-6 h-6 rounded-full border border-[#CCFF00] items-center justify-center">
                    <CaretRight size={12} color="#CCFF00" weight="bold" />
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}
