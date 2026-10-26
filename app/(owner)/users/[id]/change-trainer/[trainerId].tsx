import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Users,
  CalendarBlank,
  Clock,
  ShieldCheck,
  CheckCircle,
  Barbell,
} from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useAssignedTrainersByCustomer, useSaveCustomerTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useUser } from '@/context/UserContext';
import { triggerSuccessHaptic, triggerErrorHaptic, triggerLightHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ConfirmTrainerAssignmentScreen() {
  const { id, trainerId } = useLocalSearchParams<{ id: string; trainerId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(id);
  const { data: gymTrainers = [], isLoading: isTrainersLoading } = useGymTrainers(
    customer?.gymId,
    Boolean(customer?.gymId)
  );
  const { data: assignedTrainers = [] } = useAssignedTrainersByCustomer(id);

  const selectedTrainer = useMemo(() => {
    return gymTrainers.find((t: any) => t.gymTrainerId === trainerId) || null;
  }, [gymTrainers, trainerId]);

  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [timings, setTimings] = useState('Morning 07:00 AM - 08:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveMutation = useSaveCustomerTrainer();

  const toggleDay = (day: string) => {
    triggerLightHaptic();
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        toast.error('Select at least one training day');
        return;
      }
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!customer?.gymId || !id || !trainerId) {
      toast.error('Missing required gym or member information.');
      return;
    }

    if (selectedDays.length === 0) {
      toast.error('Please select at least one workout day.');
      return;
    }

    if (!timings.trim()) {
      toast.error('Please specify session timings.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveMutation.mutateAsync({
        gymId: customer.gymId,
        customerId: id,
        gymTrainerId: trainerId,
        weekDays: selectedDays,
        timings: timings.trim(),
        assignedBy: userId || 'owner',
        isActive: true,
      });

      triggerSuccessHaptic();
      toast.success('Trainer successfully assigned!');
      router.dismissTo(`/(owner)/users/${id}/assigned-trainer` as any);
    } catch (err: any) {
      triggerErrorHaptic();
      toast.error(err?.message || 'Failed to assign trainer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isCustomerLoading || isTrainersLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading assignment setup...</Text>
      </View>
    );
  }

  if (!selectedTrainer) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center px-6">
        <Text className="text-white text-lg font-semibold mb-2">Trainer Not Found</Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-[#1A1A1A] border border-[#27272A] px-6 py-3 rounded-xl mt-4"
        >
          <Text className="text-[#CCF200] font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const trainerInitials = selectedTrainer.fullName
    ? selectedTrainer.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'TR';

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1F1F22]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Confirm Trainer</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      >
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
          <Text className="text-[#CCF200] text-xs font-semibold uppercase tracking-wider mb-3">
            Assignment Summary
          </Text>

          <View className="py-2.5 border-b border-[#222226] flex-row justify-between items-center">
            <Text className="text-gray-400 text-xs font-medium">Member</Text>
            <Text className="text-white text-sm font-semibold">{customer?.fullName || 'Customer'}</Text>
          </View>

          <View className="mt-4 flex-row items-center">
            {selectedTrainer.users?.profilePhoto ? (
              <Image
                source={{ uri: selectedTrainer.users.profilePhoto }}
                className="w-14 h-14 rounded-2xl border border-[#333] mr-4"
              />
            ) : (
              <View className="w-14 h-14 rounded-2xl bg-[#1C1F26] border border-[#333] items-center justify-center mr-4">
                <Text className="text-[#CCF200] font-semibold text-lg">{trainerInitials}</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-white text-base font-semibold">{selectedTrainer.fullName}</Text>
              <Text className="text-[#CCF200] text-xs mt-0.5">
                {selectedTrainer.specialization || 'Fitness Trainer'}
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">{selectedTrainer.phone || ''}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
          <View className="flex-row items-center mb-3">
            <CalendarBlank size={18} color="#CCF200" weight="bold" />
            <Text className="text-white text-base font-semibold ml-2">Workout Days</Text>
          </View>
          <Text className="text-gray-400 text-xs mb-3">
            Select the recurring days this trainer will supervise sessions:
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-6">
            {ALL_DAYS.map(day => {
              const isSelected = selectedDays.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  className={`px-3.5 py-2 rounded-xl active:opacity-70 border ${isSelected
                    ? 'bg-[#CCF200] border-[#CCF200]'
                    : 'bg-[#1C1F26] border-[#2A2E38]'
                    }`}
                >
                  <Text
                    className={`text-xs font-semibold ${isSelected ? 'text-black' : 'text-gray-300'
                      }`}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row items-center mb-2">
            <Clock size={18} color="#CCF200" weight="bold" />
            <Text className="text-white text-base font-semibold ml-2">Session Timings</Text>
          </View>
          <Text className="text-gray-400 text-xs mb-2">
            Enter the scheduled hours for training sessions:
          </Text>

          <View className="bg-[#1C1F26] border border-[#2A2E38] rounded-xl px-4 py-3 mb-2">
            <TextInput
              value={timings}
              onChangeText={setTimings}
              placeholder="e.g. Morning 07:00 AM - 08:00 AM"
              placeholderTextColor="#666"
              className="text-white text-sm py-0"
            />
          </View>

          <View className="flex-row flex-wrap gap-2 mt-2">
            {[
              'Morning 06:00 AM - 07:00 AM',
              'Morning 07:00 AM - 08:00 AM',
              'Evening 06:00 PM - 07:00 PM',
              'Evening 07:00 PM - 08:00 PM',
            ].map(preset => (
              <Pressable
                key={preset}
                onPress={() => {
                  triggerLightHaptic();
                  setTimings(preset);
                }}
                className={`px-2.5 py-1 rounded-lg border ${timings === preset
                  ? 'bg-[#CCF200]/20 border-[#CCF200]'
                  : 'bg-[#181B22] border-[#252A36]'
                  }`}
              >
                <Text
                  className={`text-[11px] font-medium ${timings === preset ? 'text-[#CCF200]' : 'text-gray-400'
                    }`}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleConfirmAssignment}
          disabled={isSubmitting}
          className={`mt-6 rounded-2xl py-4 items-center justify-center flex-row gap-2 ${isSubmitting ? 'bg-[#CCF200]/50' : 'bg-[#CCF200] active:opacity-80'
            }`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <CheckCircle size={20} color="#000000" weight="bold" />
              <Text className="text-black font-semibold text-base">Confirm & Assign Trainer</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
