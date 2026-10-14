import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Linking, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Barbell,
  Users,
  Phone,
  EnvelopeSimple,
  CalendarBlank,
  Clock,
  Sparkle,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { triggerLightHaptic } from '@/lib/haptics';

export default function UserAssignedTrainerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(id);
  const { data: trainers = [], isLoading: isTrainersLoading } = useAssignedTrainersByCustomer(id);

  const activeAssignment = useMemo(() => {
    return trainers.find((t: any) => t.isActive && !t.is_deleted) || null;
  }, [trainers]);

  const trainer = activeAssignment?.trainer;

  const memberCode = useMemo(() => {
    if (!id) return 'CUST-XXXX';
    return `CUST-${id.substring(0, 6).toUpperCase()}`;
  }, [id]);

  const isLoading = isCustomerLoading || isTrainersLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading trainer details...</Text>
      </View>
    );
  }

  const initials = trainer?.fullName
    ? trainer.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'TR';

  const assignedSince = activeAssignment?.assignedOn
    ? new Date(activeAssignment.assignedOn).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

  const weekDays = activeAssignment?.weekDays || ['Mon', 'Wed', 'Fri'];
  const timings = activeAssignment?.timings || 'Morning 7:00 AM - 8:00 AM';

  const handleChangeTrainer = () => {
    triggerLightHaptic();
    router.push(`/(owner)/users/${id}/change-trainer` as any);
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1F1F22]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Assigned Trainer</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Member Strip */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4 flex-row items-center justify-between">
          <View>
            <Text className="text-gray-400 text-xs">Member</Text>
            <Text className="text-white text-base font-bold mt-0.5">{customer?.fullName || 'Customer'}</Text>
          </View>
          <View className="bg-[#1C1F26] border border-[#2A2E38] px-3 py-1 rounded-lg">
            <Text className="text-[#CCF200] text-xs font-semibold">{memberCode}</Text>
          </View>
        </View>

        {/* Current Trainer Section */}
        {trainer ? (
          <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[#CCF200] text-xs font-bold uppercase tracking-wider">
                Current Assigned Trainer
              </Text>
              <View className="px-2.5 py-0.5 rounded-md bg-[#373F0E]">
                <Text className="text-[#CCF200] text-[10px] font-bold uppercase">Active</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-5">
              {trainer.users?.profilePhoto ? (
                <Image
                  source={{ uri: trainer.users.profilePhoto }}
                  className="w-16 h-16 rounded-2xl border border-[#333] mr-4"
                />
              ) : (
                <View className="w-16 h-16 rounded-2xl bg-[#1C1F26] border border-[#333] items-center justify-center mr-4">
                  <Text className="text-[#CCF200] text-xl font-bold">{initials}</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-white text-xl font-bold" numberOfLines={1}>
                  {trainer.fullName}
                </Text>
                <Text className="text-[#CCF200] text-xs font-semibold mt-0.5">
                  {trainer.specialization || 'Personal Trainer'}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  Since {assignedSince}
                </Text>
              </View>
            </View>

            {/* Contact row */}
            <View className="pt-3 border-t border-[#222226] gap-2 mb-4">
              {trainer.phone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${trainer.phone}`)}
                  className="flex-row items-center py-1.5 active:opacity-70"
                >
                  <View className="w-7 h-7 rounded-lg bg-[#1C1F26] items-center justify-center mr-3">
                    <Phone size={14} color="#CCF200" />
                  </View>
                  <Text className="text-gray-300 text-xs flex-1">{trainer.phone}</Text>
                  <Text className="text-[#CCF200] text-xs font-semibold">Call</Text>
                </Pressable>
              )}

              {trainer.email && (
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${trainer.email}`)}
                  className="flex-row items-center py-1.5 active:opacity-70"
                >
                  <View className="w-7 h-7 rounded-lg bg-[#1C1F26] items-center justify-center mr-3">
                    <EnvelopeSimple size={14} color="#A1A1AA" />
                  </View>
                  <Text className="text-gray-300 text-xs flex-1" numberOfLines={1}>{trainer.email}</Text>
                </Pressable>
              )}
            </View>

            {/* Schedule Info */}
            <View className="bg-[#1C1F26] border border-[#2A2E38] rounded-2xl p-4 mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <CalendarBlank size={16} color="#CCF200" />
                  <Text className="text-white text-xs font-bold ml-2">Training Days</Text>
                </View>
                <View className="flex-row gap-1">
                  {weekDays.map((day: string, idx: number) => (
                    <View key={idx} className="bg-[#242A36] px-2 py-0.5 rounded-md">
                      <Text className="text-[#CCF200] text-[10px] font-bold">{day}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-row items-center justify-between pt-2 border-t border-[#2A2E38]">
                <View className="flex-row items-center">
                  <Clock size={16} color="#CCF200" />
                  <Text className="text-white text-xs font-bold ml-2">Session Timings</Text>
                </View>
                <Text className="text-gray-300 text-xs font-medium">{timings}</Text>
              </View>
            </View>

            {/* Change Trainer Button */}
            <Pressable
              onPress={handleChangeTrainer}
              className="bg-[#CCF200] rounded-2xl py-3.5 items-center justify-center flex-row gap-2 active:opacity-80"
            >
              <Users size={18} color="#000000" weight="bold" />
              <Text className="text-black font-bold text-sm">Change Trainer</Text>
            </Pressable>
          </View>
        ) : (
          <View className="bg-[#141416] border border-[#242424] rounded-3xl p-6 mt-4 items-center">
            <View className="w-16 h-16 rounded-full bg-[#1C1F26] border border-[#333] items-center justify-center mb-4">
              <Barbell size={32} color="#888" />
            </View>
            <Text className="text-white text-lg font-bold text-center">
              No Trainer Assigned
            </Text>
            <Text className="text-gray-400 text-xs text-center mt-1 mb-6 px-4 leading-5">
              Assign a certified personal trainer to manage workout routines, track form, and optimize nutrition for this member.
            </Text>

            <Pressable
              onPress={handleChangeTrainer}
              className="bg-[#CCF200] rounded-2xl py-3.5 px-6 items-center justify-center flex-row gap-2 w-full active:opacity-80"
            >
              <Users size={18} color="#000000" weight="bold" />
              <Text className="text-black font-bold text-sm">Assign a Trainer</Text>
            </Pressable>
          </View>
        )}

        {/* Benefits Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4">
          <View className="flex-row items-center mb-3">
            <ShieldCheck size={18} color="#CCF200" weight="bold" />
            <Text className="text-white text-sm font-bold ml-2">Personal Training Protocol</Text>
          </View>
          <Text className="text-gray-400 text-xs leading-5">
            Trainers assigned to members gain access to craft customized workout splits, record biometric body composition logs, and monitor attendance adherence directly from their Trainer Portal.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
