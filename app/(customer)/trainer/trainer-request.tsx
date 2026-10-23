import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, Image, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, CaretRight, Hourglass, Record, User, CalendarBlank, FileText, Bell, Trash, Warning, CheckCircle,
  Lightning, Fire, Clock, PaperPlaneRight, ClipboardText, CreditCard, Tag, ShieldCheck
} from 'phosphor-react-native';
import { useTrainerStore } from '@/constants/trainerStore';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useGymTimings } from '@/hooks/gymTimings/useGymTimings';
import { useSavePersonalTrainerRequest, useDeletePersonalTrainerRequest } from '@/hooks/personalTrainerRequests/useSavePersonalTrainerRequest';
import { usePersonalTrainerRequestsByUser } from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import {
  useAssignedGlobalTrainersByUser,
  useSaveIndividualCustomerTrainer,
  useDeleteIndividualCustomerTrainer,
  SaveIndividualCustomerTrainerParams,
} from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { triggerMediumHaptic } from '@/lib/haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalTrainer } from '@/hooks/globalTrainers/useGlobalTrainer';
import { useGymTrainerById } from '@/hooks/trainers/useGymTrainers';
import { useIndividualCustomerPayments, useSaveIndividualCustomerPayment } from '@/hooks/individual/membership/individualCustomerTrainerPayments';

export default function TrainerRequestScreen() {
  const { id, trainerName, specializations, trainerData, trainerPrice } = useLocalSearchParams<{
    id?: string;
    trainerName?: string;
    specializations?: string;
    trainerData?: string;
    trainerPrice?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const parsedTrainer = useMemo(() => {
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paidPaymentInfo, setPaidPaymentInfo] = useState<{ paymentId: string; amount: number; method: string } | null>(null);

  const queryClient = useQueryClient();

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const { userId, role } = useUser();
  const { data: profile } = useCustomerProfile(userId || undefined);
  const gymId = profile?.customerData?.gymId;
  const isIndividual = role === 'individual' || (!gymId && !!userId);

  const { data: gymTimings, isLoading: isGymTimingsLoading } = useGymTimings(gymId);

  const { data: trainerRequests } = usePersonalTrainerRequestsByUser(userId || undefined);
  const activeRequest = trainerRequests?.[0];

  const {
    data: individualAssignments,
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

  // Determine trainer price / fee
  const trainerFee = useMemo(() => {
    if (trainerPrice && !isNaN(Number(trainerPrice))) return Number(trainerPrice);
    if (globalTrainerDetails?.price != null) return Number(globalTrainerDetails.price);
    if (parsedTrainer?.price != null) return Number(parsedTrainer.price);
    if (activeIndividualAssignment?.globalTrainer?.price != null) return Number(activeIndividualAssignment.globalTrainer.price);
    if ((trainer as any)?.price != null) return Number((trainer as any).price);
    return 0;
  }, [trainerPrice, globalTrainerDetails, parsedTrainer, activeIndividualAssignment, trainer]);

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

  // Query payments for individual customer
  const { data: userPayments } = useIndividualCustomerPayments(
    userId || undefined,
    targetTrainerId ? (targetTrainerId as string) : undefined,
    { enabled: isIndividual && !!userId }
  );
  const latestPayment = userPayments?.[0];

  useEffect(() => {
    if (!isIndividual && activeRequest?.applicationStatus === 'submitted' && step === 'form') {
      setStep('pending');
    } else if (isIndividual && (activeIndividualAssignment?.status === 'pending' || activeIndividualAssignment?.isActive) && step === 'form') {
      setStep('pending');
    }
  }, [activeRequest, isIndividual, activeIndividualAssignment, step]);

  useEffect(() => {
    if (activeRequest?.applicationStatus === 'approved') {
      router.replace('/(customer)/my-trainer');
    } else if (isIndividual && (activeIndividualAssignment?.status === 'approved' || (activeIndividualAssignment?.isActive && activeIndividualAssignment?.assignedOn))) {
      router.replace('/(customer)/my-trainer');
    }
  }, [activeRequest, isIndividual, activeIndividualAssignment]);

  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const requestedDate = new Date().toLocaleDateString('en-GB', dateOptions);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(customer)/trainer/book-trainer');
    }
  };

  // Mutations
  const { mutateAsync: saveTrainerRequest, isPending: isSavingGymRequest } = useSavePersonalTrainerRequest();
  const { mutateAsync: deleteGymTrainerRequestMutation, isPending: isDeletingGym } = useDeletePersonalTrainerRequest();
  const { mutateAsync: saveIndividualCustomerTrainerMutation, isPending: isSavingIndividual } = useSaveIndividualCustomerTrainer();
  const { mutateAsync: deleteIndividualCustomerTrainerMutation, isPending: isDeletingIndividual } = useDeleteIndividualCustomerTrainer();
  const { mutateAsync: saveIndividualCustomerPaymentMutation } = useSaveIndividualCustomerPayment();

  const isSaving = isIndividual ? (isSavingIndividual || isProcessingPayment) : isSavingGymRequest;
  const isDeleting = isIndividual ? isDeletingIndividual : isDeletingGym;

  const handleConfirmCancel = async () => {

    try {
      if (isIndividual && activeIndividualAssignment?.individualCustomerTrainerId) {
        await deleteIndividualCustomerTrainerMutation(activeIndividualAssignment.individualCustomerTrainerId);
      } else if (isIndividual && userId) {
        const now = new Date().toISOString();
        await supabase
          .from('individual_customer_trainers')
          .update({
            isActive: false,
            is_deleted: true,
            deletedAt: now,
            updatedAt: now,
          })
          .eq('userId', userId)
          .eq('is_deleted', false);
      } else if (activeRequest?.personalTrainerRequestId) {
        await deleteGymTrainerRequestMutation({
          id: activeRequest.personalTrainerRequestId,
          userId: userId || undefined,
          trainerId: activeRequest.gymTrainerId,
        });
      }
    } catch (error: any) {
      console.error('[TrainerRequest] delete error caught while deleting:', error);
    } finally {
      setShowCancelModal(false);
    }

    cancelTrainerRequest();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests'] }),
      queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPayments'] }),
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['assignedTrainers'] }),
    ]);
    router.replace('/(customer)/profile');
  };

  const openWebCheckout = async () => {
    triggerMediumHaptic();
    setIsProcessingPayment(true);
    const anyTrainer = trainer as any;
    const resolvedTrainerId = id || targetTrainerId || anyTrainer?.globalTrainerId || anyTrainer?.id;

    try {
      let session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshData?.session) {
          session = refreshData.session;
        } else {
          console.warn('[TrainerRequest] Token refresh warning:', refreshErr?.message);
        }
      }

      if (!session?.access_token) {
        Alert.alert(
          'Login Required',
          'Your session has expired. Please log in again to continue.',
          [
            {
              text: 'Log In',
              onPress: () => router.replace('/auth/otp-auth' as any),
            },
          ]
        );
        setIsProcessingPayment(false);
        return;
      }

      const webHost = 'https://www.gkgymlife.com';
      const baseUrl = `${webHost}/api/auth/sso`;
      const params = new URLSearchParams();

      params.append('returnTo', '/customer');
      params.append('action', 'book-trainer');
      if (resolvedTrainerId) params.append('trainerId', String(resolvedTrainerId));
      if (nameToDisplay) params.append('trainerName', nameToDisplay);
      if (trainerFee) params.append('amount', String(trainerFee));
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

      // Record booking & payment in DB after browser flow
      if (userId && resolvedTrainerId) {
        const txnId = `pay_web_${Date.now()}`;
        try {
          if (typeof saveIndividualCustomerPaymentMutation === 'function') {
            await saveIndividualCustomerPaymentMutation({
              userId,
              globalTrainerId: resolvedTrainerId as string,
              paymentMode: 'upi',
              amountPaid: trainerFee,
              transactionId: txnId,
              status: 'successful',
            });
          }
        } catch (payErr) {
          console.warn('[TrainerRequest] Payment record notice:', payErr);
        }

        try {
          const payload: SaveIndividualCustomerTrainerParams = {
            userId,
            globalTrainerId: resolvedTrainerId as string,
            weekDays: selectedDays.length > 0 ? selectedDays : (activeIndividualAssignment?.weekDays || ['Mon', 'Wed', 'Fri']),
            timings: selectedTime || activeIndividualAssignment?.timings || '6:00 AM',
            assignedOn: null,
            status: 'pending',
            isActive: true,
          };
          if (typeof saveIndividualCustomerTrainerMutation === 'function') {
            await saveIndividualCustomerTrainerMutation(payload);
          }
        } catch (saveErr) {
          console.warn('[TrainerRequest] Assignment record notice:', saveErr);
        }

        setPaidPaymentInfo({
          paymentId: txnId,
          amount: trainerFee,
          method: 'upi',
        });
      }

      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] }),
          queryClient.invalidateQueries({ queryKey: ['individualCustomerTrainers'] }),
          queryClient.invalidateQueries({ queryKey: ['individualCustomerPayments'] }),
          queryClient.invalidateQueries({ queryKey: ['customerProfile'] }),
          queryClient.invalidateQueries({ queryKey: ['assignedTrainers'] }),
        ]);
      } catch (invErr) {
        console.warn('[TrainerRequest] Query invalidation warning:', invErr);
      }

      setStep('pending');
    } catch (err) {
      console.warn('[TrainerRequest] Error opening web browser:', err);
      try {
        const fallbackUrl = Platform.OS === 'ios'
          ? 'https://www.gkgymlife.com/customer'
          : `https://www.gkgymlife.com/customer?action=book-trainer&amount=${trainerFee}`;
        await Linking.openURL(fallbackUrl);
      } catch (linkErr) {
        Alert.alert('Error', 'Unable to open browser. Please visit https://www.gkgymlife.com/customer');
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const confirmAndSend = async () => {
    const anyTrainer = trainer as any;
    const resolvedTrainerId = id || targetTrainerId || anyTrainer?.globalTrainerId || anyTrainer?.gymTrainerId || anyTrainer?.id;

    if (!userId || !resolvedTrainerId) {
      console.warn('[TrainerRequest] Missing required credentials. userId:', userId, 'targetTrainerId:', resolvedTrainerId);
      setShowConfirmModal(false);
      return;
    }

    if (isIndividual) {
      setShowConfirmModal(false);
      if (trainerFee > 0) {
        await openWebCheckout();
        return;
      }

      // Free / zero price booking
      const payload: SaveIndividualCustomerTrainerParams = {
        userId,
        globalTrainerId: resolvedTrainerId as string,
        weekDays: selectedDays,
        timings: selectedTime,
        assignedOn: null,
        status: 'pending',
        isActive: true,
      };

      try {
        if (typeof saveIndividualCustomerTrainerMutation === 'function') {
          await saveIndividualCustomerTrainerMutation(payload);
        }
      } catch (error: any) {
        console.warn('[TrainerRequest] saveIndividualCustomerTrainer warning:', error);
      }
    } else {
      setShowConfirmModal(false);
      const payload = {
        requestedBy: userId,
        gymTrainerId: resolvedTrainerId as string,
        preferredWorkoutDays: selectedDays,
        preferredWorkoutTime: selectedTime
      };

      try {
        if (typeof saveTrainerRequest === 'function') {
          await saveTrainerRequest(payload);
        }
      } catch (error: any) {
        console.warn('[TrainerRequest] saveTrainerRequest warning:', error);
      }
    }

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

  const trainerGender = isIndividual
    ? (globalTrainerDetails?.gender || parsedTrainer?.gender || null)
    : (gymTrainer?.gender || parsedTrainer?.gender || null);

  const rawStatus = isIndividual
    ? (activeIndividualAssignment?.status || (activeIndividualAssignment?.isActive ? 'approved' : 'pending'))
    : (activeRequest?.applicationStatus || 'pending');
  const displayStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  const statusTitle = rawStatus === 'approved' ? 'Approved' : 'Pending Review';

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

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {/* Trainer Info Header Card */}
          <View className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 flex-row items-center mt-4 mb-5">
            <StaticAvatar
              uri={trainerProfilePic}
              name={nameToDisplay}
              gender={trainerGender}
              size={56}
              className="w-14 h-14 rounded-2xl mr-3.5 border border-[#27272A]"
            />
            <View className="flex-1">
              <Text className="text-white text-base font-semibold" numberOfLines={1}>{nameToDisplay}</Text>
              <Text className="text-[#CCFF00] text-xs font-semibold capitalize mt-0.5">
                {parsedSpecializations[0] || 'Personal Trainer'}
              </Text>
            </View>

            {isIndividual && trainerFee > 0 && Platform.OS !== 'ios' && (
              <View className="bg-[#1C2307] border border-[#3E4C14] px-3 py-1.5 rounded-xl items-end">
                <Text className="text-[#CCFF00] text-base font-semibold">₹{trainerFee}</Text>
                <Text className="text-[#8E8E93] text-[9px]">/ month</Text>
              </View>
            )}
          </View>

          <Text className="text-white text-base font-semibold mb-3">Specializations</Text>

          <View className="flex-row flex-wrap gap-2.5 mb-6">
            {parsedSpecializations.map((spec, index) => (
              <View key={index} className="flex-row items-center bg-[#1A1A1A] border border-[#27272A] rounded-xl px-3.5 py-2.5">
                {getIconForSpecialization(spec)}
                <Text className="text-white text-xs font-semibold capitalize px-1">{spec}</Text>
              </View>
            ))}
          </View>

          <Text className="text-white text-base font-semibold mb-1">1. Choose Your Preferred Workout Days</Text>
          <Text className="text-[#8E8E93] text-xs mb-3">Select the days you prefer to train</Text>

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
          <View className="flex-row items-center mb-6">
            <CalendarBlank size={12} color="#CCFF00" style={{ marginRight: 4 }} />
            <Text className="text-[#8E8E93] text-[10px]">Select 1 or more workout days per week.</Text>
          </View>

          <View className="h-[1px] bg-[#27272A] w-full mb-6" />

          <Text className="text-white text-base font-semibold mb-1">2. Choose Your Preferred Workout Time</Text>
          <Text className="text-[#8E8E93] text-xs mb-3">Select your daily training slot</Text>

          <View className="flex-row flex-wrap justify-between">
            {availableTimings.length > 0 ? availableTimings.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  className={`w-[48%] py-3.5 rounded-xl items-center flex-row justify-center mb-3 border relative ${isSelected ? 'border-[#CCFF00] bg-[#1A1A1A]' : 'border-[#27272A] bg-[#1A1A1A]'}`}
                >
                  <Clock size={16} color={isSelected ? "#CCFF00" : "#8E8E93"} style={{ marginRight: 8 }} />
                  <Text className={`font-semibold text-xs ${isSelected ? 'text-[#CCFF00]' : 'text-[#8E8E93]'}`}>{time}</Text>
                  {isSelected && (
                    <View className="absolute -top-1 -right-1 bg-[#CCFF00] rounded-full p-0.5 border border-[#0F0F0F]">
                      <CheckCircle size={12} color="#000" weight="fill" />
                    </View>
                  )}
                </Pressable>
              );
            }) : (
              <View className="w-full py-6 items-center justify-center border border-[#27272A] rounded-xl bg-[#1A1A1A]">
                <Text className="text-[#8E8E93] text-xs">
                  {selectedDays.length === 0
                    ? "Select workout days above to view available times"
                    : "No timings available for selected days"}
                </Text>
              </View>
            )}
          </View>

          {isIndividual && (
            Platform.OS === 'ios' ? (
              <View className="bg-[#141416] border border-[#27272A] rounded-2xl p-4 mt-4 mb-2">
                <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-[#27272A]">
                  <View className="flex-row items-center">
                    <User size={18} color="#CCFF00" weight="bold" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold text-sm">Personal Coaching Plan</Text>
                  </View>
                  <View className="bg-[#1C2307] border border-[#3E4C14] px-2 py-0.5 rounded-md">
                    <Text className="text-[#CCFF00] text-[10px] font-semibold">1-on-1 Guidance</Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[#8E8E93] text-xs">Custom Workout & Nutrition Plan</Text>
                  <Text className="text-[#34C759] text-xs font-semibold">Included</Text>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[#8E8E93] text-xs">Direct Chat & Progress Tracking</Text>
                  <Text className="text-[#34C759] text-xs font-semibold">Included</Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-[#8E8E93] text-xs">Certified Professional Coach</Text>
                  <Text className="text-[#34C759] text-xs font-semibold">Included</Text>
                </View>
              </View>
            ) : (
              <View className="bg-[#141416] border border-[#27272A] rounded-2xl p-4 mt-4 mb-2">
                <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-[#27272A]">
                  <View className="flex-row items-center">
                    <CreditCard size={18} color="#CCFF00" weight="bold" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold text-sm">Fee & Booking Summary</Text>
                  </View>
                  <View className="bg-[#1C2307] border border-[#3E4C14] px-2 py-0.5 rounded-md">
                    <Text className="text-[#CCFF00] text-[10px] font-semibold">Monthly Plan</Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[#8E8E93] text-xs">Personal Trainer Monthly Fee</Text>
                  <Text className="text-white text-xs font-semibold">₹{trainerFee}</Text>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[#8E8E93] text-xs">Custom Workout & Nutrition Plan</Text>
                  <Text className="text-[#34C759] text-xs font-semibold">Included</Text>
                </View>

                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[#8E8E93] text-xs">Direct Chat & Progress Tracking</Text>
                  <Text className="text-[#34C759] text-xs font-semibold">Included</Text>
                </View>

                <View className="h-[1px] bg-[#27272A] w-full mb-3" />

                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-white text-sm font-semibold">Total Amount Payable</Text>
                  <Text className="text-[#CCFF00] text-lg font-semibold">₹{trainerFee}</Text>
                </View>

                <View className="flex-row items-center bg-[#14180A] border border-[#3E4C14] rounded-xl p-2.5">
                  <ShieldCheck size={16} color="#CCFF00" weight="fill" style={{ marginRight: 8 }} />
                  <Text className="text-[#8E8E93] text-[10px] flex-1 leading-tight">
                    Secure Razorpay gateway. Pay instantly via UPI (GPay, PhonePe, Paytm), Card, or Netbanking.
                  </Text>
                </View>
              </View>
            )
          )}
        </ScrollView>

        {/* Fixed bottom action button */}
        <View
          className="absolute bottom-0 left-0 right-0 p-4 bg-[#0F0F0F]/95 border-t border-[#1A1A1A]"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Pressable
            onPress={() => {
              if (selectedDays.length > 0 && selectedTime) {
                if (isIndividual && trainerFee > 0) {
                  openWebCheckout();
                } else {
                  setShowConfirmModal(true);
                }
              }
            }}
            disabled={selectedDays.length === 0 || !selectedTime || isSaving}
            className={`flex-row justify-center items-center py-4 rounded-2xl active:opacity-80 ${selectedDays.length > 0 && selectedTime ? 'bg-[#CCFF00]' : 'bg-[#1A1A1A]'}`}
          >
            {isIndividual && trainerFee > 0 ? (
              <>
                <CreditCard size={20} color={selectedDays.length > 0 && selectedTime ? "#000000" : "#6C6C70"} weight="bold" />
                <Text className={`font-semibold text-base ml-2 ${selectedDays.length > 0 && selectedTime ? 'text-black' : 'text-[#6C6C70]'}`}>
                  {isProcessingPayment
                    ? "Connecting Web Portal..."
                    : (Platform.OS === 'ios' ? 'CONFIRM & MANAGE PLAN' : `PAY ₹${trainerFee} & ACTIVATE`)}
                </Text>
                <CaretRight size={16} color={selectedDays.length > 0 && selectedTime ? "#000000" : "#6C6C70"} weight="bold" style={{ marginLeft: 4 }} />
              </>
            ) : (
              <>
                <PaperPlaneRight size={20} color={selectedDays.length > 0 && selectedTime ? "#000000" : "#6C6C70"} weight="fill" />
                <Text className={`font-semibold text-base ml-2 ${selectedDays.length > 0 && selectedTime ? 'text-black' : 'text-[#6C6C70]'}`}>
                  {isSaving ? "Sending..." : "Send Request"}
                </Text>
              </>
            )}
          </Pressable>

          {Platform.OS === 'ios' && isIndividual && trainerFee > 0 && (
            <Text className="text-[#8E8E93] text-[11px] text-center mt-2 leading-4">
              View and manage your training plan and coach assignment securely on our web portal.
            </Text>
          )}
        </View>

        {/* Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showConfirmModal}
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View className="flex-1 bg-black/85 justify-center items-center p-6">
            <View className="bg-[#18181B] w-full max-w-[340px] rounded-3xl p-6 items-center border border-[#27272A] shadow-2xl">
              <View className="relative mb-4 mt-1">
                <View className="w-18 h-18 rounded-full border-2 border-[#CCFF00] items-center justify-center bg-[#1A1A1A] p-4">
                  {isIndividual && trainerFee > 0 ? (
                    <CreditCard size={28} color="#CCFF00" weight="bold" />
                  ) : (
                    <ClipboardText size={28} color="#CCFF00" weight="regular" />
                  )}
                </View>
                <View className="absolute bottom-0 right-0 bg-[#CCFF00] rounded-full p-1 border-2 border-[#1A1A1A]">
                  <CheckCircle size={14} color="#000000" weight="fill" />
                </View>
              </View>

              <Text className="text-white text-lg font-semibold text-center mb-1">
                {isIndividual && trainerFee > 0
                  ? (Platform.OS === 'ios' ? 'Manage Training Plan' : 'Activate Trainer Plan')
                  : 'Send Trainer Request?'}
              </Text>

              <Text className="text-[#A1A1AA] text-xs text-center leading-5 mb-5 px-2">
                {isIndividual && trainerFee > 0
                  ? (Platform.OS === 'ios'
                    ? `Continue to web portal to manage your schedule and training plan with ${nameToDisplay}.`
                    : `Activate your training plan with ${nameToDisplay}.`)
                  : `You're about to send a request to ${nameToDisplay} to be your personal trainer.`}
              </Text>

              <View className="w-full bg-[#1A1A1A] border border-[#27272A] rounded-xl p-3.5 mb-5">
                <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-[#27272A]">
                  <Text className="text-[#8E8E93] text-xs">Trainer</Text>
                  <Text className="text-white font-semibold text-xs">{nameToDisplay}</Text>
                </View>

                <View className="flex-row items-start justify-between mb-2">
                  <Text className="text-[#8E8E93] text-xs">Preferred Days</Text>
                  <View className="flex-1 flex-row flex-wrap justify-end gap-1">
                    {selectedDays.map((day) => (
                      <View key={day} className="bg-[#242A10] border border-[#3E4C14] rounded px-1.5 py-0.5">
                        <Text className="text-[#CCFF00] font-semibold text-[11px]">{day}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#8E8E93] text-xs">Preferred Time</Text>
                  <Text className="text-[#CCFF00] font-semibold text-xs">{selectedTime}</Text>
                </View>

                {isIndividual && trainerFee > 0 && Platform.OS !== 'ios' && (
                  <View className="flex-row items-center justify-between pt-2 border-t border-[#27272A]">
                    <Text className="text-white text-xs font-semibold">Total Payable</Text>
                    <Text className="text-[#CCFF00] text-sm font-semibold">₹{trainerFee}</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={confirmAndSend}
                disabled={isSaving}
                className={`w-full py-3.5 rounded-2xl items-center flex-row justify-center mb-3 active:opacity-80 ${isSaving ? 'bg-[#CCFF00]/50' : 'bg-[#CCFF00]'}`}
              >
                {isIndividual && trainerFee > 0 ? (
                  <>
                    <CreditCard size={18} color="#000000" weight="bold" style={{ marginRight: 6 }} />
                    <Text className="text-black font-semibold text-sm">
                      {isSaving
                        ? "Connecting Web Portal..."
                        : (Platform.OS === 'ios' ? 'CONTINUE TO WEB PORTAL' : `ACTIVATE PLAN (₹${trainerFee})`)}
                    </Text>
                  </>
                ) : (
                  <>
                    <PaperPlaneRight size={18} color="#000000" weight="bold" style={{ marginRight: 6 }} />
                    <Text className="text-black font-semibold text-sm">
                      {isSaving ? "Sending..." : "Send Request"}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowConfirmModal(false)}
                className="bg-[#27272A] border border-[#3A3A3C] w-full py-3 rounded-2xl items-center active:opacity-70"
              >
                <Text className="text-white font-semibold text-sm">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={handleBack} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-semibold mr-8">Trainer Request</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mt-8 mb-6">
          <View className="w-20 h-20 bg-[#2D3319] rounded-full items-center justify-center relative mb-5 border border-[#3E4C14]">
            <Hourglass size={38} color="#CCFF00" weight="regular" />
            <View className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 bg-[#CCFF00] rounded-full border-2 border-[#0F0F0F]" />
          </View>
          <Text className="text-white text-2xl font-semibold mb-1.5">Request Pending</Text>
          <Text className="text-[#8E8E93] text-center text-xs px-4 leading-relaxed">
            Your request has been submitted to {nameToDisplay}.{'\n'}They will review your schedule and respond soon.
          </Text>
        </View>

        {isIndividual && (
          <View className="bg-[#141416] rounded-2xl border border-[#27272A] p-4 mb-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#27272A]">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-[#1C2307] items-center justify-center mr-3 border border-[#3E4C14]">
                  <CreditCard size={20} color="#CCFF00" weight="fill" />
                </View>
                <View>
                  <Text className="text-[#8E8E93] text-[10px] font-semibold uppercase tracking-wider">
                    {Platform.OS === 'ios' ? 'Training Access' : 'Trainer Plan'}
                  </Text>
                  <Text className="text-white text-sm font-semibold">
                    {latestPayment || paidPaymentInfo ? 'Verified Plan' : (Platform.OS === 'ios' ? 'Personal Coaching' : 'Online Payment')}
                  </Text>
                </View>
              </View>
              {Platform.OS !== 'ios' && (
                <View className="items-end">
                  <Text className="text-[#CCFF00] text-lg font-semibold">
                    ₹{paidPaymentInfo?.amount ?? latestPayment?.amountPaid ?? (trainerFee > 0 ? trainerFee : 0)}
                  </Text>
                  <Text className="text-[#8E8E93] text-[10px]">Monthly Fee</Text>
                </View>
              )}
            </View>

            {latestPayment || paidPaymentInfo ? (
              <View className="pt-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <ShieldCheck size={16} color="#34C759" weight="fill" style={{ marginRight: 5 }} />
                  <Text className="text-[#34C759] text-xs font-semibold">Plan Verified & Active</Text>
                </View>
                <Text className="text-[#8E8E93] text-[10px]">
                  {requestedDate}
                </Text>
              </View>
            ) : (
              <View className="pt-3">
                <Pressable
                  onPress={openWebCheckout}
                  disabled={isProcessingPayment}
                  className={`bg-[#CCFF00] py-3.5 rounded-xl items-center flex-row justify-center active:opacity-80 ${isProcessingPayment ? 'opacity-70' : ''}`}
                >
                  <Text className="text-black font-semibold text-xs uppercase tracking-wide mr-1">
                    {isProcessingPayment
                      ? "Connecting Web Portal..."
                      : (Platform.OS === 'ios' ? 'MANAGE TRAINING PLAN' : 'ACTIVATE TRAINING PLAN')}
                  </Text>
                  <CaretRight size={14} color="#000000" weight="bold" />
                </Pressable>

                {Platform.OS === 'ios' && (
                  <Text className="text-[#8E8E93] text-[11px] text-center mt-2.5 leading-4">
                    Manage your trainer plan and coach assignment securely on our web portal.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        <View className="bg-[#1A1A1A] rounded-2xl border border-[#27272A] mb-5">
          <View className="flex-row items-center p-4 border-b border-[#27272A]">
            <View className="w-11 h-11 bg-[#2D221C] rounded-xl items-center justify-center mr-3.5 border border-[#4A3225]">
              <Record size={22} color="#FF9F0A" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5 tracking-[1px] uppercase">Review Status</Text>
              <Text className="text-[#FF9F0A] text-sm font-semibold">{statusTitle}</Text>
            </View>
            <View className="border border-[#FF9F0A] rounded-full px-3 py-1 bg-[#3E3218]/40">
              <Text className="text-[#FF9F0A] text-xs font-medium">{displayStatus}</Text>
            </View>
          </View>

          <View className="flex-row items-center p-4 border-b border-[#27272A]">
            <View className="w-11 h-11 bg-[#222222] rounded-xl items-center justify-center mr-3.5 border border-[#27272A]">
              <User size={20} color="#FFFFFF" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5 tracking-[1px] uppercase">Requested Trainer</Text>
              <Text className="text-white text-sm font-semibold">{nameToDisplay}</Text>
            </View>
            <StaticAvatar
              uri={trainerProfilePic}
              name={nameToDisplay}
              gender={trainerGender}
              className="w-10 h-10 rounded-full border border-[#27272A]"
              size={40}
            />
          </View>

          <View className="flex-row items-center p-4">
            <View className="w-11 h-11 bg-[#222222] rounded-xl items-center justify-center mr-3.5 border border-[#27272A]">
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
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3 border border-[#3E4C14]">
                <FileText size={18} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">Trainer reviews your schedule</Text>
            </View>

            <View className="items-center flex-1 px-1">
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3 border border-[#3E4C14]">
                <Bell size={18} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">You'll receive a notification</Text>
            </View>

            <View className="items-center flex-1 px-1">
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3 border border-[#3E4C14]">
                <User size={18} color="#CCFF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">Start training once approved</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Cancel Request bottom action bar */}
      <View
        className="absolute bottom-0 left-0 right-0 p-4 bg-[#0F0F0F]/95 border-t border-[#1A1A1A]"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={() => setShowCancelModal(true)}
          className="flex-row justify-center items-center py-4 border border-[#551818] rounded-2xl bg-[#1D0909] active:opacity-75"
        >
          <Trash size={18} color="#FF3B30" weight="bold" />
          <Text className="text-[#FF3B30] font-semibold text-base ml-2">Cancel Request</Text>
        </Pressable>
      </View>

      {/* Cancel Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCancelModal}
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View className="flex-1 bg-black/85 justify-center items-center p-6">
          <View className="bg-[#18181B] w-full max-w-[340px] rounded-3xl p-6 items-center border border-[#27272A] shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-[#2A0F0F] items-center justify-center mb-4 border border-[#551818]">
              <Warning size={34} color="#FF3B30" weight="fill" />
            </View>

            <Text className="text-white text-xl font-semibold text-center mb-2">
              Withdraw Booking Request?
            </Text>

            <Text className="text-[#A1A1AA] text-sm text-center leading-5 mb-7 px-2">
              Are you sure you want to cancel your personal training request with <Text className="text-white font-semibold">{nameToDisplay}</Text>?
            </Text>

            <Pressable
              onPress={handleConfirmCancel}
              disabled={isDeleting}
              className={`bg-[#D32F2F] w-full py-4 rounded-2xl items-center flex-row justify-center mb-3 active:opacity-80 ${isDeleting ? 'opacity-50' : ''}`}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <View className="mr-2">
                    <Trash size={18} color="#FFFFFF" weight="bold" />
                  </View>
                  <Text className="text-white font-semibold text-base">Yes, Cancel Request</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => setShowCancelModal(false)}
              disabled={isDeleting}
              className="bg-[#27272A] w-full py-4 rounded-2xl items-center active:opacity-70"
            >
              <Text className="text-gray-200 font-semibold text-base">Keep Request & Wait</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
