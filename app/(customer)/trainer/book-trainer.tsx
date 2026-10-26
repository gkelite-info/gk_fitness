import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, ShieldCheck, MagnifyingGlass, Faders, Star, Users, Tag, CaretRight, CheckCircle,
  Record, Clock, Trash, User, ArrowRight
} from 'phosphor-react-native';
import { getCalendarDaysDifference } from '@/lib/dateUtils';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useGlobalTrainers } from '@/hooks/globalTrainers/useGlobalTrainers';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useQueryClient } from '@tanstack/react-query';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { triggerMediumHaptic } from '@/lib/haptics';
import { useTrainerStore } from '@/constants/trainerStore';
import {
  useAssignedGlobalTrainersByUser,
  useDeleteIndividualCustomerTrainer,
} from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import {
  usePersonalTrainerRequestsByUser,
} from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import {
  useDeletePersonalTrainerRequest,
} from '@/hooks/personalTrainerRequests/useSavePersonalTrainerRequest';

export default function BookTrainerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isNavigatingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { userId, role } = useUser();
  const isIndividual = role === 'individual';
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useCustomerProfile(userId || undefined);

  const gymId = isIndividual ? null : profile?.customerData?.gymId;
  const shouldFetchGlobal = isIndividual || !gymId;

  const { data: gymTrainers, isLoading: isGymTrainersLoading } = useGymTrainers(
    gymId,
    !shouldFetchGlobal && !!gymId && !isProfileLoading,
    debouncedSearchQuery
  );
  const { data: globalTrainers, isLoading: isGlobalTrainersLoading } = useGlobalTrainers(
    shouldFetchGlobal && !isProfileLoading,
    debouncedSearchQuery
  );

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { cancelTrainerRequest } = useTrainerStore();

  const { data: individualTrainers, refetch: refetchIndividualTrainers } = useAssignedGlobalTrainersByUser(
    userId || undefined
  );
  const pendingIndividual = individualTrainers?.find(
    (t: any) => t.status === 'pending' || (t.status == null && t.isActive !== false)
  );

  const customerId = profile?.customerData?.customerId || userId;
  const { data: gymAssignedTrainers, refetch: refetchGymAssignedTrainers } = useAssignedTrainersByCustomer(
    customerId,
    userId || undefined
  );

  const { data: gymTrainerRequests, refetch: refetchGymTrainerRequests } = usePersonalTrainerRequestsByUser(
    userId || undefined
  );
  const pendingGym = gymTrainerRequests?.find(
    (r: any) => r.applicationStatus === 'submitted' || r.applicationStatus === 'pending'
  );

  const activeIndividual = individualTrainers?.find((t: any) => {
    if (t.is_deleted) return false;
    if (t.isActive === false) return false;
    if (t.status === 'rejected' || t.status === 'cancelled') return false;
    return t.status === 'approved' || (t.status !== 'pending' && !!t.assignedOn);
  });

  const activeGym = gymAssignedTrainers?.find((t: any) => {
    if (t.is_deleted) return false;
    if (t.isActive === false) return false;
    return true;
  });

  const activeAssignment = isIndividual ? activeIndividual : (activeIndividual || activeGym);
  const activeTrainerId = isIndividual
    ? activeIndividual?.globalTrainerId
    : (activeGym?.gymTrainerId || activeIndividual?.globalTrainerId);

  let trainerDaysLeft: number | null = null;
  let trainerProgressPercentage = 0;
  let isTrainerExpired = false;

  if (activeAssignment?.expiryOn) {
    const diffDays = getCalendarDaysDifference(activeAssignment.expiryOn);
    const currentDaysLeft = diffDays > 0 ? diffDays : 0;
    trainerDaysLeft = currentDaysLeft;

    if (diffDays <= 0) {
      isTrainerExpired = true;
      trainerDaysLeft = 0;
      trainerProgressPercentage = 0;
    } else {
      let percentage = 0;
      const startDate = activeAssignment.assignedOn || activeAssignment.createdAt;
      if (startDate) {
        const totalDays = getCalendarDaysDifference(activeAssignment.expiryOn, startDate);
        if (totalDays > 0) {
          percentage = (currentDaysLeft / totalDays) * 100;
          percentage = Math.min(Math.max(percentage, 0), 100);
        }
      } else {
        percentage = Math.min(Math.max((currentDaysLeft / 30) * 100, 0), 100);
      }
      trainerProgressPercentage = percentage;
    }
  } else if (activeAssignment?.renewalOn) {
    const diffDays = getCalendarDaysDifference(activeAssignment.renewalOn);
    const currentDaysLeft = diffDays > 0 ? diffDays : 0;
    trainerDaysLeft = currentDaysLeft;
    if (diffDays <= 0) {
      isTrainerExpired = true;
      trainerDaysLeft = 0;
      trainerProgressPercentage = 0;
    } else {
      const percentage = Math.min(Math.max((currentDaysLeft / 30) * 100, 0), 100);
      trainerProgressPercentage = percentage;
    }
  } else if (activeAssignment) {
    trainerDaysLeft = 30;
    trainerProgressPercentage = 100;
  }

  const lastNavigatedAtRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false;
      lastNavigatedAtRef.current = 0;
      queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['assignedTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      if (typeof refetchIndividualTrainers === 'function') {
        refetchIndividualTrainers();
      }
      if (typeof refetchGymTrainerRequests === 'function') {
        refetchGymTrainerRequests();
      }
      if (typeof refetchGymAssignedTrainers === 'function') {
        refetchGymAssignedTrainers();
      }
    }, [queryClient, refetchIndividualTrainers, refetchGymTrainerRequests, refetchGymAssignedTrainers])
  );

  const handleOpenTrainerProfile = useCallback((trainer: any) => {
    const now = Date.now();
    if (isNavigatingRef.current || (now - lastNavigatedAtRef.current < 1200)) {
      return;
    }
    isNavigatingRef.current = true;
    lastNavigatedAtRef.current = now;

    const targetId = trainer.gymTrainerId || trainer.globalTrainerId || trainer.id;
    (router as any).navigate({
      pathname: `/(customer)/trainer/${targetId}`,
      params: { trainerData: JSON.stringify(trainer), from: 'book-trainer' }
    });

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1200);
  }, [router]);

  const handleOpenTrainerRequest = useCallback(() => {
    const now = Date.now();
    if (isNavigatingRef.current || (now - lastNavigatedAtRef.current < 1200)) {
      return;
    }
    isNavigatingRef.current = true;
    lastNavigatedAtRef.current = now;
    (router as any).navigate('/(customer)/trainer/trainer-request');
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1200);
  }, [router]);

  const handleOpenWebCheckoutForPending = async (
    targetTrainerId?: string,
    targetTrainerName?: string,
    targetAmount?: number
  ) => {
    triggerMediumHaptic();
    try {
      let session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session) session = refreshData.session;
      }

      if (!session?.access_token) {
        toast.error('Your session has expired. Please log in again.');
        return;
      }

      const webHost = 'https://www.gkgymlife.com';
      const baseUrl = `${webHost}/api/auth/sso`;
      const params = new URLSearchParams();

      params.append('returnTo', '/customer');
      params.append('action', 'book-trainer');
      if (targetTrainerId) params.append('trainerId', String(targetTrainerId));
      if (targetTrainerName) params.append('trainerName', targetTrainerName);
      if (targetAmount != null) params.append('amount', String(targetAmount));

      if (userId) params.append('userId', userId);
      if (role) params.append('role', role);
      if (profile?.customerData?.customerId) {
        params.append('customerId', profile.customerData.customerId);
      }
      const gymIdVal = profile?.customerData?.gymId || gymId;
      if (gymIdVal) params.append('gymId', gymIdVal);

      const emailVal = session.user?.email || profile?.customerData?.email;
      const phoneVal = session.user?.phone || profile?.customerData?.phone;
      if (emailVal) params.append('email', emailVal);
      if (phoneVal) params.append('phone', phoneVal);

      params.append('access_token', session.access_token);
      if (session.refresh_token) {
        params.append('refresh_token', session.refresh_token);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const targetUrl = `${baseUrl}${queryString}`;

      await WebBrowser.openBrowserAsync(targetUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#0A0A0A',
        controlsColor: '#CCFF00',
      });

      try {
        await Promise.all([
          typeof refetchProfile === 'function' ? refetchProfile() : Promise.resolve(),
          typeof refetchIndividualTrainers === 'function' ? refetchIndividualTrainers() : Promise.resolve(),
          queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] }),
          queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainers'] }),
          queryClient.invalidateQueries({ queryKey: ['individualCustomerPayments'] }),
          queryClient.invalidateQueries({ queryKey: ['customerProfile'] }),
        ]);
      } catch (postErr) {
        console.warn('[BookTrainer] Post-checkout refetch warning:', postErr);
      }
    } catch (err) {
      console.warn('[BookTrainer] Error opening web checkout:', err);
      try {
        await Linking.openURL('https://www.gkgymlife.com/customer');
      } catch {
        toast.error('Unable to open browser. Please visit https://www.gkgymlife.com/customer');
      }
    }
  };

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
  const isDeletingRequest = isDeletingIndividual || isDeletingGym;

  const handleConfirmCancel = async () => {

    try {
      const targetIndividualId =
        pendingIndividual?.individualCustomerTrainerId ||
        (pendingIndividual as any)?.id ||
        individualTrainers?.find((t: any) => t.is_deleted === false && (t.status === 'pending' || t.status == null))?.individualCustomerTrainerId;

      if (targetIndividualId) {
        await deleteIndividualCustomerTrainerMutation(targetIndividualId);
      } else if (isIndividual && userId) {
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
        }
      } else if (pendingGym?.personalTrainerRequestId) {
        await deleteGymTrainerRequestMutation({
          id: pendingGym.personalTrainerRequestId,
          userId: userId || undefined,
          trainerId: pendingGym.gymTrainerId,
        });
      }
    } catch (err: any) {
      console.error('[BookTrainer] Error deleting trainer request:', err);
      toast.error(err?.message || 'Failed to cancel trainer request');
    } finally {
      setShowCancelModal(false);
    }

    cancelTrainerRequest();
    toast.success('Trainer request cancelled');
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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customerProfile', userId] }),
      queryClient.invalidateQueries({ queryKey: ['trainers'] }),
      queryClient.invalidateQueries({ queryKey: ['globalTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['assignedTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests'] }),
    ]);
    if (typeof refetchGymAssignedTrainers === 'function') {
      refetchGymAssignedTrainers();
    }
    setRefreshing(false);
  };

  const trainers = shouldFetchGlobal ? (globalTrainers || []) : (gymTrainers || []);
  const isLoading = isProfileLoading || (shouldFetchGlobal ? isGlobalTrainersLoading : isGymTrainersLoading);

  const filteredTrainers = trainers;

  const sortedTrainers = [...filteredTrainers].sort((a: any, b: any) => {
    const aId = a.gymTrainerId || a.globalTrainerId || a.id;
    const bId = b.gymTrainerId || b.globalTrainerId || b.id;
    const aIsActive = !!activeTrainerId && aId === activeTrainerId;
    const bIsActive = !!activeTrainerId && bId === activeTrainerId;
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    return 0;
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(customer)/profile');
    }
  };

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
                  gender={pendingTrainer?.gender}
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
                {pendingTrainer?.price != null && Platform.OS !== 'ios' && (
                  <View className="flex-row items-center mt-1">
                    <View className="bg-[#1C2307] border border-[#3E4C14] px-2 py-0.5 rounded-md flex-row items-center">
                      <Tag size={10} color="#CCFF00" weight="bold" style={{ marginRight: 4 }} />
                      <Text className="text-[#CCFF00] text-[11px] font-semibold">
                        ₹{pendingTrainer.price}
                      </Text>
                      <Text className="text-[#8E8E93] text-[10px] ml-0.5">Trainer Fee</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <Text className="text-[#A1A1AA] text-xs leading-5 mb-4">
              Your request has been sent to {pendingTrainerName}. They will review your schedule and respond soon.
            </Text>

            {/* Direct action button to manage/activate on web */}
            {isIndividual && (
              <View className="mb-3">
                <Pressable
                  onPress={() => handleOpenWebCheckoutForPending(
                    pendingIndividual?.globalTrainerId || pendingGym?.gymTrainerId || (pendingTrainer as any)?.globalTrainerId || (pendingTrainer as any)?.id,
                    pendingTrainerName,
                    pendingTrainer?.price
                  )}
                  className="bg-[#CCFF00] py-3.5 px-4 rounded-xl flex-row items-center justify-center active:opacity-80"
                >
                  <Text className="text-black text-xs font-semibold tracking-wide mr-1 uppercase">
                    {Platform.OS === 'ios' ? 'MANAGE TRAINING PLAN' : 'ACTIVATE TRAINING PLAN'}
                  </Text>
                  <CaretRight size={14} color="#000000" weight="bold" />
                </Pressable>

                {Platform.OS === 'ios' && (
                  <Text className="text-[#8E8E93] text-[10px] text-center mt-1.5 leading-4">
                    Manage your trainer plan and coach assignment securely on our web portal.
                  </Text>
                )}
              </View>
            )}

            <View className="flex-row gap-3 pt-3 border-t border-[#27272A]">
              <Pressable
                onPress={handleOpenTrainerRequest}
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
          ) : sortedTrainers.length > 0 ? (
            sortedTrainers.map((trainer: any) => {
              const trainerId = trainer.gymTrainerId || trainer.globalTrainerId || trainer.id;
              const isThisTrainerActive = !!activeTrainerId && trainerId === activeTrainerId;
              const isThisTrainerRequested = !isThisTrainerActive && (
                (pendingIndividual && (pendingIndividual.globalTrainerId === trainerId || (pendingTrainer as any)?.globalTrainerId === trainerId)) ||
                (pendingGym && (pendingGym.gymTrainerId === trainerId || (pendingTrainer as any)?.gymTrainerId === trainerId))
              );
              const displayClientsCount = trainer.clients || trainer.clientCount || 0;

              const trainerUri =
                trainer.profilePic ||
                trainer.profilePhoto ||
                trainer.users?.profilePic ||
                trainer.users?.profilePhoto ||
                trainer.user?.profilePic ||
                trainer.user?.profilePhoto ||
                trainer.profilePicture ||
                null;

              return (
                <Pressable
                  key={trainerId}
                  onPress={() => isThisTrainerActive ? router.push('/(customer)/my-trainer') : handleOpenTrainerProfile(trainer)}
                  className={`rounded-2xl p-3 border active:opacity-95 ${
                    isThisTrainerActive
                      ? 'bg-[#15190D] border-[#D7FF00]/80 shadow-lg'
                      : 'bg-[#1A1A1A] border-[#27272A]'
                  }`}
                >
                  <View className="flex-row">
                    <View className="w-[120px] h-[150px] relative rounded-xl overflow-hidden mr-3">
                      <StaticAvatar
                        uri={trainerUri}
                        name={trainer.fullName}
                        gender={trainer.gender}
                        size={80}
                        className="w-full h-full"
                      />

                      <View className="absolute inset-0 bg-black/20" />

                      {isThisTrainerActive ? (
                        <View className="absolute top-2 left-2 bg-[#D7FF00] rounded px-1.5 py-0.5 flex-row items-center shadow-sm">
                          <View className="w-1.5 h-1.5 rounded-full bg-black mr-1" />
                          <Text className="text-black text-[8px] font-extrabold tracking-wider">ACTIVE TRAINER</Text>
                        </View>
                      ) : isThisTrainerRequested ? (
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

                        {trainer.price != null && Platform.OS !== 'ios' && (
                          <View className="flex-row items-center mt-1">
                            <View className="bg-[#1C2307] border border-[#3E4C14] px-2 py-0.5 rounded-md flex-row items-center">
                              <Tag size={10} color="#CCFF00" weight="bold" style={{ marginRight: 4 }} />
                              <Text className="text-[#CCFF00] text-[11px] font-semibold">
                                ₹{trainer.price}
                              </Text>
                              <Text className="text-[#8E8E93] text-[10px] ml-0.5">/mo</Text>
                            </View>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-end justify-between mt-2">
                        {isThisTrainerActive ? (
                          <Pressable
                            className="flex-row items-center bg-[#D7FF00] rounded-full px-3 py-1.5 active:opacity-80"
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              router.push('/(customer)/my-trainer');
                            }}
                          >
                            <Text className="text-black text-[10px] font-bold mr-1">My Trainer</Text>
                            <CaretRight size={10} color="#000000" weight="bold" />
                          </Pressable>
                        ) : isThisTrainerRequested ? (
                          <Pressable
                            className="flex-row items-center bg-[#3E3218] border border-[#FF9F0A] rounded-full px-3 py-1.5 active:opacity-80"
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              handleOpenTrainerRequest();
                            }}
                          >
                            <Text className="text-[#FF9F0A] text-[10px] font-semibold mr-1">
                              {isIndividual ? (Platform.OS === 'ios' ? 'Manage Plan' : 'Under Review') : 'Pending Review'}
                            </Text>
                            <CaretRight size={10} color="#FF9F0A" weight="bold" />
                          </Pressable>
                        ) : (
                          <View
                            pointerEvents="none"
                            className="flex-row items-center border border-[#445000] rounded-full px-3 py-1.5"
                          >
                            <Text className="text-[#D4FF00] text-[10px] font-semibold mr-1">View Profile</Text>
                            <CaretRight size={10} color="#D4FF00" weight="bold" />
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Active Training Plan Expiry Card matching home.tsx */}
                  {isThisTrainerActive && (
                    <View className="mt-3 pt-3 border-t border-[#262626] w-full">
                      <View className="flex-row items-center justify-between mb-2.5">
                        <View className="flex-row items-center gap-2">
                          <View className="w-6 h-6 rounded-full bg-[#D7FF00] items-center justify-center">
                            <Star size={13} color="#000000" weight="fill" />
                          </View>
                          <Text className="text-[#D7FF00] text-xs font-semibold tracking-wider uppercase">
                            ACTIVE TRAINING PLAN
                          </Text>
                        </View>
                        <View className="bg-[#D7FF00]/15 border border-[#D7FF00]/40 rounded-full px-2 py-0.5">
                          <Text className="text-[#D7FF00] text-[10px] font-bold">CURRENT COACH</Text>
                        </View>
                      </View>

                      {typeof trainerDaysLeft === 'number' && trainerDaysLeft > 0 ? (
                        <>
                          <View className="flex-row items-baseline gap-2 mb-2.5">
                            <Text className="text-white text-3xl font-semibold">{trainerDaysLeft}</Text>
                            <Text className="text-[#8E8E93] text-sm font-medium">Days Left</Text>
                            {activeAssignment?.expiryOn && (
                              <Text className="text-[#8E8E93] text-[11px] ml-auto font-medium">
                                Expires {new Date(activeAssignment.expiryOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </Text>
                            )}
                          </View>

                          <View className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden mb-3">
                            <View className="h-full bg-[#D7FF00] rounded-full" style={{ width: `${trainerProgressPercentage}%` }} />
                          </View>

                          <View className="flex-row items-center justify-between mt-0.5">
                            <Pressable
                              onPress={(e) => {
                                e?.stopPropagation?.();
                                router.push('/(customer)/my-trainer');
                              }}
                              className="flex-row items-center gap-1.5 active:opacity-70 mt-0.5"
                            >
                              <Text className="text-[#8E8E93] text-xs font-medium">
                                Trainer Details & Schedule
                              </Text>
                              <ArrowRight size={12} color="#8E8E93" weight="bold" />
                            </Pressable>

                            {isIndividual && Platform.OS !== 'ios' && (
                              <Pressable
                                onPress={(e) => {
                                  e?.stopPropagation?.();
                                  handleOpenWebCheckoutForPending(
                                    trainerId,
                                    trainer.fullName,
                                    trainer.price
                                  );
                                }}
                                className="bg-[#242A10] border border-[#445012] px-2.5 py-1 rounded-lg active:opacity-80"
                              >
                                <Text className="text-[#D7FF00] text-[10px] font-semibold">Extend Plan</Text>
                              </Pressable>
                            )}
                          </View>
                        </>
                      ) : (
                        <View className="mb-1">
                          <Text className="text-[#EF4444] text-base font-semibold mb-1">Training Plan Expired</Text>
                          <Text className="text-[#8E8E93] text-xs font-medium mb-3">
                            Renew your trainer plan to continue 1-on-1 coaching sessions.
                          </Text>
                          <Pressable
                            className="bg-[#D7FF00] py-2 px-4 rounded-xl self-start active:opacity-80"
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              handleOpenWebCheckoutForPending(
                                trainerId,
                                trainer.fullName,
                                trainer.price
                              );
                            }}
                          >
                            <Text className="text-black text-xs font-semibold tracking-wide">
                              {Platform.OS === 'ios' ? 'MANAGE TRAINING PLAN' : 'RENEW TRAINING PLAN'}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })
          ) : (
            <Text className="text-[#A1A1AA] text-center mt-10">No trainers found.</Text>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal to cancel pending request */}
      <ConfirmModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        title="Withdraw Booking Request?"
        description={`Are you sure you want to cancel your personal training request with ${pendingTrainerName}?`}
        confirmText="Yes, Cancel Request"
        cancelText="Keep Request & Wait"
        confirmButtonColor="bg-red-600"
        confirmTextColor="text-white"
        isLoading={isDeletingRequest}
      />
    </View>
  );
}
