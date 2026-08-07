import React from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  CalendarBlank,
  User,
  Phone,
  EnvelopeSimple,
  Globe,
  Users,
  Barbell,
  PencilSimple,
  Power,
  DotsThreeVertical
} from 'phosphor-react-native';
import { useGyms } from '@/hooks/gyms/useGyms';
import { useGymOwners } from '@/hooks/gymOwners/useGymOwners';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { toggleGymActiveStatus } from '@/helpers/gym/gymHelper';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from '@/lib/toast';

export default function GymDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const { data: gyms, isLoading: isLoadingGyms } = useGyms();
  const { data: owners, isLoading: isLoadingOwners } = useGymOwners();
  const { data: trainers, isLoading: isLoadingTrainers } = useGymTrainers(id);
  const { data: customers, isLoading: isLoadingCustomers } = useGymCustomers(id);

  if (isLoadingGyms || isLoadingOwners || isLoadingTrainers || isLoadingCustomers) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#BAFF00" />
      </View>
    );
  }

  const handleBack = () => {
    router.push
  }

  const gym = gyms?.find((g) => g.gymId === id);
  const owner = owners?.find((o) => o.gymId === id);

  if (!gym) {
    return (
      <View className="flex-1 bg-[#0A0A0A] p-4">
        <View className="flex-row items-center gap-3 mb-6">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center">
            <ArrowLeft size={18} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xl font-semibold text-white">Gym Not Found</Text>
        </View>
      </View>
    );
  }

  const formatPgDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const trainersCount = trainers?.length || 0;
  const customersCount = customers?.length || 0;

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-5">
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#1A1A1A] items-center justify-center active:opacity-70">
            <ArrowLeft size={18} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text className="text-xl font-semibold text-white">Gym Details</Text>
            <Text className="text-[10px] text-[#A1A1AA]">View and manage gym information.</Text>
          </View>
        </View>
        <Pressable className="w-9 h-9 rounded-full bg-[#1A1A1A] items-center justify-center">
          <DotsThreeVertical size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4 flex-row gap-4 mb-6">
          {gym.logo ? (
            <Image source={{ uri: gym.logo }} className="w-24 h-24 rounded-2xl bg-[#1A1A1A]" resizeMode="cover" />
          ) : (
            <View className="w-24 h-24 rounded-2xl bg-[#1A1A1A] items-center justify-center">
              <Text className="text-[#A1A1AA] text-xs font-semibold">LOGO</Text>
            </View>
          )}

          <View className="flex-1 justify-center">
            <Text className="text-xl font-semibold text-white mb-1">{gym.gymName}</Text>
            <View className="flex-row items-center gap-1.5 mb-2">
              <View className={`w-1.5 h-1.5 rounded-full ${gym.isActive ? 'bg-[#BAFF00]' : 'bg-red-500'}`} />
              <Text className={`text-[12px] font-semibold ${!gym.isActive ? 'text-red-500' : ''}`} style={gym.isActive ? { color: '#BAFF00' } : undefined}>
                {gym.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5 mb-1">
              <MapPin size={12} color="#A1A1AA" />
              <Text className="text-[12px] text-[#A1A1AA]">{gym.city}, {gym.state}</Text>
            </View>

            <View className="flex-row items-center gap-1.5 mb-1">
              <CalendarBlank size={12} color="#A1A1AA" />
              <Text className="text-[12px] text-[#A1A1AA]">Registered on {formatPgDate(gym.createdAt)}</Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              <View className="w-[12px] h-[12px] border border-[#A1A1AA] rounded-full items-center justify-center">
                <View className="w-[6px] h-[6px] bg-transparent rounded-full" />
              </View>
              <Text className="text-[12px] text-[#A1A1AA]">Gym ID: {gym.gymId}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2 mb-3">
          <User size={16} color="#BAFF00" />
          <Text className="text-sm font-semibold" style={{ color: '#BAFF00' }}>Owner Details</Text>
        </View>
        <View className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-[#1A1A1A] items-center justify-center overflow-hidden border border-[#1F1F1F]">
                <User size={24} color="#A1A1AA" />
              </View>
              <View>
                <Text className="text-lg font-semibold text-white">{owner?.ownerFullname || 'Unknown Owner'}</Text>
                <View className="bg-[#1A2600] px-2 py-0.5 rounded mt-1 self-start">
                  <Text className="text-[10px] font-semibold" style={{ color: '#BAFF00' }}>OWNER</Text>
                </View>
              </View>
            </View>
            {/* <Pressable className="border rounded-lg px-3 py-1.5" style={{ borderColor: "#BAFF00" }}>
              <Text className="text-xs font-semibold" style={{ color: '#BAFF00' }}>View Profile</Text>
            </Pressable> */}
          </View>

          <View className="flex-row items-center gap-2 mb-2">
            <EnvelopeSimple size={14} color="#A1A1AA" />
            <Text className="text-sm text-[#A1A1AA]">{owner?.ownerEmail || 'N/A'}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Phone size={14} color="#A1A1AA" />
            <Text className="text-sm text-[#A1A1AA]">{owner?.ownerPhone ? `${owner.ownerPhone}` : 'N/A'}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 mb-3">
          <Phone size={16} color="#BAFF00" />
          <Text className="text-sm font-semibold" style={{ color: '#BAFF00' }}>Contact Information</Text>
        </View>
        <View className="bg-[#111111] border border-[#1F1F1F] rounded-2xl mb-6">
          <View className="flex-row items-center justify-between p-4 border-b border-[#1F1F1F]">
            <View>
              <Text className="text-[10px] text-[#A1A1AA] mb-0.5">Phone Number</Text>
              <Text className="text-sm text-white">{gym.phoneCode} {gym.phone || 'N/A'}</Text>
            </View>
            <View className="w-8 h-8 rounded-full border border-[#2A2A2A] items-center justify-center">
              <Phone size={14} color="#A1A1AA" />
            </View>
          </View>

          <View className="flex-row items-center justify-between p-4 border-b border-[#1F1F1F]">
            <View>
              <Text className="text-[10px] text-[#A1A1AA] mb-0.5">Email Address</Text>
              <Text className="text-sm text-white">{gym.gymEmail || 'N/A'}</Text>
            </View>
            <View className="w-8 h-8 rounded-full border border-[#2A2A2A] items-center justify-center">
              <EnvelopeSimple size={14} color="#A1A1AA" />
            </View>
          </View>

          <View className="flex-row items-center justify-between p-4">
            <View>
              <Text className="text-[10px] text-[#A1A1AA] mb-0.5">Website</Text>
              <Text className="text-sm text-white">{gym.website || 'N/A'}</Text>
            </View>
            <View className="w-8 h-8 rounded-full border border-[#2A2A2A] items-center justify-center">
              <Globe size={14} color="#A1A1AA" />
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2 mb-3">
          <MapPin size={16} color="#BAFF00" />
          <Text className="text-sm font-semibold" style={{ color: '#BAFF00' }}>Address</Text>
        </View>
        <View className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4 flex-row gap-3 mb-6">
          <View className="mt-0.5">
            <MapPin size={16} color="#A1A1AA" />
          </View>
          <Text className="text-sm text-[#A1A1AA] leading-5 flex-1">{gym.address}, {gym.city}, {gym.state}</Text>
        </View>

        <View className="flex-row items-center gap-4 mb-6">
          <View className="flex-1 bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 items-center justify-center">
            <View className="w-10 h-10 rounded-full border border-[#1F1F1F] items-center justify-center mb-3">
              <Users size={20} color="#BAFF00" />
            </View>
            <Text className="text-2xl font-semibold text-white mb-1">{customersCount}</Text>
            <Text className="text-[9px] font-semibold tracking-wider text-[#A1A1AA]">TOTAL CUSTOMERS</Text>
          </View>
          <View className="flex-1 bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 items-center justify-center">
            <View className="w-10 h-10 rounded-full border border-[#1F1F1F] items-center justify-center mb-3">
              <Barbell size={20} color="#BAFF00" />
            </View>
            <Text className="text-2xl font-semibold text-white mb-1">{trainersCount}</Text>
            <Text className="text-[9px] font-semibold tracking-wider text-[#A1A1AA]">TOTAL TRAINERS</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 mb-5">
          <PencilSimple size={16} color="#BAFF00" />
          <Text className="text-sm font-semibold" style={{ color: '#BAFF00' }}>Actions</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => router.push({ pathname: '/(superadmin)/dashboard/register', params: { editGymId: gym.gymId } } as any)}
            className="flex-1 bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4 items-center justify-center">
            <View className="w-10 h-10 rounded-full border border-[#2A2A2A] items-center justify-center mb-2">
              <PencilSimple size={16} color="#BAFF00" />
            </View>
            <Text className="text-xs font-medium text-white">Edit Gym</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowConfirm(true)}
            disabled={isToggling}
            className={`flex-1 bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4 items-center justify-center ${isToggling ? 'opacity-50' : ''}`}>
            {isToggling ? (
              <ActivityIndicator size="small" color={gym.isActive ? "#EF4444" : "#BAFF00"} />
            ) : (
              <>
                <View className={`w-10 h-10 rounded-full border items-center justify-center mb-2 ${gym.isActive ? 'border-[#542121]' : 'border-[#BAFF00]/30'}`}>
                  <Power size={16} color={gym.isActive ? "#EF4444" : "#BAFF00"} />
                </View>
                <Text className={`text-xs font-medium ${gym.isActive ? 'text-[#EF4444]' : 'text-[#BAFF00]'}`}>
                  {gym.isActive ? 'Deactivate' : 'Activate'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={gym.isActive ? 'Deactivate Gym' : 'Activate Gym'}
        description={`Are you sure you want to ${gym.isActive ? 'deactivate' : 'activate'} this gym?`}
        confirmText={gym.isActive ? 'Deactivate' : 'Activate'}
        confirmButtonColor={gym.isActive ? 'bg-red-500' : 'bg-[#BAFF00]'}
        confirmTextColor={gym.isActive ? 'text-white' : 'text-black'}
        icon={<Power size={32} color={gym.isActive ? "#EF4444" : "#BAFF00"} />}
        onConfirm={async () => {
          setShowConfirm(false);
          try {
            setIsToggling(true);
            await toggleGymActiveStatus(gym.gymId!, gym.isActive ?? true);
            await queryClient.invalidateQueries({ queryKey: ['gyms'] });
            toast.success(gym.isActive ? 'Gym deactivated successfully' : 'Gym activated successfully');
          } catch (error) {
            console.error('Failed to toggle gym status:', error);
            Alert.alert('Error', 'Failed to update gym status.');
          } finally {
            setIsToggling(false);
          }
        }}
      />
    </View>
  );
}
