import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, CheckCircle, Star, Users, Medal, Tag, ArrowRight, CaretDown
} from 'phosphor-react-native';
import { mockTrainers } from '@/constants/mockTrainers';
import { startApprovalSimulation } from '@/constants/trainerStore';

export default function TrainerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const trainer = mockTrainers.find(t => t.id === id) || mockTrainers[0];
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="p-2 bg-[#1A1A1A] rounded-full">
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="items-center px-4 mb-6 mt-2">
          <View className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-[#1A1A1A]">
            <Image source={{ uri: trainer.image }} className="w-full h-full" />
          </View>
          
          <View className="flex-row items-center mb-1">
            <Text className="text-white text-xl font-bold mr-1">{trainer.name}</Text>
            {trainer.isVerified && <CheckCircle size={18} color="#1DA1F2" weight="fill" />}
          </View>
          
          <Text className="text-[#D4FF00] text-sm font-semibold mb-2">{trainer.specialty}</Text>
          
          <View className="flex-row items-center">
            <Star size={14} color="#D4FF00" weight="fill" />
            <Text className="text-white text-xs font-bold ml-1">{trainer.rating}</Text>
            <Text className="text-[#8E8E93] text-xs ml-1">({trainer.reviews} Reviews)</Text>
          </View>
        </View>

        <View className="flex-row mx-4 mb-4 bg-[#1A1A1A] rounded-2xl p-4 border border-[#27272A] justify-between">
          <View className="items-center flex-1">
            <Medal size={24} color="#D4FF00" weight="regular" style={{ marginBottom: 8 }} />
            <Text className="text-white font-bold">{trainer.experience.split('+')[0]}</Text>
            <Text className="text-[#8E8E93] text-[10px] mt-1">YEARS EXP.</Text>
          </View>
          <View className="w-[1px] h-full bg-[#27272A]" />
          <View className="items-center flex-1">
            <Users size={24} color="#5E5CE6" weight="regular" style={{ marginBottom: 8 }} />
            <Text className="text-white font-bold">{trainer.clients}</Text>
            <Text className="text-[#8E8E93] text-[10px] mt-1">CLIENTS</Text>
          </View>
          <View className="w-[1px] h-full bg-[#27272A]" />
          <View className="items-center flex-1">
            <Medal size={24} color="#FF9F0A" weight="regular" style={{ marginBottom: 8 }} />
            <Text className="text-white font-bold">{trainer.certifications?.[0]?.name || 'Cert'}</Text>
            <Text className="text-[#8E8E93] text-[10px] mt-1">CERTIFIED</Text>
          </View>
        </View>

        <View className="flex-row mx-4 mb-8 bg-[#1A1A1A] rounded-2xl p-4 border border-[#27272A] justify-between items-center">
      
          <View className="flex-row items-center flex-1 justify-center">
            <Users size={16} color="#8E8E93" weight="regular" style={{ marginRight: 8 }} />
            <View>
              <Text className="text-white text-xs font-bold">{trainer.membersTraining} Members</Text>
              <Text className="text-[#8E8E93] text-[10px]">training with him</Text>
            </View>
          </View>
        </View>

        <View className="px-4 mb-8">
          <Text className="text-white text-lg font-bold mb-3">About {trainer.name.split(' ')[0]}</Text>
          <Text className="text-[#A1A1AA] text-sm leading-relaxed mb-2">
            {trainer.about}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-[#D4FF00] text-xs font-bold mr-1">Read More</Text>
            <CaretDown size={12} color="#D4FF00" weight="bold" />
          </View>
        </View>

        <View className="mb-8">
          <View className="flex-row justify-between items-center px-4 mb-4">
            <Text className="text-white text-lg font-bold">Expertise</Text>
            <Text className="text-[#D4FF00] text-xs font-bold">View All</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {trainer.expertise?.map((exp, index) => (
              <View key={index} className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 items-center justify-center w-[100px] h-[100px]">
                <Medal size={24} color="#D4FF00" weight="regular" style={{ marginBottom: 8 }} />
                <Text className="text-[#8E8E93] text-[10px] text-center font-medium leading-tight">{exp}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className="mb-8">
          <View className="flex-row justify-between items-center px-4 mb-4">
            <Text className="text-white text-lg font-bold">Certifications</Text>
            <Text className="text-[#D4FF00] text-xs font-bold">View All</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {trainer.certifications?.map((cert, index) => (
              <View key={index} className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-5 w-[160px] h-[140px] justify-center items-center">
                <Text className="text-white text-2xl font-bold italic mb-3">{cert.name}</Text>
                <Text className="text-white text-xs font-bold text-center mb-1">{cert.title}</Text>
                <Text className="text-[#6C6C70] text-[8px] text-center">{cert.issuer}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {trainer.transformations && trainer.transformations.length > 0 && (
          <View className="mb-8">
            <View className="flex-row justify-between items-center px-4 mb-4">
              <Text className="text-white text-lg font-bold">Client Transformations</Text>
              <Text className="text-[#D4FF00] text-xs font-bold">View All</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {trainer.transformations.map((trans) => (
                <View key={trans.id} className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl overflow-hidden w-[280px]">
                  <View className="flex-row h-[200px] relative">
                    <Image source={{ uri: trans.before }} className="flex-1 h-full" />
                    <View className="w-[2px] h-full bg-black absolute left-1/2 -ml-[1px] z-10" />
                    <View className="absolute left-1/2 top-1/2 -ml-3 -mt-3 w-6 h-6 bg-black/80 rounded-full items-center justify-center z-20 border border-[#D4FF00]">
                      <ArrowRight size={10} color="#D4FF00" weight="bold" />
                    </View>
                    <Image source={{ uri: trans.after }} className="flex-1 h-full" />
                  </View>
                  <View className="p-3 items-center justify-center bg-[#111111]">
                    <Text className="text-[#D4FF00] text-xs font-bold">{trans.label}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {trainer.review && (
          <View className="mb-8">
            <View className="flex-row justify-between items-center px-4 mb-4">
              <Text className="text-white text-lg font-bold">What Clients Say</Text>
              <Text className="text-[#D4FF00] text-xs font-bold">View All</Text>
            </View>
            <View className="mx-4 bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-row items-center">
                  <Image source={{ uri: trainer.review.avatarUrl }} className="w-10 h-10 rounded-full mr-3 border border-[#27272A]" />
                  <View>
                    <Text className="text-white font-bold text-sm">{trainer.review.name}</Text>
                    <View className="flex-row mt-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={10} color="#D4FF00" weight="fill" style={{ marginRight: 2 }} />
                      ))}
                    </View>
                  </View>
                </View>
                <Text className="text-[#6C6C70] text-[10px]">{trainer.review.date}</Text>
              </View>
              <Text className="text-[#A1A1AA] text-xs leading-relaxed">
                {trainer.review.comment}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#0F0F0F]/90 border-t border-[#1A1A1A]">
        <Pressable 
          onPress={() => setModalVisible(true)}
          className="bg-[#D4FF00] py-4 rounded-full flex-row justify-center items-center shadow-lg"
          style={{ shadowColor: '#D4FF00', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}
        >
          <Text className="text-black text-base font-bold mr-2">Choose {trainer.name.split(' ')[0]} as My Trainer</Text>
          <ArrowRight size={18} color="#000000" weight="bold" />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-6">
          <View className="bg-[#1A1A1A] w-full max-w-[340px] rounded-3xl p-6 items-center border border-[#27272A]">
            
            <View className="relative mb-5 mt-2">
              <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4FF00]">
                <Image source={{ uri: trainer.image }} className="w-full h-full" />
              </View>
              <View className="absolute bottom-0 right-0 bg-[#D4FF00] rounded-full p-1 border-2 border-[#1A1A1A]">
                <CheckCircle size={16} color="#000000" weight="fill" />
              </View>
            </View>

            <Text className="text-white text-xl font-bold text-center mb-3">
              Choose {trainer.name} as your Personal Trainer?
            </Text>
            
            <Text className="text-[#8E8E93] text-sm text-center mb-8">
              You can change your trainer later based on gym policy.
            </Text>

            <Pressable 
              onPress={() => {
                setModalVisible(false);
                startApprovalSimulation(15, trainer.id);
                router.push({ pathname: '/(customer)/trainer-request', params: { id: trainer.id } });
              }}
              className="bg-[#D4FF00] w-full py-4 rounded-2xl items-center mb-3"
            >
              <Text className="text-black font-bold text-base">Confirm</Text>
            </Pressable>
            
            <Pressable 
              onPress={() => setModalVisible(false)}
              className="w-full py-4 rounded-2xl items-center border border-[#3A3A3C]"
            >
              <Text className="text-white font-bold text-base">Cancel</Text>
            </Pressable>
            
          </View>
        </View>
      </Modal>

    </View>
  );
}
