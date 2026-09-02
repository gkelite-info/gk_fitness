import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, EnvelopeSimple, CalendarBlank, User, Star, Check, X, ClockClockwise } from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useGymTrainerById } from '@/hooks/trainers/useGymTrainers';
import { useSaveCustomerTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymOwners } from '@/hooks/gymOwners/useGymOwners';
import { useGymTimings } from '@/hooks/gymTimings/useGymTimings';
import ConfirmModal from '@/components/ConfirmModal';
import { useUser } from '@/context/UserContext';

export default function AssignTrainerConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customerId, gymTrainerId } = useLocalSearchParams<{ customerId: string, gymTrainerId: string }>();
  const { userId } = useUser();

  const { data: customer, isLoading: isLoadingCustomer } = useGymCustomerById(customerId);
  const { data: trainerData, isLoading: isLoadingTrainer } = useGymTrainerById(gymTrainerId);
  const { data: gymOwners } = useGymOwners();
  const { mutate: assignTrainer, isPending: isAssigning } = useSaveCustomerTrainer();
  const { data: gymTimings } = useGymTimings(customer?.gymId);

  const trainer = trainerData?.trainer;
  const currentGymOwner = gymOwners?.find(owner => owner.userId === userId);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<'assign' | 'cancel'>('assign');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const dayMap: Record<string, string> = {
    'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday',
    'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
    setSelectedTime('');
  };

  const getAvailableTimings = () => {
    if (!gymTimings || gymTimings.length === 0) {
      return ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'];
    }
    if (selectedDays.length === 0) return [];

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

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleAssign = () => {
    setModalAction('assign');
    setModalVisible(true);
  };

  const handleCancel = () => {
    router.back();
  };

  const confirmAction = () => {
    if (modalAction === 'assign' && customerId && gymTrainerId && customer?.gymId && currentGymOwner?.gymOwnerId) {
      assignTrainer(
        {
          gymId: customer.gymId,
          customerId: customerId,
          gymTrainerId: gymTrainerId,
          weekDays: selectedDays,
          timings: selectedTime,
          assignedBy: currentGymOwner.gymOwnerId,
          isActive: true
        },
        {
          onSuccess: () => {
            setModalVisible(false);
            router.navigate('/(owner)/profile/personal-training'); // or just go back a few screens
          }
        }
      );
    } else {
      setModalVisible(false);
    }
  };

  if (isLoadingCustomer || isLoadingTrainer) {
    return (
      <View className="flex-1 bg-[#0F0F0F] justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  if (!customer || !trainer) {
    return (
      <View className="flex-1 bg-[#0F0F0F] justify-center items-center">
        <Text className="text-white">Data not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-[#1F1F1F] rounded-lg">
          <Text className="text-[#CCFF00]">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-5 pb-4 border-b border-[#1F1F1F]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#1F1F1F] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View>
          <Text className="text-white text-xl font-semibold">Confirm Assignment</Text>
          <Text className="text-[#A1A1AA] text-xs mt-0.5">Review details before assigning trainer</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
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
                  {customer?.customId || `CUST-${(customer?.customerId || '').slice(0, 4).toUpperCase()}`}
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

        <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3 uppercase">Selected Trainer</Text>
        <View className="bg-[#1A1A1A] rounded-2xl p-5 mb-8 border border-[#222222]">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-[#1F2937] overflow-hidden mr-4 items-center justify-center border border-[#333333]">
              {trainer?.users?.profilePhoto || trainer?.profilePicture ? (
                <Image source={{ uri: trainer?.users?.profilePhoto || trainer?.profilePicture }} className="w-full h-full" />
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

        <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3 uppercase">Schedule</Text>
        <View className="mb-6">
          <Text className="text-white text-sm font-semibold mb-1">Workout Days</Text>
          <Text className="text-[#8E8E93] text-xs mb-3">Select the days for personal training</Text>

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
                  className={`w-14 h-14 rounded-xl items-center justify-center mr-3 border ${isSelected ? 'border-[#CCFF00] bg-[#1A1A1A]' : 'border-[#27272A] bg-[#1A1A1A]'} ${isClosed ? 'opacity-30' : ''}`}
                >
                  <Text className={`font-semibold text-sm ${isSelected ? 'text-[#CCFF00]' : 'text-[#8E8E93]'}`}>{day}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View className="flex-row items-center mb-6 mt-1">
            <CalendarBlank size={12} color="#CCFF00" style={{ marginRight: 4 }} />
            <Text className="text-[#8E8E93] text-[10px]">You can select multiple days. Closed days are disabled.</Text>
          </View>

          <Text className="text-white text-sm font-semibold mb-1">Workout Time</Text>
          <Text className="text-[#8E8E93] text-xs mb-3">Select the preferred time slot</Text>

          <View className="flex-row flex-wrap justify-between">
            {availableTimings.length > 0 ? availableTimings.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  className={`w-[48%] py-3 rounded-xl items-center flex-row justify-center mb-3 border relative ${isSelected ? 'border-[#CCFF00] bg-[#1A1A1A]' : 'border-[#27272A] bg-[#1A1A1A]'}`}
                >
                  <Text className={`font-semibold text-sm ${isSelected ? 'text-[#CCFF00]' : 'text-[#8E8E93]'}`}>{time}</Text>
                  {isSelected && (
                    <View className="absolute -top-1 -right-1 bg-[#CCFF00] rounded-full p-0.5 border border-[#0F0F0F]">
                      <Check size={10} color="#000" weight="bold" />
                    </View>
                  )}
                </Pressable>
              );
            }) : (
              <View className="w-full py-5 items-center justify-center border border-[#27272A] rounded-xl bg-[#1A1A1A]">
                <Text className="text-[#8E8E93] text-sm">
                  {selectedDays.length === 0
                    ? "Select days to view available times"
                    : "No common times available"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className=" p-4 flex-row items-center pb-8">
          <Pressable
            disabled={isAssigning}
            onPress={handleCancel}
            className="flex-1 flex-row items-center justify-center border border-red-500 rounded-xl py-3.5 mr-3 active:bg-red-500/20"
          >
            <X size={16} color="#EF4444" weight="bold" />
            <Text className="text-red-500 font-semibold ml-2">Cancel</Text>
          </Pressable>
          <Pressable
            disabled={isAssigning || selectedDays.length === 0 || !selectedTime}
            onPress={handleAssign}
            className={`flex-1 flex-row items-center justify-center rounded-xl py-3.5 active:opacity-80 ${(isAssigning || selectedDays.length === 0 || !selectedTime) ? 'bg-[#CCFF00]/50' : 'bg-[#CCFF00]'}`}
          >
            <Check size={16} color="#000000" weight="bold" />
            <Text className="text-black font-semibold ml-2">Assign Trainer</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        title={"Assign Trainer?"}
        description={`Are you sure you want to assign ${trainer?.fullName} as a personal trainer for ${customer?.fullName || customer?.name}?`}
        onConfirm={confirmAction}
        onClose={() => setModalVisible(false)}
        confirmText={isAssigning ? "Assigning..." : "Assign"}
        confirmButtonColor={'bg-[#CCFF00]'}
        confirmTextColor={'text-black'}
      />
    </View>
  );
}
