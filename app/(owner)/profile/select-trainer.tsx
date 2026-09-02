import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, MagnifyingGlass, Star, CaretRight, Users } from 'phosphor-react-native';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useUser } from '@/context/UserContext';

export default function SelectTrainerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const { gymId } = useUser();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: trainers, isLoading } = useGymTrainers(gymId ?? undefined, true, searchQuery);

  const totalTrainers = trainers?.length || 0;

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#1F1F1F] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Assign Personal Trainer</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text className="text-white text-lg font-semibold mb-4">Select Trainer</Text>

        <View className="flex-row items-center bg-[#151515] rounded-xl px-4 py-3.5 border border-[#222222] mb-6">
          <MagnifyingGlass size={20} color="#A1A1AA" />
          <TextInput
            className="flex-1 text-white ml-3 text-[15px] font-sans"
            placeholder="Search trainer by name or expertise..."
            placeholderTextColor="#A1A1AA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Text className="text-[#A1A1AA] text-sm mb-4">Trainers ({totalTrainers})</Text>
        <View className="h-[1px] bg-[#222222] mb-4" />

        {isLoading ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
          </View>
        ) : totalTrainers === 0 ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-[#A1A1AA] text-base">No trainers found</Text>
          </View>
        ) : (
          trainers?.map((trainer, index) => (
            <Pressable
              key={trainer.gymTrainerId || index}
              className="bg-[#151515] border border-[#222222] rounded-2xl p-4 mb-4 flex-row items-center active:opacity-80"
              onPress={() => router.push(`/(owner)/profile/assign-trainer-confirm?customerId=${customerId}&gymTrainerId=${trainer.gymTrainerId}` as any)}
            >
              <View className="w-16 h-16 rounded-full bg-[#1F1F1F] overflow-hidden mr-4 border border-[#333333]">
                {trainer.users?.profilePhoto ? (
                  <Image source={{ uri: trainer.users.profilePhoto }} className="w-full h-full" />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-[#A1A1AA] text-lg font-semibold">{trainer.fullName?.charAt(0)}</Text>
                  </View>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-white text-lg font-semibold mb-0.5">{trainer.fullName}</Text>
                <Text className="text-[#CCFF00] text-sm font-semibold mb-2">{trainer.specialization}</Text>

                <View className="flex-row items-center mb-2">
                  <View className="flex-row items-center mr-2">
                    <View className="mr-1 mt-0.5">
                      <Star size={12} color="#FBBF24" weight="fill" />
                    </View>
                    <Text className="text-white text-xs font-semibold">4.8</Text>
                  </View>
                  <Text className="text-[#555555] text-xs mr-2">|</Text>
                  <Text className="text-[#A1A1AA] text-xs">{trainer.experienceYears} yrs experience</Text>
                </View>

                <View className="bg-[#1A1A1A] border border-[#2A2A2A] self-start px-2 py-1 rounded-md flex-row items-center">
                  <View className="mr-1.5"><Users size={12} color="#A1A1AA" /></View>
                  <Text className="text-[#A1A1AA] text-[10px] font-semibold">120+ clients</Text>
                </View>
              </View>

              <View className="w-8 h-8 rounded-full border border-[#333333] items-center justify-center ml-2 bg-[#1A1A1A]">
                <CaretRight size={14} color="#A1A1AA" />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
