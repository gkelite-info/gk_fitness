import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, EnvelopeSimple, Calendar, User, Star, Clock, CalendarBlank, Barbell, Check, X, ClockClockwise } from 'phosphor-react-native';
import { usePersonalTrainerRequestById, useUpdatePersonalTrainerRequestStatus } from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import ConfirmModal from '@/components/ConfirmModal';
import { useSaveCustomerTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymOwners } from '@/hooks/gymOwners/useGymOwners';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useUser } from '@/context/UserContext';

export default function RequestDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const { data: request, isLoading } = usePersonalTrainerRequestById(requestId);
  const { data: gymCustomer } = useGymCustomerById(request?.requestedBy);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdatePersonalTrainerRequestStatus();
  const { mutate: saveTrainer, isPending: isSaving } = useSaveCustomerTrainer();
  const { userId } = useUser();
  const { data: gymOwners } = useGymOwners();
  const currentGymOwner = gymOwners?.find(owner => owner.userId === userId);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<'approved' | 'rejected'>('approved');

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRelativeTime = (dateString?: string | Date | null) => {
    if (!dateString) return '';
    const time = new Date(dateString).getTime();
    const now = Date.now();
    const diffInMs = Math.abs(now - time);
    const diffInHours = Math.round(diffInMs / 3600000);

    if (diffInHours < 24) return `Received ${diffInHours}h ago`;
    return `Received ${Math.round(diffInHours / 24)}d ago`;
  };

  const handleApprove = () => {
    setModalAction('approved');
    setModalVisible(true);
  };

  const handleReject = () => {
    setModalAction('rejected');
    setModalVisible(true);
  };

  const confirmAction = () => {
    if (requestId) {
      updateStatus({ personalTrainerRequestId: requestId, status: modalAction }, {
        onSuccess: () => {
          if (modalAction === 'approved' && request && currentGymOwner?.gymOwnerId && gymCustomer?.gymId) {
            saveTrainer({
              gymId: gymCustomer.gymId,
              customerId: request.requestedBy,
              gymTrainerId: request.gymTrainerId,
              weekDays: Array.isArray(request.preferredWorkoutDays) ? request.preferredWorkoutDays : (typeof request.preferredWorkoutDays === 'string' ? request.preferredWorkoutDays.split(',').map((s: string) => s.trim()) : []),
              timings: request.preferredWorkoutTime || '-',
              assignedBy: currentGymOwner.gymOwnerId,
              isActive: true
            }, {
              onSuccess: () => {
                setModalVisible(false);
                router.back();
              }
            });
          } else {
            setModalVisible(false);
            router.back();
          }
        }
      });
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0F0F0F] justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  if (!request) {
    return (
      <View className="flex-1 bg-[#0F0F0F] justify-center items-center">
        <Text className="text-white">Request not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-[#1F1F1F] rounded-lg">
          <Text className="text-[#CCFF00]">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const customer = request.user;
  const trainer = request.gymTrainer;

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#1F1F1F] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View>
          <Text className="text-white text-xl font-semibold">Request Details</Text>
          <Text className="text-[#A1A1AA] text-xs mt-0.5">Review and take action on this PT request</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Pending Approval Banner */}
        <View className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333] mb-8 flex-row items-start">
          <View className="mt-0.5 mr-3">
            <ClockClockwise size={20} color="#CCFF00" weight="fill" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[#CCFF00] font-semibold text-base">Pending Approval</Text>
              <View className="bg-[#2A2A2A] px-2 py-0.5 rounded-md">
                <Text className="text-[#A1A1AA] text-[10px]">{getRelativeTime(request.createdAt)}</Text>
              </View>
            </View>
            <Text className="text-[#A1A1AA] text-sm">This request is waiting for your approval.</Text>
          </View>
        </View>

        {/* CUSTOMER Section */}
        <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3 uppercase">Customer</Text>
        <View className="bg-[#1A1A1A] rounded-2xl p-5 mb-8 border border-[#222222]">
          <View className="flex-row items-center mb-5">
            <View className="w-14 h-14 rounded-full bg-[#2D3117] overflow-hidden mr-4 items-center justify-center border border-[#333333]">
              {customer?.profilePhoto || customer?.profilePicture ? (
                <Image source={{ uri: customer.profilePhoto || customer.profilePicture }} className="w-full h-full" />
              ) : (
                <User size={24} color="#CCFF00" weight="fill" />
              )}
            </View>
            <View>
              <Text className="text-white text-lg font-semibold mb-1">{customer?.fullName || customer?.name}</Text>
              <View className="bg-[#2A2A2A] self-start px-2 py-1 rounded-md">
                <Text className="text-[#A1A1AA] text-[10px] font-semibold tracking-wider">
                  {customer?.customId || `CUST-${(customer?.userId || '').slice(0, 4).toUpperCase()}`}
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-y-3">
            <View className="flex-row items-center">
              <View className="w-5 items-center mr-3"><Phone size={16} color="#CCFF00" /></View>
              <Text className="text-[#A1A1AA] text-sm">{customer?.phone || 'N/A'}</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-5 items-center mr-3"><EnvelopeSimple size={16} color="#CCFF00" /></View>
              <Text className="text-[#A1A1AA] text-sm">{customer?.email || 'N/A'}</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-5 items-center mr-3"><CalendarBlank size={16} color="#CCFF00" /></View>
              <Text className="text-[#A1A1AA] text-sm">Joined on {formatDate(customer?.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* REQUESTED TRAINER Section */}
        <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3 uppercase">Requested Trainer</Text>
        <View className="bg-[#1A1A1A] rounded-2xl p-5 mb-8 border border-[#222222]">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-[#1F2937] overflow-hidden mr-4 items-center justify-center border border-[#333333]">
              {trainer?.user?.profilePhoto || trainer?.profilePicture ? (
                <Image source={{ uri: trainer?.user?.profilePhoto || trainer?.profilePicture }} className="w-full h-full" />
              ) : (
                <User size={24} color="#FFFFFF" weight="fill" />
              )}
            </View>
            <View>
              <Text className="text-white text-lg font-semibold mb-1">{trainer?.fullName}</Text>
              <Text className="text-[#CCFF00] text-xs mb-2">{trainer?.specialization || 'Fitness Coach'}</Text>

              <View className="flex-row items-center mb-2">
                <View className="bg-[#2A2A2A] px-2 py-1 rounded-md flex-row items-center">
                  <View className="mr-1 mt-0.5"><Star size={10} color="#FBBF24" weight="fill" /></View>
                  <Text className="text-[#A1A1AA] text-[10px] font-semibold">4.8 (128 reviews)</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-4 items-center mr-2"><Phone size={14} color="#CCFF00" /></View>
                <Text className="text-[#A1A1AA] text-xs">{trainer?.phone || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* TRAINING PREFERENCES Section */}
        <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3 uppercase">Training Preferences</Text>
        <View className="bg-[#1A1A1A] rounded-2xl border border-[#222222] overflow-hidden">
          <View className="flex-row items-center p-4 border-b border-[#222222]">
            <View className="mr-4 mt-1 self-start"><Calendar size={20} color="#CCFF00" /></View>
            <View>
              <Text className="text-[#A1A1AA] text-xs mb-1">Duration</Text>
              <Text className="text-white text-sm font-semibold">1 Month</Text>
            </View>
          </View>

          <View className="flex-row items-center p-4 border-b border-[#222222]">
            <View className="mr-4 mt-1 self-start"><Barbell size={20} color="#CCFF00" /></View>
            <View>
              <Text className="text-[#A1A1AA] text-xs mb-1">Training Days</Text>
              <Text className="text-white text-sm font-semibold capitalize">
                {Array.isArray(request.preferredWorkoutDays) ? request.preferredWorkoutDays.join(', ') : request.preferredWorkoutDays}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center p-4 border-b border-[#222222]">
            <View className="mr-4 mt-1 self-start"><Clock size={20} color="#CCFF00" /></View>
            <View>
              <Text className="text-[#A1A1AA] text-xs mb-1">Preferred Time</Text>
              <Text className="text-white text-sm font-semibold uppercase">{request.preferredWorkoutTime}</Text>
            </View>
          </View>

          <View className="flex-row items-center p-4">
            <View className="mr-4 mt-1 self-start"><CalendarBlank size={20} color="#CCFF00" /></View>
            <View>
              <Text className="text-[#A1A1AA] text-xs mb-1">Preferred Start Date</Text>
              <Text className="text-white text-sm font-semibold">
                {formatDate(request.createdAt)}
              </Text>
            </View>
          </View>
        </View>
        <View className="bg-[#0F0F0F] mt-5 p-4 px-0 flex-row items-center pb-8">
          <Pressable
            disabled={isUpdating || isSaving}
            onPress={handleReject}
            className="flex-1 flex-row items-center justify-center border border-red-500 rounded-xl py-3.5 mr-3 active:bg-red-500/20"
          >
            <X size={16} color="#EF4444" weight="bold" />
            <Text className="text-red-500 font-semibold ml-2">Reject Request</Text>
          </Pressable>
          <Pressable
            disabled={isUpdating || isSaving}
            onPress={handleApprove}
            className="flex-1 flex-row items-center justify-center bg-[#CCFF00] rounded-xl py-3.5 active:opacity-80"
          >
            <Check size={16} color="#000000" weight="bold" />
            <Text className="text-black font-semibold ml-2">Approve Request</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        title={modalAction === 'approved' ? "Approve Request?" : "Reject Request?"}
        description={modalAction === 'approved' ? "Are you sure you want to approve this personal training request?" : "Are you sure you want to reject this personal training request?"}
        onConfirm={confirmAction}
        onClose={() => setModalVisible(false)}
        confirmText={(isUpdating || isSaving) ? "Processing..." : modalAction === 'approved' ? "Approve" : "Reject"}
        confirmButtonColor={modalAction === 'rejected' ? 'bg-red-500' : 'bg-[#CCFF00]'}
        confirmTextColor={modalAction === 'rejected' ? 'text-white' : 'text-black'}
      />
    </View>
  );
}
