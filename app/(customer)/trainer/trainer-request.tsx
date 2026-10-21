import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, Hourglass, Record, User, CalendarBlank, FileText, Bell, Trash, Warning, CheckCircle, Lightning, Fire, Person, Calendar, Clock, PaperPlaneRight, ClipboardText
} from 'phosphor-react-native';
import { useTrainerStore } from '@/constants/trainerStore';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useGymTimings } from '@/hooks/gymTimings/useGymTimings';
import { useSavePersonalTrainerRequest } from '@/hooks/personalTrainerRequests/useSavePersonalTrainerRequest';
import { usePersonalTrainerRequestsByUser } from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import {
  useAssignedGlobalTrainersByUser,
  useSaveIndividualCustomerTrainer,
  useDeleteIndividualCustomerTrainer,
  SaveIndividualCustomerTrainerParams,
} from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmModal from '@/components/ConfirmModal';
import { useGlobalTrainer } from '@/hooks/globalTrainers/useGlobalTrainer';
import { useGymTrainerById } from '@/hooks/trainers/useGymTrainers';

export default function TrainerRequestScreen() {
  const { id, trainerName, specializations, trainerData } = useLocalSearchParams<{
    id?: string;
    trainerName?: string;
    specializations?: string;
    trainerData?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const parsedTrainer = React.useMemo(() => {
    if (!trainerData) return null;
    try {
      return JSON.parse(trainerData);
    } catch {
      return null;
    }
  }, [trainerData]);

  const {
    trainer, status, simulationTimeLeft, startApprovalSimulation, cancelTrainerRequest
  } = useTrainerStore();

  const [step, setStep] = useState<'form' | 'pending'>('form');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const queryClient = useQueryClient();

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const { userId, role } = useUser();
  const { data: profile } = useCustomerProfile(userId || undefined);
  const gymId = profile?.customerData?.gymId;
  const isIndividual = role === 'individual' || (!gymId && !!userId);

  const { data: gymTimings, isLoading: isGymTimingsLoading } = useGymTimings(gymId);

  const { data: trainerRequests } = usePersonalTrainerRequestsByUser(isIndividual ? undefined : (userId || undefined));
  const activeRequest = trainerRequests?.[0];

  const {
    data: individualAssignments,
    isLoading: isIndividualAssignmentsLoading,
  } = useAssignedGlobalTrainersByUser(isIndividual && userId ? userId : undefined);
  const activeIndividualAssignment = individualAssignments?.find(t => t.isActive !== false) || individualAssignments?.[0];

  const targetTrainerId =
    id ||
    activeIndividualAssignment?.globalTrainerId ||
    activeRequest?.gymTrainerId ||
    parsedTrainer?.globalTrainerId ||
    parsedTrainer?.gymTrainerId ||
    parsedTrainer?.id;

  const { data: globalTrainerDetails } = useGlobalTrainer(
    isIndividual && targetTrainerId ? (targetTrainerId as string) : undefined
  );
  const { data: gymTrainerResult } = useGymTrainerById(
    !isIndividual && targetTrainerId ? (targetTrainerId as string) : undefined
  );
  const gymTrainer = gymTrainerResult?.trainer;

  useEffect(() => {
    console.log('[TrainerRequest] Component State & User Details:', {
      userId,
      role,
      isIndividual,
      gymId,
      paramId: id,
      paramTrainerName: trainerName,
      step,
      gymRequestsCount: trainerRequests?.length,
      activeGymRequestStatus: activeRequest?.applicationStatus,
      individualAssignmentsCount: individualAssignments?.length,
      activeIndividualAssignmentId: activeIndividualAssignment?.individualCustomerTrainerId,
      activeIndividualTrainer: activeIndividualAssignment?.globalTrainer?.fullName,
      activeIndividualIsActive: activeIndividualAssignment?.isActive,
    });
  }, [userId, role, isIndividual, gymId, id, trainerName, step, trainerRequests, activeRequest, individualAssignments, activeIndividualAssignment]);

  useEffect(() => {
    if (!isIndividual && activeRequest?.applicationStatus === 'submitted' && step === 'form') {
      console.log('[TrainerRequest] Active gym request status is submitted. Switching to pending view.');
      setStep('pending');
    }
  }, [activeRequest, isIndividual, step]);

  useEffect(() => {
    if (!isIndividual && activeRequest?.applicationStatus === 'approved') {
      console.log('[TrainerRequest] Active gym request status is approved. Redirecting to my-trainer.');
      router.replace('/(customer)/my-trainer');
    }
  }, [activeRequest, isIndividual]);

  useEffect(() => {
    if (isIndividual && activeIndividualAssignment?.status === 'approved') {
      console.log('[TrainerRequest] Active individual request status is approved. Redirecting to my-trainer.');
      router.replace('/(customer)/my-trainer');
    }
  }, [activeIndividualAssignment, isIndividual]);

  useEffect(() => {
    if (isIndividual && (activeIndividualAssignment?.status === 'pending' || activeIndividualAssignment?.isActive) && !id && step === 'form') {
      console.log('[TrainerRequest] Individual user already has a pending/active trainer assignment with no new trainer ID specified. Switching to pending view.');
      setStep('pending');
    }
  }, [isIndividual, activeIndividualAssignment, id, step]);

  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const requestedDate = isIndividual && activeIndividualAssignment?.assignedOn
    ? new Date(activeIndividualAssignment.assignedOn).toLocaleDateString('en-GB', dateOptions)
    : (isIndividual && activeIndividualAssignment?.createdAt
      ? new Date(activeIndividualAssignment.createdAt).toLocaleDateString('en-GB', dateOptions)
      : (activeRequest?.createdAt
        ? new Date(activeRequest.createdAt).toLocaleDateString('en-GB', dateOptions)
        : new Date().toLocaleDateString('en-GB', dateOptions)));

  const handleBack = () => {
    console.log('[TrainerRequest] handleBack pressed. Router canGoBack:', router.canGoBack());
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(customer)/trainer/book-trainer');
    }
  };

  // Mutations
  const { mutateAsync: saveTrainerRequest, isPending: isSavingGymRequest } = useSavePersonalTrainerRequest();
  const { mutateAsync: saveIndividualCustomerTrainerMutation, isPending: isSavingIndividual } = useSaveIndividualCustomerTrainer();
  const { mutateAsync: deleteIndividualCustomerTrainerMutation, isPending: isDeletingIndividual } = useDeleteIndividualCustomerTrainer();

  const isSaving = isIndividual ? isSavingIndividual : isSavingGymRequest;

  const handleConfirmCancel = async () => {
    console.log('[TrainerRequest] handleConfirmCancel pressed. isIndividual:', isIndividual);

    try {
      if (isIndividual && activeIndividualAssignment?.individualCustomerTrainerId) {
        console.log('[TrainerRequest] Calling deleteIndividualCustomerTrainer for ID:', activeIndividualAssignment.individualCustomerTrainerId);
        const delRes = await deleteIndividualCustomerTrainerMutation(activeIndividualAssignment.individualCustomerTrainerId);
        console.log('[TrainerRequest] deleteIndividualCustomerTrainer SUCCESS (is_deleted=true, isActive=false, deletedAt=now):', delRes);
      }
    } catch (error: any) {
      console.error('[TrainerRequest] deleteIndividualCustomerTrainer ERROR caught while deleting:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        error,
      });
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
    router.replace('/(customer)/profile');
  };

  const confirmAndSend = async () => {
    const anyTrainer = trainer as any;
    const targetTrainerId = id || anyTrainer.globalTrainerId || anyTrainer.gymTrainerId || anyTrainer.id;

    console.log('[TrainerRequest] confirmAndSend initiated:', {
      userId,
      targetTrainerId,
      isIndividual,
      selectedDays,
      selectedTime,
    });

    if (!userId || !targetTrainerId) {
      console.warn('[TrainerRequest] Missing required credentials. userId:', userId, 'targetTrainerId:', targetTrainerId);
      setShowConfirmModal(false);
      return;
    }

    if (isIndividual) {
      const payload: SaveIndividualCustomerTrainerParams = {
        userId,
        globalTrainerId: targetTrainerId as string,
        weekDays: selectedDays,
        timings: selectedTime,
        assignedOn: null,
        assignedBy: null,
        status: 'pending',
        isActive: true,
      };

      console.log('[TrainerRequest] Executing saveIndividualCustomerTrainer with payload:', payload);

      try {
        const response = await saveIndividualCustomerTrainerMutation(payload);
        console.log('[TrainerRequest] saveIndividualCustomerTrainer SUCCESS! Response:', response);
      } catch (error: any) {
        console.error('[TrainerRequest] saveIndividualCustomerTrainer ERROR caught while saving data:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          error,
        });
      }
    } else {
      const payload = {
        requestedBy: userId,
        gymTrainerId: targetTrainerId as string,
        preferredWorkoutDays: selectedDays,
        preferredWorkoutTime: selectedTime,
      };

      console.log('[TrainerRequest] Executing saveTrainerRequest (Gym) with payload:', payload);

      try {
        const response = await saveTrainerRequest(payload);
        console.log('[TrainerRequest] saveTrainerRequest (Gym) SUCCESS! Response:', response);
      } catch (error: any) {
        console.error('[TrainerRequest] saveTrainerRequest ERROR caught while saving data:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          error,
        });
      }
    }

    setShowConfirmModal(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests'] }),
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['assignedTrainers'] }),
    ]);
    setStep('pending');
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
    setSelectedTime('');
  };

  const dayMap: Record<string, string> = {
    'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday',
    'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
  };

  const getAvailableTimings = () => {
    if (!gymTimings || gymTimings.length === 0) {
      return ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'];
    }

    if (selectedDays.length === 0) {
      return [];
    }

    let commonSlots: string[] | null = null;

    const parseToDate = (timeStr: string) => {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      let h = parseInt(hours, 10);
      if (h === 12) h = 0;
      if (modifier === 'PM') h += 12;
      const d = new Date();
      d.setHours(h, parseInt(minutes, 10), 0, 0);
      return d;
    };

    const formatToTime = (d: Date) => {
      let hours = d.getHours();
      let minutes: any = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutes} ${ampm}`;
    };

    for (const shortDay of selectedDays) {
      const fullDay = dayMap[shortDay];
      const timing = gymTimings.find(t => t.day === fullDay);
      if (!timing || timing.isClosed) return [];

      const openDate = parseToDate(timing.openTime);
      const closeDate = parseToDate(timing.closeTime);
      const slots: string[] = [];

      let current = new Date(openDate);
      while (current < closeDate) {
        slots.push(formatToTime(current));
        current.setHours(current.getHours() + 1);
      }

      if (commonSlots === null) {
        commonSlots = slots;
      } else {
        commonSlots = commonSlots.filter(slot => slots.includes(slot));
      }
    }

    return commonSlots || [];
  };

  const availableTimings = getAvailableTimings();

  const nameToDisplay = isIndividual
    ? (
        activeIndividualAssignment?.globalTrainer?.fullName ||
        globalTrainerDetails?.fullName ||
        trainerName ||
        parsedTrainer?.fullName ||
        parsedTrainer?.name ||
        'Trainer'
      )
    : (
        activeRequest?.gymTrainer?.fullName ||
        gymTrainer?.fullName ||
        trainerName ||
        parsedTrainer?.fullName ||
        parsedTrainer?.name ||
        'Trainer'
      );

  const rawTrainerPic = isIndividual
    ? (
        activeIndividualAssignment?.globalTrainer?.profilePic ||
        activeIndividualAssignment?.globalTrainer?.profilePhoto ||
        activeIndividualAssignment?.globalTrainer?.users?.profilePic ||
        activeIndividualAssignment?.globalTrainer?.users?.profilePhoto ||
        activeIndividualAssignment?.globalTrainer?.user?.profilePic ||
        activeIndividualAssignment?.globalTrainer?.user?.profilePhoto ||
        globalTrainerDetails?.profilePic ||
        globalTrainerDetails?.profilePhoto ||
        globalTrainerDetails?.users?.profilePic ||
        globalTrainerDetails?.users?.profilePhoto ||
        parsedTrainer?.profilePic ||
        parsedTrainer?.profilePhoto ||
        parsedTrainer?.users?.profilePic ||
        parsedTrainer?.users?.profilePhoto ||
        null
      )
    : (
        activeRequest?.gymTrainer?.user?.profilePhoto ||
        activeRequest?.gymTrainer?.profilePic ||
        activeRequest?.gymTrainer?.profilePhoto ||
        gymTrainer?.profilePic ||
        gymTrainer?.profilePhoto ||
        gymTrainer?.user?.profilePhoto ||
        gymTrainer?.user?.profilePic ||
        parsedTrainer?.profilePic ||
        parsedTrainer?.profilePhoto ||
        null
      );

  const trainerProfilePic =
    rawTrainerPic &&
    typeof rawTrainerPic === 'string' &&
    rawTrainerPic.trim() !== '' &&
    rawTrainerPic !== 'null' &&
    rawTrainerPic !== 'undefined' &&
    !rawTrainerPic.includes('unsplash.com') &&
    !rawTrainerPic.includes('pravatar.cc')
      ? rawTrainerPic.trim()
      : null;

  const rawStatus = isIndividual
    ? (activeIndividualAssignment?.status || (activeIndividualAssignment?.isActive ? 'approved' : 'pending'))
    : (activeRequest?.applicationStatus || 'pending');
  const displayStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  const statusTitle = (rawStatus === 'approved' || rawStatus === 'active') ? 'Approved' : (rawStatus === 'rejected' ? 'Rejected' : 'Pending Review');

  let parsedSpecializations: string[] = [];
  try {
    parsedSpecializations = specializations ? JSON.parse(specializations) : [];
  } catch (e) { }

  if (parsedSpecializations.length === 0) {
    parsedSpecializations = (trainer as any).expertise || [(trainer as any).specialization || (trainer as any).specialty || 'General Fitness'];
  }

  const getIconForSpecialization = (spec: string) => {
    const s = spec.toLowerCase();
    if (s.includes('muscle') || s.includes('strength') || s.includes('power')) return <User size={16} color="#CCFF00" weight="bold" style={{ marginRight: 8 }} />;
    if (s.includes('fat') || s.includes('weight loss') || s.includes('cardio')) return <Fire size={16} color="#CCFF00" weight="bold" style={{ marginRight: 8 }} />;
    return <Lightning size={16} color="#CCFF00" weight="bold" style={{ marginRight: 8 }} />;
  };

  if (step === 'form') {
    return (
      <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
          <Pressable onPress={handleBack} className="p-2 -ml-2 active:opacity-70">
            <CaretLeft size={20} color="#FFFFFF" weight="bold" />
          </Pressable>
          <Text className="flex-1 text-center text-white text-lg font-semibold mr-8">Book Personal Trainer</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          <Text className="text-white text-lg font-semibold mt-6 mb-4">Specializations</Text>

          <View className="flex-row flex-wrap gap-3 mb-8">
            {parsedSpecializations.map((spec, index) => (
              <View key={index} className="flex-row items-center bg-[#1A1A1A] border border-[#27272A] rounded-xl px-4 py-3">
                {getIconForSpecialization(spec)}
                <Text className="text-white text-sm font-semibold capitalize px-1">{spec}</Text>
              </View>
            ))}
          </View>

          <Text className="text-white text-lg font-semibold mb-1">1. Choose Your Preferred Workout Days</Text>
          <Text className="text-[#8E8E93] text-xs mb-4">Select the days you usually prefer to work out</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
              const fullDay = dayMap[day];
              const timing = gymTimings?.find(t => t.day === fullDay);
              const isClosed = timing?.isClosed || false;
              const isSelected = selectedDays.includes(day);

              return (
                <Pressable
                  key={day}
                  disabled={isClosed}
                  onPress={() => toggleDay(day)}
                  className={`w-16 h-16 rounded-xl items-center justify-center mr-3 border ${isSelected ? 'border-[#CCFF00] bg-[#1A1A1A]' : 'border-[#27272A] bg-[#1A1A1A]'} ${isClosed ? 'opacity-30' : ''}`}
                >
                  <Text className={`font-semibold ${isSelected ? 'text-[#CCFF00]' : 'text-[#8E8E93]'}`}>{day}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View className="flex-row items-center mb-8">
            <CalendarBlank size={12} color="#CCFF00" style={{ marginRight: 4 }} />
            <Text className="text-[#8E8E93] text-[10px]">You can select multiple days. Closed days are grayed out.</Text>
          </View>

          <View className="h-[1px] bg-[#27272A] w-full mb-8" />

          <Text className="text-white text-lg font-semibold mb-1">2. Choose Your Preferred Workout Time</Text>
          <Text className="text-[#8E8E93] text-xs mb-4">Select the time you are usually available at the gym</Text>

          <View className="flex-row flex-wrap justify-between">
            {availableTimings.length > 0 ? availableTimings.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  className={`w-[48%] py-4 rounded-xl items-center flex-row justify-center mb-3 border relative ${isSelected ? 'border-[#CCFF00] bg-[#1A1A1A]' : 'border-[#27272A] bg-[#1A1A1A]'}`}
                >
                  <Clock size={16} color={isSelected ? "#CCFF00" : "#8E8E93"} style={{ marginRight: 8 }} />
                  <Text className={`font-semibold ${isSelected ? 'text-[#CCFF00]' : 'text-[#8E8E93]'}`}>{time}</Text>
                  {isSelected && (
                    <View className="absolute -top-1 -right-1 bg-[#CCFF00] rounded-full p-0.5 border border-[#0F0F0F]">
                      <CheckCircle size={12} color="#000" weight="fill" />
                    </View>
                  )}
                </Pressable>
              );
            }) : (
              <View className="w-full py-6 items-center justify-center border border-[#27272A] rounded-xl bg-[#1A1A1A]">
                <Text className="text-[#8E8E93] text-sm">
                  {selectedDays.length === 0
                    ? "Select a day to view available times"
                    : "No common times available for selected days"}
                </Text>
              </View>
            )}
          </View>

          <View className="p-4 px-0 bg-[#0F0F0F]/95 border-t border-[#1A1A1A]" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <Pressable
              onPress={() => {
                if (selectedDays.length > 0 && selectedTime) {
                  setShowConfirmModal(true);
                }
              }}
              className={`flex-row justify-center items-center py-4 rounded-2xl ${selectedDays.length > 0 && selectedTime ? 'bg-[#CCFF00]' : 'bg-[#1A1A1A]'}`}
            >
              <PaperPlaneRight size={20} color={selectedDays.length > 0 && selectedTime ? "#000000" : "#6C6C70"} weight="fill" />
              <Text className={`font-semibold text-base ml-2 ${selectedDays.length > 0 && selectedTime ? 'text-black' : 'text-[#6C6C70]'}`}>Send Request</Text>
            </Pressable>
          </View>
        </ScrollView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={showConfirmModal}
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View className="flex-1 bg-black/85 justify-center items-center p-6">
            <View className="bg-[#18181B] w-full max-w-[340px] rounded-3xl p-6 items-center border border-[#27272A] shadow-2xl">

              <View className="relative mb-5 mt-2">
                <View className="w-20 h-20 rounded-full border-2 border-[#CCFF00] items-center justify-center bg-[#1A1A1A]">
                  <ClipboardText size={32} color="#CCFF00" weight="regular" />
                </View>
                <View className="absolute bottom-0 right-0 bg-[#CCFF00] rounded-full p-1 border-2 border-[#1A1A1A]">
                  <CheckCircle size={16} color="#000000" weight="fill" />
                </View>
              </View>

              <Text className="text-white text-xl font-semibold text-center mb-2">
                Send Trainer Request?
              </Text>

              <Text className="text-[#A1A1AA] text-sm text-center leading-5 mb-6 px-2">
                You're about to send a request to {nameToDisplay} to be your personal trainer.
              </Text>

              <View className="w-full bg-[#1A1A1A] border border-[#27272A] rounded-xl p-4 mb-6">
                <View className="flex-row items-center mb-4">
                  <CalendarBlank size={16} color="#CCFF00" weight="bold" style={{ marginRight: 8 }} />
                  <Text className="text-white font-semibold text-sm">Your Preferred Schedule</Text>
                </View>
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-row items-center mr-3 mt-1">
                    <CalendarBlank size={14} color="#8E8E93" style={{ marginRight: 6 }} />
                    <Text className="text-[#8E8E93] text-xs">Preferred Days</Text>
                  </View>
                  <View className="flex-1 flex-row flex-wrap justify-end gap-1.5">
                    {selectedDays.map((day) => (
                      <View key={day} className="bg-[#242A10] border border-[#3E4C14] rounded-md px-2 py-0.5">
                        <Text className="text-[#CCFF00] font-semibold text-xs">{day}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Clock size={14} color="#8E8E93" style={{ marginRight: 6 }} />
                    <Text className="text-[#8E8E93] text-xs">Preferred Time</Text>
                  </View>
                  <View className="bg-[#242A10] border border-[#3E4C14] rounded-md px-2.5 py-0.5">
                    <Text className="text-[#CCFF00] font-semibold text-xs">{selectedTime}</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-start bg-[#1D1D10] border border-[#3D3D1F] rounded-xl p-3 mb-6 w-full">
                <Warning size={16} color="#CCFF00" style={{ marginRight: 8, marginTop: 2 }} />
                <Text className="flex-1 text-[#A1A1AA] text-[10px] leading-tight">
                  Once your request is sent, {nameToDisplay} will review it and respond soon. You'll be notified once your request is accepted.
                </Text>
              </View>

              <Pressable
                onPress={confirmAndSend}
                disabled={isSaving}
                className={`w-full py-4 rounded-2xl items-center flex-row justify-center mb-3 active:opacity-80 ${isSaving ? 'bg-[#CCFF00]/50' : 'bg-[#CCFF00]'}`}
              >
                <View className="mr-2">
                  <PaperPlaneRight size={18} color="#000000" weight="bold" />
                </View>
                <Text className="text-black font-semibold text-base">
                  {isSaving ? "Sending..." : "Send Request"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowConfirmModal(false)}
                className="bg-[#27272A] border border-[#3A3A3C] w-full py-4 rounded-2xl items-center active:opacity-70"
              >
                <Text className="text-white font-semibold text-base">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F0F0F] pt-2">
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={handleBack} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-semibold mr-8">Trainer Request</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mt-10 mb-8">
          <View className="w-20 h-20 bg-[#2D3319] rounded-full items-center justify-center relative mb-6">
            <Hourglass size={40} color="#CCFF00" weight="regular" />
            <View className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-[#CCFF00] rounded-full border-2 border-[#0F0F0F]" />
          </View>
          <Text className="text-white text-2xl font-semibold mb-2">Request Pending</Text>
          <Text className="text-[#8E8E93] text-center text-sm px-4 leading-relaxed">
            Your request has been sent to the trainer.{'\n'}They will review it shortly.
          </Text>
        </View>

        <View className="bg-[#1A1A1A] rounded-2xl border border-[#27272A] mb-6">
          <View className="flex-row items-center p-4 border-b border-[#27272A]">
            <View className="w-12 h-12 bg-[#2D221C] rounded-xl items-center justify-center mr-4 border border-[#4A3225]">
              <Record size={24} color="#FF9F0A" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5 tracking-[1px] uppercase">Status</Text>
              <Text className="text-[#FF9F0A] text-sm font-semibold">{statusTitle}</Text>
            </View>
            <View className="border border-[#FF9F0A] rounded-full px-3 py-1">
              <Text className="text-[#FF9F0A] text-xs font-medium">{displayStatus}</Text>
            </View>
          </View>

          <View className="flex-row items-center p-4 border-b border-[#27272A]">
            <View className="w-12 h-12 bg-[#222222] rounded-xl items-center justify-center mr-4 border border-[#27272A]">
              <User size={20} color="#FFFFFF" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5 tracking-[1px] uppercase">Trainer</Text>
              <Text className="text-white text-sm font-semibold">{nameToDisplay}</Text>
            </View>
            {trainerProfilePic ? (
              <View className="w-10 h-10 rounded-full overflow-hidden border border-[#27272A] bg-[#27272A]">
                <Image
                  source={{ uri: trainerProfilePic }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View className="w-10 h-10 rounded-full bg-[#27272A] border border-[#3A3A3C] items-center justify-center">
                <User size={20} color="#8E8E93" weight="regular" />
              </View>
            )}
          </View>

          <View className="flex-row items-center p-4">
            <View className="w-12 h-12 bg-[#222222] rounded-xl items-center justify-center mr-4 border border-[#27272A]">
              <CalendarBlank size={20} color="#FFFFFF" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5 tracking-[1px] uppercase">Requested On</Text>
              <Text className="text-white text-sm font-semibold">{requestedDate}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#1A1A1A] rounded-2xl border border-[#27272A] p-5 mb-8">
          <Text className="text-[#CCFF00] text-xs font-semibold text-center mb-6 uppercase tracking-wider">What happens next?</Text>

          <View className="flex-row justify-between">
            <View className="items-center flex-1 px-1">
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3">
                <FileText size={20} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">Trainer will review your request</Text>
            </View>

            <View className="items-center flex-1 px-1">
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3">
                <Bell size={20} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">You'll get a notification</Text>
            </View>

            <View className="items-center flex-1 px-1">
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3">
                <User size={20} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">Start training once approved</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#0F0F0F]/95 border-t border-[#1A1A1A]">
        <Pressable
          onPress={() => setShowCancelModal(true)}
          className="flex-row justify-center items-center py-4 border border-[#551818] rounded-2xl bg-[#1D0909] active:opacity-75"
        >
          <Trash size={18} color="#FF3B30" weight="bold" />
          <Text className="text-[#FF3B30] font-semibold text-base ml-2">Cancel Request</Text>
        </Pressable>
      </View>

      <ConfirmModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        title="Withdraw Booking Request?"
        description={`Are you sure you want to cancel your pending personal training request with ${nameToDisplay}?`}
        confirmText="Yes, Cancel Request"
        cancelText="Keep Request & Wait"
        confirmButtonColor="bg-red-600"
        confirmTextColor="text-white"
        isLoading={isDeletingIndividual}
        icon={
          <View className="w-16 h-16 rounded-full bg-[#2A0F0F] items-center justify-center border border-[#551818]">
            <Warning size={32} color="#FF3B30" weight="fill" />
          </View>
        }
      />
    </View>
  );
}
