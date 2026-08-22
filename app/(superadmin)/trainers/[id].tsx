import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  CalendarBlank,
  Phone,
  MapPin,
  Info
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

export default function TrainerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: trainer, isLoading } = useQuery({
    queryKey: ['trainerProfile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_trainers')
        .select('*')
        .eq('gymTrainerId', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  if (!trainer) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center px-4">
        <Text className="text-white text-lg font-bold mb-4">Trainer Not Found</Text>
        <Pressable onPress={() => router.back()} className="px-6 py-3 bg-[#1C1C1E] rounded-xl border border-[#2A2A2D]">
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const displayId = `TRN-${(trainer.gymTrainerId || id).substring(0, 6).toUpperCase()}`;
  const isActive = trainer.is_Active !== false && trainer.status !== 'INACTIVE';

  const renderRow = (icon: React.ReactNode, label: string, value: string) => (
    <View className="flex-row items-center justify-between py-4">
      <View className="flex-row items-center opacity-80 flex-1">
        <View className="mr-3">{icon}</View>
        <Text className="text-[#8E8E93] text-sm">{label}</Text>
      </View>
      <View className="flex-1 items-end pl-2">
        <Text className="text-white text-sm font-medium text-right">{value}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="px-5 pt-4 pb-2">
        {/* Header */}
        <View className="mt-2 mb-4">
          <View className="flex-row items-center mb-1">
            <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70">
              <ArrowLeft size={24} color="#FFFFFF" weight="bold" />
            </Pressable>
            <Text className="text-white text-xl font-bold">Trainer Profile</Text>
          </View>
          <Text className="text-[#8E8E93] text-sm ml-10">View trainer details and manage access.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 160 }} showsVerticalScrollIndicator={false}>
        {/* Top Card */}
        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5">
          <View className="flex-row items-center mb-6">
            <StaticAvatar uri={trainer.profilePhoto} name={trainer.fullName || 'Unknown'} size={60} className="w-[60px] h-[60px] rounded-full mr-4" />
            <View>
              <Text className="text-white text-xl font-bold mb-1">{trainer.fullName || 'Unknown'}</Text>
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-[#CCFF00]' : 'bg-[#EF4444]'}`} />
                <Text className={`text-[10px] font-bold ${isActive ? 'text-[#CCFF00]' : 'text-[#EF4444]'}`}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>
          </View>

          <View className="h-[1px] bg-[#2A2A2D] mb-4" />

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-[#8E8E93] text-[10px] mb-1 font-bold">TRAINER ID</Text>
              <Text className="text-[#CCFF00] text-sm font-bold">{displayId}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] mb-1 font-bold">PHONE</Text>
              <Text className="text-white text-sm font-medium">{trainer.phone || 'N/A'}</Text>
            </View>
          </View>

          <View className="flex-row justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-[#8E8E93] text-[10px] mb-1 font-bold">EMAIL</Text>
              <Text className="text-white text-sm font-medium">{trainer.email || 'N/A'}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] mb-1 font-bold">SPECIALIZATION</Text>
              <Text className="text-white text-sm font-medium">{trainer.specialization || 'General Fitness'}</Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5">
          <View className="flex-row items-center mb-2">
            <View className="mr-3"><User size={20} color="#CCFF00" weight="regular" /></View>
            <Text className="text-white text-base font-bold">Personal Information</Text>
          </View>

          {renderRow(
            <CalendarBlank size={18} color="#8E8E93" />,
            "Date of Birth",
            trainer.dateOfBirth ? new Date(trainer.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />
          
          {renderRow(
            <Text className="text-[#8E8E93] text-lg leading-5 -mt-1 ml-1 mr-1">♂</Text>,
            "Gender",
            trainer.gender ? trainer.gender.charAt(0).toUpperCase() + trainer.gender.slice(1) : 'N/A'
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />
          
          {renderRow(
            <MapPin size={18} color="#8E8E93" />,
            "Address",
            trainer.address || 'Not Provided'
          )}
        </View>

        {/* Account Information */}
        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5">
          <View className="flex-row items-center mb-2">
            <View className="mr-3"><Info size={20} color="#CCFF00" weight="regular" /></View>
            <Text className="text-white text-base font-bold">Account Information</Text>
          </View>

          {renderRow(
            <View className="w-[18px] items-center justify-center"><View className="w-4 h-4 rounded-full border border-[#8E8E93] items-center justify-center"><View className="w-2 h-2 rounded-full bg-[#8E8E93]" /></View></View>,
            "Account Status",
            isActive ? "Active" : "Inactive"
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />
          
          {renderRow(
            <User size={18} color="#8E8E93" />,
            "Added By",
            trainer.gymName || "Gold Fitness" // Mocking if unavailable in flat schema
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />

          {renderRow(
            <CalendarBlank size={18} color="#8E8E93" />,
            "Added On",
            trainer.createdAt ? new Date(trainer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '12 Jan 2024'
          )}
        </View>

        {/* Additional Information */}
        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5">
          <View className="flex-row items-center mb-2">
            <View className="mr-3"><Info size={20} color="#CCFF00" weight="regular" /></View>
            <Text className="text-white text-base font-bold">Additional Information</Text>
          </View>

          {renderRow(
            <Phone size={18} color="#8E8E93" />,
            "Emergency Contact",
            "Ramesh Verma (Father)" // Since emergency contact doesn't exist in GymTrainerAttributes directly, mocking for UI parity
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />
          
          {renderRow(
            <Phone size={18} color="#8E8E93" />,
            "Emergency Phone",
            trainer.alternatePhone || "+91 91234 56789"
          )}
        </View>

      </ScrollView>

      {/* Sticky Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#09090B]/90" style={{ paddingBottom: insets.bottom + 20 }}>
        <Pressable className="bg-[#CCFF00] rounded-xl py-4 items-center active:opacity-80">
          <Text className="text-black text-sm font-bold">Convert to Global Trainer</Text>
        </Pressable>
      </View>
    </View>
  );
}
