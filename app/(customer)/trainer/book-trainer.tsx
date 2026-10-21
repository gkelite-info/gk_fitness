import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, ShieldCheck, MagnifyingGlass, Faders, Star, Users, Tag, CaretRight, CheckCircle,
  User, Trash, Warning, Clock, Record
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useGlobalTrainers } from '@/hooks/globalTrainers/useGlobalTrainers';
import {
  useAssignedGlobalTrainersByUser,
  useDeleteIndividualCustomerTrainer,
  useIndividualCustomerTrainers,
} from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import { usePersonalTrainerRequestsByUser } from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import { useDeletePersonalTrainerRequest } from '@/hooks/personalTrainerRequests/useSavePersonalTrainerRequest';
import { useTrainerStore } from '@/constants/trainerStore';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';

function TrainerCardAvatar({ uri }: { uri?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const cleanUri =
    uri && typeof uri === 'string' && uri.trim() !== '' && uri !== 'null' && uri !== 'undefined'
      ? uri.trim()
      : null;

  useEffect(() => {
    setImgError(false);
  }, [cleanUri]);

  if (cleanUri && !imgError) {
    return (
      <Image
        source={{ uri: cleanUri }}
        className="w-full h-full bg-[#27272A]"
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View className="w-full h-full bg-[#27272A] items-center justify-center">
      <User size={44} color="#8E8E93" weight="regular" />
    </View>
  );
}

export default function BookTrainerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { userId, role } = useUser();
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useCustomerProfile(userId || undefined);

  const gymId = profile?.customerData?.gymId;
  const isIndividual = role === 'individual' || (!gymId && !!userId);
  const shouldFetchGlobal = isIndividual || !gymId;

  const { data: approvedIndividualAssignments, refetch: refetchApprovedIndividualAssignments } = useIndividualCustomerTrainers(
    {
      status: 'approved',
      isActive: true,
      includeDeleted: false,
    },
    { enabled: isIndividual }
  );

  const { data: gymTrainers, isLoading: isGymTrainersLoading, refetch: refetchGymTrainers } = useGymTrainers(
    gymId,
    !shouldFetchGlobal && !!gymId && !isProfileLoading,
    debouncedSearchQuery
  );
  const { data: globalTrainers, isLoading: isGlobalTrainersLoading, refetch: refetchGlobalTrainers } = useGlobalTrainers(
    shouldFetchGlobal && !isProfileLoading,
    debouncedSearchQuery
  );

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { cancelTrainerRequest } = useTrainerStore();

  // Pending request queries - check both tables for maximum resilience
  const { data: individualTrainers, refetch: refetchIndividualTrainers } = useAssignedGlobalTrainersByUser(
    userId || undefined
  );
  const pendingIndividual = individualTrainers?.find(
    (t: any) => t.status === 'pending' || (t.status == null && t.isActive !== false)
  );

  const { data: gymTrainerRequests, refetch: refetchGymTrainerRequests } = usePersonalTrainerRequestsByUser(
    userId || undefined
  );
  const pendingGym = gymTrainerRequests?.find(
    (r: any) => r.applicationStatus === 'submitted' || r.applicationStatus === 'pending'
  );

  useFocusEffect(
    useCallback(() => {
      console.log('[BookTrainer] Screen focused. Invalidate and refetch queries...');
      queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      refetchIndividualTrainers();
      if (isIndividual) {
        refetchApprovedIndividualAssignments();
      }
      refetchGymTrainerRequests();
    }, [queryClient, refetchIndividualTrainers, refetchApprovedIndividualAssignments, refetchGymTrainerRequests, isIndividual])
  );

  const hasPendingRequest = !!pendingIndividual || !!pendingGym;

  const isPendingIndividual = !!pendingIndividual;
  const pendingTrainer = isPendingIndividual
    ? pendingIndividual?.globalTrainer
    : pendingGym?.gymTrainer;

  const pendingTrainerName =
    pendingTrainer?.fullName ||
    (pendingTrainer as any)?.name ||
    'Requested Trainer';

  const pendingTrainerPhoto =
    pendingTrainer?.profilePic ||
    pendingTrainer?.profilePhoto ||
    pendingTrainer?.users?.profilePic ||
    pendingTrainer?.users?.profilePhoto ||
    pendingTrainer?.user?.profilePic ||
    pendingTrainer?.user?.profilePhoto ||
    (pendingTrainer as any)?.profilePicture ||
    null;

  const pendingTrainerSpecialization =
    pendingTrainer?.specialization || 'Personal Trainer';

  const pendingScheduleDays = isPendingIndividual
    ? (Array.isArray(pendingIndividual?.weekDays) ? pendingIndividual?.weekDays?.join(', ') : pendingIndividual?.weekDays)
    : (Array.isArray(pendingGym?.preferredWorkoutDays) ? pendingGym?.preferredWorkoutDays?.join(', ') : pendingGym?.preferredWorkoutDays);

  const pendingScheduleTime = isPendingIndividual
    ? pendingIndividual?.timings
    : pendingGym?.preferredWorkoutTime;

  const { mutateAsync: deleteIndividualCustomerTrainerMutation, isPending: isDeletingIndividual } = useDeleteIndividualCustomerTrainer();
  const { mutateAsync: deleteGymTrainerRequestMutation, isPending: isDeletingGym } = useDeletePersonalTrainerRequest();

  const handleConfirmCancel = async () => {
    console.log('[BookTrainer] handleConfirmCancel called.', {
      isIndividual,
      pendingIndividualId: pendingIndividual?.individualCustomerTrainerId,
      pendingGymId: pendingGym?.personalTrainerRequestId,
    });

    try {
      const targetIndividualId =
        pendingIndividual?.individualCustomerTrainerId ||
        (pendingIndividual as any)?.id ||
        individualTrainers?.find((t: any) => t.is_deleted === false && (t.status === 'pending' || t.status == null))?.individualCustomerTrainerId;

      if (targetIndividualId) {
        console.log('[BookTrainer] Calling deleteIndividualCustomerTrainer for ID:', targetIndividualId);
        await deleteIndividualCustomerTrainerMutation(targetIndividualId);
        console.log('[BookTrainer] deleteIndividualCustomerTrainer SUCCESS (is_deleted=true, isActive=false, deletedAt=now)');
      } else if (isIndividual && userId) {
        console.log('[BookTrainer] Fallback: Soft deleting pending individual trainer request by userId:', userId);
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('individual_customer_trainers')
          .update({
            isActive: false,
            is_deleted: true,
            deletedAt: now,
            updatedAt: now,
          })
          .eq('userId', userId)
          .eq('is_deleted', false);

        if (error) {
          console.error('[BookTrainer] Fallback soft delete error:', error);
        } else {
          console.log('[BookTrainer] Fallback soft delete SUCCESS (is_deleted=true, isActive=false, deletedAt=now)');
        }
      } else if (pendingGym?.personalTrainerRequestId) {
        console.log('[BookTrainer] Calling deletePersonalTrainerRequest for ID:', pendingGym.personalTrainerRequestId);
        await deleteGymTrainerRequestMutation({
          id: pendingGym.personalTrainerRequestId,
          userId: userId || undefined,
          trainerId: pendingGym.gymTrainerId,
        });
        console.log('[BookTrainer] deletePersonalTrainerRequest SUCCESS');
      }
    } catch (err: any) {
      console.error('[BookTrainer] Error deleting trainer request:', err);
    } finally {
      setShowCancelModal(false);
    }

    cancelTrainerRequest();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests'] }),
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['assignedTrainers'] }),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    console.log('[BookTrainer] onRefresh started: Fetching latest table data from database...');
    try {
      await Promise.all([
        refetchProfile(),
        refetchIndividualTrainers(),
        refetchApprovedIndividualAssignments(),
        refetchGymTrainerRequests(),
        shouldFetchGlobal ? refetchGlobalTrainers() : refetchGymTrainers(),
        queryClient.refetchQueries({ queryKey: ['assignedGlobalTrainers'], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['personalTrainerRequests'], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['individualCustomerTrainers'], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['globalTrainers'], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['trainers'], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['customerProfile'], type: 'all' }),
      ]);
      console.log('[BookTrainer] onRefresh completed: All table queries updated with fresh data.');
    } catch (err) {
      console.error('[BookTrainer] onRefresh error while fetching data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const trainers = shouldFetchGlobal ? (globalTrainers || []) : (gymTrainers || []);
  const isLoading = isProfileLoading || (shouldFetchGlobal ? isGlobalTrainersLoading : isGymTrainersLoading);

  const filteredTrainers = trainers;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(customer)/profile');
    }
  };

  const requestedTrainerId = pendingIndividual?.globalTrainerId || pendingGym?.gymTrainerId;

  return (
    <View className="flex-1 bg-[#0F0F0F] pt-2">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={handleBack} className="p-2">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-semibold mr-8">Book Personal Trainer</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {hasPendingRequest && (
          <View className="bg-[#18181A] rounded-3xl p-5 border border-[#3E3218] mb-6 shadow-2xl">
            <View className="flex-row items-center justify-between mb-3.5">
              <View className="flex-row items-center">
                <Record size={16} color="#FF9F0A" weight="fill" style={{ marginRight: 6 }} />
                <Text className="text-[#FF9F0A] text-xs font-semibold uppercase tracking-wider">
                  Request Pending
                </Text>
              </View>
              <View className="border border-[#FF9F0A] rounded-full px-2.5 py-0.5">
                <Text className="text-[#FF9F0A] text-[10px] font-semibold">Under Review</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-4">
              <View className="w-14 h-14 rounded-2xl overflow-hidden border border-[#27272A] mr-3.5 bg-[#27272A]">
                <StaticAvatar
                  uri={pendingTrainerPhoto}
                  name={pendingTrainerName}
                  size={56}
                  className="w-full h-full"
                />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold" numberOfLines={1}>{pendingTrainerName}</Text>
                <Text className="text-[#CCFF00] text-xs font-semibold capitalize mt-0.5">{pendingTrainerSpecialization}</Text>
                {(pendingScheduleDays || pendingScheduleTime) && (
                  <View className="flex-row items-center mt-1">
                    <Clock size={12} color="#8E8E93" style={{ marginRight: 4 }} />
                    <Text className="text-[#8E8E93] text-[11px]" numberOfLines={1}>
                      {[pendingScheduleDays, pendingScheduleTime].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text className="text-[#A1A1AA] text-xs leading-5 mb-4">
              Your request has been sent to {pendingTrainerName}. They will review your schedule and respond soon.
            </Text>

            <View className="flex-row gap-3 pt-3 border-t border-[#27272A]">
              <Pressable
                onPress={() => router.push('/(customer)/trainer/trainer-request')}
                className="flex-1 bg-[#27272A] py-3 rounded-xl items-center justify-center active:opacity-75"
              >
                <Text className="text-white text-xs font-semibold">View Details</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowCancelModal(true)}
                className="flex-1 bg-[#220B0B] border border-[#551818] py-3 rounded-xl items-center justify-center flex-row active:opacity-75"
              >
                <Trash size={14} color="#FF3B30" weight="bold" style={{ marginRight: 6 }} />
                <Text className="text-[#FF3B30] text-xs font-semibold">Cancel Request</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text className="text-[#A1A1AA] text-sm text-center mt-2 mb-6 px-4 leading-relaxed">
          Choose a trainer that matches your goals and start your transformation journey.
        </Text>

        <View className="bg-[#1A1A1A] rounded-2xl p-4 flex-row items-center mb-6">
          <View className="w-12 h-12 bg-[#2D3319] rounded-xl items-center justify-center mr-4">
            <ShieldCheck size={28} color="#D4FF00" weight="fill" />
          </View>
          <View className="flex-1">
            <Text className="text-[#D4FF00] font-semibold text-base mb-1">All our trainers are certified</Text>
            <Text className="text-[#8E8E93] text-xs leading-tight">
              Verified professionals. Personalized{'\n'}guidance. Faster results.
            </Text>
          </View>
        </View>

        <View className="flex-row mb-6 gap-3">
          <View className="flex-1 bg-[#1A1A1A] rounded-xl flex-row items-center px-4 h-12">
            <MagnifyingGlass size={20} color="#8E8E93" weight="regular" />
            <TextInput
              placeholder="Search trainers, expertise, goals..."
              placeholderTextColor="#8E8E93"
              className="flex-1 text-white ml-3 h-full font-sans"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable className="bg-[#1A1A1A] w-12 h-12 rounded-xl items-center justify-center">
            <Faders size={20} color="#FFFFFF" weight="regular" />
          </Pressable>
        </View>

        <View className="gap-4">
          {isLoading ? (
            <View className="py-10 items-center justify-center">
              <ActivityIndicator color="#D4FF00" size="large" />
            </View>
          ) : filteredTrainers.length > 0 ? (
            filteredTrainers.map((trainer: any) => {
              const currentTrainerId = trainer.globalTrainerId || trainer.gymTrainerId || trainer.id;
              const isThisTrainerRequested = !!requestedTrainerId && (currentTrainerId === requestedTrainerId);

              const trainerApprovedClientsCount = approvedIndividualAssignments
                ? approvedIndividualAssignments.filter(
                  (a: any) =>
                    a.globalTrainerId === currentTrainerId ||
                    (trainer.globalTrainerId && a.globalTrainerId === trainer.globalTrainerId) ||
                    (trainer.id && a.globalTrainerId === trainer.id)
                ).length
                : 0;
              const displayClientsCount = isIndividual ? trainerApprovedClientsCount : (trainer.clients || 0);

              return (
                <Pressable
                  key={trainer.gymTrainerId || trainer.globalTrainerId}
                  onPress={() => (router as any).push({
                    pathname: `/(customer)/trainer/${trainer.gymTrainerId || trainer.globalTrainerId}`,
                    params: { trainerData: JSON.stringify(trainer) }
                  })}
                  className="bg-[#1A1A1A] rounded-2xl p-3 flex-row border border-[#27272A]"
                >
                  <View className="w-[120px] h-[150px] relative rounded-xl overflow-hidden mr-3">
                    <TrainerCardAvatar
                      uri={
                        trainer.profilePic ||
                        trainer.profilePhoto ||
                        trainer.users?.profilePic ||
                        trainer.users?.profilePhoto ||
                        trainer.user?.profilePic ||
                        trainer.user?.profilePhoto ||
                        trainer.profilePicture
                      }
                    />

                    <View className="absolute inset-0 bg-black/20" />

                    {isThisTrainerRequested ? (
                      <View className="absolute top-2 left-2 bg-[#FF9F0A] rounded px-1.5 py-0.5">
                        <Text className="text-black text-[8px] font-semibold">REQUESTED</Text>
                      </View>
                    ) : trainer.isTopRated ? (
                      <View className="absolute top-2 left-2 bg-black/80 border border-[#D4FF00] rounded px-1.5 py-0.5 flex-row items-center">
                        <Star size={8} color="#D4FF00" weight="fill" />
                        <Text className="text-[#D4FF00] text-[8px] font-semibold ml-1">TOP RATED</Text>
                      </View>
                    ) : null}

                    <View className="absolute bottom-2 left-2 bg-black/80 rounded px-1.5 py-0.5">
                      <Text className="text-white text-[9px] font-semibold">{(trainer.experienceYears ?? trainer.experience) || 0} Years</Text>
                    </View>
                  </View>

                  <View className="flex-1 justify-between py-1">
                    <View>
                      <View className="flex-row items-center mb-1">
                        <Text className="text-white text-base font-semibold mr-1">{trainer.fullName}</Text>
                        {trainer.isVerified && (
                          <CheckCircle size={16} color="#D4FF00" weight="fill" />
                        )}
                      </View>

                      <Text className="text-[#D4FF00] text-xs font-semibold mb-3 capitalize">{trainer.specialization}</Text>

                      <View className="flex-row items-center mb-1.5">
                        <Star size={12} color="#D4FF00" weight="fill" />
                        <Text className="text-white text-xs font-semibold ml-1">{trainer.rating || '0'}</Text>
                        <Text className="text-[#8E8E93] text-[10px] ml-1">({trainer.reviews || 0} Reviews)</Text>
                        <Text className="text-[#8E8E93] text-xs mx-2">•</Text>
                        <Users size={12} color="#8E8E93" weight="regular" />
                        <Text className="text-[#8E8E93] text-[10px] ml-1">{displayClientsCount || 0} Clients</Text>
                      </View>
                    </View>

                    <View className="flex-row items-end justify-between mt-2">
                      {isThisTrainerRequested ? (
                        <Pressable
                          className="flex-row items-center bg-[#3E3218] border border-[#FF9F0A] rounded-full px-3 py-1.5"
                          onPress={() => router.push('/(customer)/trainer/trainer-request')}
                        >
                          <Text className="text-[#FF9F0A] text-[10px] font-semibold mr-1">Pending Review</Text>
                          <CaretRight size={10} color="#FF9F0A" weight="bold" />
                        </Pressable>
                      ) : (
                        <Pressable
                          className="flex-row items-center border border-[#445000] rounded-full px-3 py-1.5"
                          onPress={() => (router as any).push({
                            pathname: `/(customer)/trainer/${trainer.gymTrainerId || trainer.globalTrainerId}`,
                            params: { trainerData: JSON.stringify(trainer) }
                          })}
                        >
                          <Text className="text-[#D4FF00] text-[10px] font-semibold mr-1">View Profile</Text>
                          <CaretRight size={10} color="#D4FF00" weight="bold" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text className="text-[#A1A1AA] text-center mt-10">No trainers found.</Text>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        title="Withdraw Booking Request?"
        description={`Are you sure you want to cancel your pending personal training request with ${pendingTrainerName}?`}
        confirmText="Yes, Cancel Request"
        cancelText="Keep Request & Wait"
        confirmButtonColor="bg-red-600"
        confirmTextColor="text-white"
        isLoading={isDeletingIndividual || isDeletingGym}
        icon={
          <View className="w-16 h-16 rounded-full bg-[#2A0F0F] items-center justify-center border border-[#551818]">
            <Warning size={32} color="#FF3B30" weight="fill" />
          </View>
        }
      />
    </View>
  );
}
