import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, EnvelopeSimple, Calendar, Crown, User, GenderIntersex, MapPin, Barbell, ArrowRight, Star, Users } from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useAssignedTrainersByCustomer, useDeleteCustomerTrainer, useToggleCustomerTrainerStatus } from '@/hooks/customerTrainers/useCustomerTrainers';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';

export default function AssignTrainerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();

  const { data: customer, isLoading: isCustomerLoading, refetch: refetchCustomer } = useGymCustomerById(customerId);
  const { data: membershipPlans, isLoading: isMembershipLoading, refetch: refetchPlans } = useGymCustomerMembershipPlans(undefined, customerId);
  const { data: assignedTrainers, isLoading: isAssignedLoading, refetch: refetchAssigned } = useAssignedTrainersByCustomer(customerId);

  const { mutate: deleteTrainer, isPending: isDeleting } = useDeleteCustomerTrainer();
  const { mutate: toggleTrainerStatus, isPending: isToggling } = useToggleCustomerTrainerStatus();

  const activePlan = membershipPlans?.find(plan => plan.is_Active);
  const activeAssignment = assignedTrainers?.[0];
  const assignedTrainer = activeAssignment?.trainer;

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<'delete' | 'deactivate' | 'activate'>('delete');

  const handleDeactivate = () => {
    setModalAction('deactivate');
    setModalVisible(true);
  };

  const handleActivate = () => {
    setModalAction('activate');
    setModalVisible(true);
  };

  const handleDelete = () => {
    setModalAction('delete');
    setModalVisible(true);
  };

  const confirmAction = () => {
    if (!activeAssignment?.customerTrainerId) return;

    if (modalAction === 'delete') {
      deleteTrainer(activeAssignment.customerTrainerId, {
        onSuccess: () => setModalVisible(false),
      });
    } else if (modalAction === 'deactivate') {
      toggleTrainerStatus({ customerTrainerId: activeAssignment.customerTrainerId, currentStatus: true }, {
        onSuccess: () => setModalVisible(false),
      });
    } else if (modalAction === 'activate') {
      toggleTrainerStatus({ customerTrainerId: activeAssignment.customerTrainerId, currentStatus: false }, {
        onSuccess: () => setModalVisible(false),
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchCustomer(),
      refetchPlans(),
      refetchAssigned()
    ]);
    setRefreshing(false);
  }, [refetchCustomer, refetchPlans, refetchAssigned]);

  const formatDate = (dateString?: string | null | Date) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isCustomerLoading || isMembershipLoading || isAssignedLoading) {
    return (
      <View className="flex-1 bg-[#0F0F0F] justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View className="flex-1 bg-[#0F0F0F] justify-center items-center">
        <Text className="text-white">Customer not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-[#1F1F1F] rounded-lg">
          <Text className="text-[#CCFF00]">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 pb-4 border-b border-[#1F1F1F]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#1F1F1F] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Customer Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row items-start mb-8">
          <View className="w-20 h-20 rounded-full bg-[#2D3117] overflow-hidden mr-4 items-center justify-center">
            {customer.profilePicture || customer.profilePhoto ? (
              <Image source={{ uri: customer.profilePicture || customer.profilePhoto }} className="w-full h-full" />
            ) : (
              <User size={32} color="#CCFF00" weight="fill" />
            )}
          </View>

          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white text-xl font-semibold mb-1">{customer.fullName}</Text>
                <View className="bg-[#1F1F1F] self-start px-2 py-0.5 rounded-full mb-3 border border-[#333333]">
                  <Text className="text-[#CCFF00] text-[10px] font-semibold uppercase tracking-wider">
                    {customer.customId || `CUST-${(customer.customerId || '').slice(0, 4).toUpperCase()}`}
                  </Text>
                </View>
              </View>
              {/* <Pressable className="flex-row items-center bg-[#1F1F1F] px-3 py-1.5 rounded-full border border-[#333333] active:opacity-70">
                <View className="mr-1"><PencilSimple size={12} color="#FFFFFF" /></View>
                <Text className="text-white text-xs font-semibold">Edit</Text>
              </Pressable> */}
            </View>

            <View className="gap-y-1.5">
              <View className="flex-row items-center">
                <View className="w-4 mr-2 items-center"><Phone size={14} color="#CCFF00" weight="fill" /></View>
                <Text className="text-[#A1A1AA] text-xs">{customer.phone}</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-4 mr-2 items-center"><EnvelopeSimple size={14} color="#CCFF00" weight="fill" /></View>
                <Text className="text-[#A1A1AA] text-xs">{customer.email}</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-4 mr-2 items-center"><Calendar size={14} color="#CCFF00" weight="fill" /></View>
                <Text className="text-[#A1A1AA] text-xs">Joined on {formatDate(customer.createdAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text className="text-white text-lg font-semibold mb-3">Membership Details</Text>
        <View className="bg-[#151515] rounded-2xl p-4 border border-[#222222] mb-6">
          {activePlan ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#1F1F00] items-center justify-center mr-3">
                  <Crown size={20} color="#CCFF00" weight="fill" />
                </View>
                <View>
                  <Text className="text-white font-semibold text-[15px] mb-0.5">{activePlan.plan?.planName || 'Custom Plan'}</Text>
                  <Text className="text-[#A1A1AA] text-xs">Valid till {formatDate(activePlan.endDate)}</Text>
                </View>
              </View>
              <View className="bg-[#1A2E05] px-3 py-1 rounded-full border border-[#2B4D08]">
                <Text className="text-[#CCFF00] text-xs font-semibold">Active</Text>
              </View>
            </View>
          ) : (
            <Text className="text-[#A1A1AA] text-sm text-center py-2">No active membership plan</Text>
          )}
        </View>

        <Text className="text-white text-lg font-semibold mb-3">Personal Details</Text>
        <View className="bg-[#151515] rounded-2xl border border-[#222222] mb-6 overflow-hidden">
          <View className="flex-row items-center justify-between p-4 border-b border-[#222222]">
            <View className="flex-row items-center">
              <View className="mr-3"><User size={16} color="#CCFF00" /></View>
              <Text className="text-[#A1A1AA] text-sm">Date of Birth</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{formatDate(customer.dateOfBirth)}</Text>
          </View>

          <View className="flex-row items-center justify-between p-4 border-b border-[#222222]">
            <View className="flex-row items-center">
              <View className="mr-3"><GenderIntersex size={16} color="#CCFF00" /></View>
              <Text className="text-[#A1A1AA] text-sm">Gender</Text>
            </View>
            <Text className="text-white text-sm font-semibold capitalize">{customer.gender || 'N/A'}</Text>
          </View>

          <View className="flex-row items-center justify-between p-4 border-b border-[#222222]">
            <View className="flex-row items-center">
              <View className="mr-3"><Phone size={16} color="#CCFF00" /></View>
              <Text className="text-[#A1A1AA] text-sm">Phone Number</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{customer.phone}</Text>
          </View>

          <View className="flex-row items-center justify-between p-4 border-b border-[#222222]">
            <View className="flex-row items-center">
              <View className="mr-3"><EnvelopeSimple size={16} color="#CCFF00" /></View>
              <Text className="text-[#A1A1AA] text-sm">Email</Text>
            </View>
            <Text className="text-white text-sm font-semibold">{customer.email}</Text>
          </View>

          <View className="flex-row items-start justify-between p-4">
            <View className="flex-row items-start mt-0.5">
              <View className="mr-3 mt-0.5"><MapPin size={16} color="#CCFF00" /></View>
              <Text className="text-[#A1A1AA] text-sm">Address</Text>
            </View>
            <View className="flex-1 items-end ml-4">
              <Text className="text-white text-sm font-semibold text-right leading-5">
                {customer.user?.address || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <Text className="text-white text-lg font-semibold mb-3">Personal Training</Text>
        {assignedTrainer ? (
          <>
            <View className="bg-[#151515] rounded-2xl border border-[#222222] p-4 flex-row items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-[#1F1F1F] overflow-hidden mr-4 border border-[#333333]">
                {assignedTrainer.users?.profilePhoto ? (
                  <Image source={{ uri: assignedTrainer.users.profilePhoto }} className="w-full h-full" />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-[#A1A1AA] text-lg font-semibold">{assignedTrainer.fullName?.charAt(0)}</Text>
                  </View>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-white text-lg font-semibold mb-0.5">{assignedTrainer.fullName}</Text>
                <Text className="text-[#CCFF00] text-sm font-semibold mb-2">{assignedTrainer.specialization}</Text>

                <View className="flex-row items-center mb-2">
                  <View className="flex-row items-center mr-2">
                    <View className="mr-1 mt-0.5">
                      <Star size={12} color="#FBBF24" weight="fill" />
                    </View>
                    <Text className="text-white text-xs font-semibold">4.8</Text>
                  </View>
                  <Text className="text-[#555555] text-xs mr-2">|</Text>
                  <Text className="text-[#A1A1AA] text-xs">{assignedTrainer.experienceYears} yrs experience</Text>
                </View>

                <View className={`border self-start px-2 py-1 rounded-md flex-row items-center ${activeAssignment?.isActive ? 'bg-[#1A1A1A] border-[#2A2A2A]' : 'bg-red-900/20 border-red-900/50'}`}>
                  <View className="mr-1.5"><Users size={12} color={activeAssignment?.isActive ? "#A1A1AA" : "#EF4444"} /></View>
                  <Text className={`${activeAssignment?.isActive ? 'text-[#A1A1AA]' : 'text-red-500'} text-[10px] font-semibold`}>
                    {activeAssignment?.isActive ? 'Assigned Trainer' : 'Inactive Trainer'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center justify-between mb-6 gap-x-3">
              {activeAssignment?.isActive ? (
                <Pressable
                  onPress={handleDeactivate}
                  disabled={isToggling || isDeleting}
                  className="flex-1 border border-red-500/50 rounded-xl py-3 flex-row items-center justify-center active:bg-red-500/10"
                >
                  <Text className="text-red-500 font-semibold text-sm">Deactivate</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleActivate}
                  disabled={isToggling || isDeleting}
                  className="flex-1 border border-[#CCFF00]/50 rounded-xl py-3 flex-row items-center justify-center active:bg-[#CCFF00]/10"
                >
                  <Text className="text-[#CCFF00] font-semibold text-sm">Reactivate</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleDelete}
                disabled={isToggling || isDeleting}
                className="flex-1 bg-red-500/20 border border-red-500 rounded-xl py-3 flex-row items-center justify-center active:bg-red-500/30"
              >
                <Text className="text-red-500 font-semibold text-sm">Delete Trainer</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View className="bg-[#151515] rounded-2xl border border-[#222222] p-6 items-center mb-6">
            <View className="w-12 h-12 rounded-full bg-[#1A2E05] items-center justify-center mb-4">
              <Barbell size={24} color="#CCFF00" weight="fill" />
            </View>
            <Text className="text-white text-base font-semibold mb-2">No trainer assigned</Text>
            <Text className="text-[#A1A1AA] text-sm text-center mb-6 leading-5 px-4">
              Assign a personal trainer to help achieve fitness goals.
            </Text>

            <Pressable
              onPress={() => router.push(`/(owner)/profile/select-trainer?customerId=${customerId}` as any)}
              className="w-full bg-[#CCFF00] rounded-xl py-3.5 flex-row justify-center items-center active:opacity-80"
            >
              <Text className="text-black font-semibold text-base mr-2">Assign Trainer</Text>
              <ArrowRight size={16} color="#000000" weight="bold" />
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        title={
          modalAction === 'delete' ? "Delete Assignment?" :
            modalAction === 'deactivate' ? "Deactivate Trainer?" : "Reactivate Trainer?"
        }
        description={
          modalAction === 'delete' ? `Are you sure you want to permanently delete this trainer assignment?` :
            modalAction === 'deactivate' ? `Are you sure you want to deactivate ${assignedTrainer?.fullName || 'this trainer'} for this customer?` :
              `Are you sure you want to reactivate ${assignedTrainer?.fullName || 'this trainer'} for this customer?`
        }
        onConfirm={confirmAction}
        onClose={() => setModalVisible(false)}
        confirmText={
          modalAction === 'delete' ? (isDeleting ? "Deleting..." : "Delete") :
            modalAction === 'deactivate' ? (isToggling ? "Deactivating..." : "Deactivate") :
              (isToggling ? "Reactivating..." : "Reactivate")
        }
        confirmButtonColor={modalAction === 'activate' ? "bg-[#CCFF00]" : "bg-red-500"}
        confirmTextColor={modalAction === 'activate' ? "text-black" : "text-white"}
      />
    </View>
  );
}
