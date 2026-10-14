import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  MagnifyingGlass,
  Barbell,
  Users,
  CheckCircle,
  Phone,
  ArrowRight,
  Info,
} from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { triggerLightHaptic } from '@/lib/haptics';

export default function ChangeTrainerSelectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(id);
  const { data: gymTrainers = [], isLoading: isTrainersLoading } = useGymTrainers(
    customer?.gymId,
    Boolean(customer?.gymId)
  );
  const { data: assignedTrainers = [] } = useAssignedTrainersByCustomer(id);

  const activeAssignment = useMemo(() => {
    return assignedTrainers.find((t: any) => t.isActive && !t.is_deleted) || null;
  }, [assignedTrainers]);

  const filteredTrainers = useMemo(() => {
    return gymTrainers.filter((t: any) => {
      const matchesSearch =
        !search.trim() ||
        t.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        t.specialization?.toLowerCase().includes(search.toLowerCase()) ||
        t.phone?.includes(search);
      return matchesSearch && t.is_Active !== false;
    });
  }, [gymTrainers, search]);

  const isLoading = isCustomerLoading || isTrainersLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading trainers...</Text>
      </View>
    );
  }

  const handleSelectTrainer = (trainerId: string) => {
    triggerLightHaptic();
    router.push(`/(owner)/users/${id}/change-trainer/${trainerId}` as any);
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
        <Text className="text-white text-lg font-bold">Select Trainer</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Notice Card */}
        <View className="bg-[#10141C] border border-[#212735] rounded-2xl p-4 mt-4 flex-row items-center">
          <Info size={20} color="#CCF200" weight="bold" />
          <Text className="text-gray-300 text-xs ml-3 flex-1 leading-5">
            Selecting a new trainer will assign them to{' '}
            <Text className="text-white font-bold">{customer?.fullName || 'this member'}</Text>.
          </Text>
        </View>

        {/* Current Trainer Highlight if any */}
        {activeAssignment?.trainer && (
          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4">
            <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              Currently Assigned
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#333] items-center justify-center mr-3">
                  <Text className="text-[#CCF200] font-bold text-sm">
                    {activeAssignment.trainer.fullName?.charAt(0) || 'T'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-bold" numberOfLines={1}>
                    {activeAssignment.trainer.fullName}
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    {activeAssignment.trainer.specialization || 'Personal Trainer'}
                  </Text>
                </View>
              </View>
              <View className="px-2 py-0.5 rounded bg-[#373F0E]">
                <Text className="text-[#CCF200] text-[10px] font-bold">Current</Text>
              </View>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl flex-row items-center px-4 py-3 mt-4">
          <MagnifyingGlass size={18} color="#71717A" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search trainers by name or specialty..."
            placeholderTextColor="#666"
            className="flex-1 text-white text-sm ml-3 py-0"
          />
        </View>

        {/* Trainers List */}
        <Text className="text-[#CCF200] text-xs font-bold uppercase tracking-wider mt-6 mb-3">
          Available Gym Trainers ({filteredTrainers.length})
        </Text>

        {filteredTrainers.length === 0 ? (
          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-8 items-center mt-2">
            <Barbell size={32} color="#666" />
            <Text className="text-white text-sm font-semibold mt-3">No Trainers Found</Text>
            <Text className="text-gray-400 text-xs text-center mt-1">
              {search ? 'Try adjusting your search query.' : 'No active trainers available in this gym.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredTrainers.map((trainer: any) => {
              const isCurrent = activeAssignment?.gymTrainerId === trainer.gymTrainerId;
              const initials = trainer.fullName
                ? trainer.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                : 'TR';

              return (
                <View
                  key={trainer.gymTrainerId}
                  className={`bg-[#141416] border rounded-2xl p-4 ${
                    isCurrent ? 'border-[#CCF200]/40' : 'border-[#242424]'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 mr-3">
                      {trainer.users?.profilePhoto ? (
                        <Image
                          source={{ uri: trainer.users.profilePhoto }}
                          className="w-12 h-12 rounded-xl border border-[#333] mr-3"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-xl bg-[#1C1F26] border border-[#333] items-center justify-center mr-3">
                          <Text className="text-[#CCF200] font-bold text-base">{initials}</Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-white text-base font-bold" numberOfLines={1}>
                          {trainer.fullName}
                        </Text>
                        <Text className="text-[#CCF200] text-xs font-semibold mt-0.5">
                          {trainer.specialization || 'Fitness Trainer'}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-0.5">
                          {trainer.phone || 'No phone'}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => handleSelectTrainer(trainer.gymTrainerId)}
                      className={`px-4 py-2 rounded-xl active:opacity-80 ${
                        isCurrent
                          ? 'bg-[#1C1F26] border border-[#2A2E38]'
                          : 'bg-[#CCF200]'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-gray-300' : 'text-black'
                        }`}
                      >
                        {isCurrent ? 'Reassign' : 'Select'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
