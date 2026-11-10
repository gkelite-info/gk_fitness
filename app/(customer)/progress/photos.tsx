import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretDown, CaretRight, Plus, CaretLeft, Camera, X, ArrowsClockwise } from 'phosphor-react-native';

import { useProgressData } from '@/hooks/fitness/useProgressData';
import { useUser } from '@/context/UserContext';
import { resolveProgressPhotoUrl } from '@/lib/services/progressService';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerSelectionHaptic } from '@/lib/haptics';

const formatDateDisplay = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function ProgressPhotosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { data: progressData, isLoading, refetch, isFetching } = useProgressData(userId || null);
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(3);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const rawPhotos = progressData?.progressPhotos || [];
  const currentPhoto = rawPhotos[0];

  const sortedPhotos = useMemo(() => {
    const list = [...rawPhotos];
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.loggedAt).getTime();
      const timeB = new Date(b.createdAt || b.loggedAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [rawPhotos, sortOrder]);

  const chronologicalIds = useMemo(() => {
    const list = [...rawPhotos];
    return list
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.loggedAt).getTime();
        const timeB = new Date(b.createdAt || b.loggedAt).getTime();
        return timeA - timeB;
      })
      .map((p) => p.workoutProgressPhotoId);
  }, [rawPhotos]);

  useEffect(() => {
    setPage(1);
  }, [sortOrder]);

  const total = sortedPhotos.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  const paginatedPhotos = useMemo(() => {
    return sortedPhotos.slice(0, page * limit);
  }, [sortedPhotos, page, limit]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setPage(1);
    setRefreshing(false);
  }, [refetch]);

  if (isLoading || !progressData) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator color="#D4FF00" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-5 pt-6 pb-4">

          <View className="flex-row items-center mb-6">
            <Pressable
              className="mr-3 p-1 -ml-1 active:opacity-70"
              onPress={() => router.back()}
            >
              <CaretLeft size={28} color="#FFFFFF" weight="bold" />
            </Pressable>
            <Text className="text-white text-[28px] font-semibold tracking-tight">Progress Photos</Text>
          </View>

          {/* Current Physique Section */}
          <Text className="text-[#D4FF00] text-[11px] font-semibold tracking-[1.5px] uppercase mb-1">Current Physique</Text>
          <Text className="text-[#8E8E93] text-[13px] mb-4">{currentPhoto ? formatDateDisplay(currentPhoto.loggedAt) : 'No photos yet'}</Text>

          {currentPhoto ? (
            <Pressable
              onPress={() => setEnlargedPhotoUrl(resolveProgressPhotoUrl(currentPhoto.imageUrl, currentPhoto.userId || userId))}
              className="w-full h-64 bg-[#1C1C1E] rounded-3xl overflow-hidden mb-8 border border-[#2A2A2D]/50 active:opacity-80"
            >
              <Image
                source={{ uri: resolveProgressPhotoUrl(currentPhoto.imageUrl, currentPhoto.userId || userId) }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View className="w-full h-64 bg-[#1C1C1E] rounded-3xl items-center justify-center mb-8 border border-[#2A2A2D]/50">
              <Camera size={48} color="#2A2A2D" />
              <Text className="text-[#8E8E93] mt-4 text-sm">Upload your first progress photo</Text>
            </View>
          )}

          {/* Timeline Header */}
          <View className="flex-row justify-between items-end mb-6">
            <Text className="text-[#D4FF00] text-[11px] font-semibold tracking-[1.5px] uppercase">Timeline</Text>
            <Pressable
              onPress={() => {
                triggerSelectionHaptic();
                setIsSortModalVisible(true);
              }}
              className="flex-row items-center active:opacity-70 bg-[#1C1C1E] border border-[#2A2A2D] px-3 py-1.5 rounded-full"
            >
              <Text className="text-[#D4FF00] text-[13px] font-medium mr-1.5">
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </Text>
              <CaretDown size={14} color="#D4FF00" weight="bold" />
            </Pressable>
          </View>

          {/* Timeline List */}
          <View className="mb-2 pl-2">
            {paginatedPhotos.map((photo, index) => {
              const isLast = index === paginatedPhotos.length - 1;
              const photoUrl = resolveProgressPhotoUrl(photo.imageUrl, photo.userId || userId);
              const logNumber = chronologicalIds.indexOf(photo.workoutProgressPhotoId) + 1;
              const isLatestPhoto = logNumber === chronologicalIds.length && chronologicalIds.length > 0;
              const isCurrentBadge = isLatestPhoto && sortOrder === 'newest' && index === 0;

              return (
                <View key={photo.workoutProgressPhotoId} className="flex-row items-stretch">
                  {/* Timeline Graphic */}
                  <View className="items-center mr-4">
                    <View className={`w-5 h-5 rounded-full border-[2.5px] items-center justify-center ${isCurrentBadge ? 'border-[#D4FF00]' : 'border-[#2A2A2D]'}`}>
                      {isCurrentBadge && <View className="w-1.5 h-1.5 rounded-full bg-[#D4FF00]" />}
                    </View>
                    {(!isLast || hasMore) && (
                      <View className="w-[1px] flex-1 bg-[#2A2A2D] my-1" />
                    )}
                  </View>

                  {/* Record Row */}
                  <Pressable
                    onPress={() => setEnlargedPhotoUrl(photoUrl)}
                    className="flex-1 flex-row justify-between items-center mb-6 active:opacity-80"
                  >
                    <View>
                      <Text className="text-white text-[17px] font-semibold mb-1">
                        {isCurrentBadge ? 'Latest' : `Log #${logNumber}`}
                      </Text>
                      <Text className="text-[#8E8E93] text-[13px] mb-2">{formatDateDisplay(photo.loggedAt)}</Text>
                      {isCurrentBadge && (
                        <View className="bg-[#2E3113] px-2 py-0.5 rounded self-start border border-[#D4FF00]/20">
                          <Text className="text-[#D4FF00] text-[9px] font-semibold tracking-widest uppercase">Current</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center gap-3">
                      <View className="w-[100px] h-[60px] rounded-xl overflow-hidden bg-[#1C1C1E] border border-[#2A2A2D]/50">
                        <Image
                          source={{ uri: photoUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                      <CaretRight size={16} color="#6B6B6B" weight="bold" />
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Pagination Footer matching LogsTab.tsx pattern */}
          {isFetching && !refreshing ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#D4FF00" />
            </View>
          ) : hasMore ? (
            <View className="py-3 items-center mb-4">
              <Pressable
                onPress={() => {
                  triggerSelectionHaptic();
                  setPage((p) => p + 1);
                }}
                className="flex-row items-center gap-x-2 bg-[#141414] border border-[#2A2A2A] px-5 py-2.5 rounded-xl active:opacity-70"
              >
                <ArrowsClockwise size={16} color="#D4FF00" />
                <Text className="text-white text-sm font-semibold">Load More</Text>
              </Pressable>
            </View>
          ) : (
            sortedPhotos.length > 0 && (
              <View className="py-4 items-center mb-2">
                <Text className="text-[#666666] text-xs font-sans">You've reached the end of the photos</Text>
              </View>
            )
          )}

          <Pressable
            className="w-full bg-transparent rounded-3xl border border-dashed border-[#2A2A2D] p-8 items-center justify-center active:opacity-70 mt-2"
            onPress={() => router.push('/(customer)/progress/preview-photo')}
          >
            <View className="w-16 h-16 rounded-full border-2 border-[#D4FF00] items-center justify-center mb-4">
              <Plus size={28} color="#D4FF00" weight="regular" />
            </View>
            <Text className="text-[#D4FF00] text-[17px] font-semibold mb-1">Add New Photo</Text>
            <Text className="text-[#8E8E93] text-[13px]">Track your progress over time.</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Enlarged Image Preview Modal */}
      {enlargedPhotoUrl && (
        <Modal
          visible={!!enlargedPhotoUrl}
          transparent={true}
          animationType="fade"
          presentationStyle="overFullScreen"
          onRequestClose={() => setEnlargedPhotoUrl(null)}
          statusBarTranslucent
        >
          <View className="flex-1 bg-black/95 items-center justify-center p-4">
            {/* Top Bar with Close Cross Button */}
            <View
              className="absolute left-5 right-5 z-20 flex-row justify-between items-center"
              style={{ top: Math.max(insets.top + 10, 44) }}
            >
              <Text className="text-white text-base font-semibold">Photo Preview</Text>
              <Pressable
                onPress={() => setEnlargedPhotoUrl(null)}
                className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-white/20 items-center justify-center active:opacity-70"
              >
                <X size={20} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>

            {/* Tap Background to Close */}
            <Pressable
              className="absolute inset-0"
              onPress={() => setEnlargedPhotoUrl(null)}
            />

            {/* Enlarged Image */}
            <Image
              source={{ uri: enlargedPhotoUrl }}
              style={{
                width: Dimensions.get('window').width * 0.94,
                height: Dimensions.get('window').height * 0.78,
              }}
              resizeMode="contain"
              className="rounded-2xl"
            />
          </View>
        </Modal>
      )}

      {/* Sort Filter Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          className="flex-1 bg-black/70 justify-end"
          onPress={() => setIsSortModalVisible(false)}
        >
          <Pressable
            className="bg-[#141416] rounded-t-3xl p-6 border-t border-[#2A2A2D]"
            onPress={(e) => e.stopPropagation()}
            style={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
          >
            {/* Grab Handle */}
            <View className="items-center mb-5">
              <View className="w-10 h-1 bg-[#2A2A2D] rounded-full" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-bold">Sort Photos</Text>
              <Pressable
                onPress={() => setIsSortModalVisible(false)}
                className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-white/10 items-center justify-center active:opacity-70"
              >
                <X size={16} color="#8E8E93" weight="bold" />
              </Pressable>
            </View>

            {/* Option: Newest First */}
            <Pressable
              onPress={() => {
                triggerSelectionHaptic();
                setSortOrder('newest');
                setIsSortModalVisible(false);
              }}
              className={`p-4 rounded-2xl flex-row items-center justify-between mb-3 border ${sortOrder === 'newest'
                  ? 'bg-[#D4FF00]/10 border-[#D4FF00]/40'
                  : 'bg-[#1C1C1E] border-[#2A2A2D]/60'
                } active:opacity-80`}
            >
              <View>
                <Text
                  className={`text-base font-semibold ${sortOrder === 'newest' ? 'text-[#D4FF00]' : 'text-white'
                    }`}
                >
                  Newest First
                </Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">
                  Show most recent progress photos first (descending)
                </Text>
              </View>
              {sortOrder === 'newest' && (
                <View className="w-5 h-5 rounded-full bg-[#D4FF00] items-center justify-center">
                  <View className="w-2 h-2 rounded-full bg-black" />
                </View>
              )}
            </Pressable>

            {/* Option: Oldest First */}
            <Pressable
              onPress={() => {
                triggerSelectionHaptic();
                setSortOrder('oldest');
                setIsSortModalVisible(false);
              }}
              className={`p-4 rounded-2xl flex-row items-center justify-between border ${sortOrder === 'oldest'
                  ? 'bg-[#D4FF00]/10 border-[#D4FF00]/40'
                  : 'bg-[#1C1C1E] border-[#2A2A2D]/60'
                } active:opacity-80`}
            >
              <View>
                <Text
                  className={`text-base font-semibold ${sortOrder === 'oldest' ? 'text-[#D4FF00]' : 'text-white'
                    }`}
                >
                  Oldest First
                </Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">
                  Show earliest progress photos first (ascending)
                </Text>
              </View>
              {sortOrder === 'oldest' && (
                <View className="w-5 h-5 rounded-full bg-[#D4FF00] items-center justify-center">
                  <View className="w-2 h-2 rounded-full bg-black" />
                </View>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
