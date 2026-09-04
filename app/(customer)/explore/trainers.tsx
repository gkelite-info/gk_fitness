import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MagnifyingGlass, Faders, Star, Briefcase, CaretRight, Heart, Barbell, Fire, ArrowRight, CaretLeft,
  PersonSimpleRunIcon
} from 'phosphor-react-native';
import { useGlobalTrainersPaginated } from '@/hooks/globalTrainers/useGlobalTrainersPaginated';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

const TABS = [
  { id: 'ALL', label: 'All Trainers' },
  { id: 'STRENGTH', label: 'Strength', icon: Barbell },
  { id: 'FAT LOSS', label: 'Weight Loss', icon: Fire },
  { id: 'CROSS FIT', label: 'Cross Fit', icon: PersonSimpleRunIcon },
];

export default function ExploreTrainersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const limit = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const { data, isLoading, isFetching, refetch } = useGlobalTrainersPaginated(
    page,
    limit,
    debouncedSearch,
    undefined,
    'newest'
  );

  const accumulatedTrainers = data?.data || [];

  const filteredTrainers = accumulatedTrainers.filter(trainer => {
    if (activeTab === 'ALL') return true;
    const spec = (trainer.specialization || '').toLowerCase();
    const tabNorm = activeTab.toLowerCase().replace(/\s+/g, '');
    return spec.includes(tabNorm) || spec.includes(activeTab.toLowerCase());
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = () => {
    if (!isFetching && !isLoading && data?.total && accumulatedTrainers.length < data.total) {
      setPage(prev => prev + 1);
    }
  };

  const renderFooter = () => {
    if (isFetching && page > 1) {
      return (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color="#CCFF00" />
        </View>
      );
    }
    if (data?.total && accumulatedTrainers.length >= data.total && accumulatedTrainers.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#9CA3AF] text-xs font-sans">You've reached the end of the list</Text>
        </View>
      );
    }
    return null;
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(customer)/explore');
    }
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={handleBack} className="p-2 -ml-2">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>

      <FlatList
        data={filteredTrainers}
        keyExtractor={(item) => item.globalTrainerId}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListHeaderComponent={
          <>
            <View className="mb-4 mt-2">
              <Text className="text-white text-[32px] font-semibold tracking-tight leading-10">
                Find Your{'\n'}
                <Text className="text-[#CCFF00]">Personal Trainer 💪</Text>
              </Text>
            </View>

            <Text className="text-[#9CA3AF] text-[13px] leading-5 mb-6 pr-4">
              Explore expert trainers and choose the perfect match for your fitness journey.
            </Text>

            <View className="flex-row mb-6 gap-3">
              <View className="flex-1 bg-[#1C1C24] rounded-full flex-row items-center px-4 h-[52px] border border-[#27272A]">
                <MagnifyingGlass size={20} color="#9CA3AF" weight="regular" />
                <TextInput
                  placeholder="Search trainers by name or expertise..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-white ml-3 h-full text-[13px] font-sans"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <Pressable className="bg-[#1C1C24] w-[52px] h-[52px] rounded-full items-center justify-center border border-[#27272A]">
                <Faders size={20} color="#CCFF00" weight="regular" />
              </Pressable>
            </View>

            <View className="mb-8">
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={TABS}
                keyExtractor={(item) => item.id}
                renderItem={({ item: tab }) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <Pressable
                      onPress={() => setActiveTab(tab.id)}
                      className={`flex-row items-center px-5 py-2.5 rounded-full mr-3 border ${isActive ? 'bg-[#CCFF00] border-[#CCFF00]' : 'bg-[#1C1C24] border-[#27272A]'
                        }`}
                    >
                      {Icon && (
                        <View className="mr-2">
                          <Icon
                            size={16}
                            color={isActive ? "#09090B" : "#F3F4F6"}
                            weight={isActive ? "bold" : "regular"}
                          />
                        </View>
                      )}
                      <Text className={`font-semibold text-[13px] ${isActive ? 'text-[#09090B]' : 'text-[#F3F4F6]'
                        }`}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            <View className="flex-row items-end justify-between mb-4">
              <Text className="text-white text-lg font-semibold">Top Trainers at Your Gym</Text>
              <Pressable className="flex-row items-center">
                <Text className="text-[#CCFF00] text-xs font-semibold mr-1">View All</Text>
                <ArrowRight size={12} color="#CCFF00" weight="bold" />
              </Pressable>
            </View>

            <View className="w-10 h-0.5 bg-[#CCFF00] mb-6 rounded-full -mt-2" />

            {isLoading && page === 1 && (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator color="#CCFF00" size="large" />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="py-10 items-center justify-center">
              <Text className="text-[#9CA3AF] text-sm">No trainers found.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: trainer }) => (
          <Pressable
            onPress={() => (router as any).push({
              pathname: `/(customer)/explore/${trainer.gymTrainerId || trainer.globalTrainerId}`,
              params: { trainerData: JSON.stringify(trainer) }
            })}
            className="bg-[#1C1C24] rounded-3xl p-3 flex-row border border-[#27272A] mb-4"
          >
            <View className="w-[110px] h-[155px] rounded-2xl overflow-hidden mr-4 bg-[#2A2A35]">
              <StaticAvatar
                uri={trainer.users?.profilePhoto || trainer.profilePhoto}
                name={trainer.fullName}
                size={110}
                className="w-full h-full"
              />
            </View>

            <View className="flex-1 py-1">
              <View className="flex-row items-start justify-between mb-0.5">
                <Text className="text-white text-base font-semibold flex-1 mr-2" numberOfLines={1}>{trainer.fullName}</Text>
                <Pressable className="p-1 -mr-1 -mt-1">
                  <Heart size={18} color="#9CA3AF" weight="regular" />
                </Pressable>
              </View>

              <Text className="text-[#9CA3AF] text-[11px] mb-2 font-medium" numberOfLines={1}>
                {trainer.specialization === 'fatloss' ? 'Weight Loss & Nutrition' :
                  trainer.specialization === 'strength' ? 'Strength & Conditioning' :
                    trainer.specialization === 'crossfit' ? 'Functional Training & Strength' :
                      trainer.specialization || 'Personal Trainer'}
              </Text>

              <View className="flex-row items-center gap-3 mb-4">
                <View className="flex-row items-center">
                  <Star size={12} color="#CCFF00" weight="fill" />
                  <Text className="text-white text-xs font-semibold ml-1">{trainer.rating || '4.8'}</Text>
                </View>
                <View className="flex-row items-center">
                  <Briefcase size={12} color="#CCFF00" weight="fill" />
                  <Text className="text-[#9CA3AF] text-[10px] ml-1">{(trainer.experienceYears ?? trainer.experience) || '5+'} Years Exp.</Text>
                </View>
              </View>

              <Text className="text-[#9CA3AF] text-[8px] font-semibold tracking-widest mb-2 uppercase">PT Packages</Text>

              <View className="flex-row items-center justify-between">
                <View className="flex-row gap-2">
                  <View className="bg-[#09090B] border border-[#27272A] rounded-xl px-2 py-2 items-center justify-center">
                    <Text className="text-[#9CA3AF] text-[8px] font-medium mb-0.5">1 Day</Text>
                    <Text className="text-[#CCFF00] font-semibold text-[10px]">₹0</Text>
                  </View>
                  <View className="bg-[#09090B] border border-[#27272A] rounded-xl px-2 py-2 items-center justify-center">
                    <Text className="text-[#9CA3AF] text-[8px] font-medium mb-0.5">1 Month</Text>
                    <Text className="text-[#CCFF00] font-semibold text-[10px]">₹0</Text>
                  </View>
                </View>

                <Pressable
                  className="flex-row items-center border border-[#CCFF00] rounded-full px-3 py-2 ml-1"
                  onPress={() => (router as any).push({
                    pathname: `/(customer)/explore/${trainer.gymTrainerId || trainer.globalTrainerId}`,
                    params: { trainerData: JSON.stringify(trainer) }
                  })}
                >
                  <Text className="text-[#CCFF00] text-[10px] font-semibold mr-1">View Profile</Text>
                  <CaretRight size={10} color="#CCFF00" weight="bold" />
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
