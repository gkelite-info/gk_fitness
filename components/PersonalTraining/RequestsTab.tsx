import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { Users, User, Barbell, Calendar, Clock, Check, X, ArrowsClockwise, ArrowRight } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { usePersonalTrainerRequestsByGym, useUpdatePersonalTrainerRequestStatus } from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import ConfirmModal from '@/components/ConfirmModal';
import { AnimatedShimmer } from './AnimatedShimmer';

const getRelativeTime = (dateString?: string | Date) => {
  if (!dateString) return '';
  const time = new Date(dateString).getTime();
  const now = Date.now();
  const diffInMs = Math.abs(now - time);
  const diffInMinutes = Math.round(diffInMs / 60000);

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.round(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const RequestCardShimmer = () => (
  <View className="bg-[#1F1F1F] rounded-3xl p-5 mb-4 border border-[#222222]">
    <View className="flex-row justify-between items-start mb-4">
      <View className="flex-row items-center">
        <AnimatedShimmer className="w-11 h-11 rounded-full mr-3" />
        <View>
          <AnimatedShimmer className="w-32 h-4 rounded mb-1.5" />
          <AnimatedShimmer className="w-20 h-3 rounded" />
        </View>
      </View>
      <AnimatedShimmer className="w-12 h-5 rounded-full" />
    </View>

    <View className="bg-[#222222] rounded-2xl p-3 flex-row items-center mb-5">
      <AnimatedShimmer className="w-10 h-10 rounded-full mr-3" />
      <View>
        <AnimatedShimmer className="w-24 h-2 rounded mb-1.5" />
        <AnimatedShimmer className="w-28 h-3 rounded" />
      </View>
    </View>

    <View className="flex-row justify-between mb-6 px-1">
      <View>
        <AnimatedShimmer className="w-16 h-3 rounded mb-1.5" />
        <AnimatedShimmer className="w-12 h-3 rounded" />
      </View>
      <View>
        <AnimatedShimmer className="w-12 h-3 rounded mb-1.5" />
        <AnimatedShimmer className="w-14 h-3 rounded" />
      </View>
      <View>
        <AnimatedShimmer className="w-12 h-3 rounded mb-1.5" />
        <AnimatedShimmer className="w-16 h-3 rounded" />
      </View>
    </View>

    <View className="flex-row justify-between items-center">
      <AnimatedShimmer className="w-32 h-8 rounded-full" />
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <AnimatedShimmer className="w-11 h-11 rounded-full" />
        <AnimatedShimmer className="w-11 h-11 rounded-full" />
      </View>
    </View>
  </View>
);

export const RequestsTab = ({ gymId, refreshing, onRefreshComplete }: { gymId?: string; refreshing: boolean; onRefreshComplete: () => void }) => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<'approved' | 'rejected'>('approved');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [accumulatedRequests, setAccumulatedRequests] = useState<any[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch, isFetching } = usePersonalTrainerRequestsByGym(gymId ?? undefined, page, limit);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdatePersonalTrainerRequestStatus();

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedRequests(data.data);
      } else {
        setAccumulatedRequests((prev) => {
          const prevIds = new Set(prev.map((r) => r.personalTrainerRequestId));
          const newUnique = data.data.filter((r: any) => !prevIds.has(r.personalTrainerRequestId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [data, page]);

  useEffect(() => {
    if (refreshing) {
      const handleRefresh = async () => {
        setIsRefreshing(true);
        if (page === 1) {
          await refetch();
        } else {
          setPage(1);
        }
        setIsRefreshing(false);
        onRefreshComplete();
      };
      handleRefresh();
    }
  }, [refreshing]);

  const handleApprove = (id: string) => {
    setSelectedRequestId(id);
    setModalAction('approved');
    setModalVisible(true);
  };

  const handleReject = (id: string) => {
    setSelectedRequestId(id);
    setModalAction('rejected');
    setModalVisible(true);
  };

  const confirmAction = () => {
    if (selectedRequestId) {
      updateStatus({ personalTrainerRequestId: selectedRequestId, status: modalAction }, {
        onSuccess: () => {
          setModalVisible(false);
          setSelectedRequestId(null);
        }
      });
    }
  };

  const pendingRequests = accumulatedRequests.filter(r => r.applicationStatus === 'submitted' || !r.applicationStatus) || [];

  const renderFooter = () => {
    if (isFetching && !isRefreshing) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CCFF00" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View className="py-4 items-center pb-8">
          <Pressable
            onPress={() => setPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#1A1A1A] border border-[#222222] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#CCFF00" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedRequests.length > 0) {
      return (
        <View className="py-6 items-center pb-8">
          <Text className="text-[#A1A1AA] text-xs font-sans">You've reached the end of the requests</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <>
      <View className="flex-row items-center mb-6">
        <View className="w-12 h-12 rounded-full bg-[#1F2937] items-center justify-center mr-4">
          <Users size={24} color="#CCFF00" weight="fill" />
        </View>
        <View>
          <Text className="text-white text-lg font-semibold">{pendingRequests.length} Pending Requests</Text>
          <Text className="text-[#A1A1AA] text-sm mt-0.5">Review and approve trainer requests</Text>
        </View>
      </View>
      {(!data && page === 1) ? (
        <>
          <RequestCardShimmer />
          <RequestCardShimmer />
          <RequestCardShimmer />
        </>
      ) : pendingRequests.length === 0 ? (
        <Text className="text-[#A1A1AA] text-center mt-4">No pending requests.</Text>
      ) : pendingRequests.map((req, index) => (
        <View key={req.personalTrainerRequestId || index} className="bg-[#1F1F1F] rounded-3xl p-5 mb-4 border border-[#222222]">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-full bg-[#2D3117] mr-3 items-center justify-center overflow-hidden">
                {req.user?.profilePhoto || req.user?.profilePicture ? (
                  <Image source={{ uri: req.user?.profilePhoto || req.user?.profilePicture }} className="w-full h-full" />
                ) : (
                  <User size={20} color="#CCFF00" weight="fill" />
                )}
              </View>
              <View>
                <Text className="text-white font-semibold text-base">{req.user?.name || req.user?.fullName || 'Customer Name'}</Text>
                <Text className="text-[#A1A1AA] text-[11px] mt-0.5 tracking-wider">{req.user?.phone || 'N/A'}</Text>
              </View>
            </View>
            <View className="bg-[#222222] px-2.5 py-1 rounded-full">
              <Text className="text-[#A1A1AA] text-[10px]">{getRelativeTime(req.createdAt)}</Text>
            </View>
          </View>

          <View className="bg-[#222222] rounded-2xl p-3 flex-row items-center mb-5">
            <View className="w-10 h-10 rounded-full bg-[#1F2937] mr-3 justify-center items-center relative">
              {req.gymTrainer?.profilePhoto || req.gymTrainer?.profilePicture ? (
                <Image source={{ uri: req.gymTrainer?.profilePhoto || req.gymTrainer?.profilePicture }} className="w-10 h-10 rounded-full" />
              ) : (
                <User size={18} color="#FFFFFF" weight="fill" />
              )}
              <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#CCFF00] rounded-full items-center justify-center border-2 border-[#222222]">
                <Barbell size={8} color="#000000" weight="fill" />
              </View>
            </View>
            <View>
              <Text className="text-[#A1A1AA] text-[9px] uppercase font-semibold tracking-wider mb-0.5">Assigned Trainer</Text>
              <Text className="text-white text-xs font-medium">{req.gymTrainer?.fullName || 'N/A'}</Text>
            </View>
          </View>

          <View className="flex-row justify-between mb-6 px-1">
            <View className="flex-1 mr-4">
              <Text className="text-[#A1A1AA] text-[10px] uppercase font-semibold tracking-wider mb-1">Days</Text>
              <Text className="text-white text-xs" numberOfLines={2}>
                {Array.isArray(req.preferredWorkoutDays) ? req.preferredWorkoutDays.join(', ') : (req.preferredWorkoutDays || 'Any')}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#A1A1AA] text-[10px] uppercase font-semibold tracking-wider mb-1">Timing</Text>
              <View className="flex-row items-center">
                <View className="mr-1">
                  <Clock size={12} color="#CCFF00" weight="bold" />
                </View>
                <Text className="text-white text-xs">{req.preferredWorkoutTime || 'Flexible'}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <View className="bg-[#333333] px-3 py-1.5 rounded-full">
              <Text className="text-white text-xs font-medium">Pending Review</Text>
            </View>
            <Pressable 
              onPress={() => router.push(`/(owner)/profile/request-details?requestId=${req.personalTrainerRequestId}` as any)}
              className="w-10 h-10 rounded-full border border-[#333333] justify-center items-center active:opacity-70 ml-2 bg-[#1A1A1A]"
            >
              <ArrowRight size={16} color="#CCFF00" />
            </Pressable>
          </View>
        </View>
      ))}

      {renderFooter()}

      <ConfirmModal
        visible={modalVisible}
        title={modalAction === 'approved' ? "Approve Request?" : "Reject Request?"}
        description={modalAction === 'approved' ? "Are you sure you want to approve this personal training request?" : "Are you sure you want to reject this personal training request?"}
        onConfirm={confirmAction}
        onClose={() => {
          setModalVisible(false);
          setSelectedRequestId(null);
        }}
        confirmText={isUpdating ? "Processing..." : modalAction === 'approved' ? "Approve" : "Reject"}
        confirmButtonColor={modalAction === 'rejected' ? 'bg-red-500' : 'bg-[#CCFF00]'}
        confirmTextColor={modalAction === 'rejected' ? 'text-white' : 'text-black'}
      />
    </>
  );
};
