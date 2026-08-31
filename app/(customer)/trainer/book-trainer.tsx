import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, ShieldCheck, MagnifyingGlass, Faders, Star, Users, Tag, CaretRight, CheckCircle
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useGlobalTrainers } from '@/hooks/globalTrainers/useGlobalTrainers';
import { ActivityIndicator } from 'react-native';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useQueryClient } from '@tanstack/react-query';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

export default function BookTrainerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { userId } = useUser();
  const { data: profile, isLoading: isProfileLoading } = useCustomerProfile(userId || undefined);

  const gymId = profile?.customerData?.gymId;

  const { data: gymTrainers, isLoading: isGymTrainersLoading } = useGymTrainers(gymId, !!gymId && !isProfileLoading, debouncedSearchQuery);
  const { data: globalTrainers, isLoading: isGlobalTrainersLoading } = useGlobalTrainers(!gymId && !isProfileLoading, debouncedSearchQuery);

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customerProfile', userId] }),
      queryClient.invalidateQueries({ queryKey: ['trainers'] }),
      queryClient.invalidateQueries({ queryKey: ['globalTrainers'] })
    ]);
    setRefreshing(false);
  };

  const trainers = gymId ? (gymTrainers || []) : (globalTrainers || []);
  const isLoading = isProfileLoading || (gymId ? isGymTrainersLoading : isGlobalTrainersLoading);

  const filteredTrainers = trainers;

  const handleBack = () => {
    router.push('/(customer)/profile');
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
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
          {/* <View className="items-center justify-center ml-2">
            <View className="flex-row">
              <Image source={{ uri: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=80' }} className="w-6 h-6 rounded-full border border-[#1A1A1A]" />
              <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' }} className="w-6 h-6 rounded-full border border-[#1A1A1A] -ml-2" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] mt-1">25+ Certified</Text>
          </View> */}
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
          ) : filteredTrainers.length > 0 ? (
            filteredTrainers.map((trainer: any) => (
              <Pressable
                key={trainer.gymTrainerId || trainer.globalTrainerId}
                onPress={() => (router as any).push({
                  pathname: `/(customer)/trainer/${trainer.gymTrainerId || trainer.globalTrainerId}`,
                  params: { trainerData: JSON.stringify(trainer) }
                })}
                className="bg-[#1A1A1A] rounded-2xl p-3 flex-row border border-[#27272A]"
              >
                <View className="w-[120px] h-[150px] relative rounded-xl overflow-hidden mr-3">
                  <StaticAvatar 
                    uri={trainer.users?.profilePhoto || trainer.profilePhoto} 
                    name={trainer.fullName}
                    size={80}
                    className="w-full h-full"
                  />

                  <View className="absolute inset-0 bg-black/20" />

                  {trainer.isTopRated && (
                    <View className="absolute top-2 left-2 bg-black/80 border border-[#D4FF00] rounded px-1.5 py-0.5 flex-row items-center">
                      <Star size={8} color="#D4FF00" weight="fill" />
                      <Text className="text-[#D4FF00] text-[8px] font-semibold ml-1">TOP RATED</Text>
                    </View>
                  )}

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

                    <Text className="text-[#D4FF00] text-xs font-semibold mb-3">{trainer.specialization}</Text>

                    <View className="flex-row items-center mb-1.5">
                      <Star size={12} color="#D4FF00" weight="fill" />
                      <Text className="text-white text-xs font-semibold ml-1">{trainer.rating || '4.5'}</Text>
                      <Text className="text-[#8E8E93] text-[10px] ml-1">({trainer.reviews || 0} Reviews)</Text>
                      <Text className="text-[#8E8E93] text-xs mx-2">•</Text>
                      <Users size={12} color="#8E8E93" weight="regular" />
                      <Text className="text-[#8E8E93] text-[10px] ml-1">{trainer.clients || 0} Clients</Text>
                    </View>
                  </View>

                  <View className="flex-row items-end justify-between mt-2">
                    <Pressable 
                      className="flex-row items-center border border-[#445000] rounded-full px-3 py-1.5"
                      onPress={() => (router as any).push({
                        pathname: `/(customer)/trainer/${trainer.gymTrainerId || trainer.globalTrainerId}`,
                        params: { trainerData: JSON.stringify(trainer) }
                      })}
                    >
                      <Text className="text-[#D4FF00] text-[10px] font-semibold mr-1">View Profile</Text>
                      <CaretRight size={10} color="#D4FF00" weight="bold" />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <Text className="text-[#A1A1AA] text-center mt-10">No trainers found.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
