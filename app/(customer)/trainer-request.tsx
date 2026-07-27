import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, Hourglass, Record, User, CalendarBlank, FileText, Bell, Trash, Warning, CheckCircle
} from 'phosphor-react-native';
import { useTrainerStore } from '@/constants/trainerStore';

export default function TrainerRequestScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { 
    trainer, status, simulationTimeLeft, startApprovalSimulation, cancelTrainerRequest 
  } = useTrainerStore();

  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (status === 'none') {
      startApprovalSimulation(15, id || trainer.id);
    }
  }, [status, id]);

  useEffect(() => {
    if (status === 'approved') {
      router.replace('/(customer)/my-trainer');
    }
  }, [status]);

  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const requestedDate = new Date().toLocaleDateString('en-GB', dateOptions);

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    cancelTrainerRequest();
    router.replace('/(customer)/profile');
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-bold mr-8">Trainer Request</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        
        <View className="items-center mt-10 mb-8">
          <View className="w-20 h-20 bg-[#2D3319] rounded-full items-center justify-center relative mb-6">
            <Hourglass size={40} color="#D4FF00" weight="regular" />
            <View className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-[#D4FF00] rounded-full border-2 border-[#0F0F0F]" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">Request Pending</Text>
          <Text className="text-[#8E8E93] text-center text-sm px-4 leading-relaxed">
            Your request has been sent to the trainer.{'\n'}They will review it shortly.
          </Text>

          <View className="bg-[#1D2507] border border-[#D4FF00] rounded-2xl px-5 py-3.5 mt-6 flex-row items-center shadow-lg w-full">
            <View className="mr-3">
              <Hourglass size={22} color="#D4FF00" weight="fill" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-[#D4FF00] font-bold text-xs uppercase tracking-wider">
                  Simulating Gym Approval
                </Text>
                <Text className="text-white text-xs font-bold bg-[#2A340C] px-2 py-0.5 rounded-full border border-[#445511]">
                  15s Flow
                </Text>
              </View>
              <Text className="text-white font-semibold text-xs mt-1">
                {simulationTimeLeft > 0 ? (
                  <>Auto-approving & redirecting in <Text className="text-[#D4FF00] font-extrabold text-sm">{simulationTimeLeft}s</Text>...</>
                ) : (
                  <Text className="text-[#00FF66] font-extrabold">Approved! Opening your dashboard...</Text>
                )}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-[#1A1A1A] rounded-2xl border border-[#27272A] mb-6">
          <View className="flex-row items-center p-4 border-b border-[#27272A]">
            <View className="w-12 h-12 bg-[#2D221C] rounded-xl items-center justify-center mr-4 border border-[#4A3225]">
              <Record size={24} color="#FF9F0A" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] font-bold mb-0.5 tracking-[1px] uppercase">Status</Text>
              <Text className="text-[#FF9F0A] text-sm font-semibold">Pending Review</Text>
            </View>
            <View className="border border-[#FF9F0A] rounded-full px-3 py-1">
              <Text className="text-[#FF9F0A] text-xs font-medium">Pending</Text>
            </View>
          </View>

          <View className="flex-row items-center p-4 border-b border-[#27272A]">
            <View className="w-12 h-12 bg-[#222222] rounded-xl items-center justify-center mr-4 border border-[#27272A]">
              <User size={20} color="#FFFFFF" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] font-bold mb-0.5 tracking-[1px] uppercase">Trainer</Text>
              <Text className="text-white text-sm font-semibold">{trainer.name}</Text>
            </View>
            <Image source={{ uri: trainer.image }} className="w-10 h-10 rounded-full border border-[#27272A]" />
          </View>

          <View className="flex-row items-center p-4">
            <View className="w-12 h-12 bg-[#222222] rounded-xl items-center justify-center mr-4 border border-[#27272A]">
              <CalendarBlank size={20} color="#FFFFFF" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-[10px] font-bold mb-0.5 tracking-[1px] uppercase">Requested On</Text>
              <Text className="text-white text-sm font-semibold">{requestedDate}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#1A1A1A] rounded-2xl border border-[#27272A] p-5 mb-8">
          <Text className="text-[#D4FF00] text-xs font-bold text-center mb-6 uppercase tracking-wider">What happens next?</Text>
          
          <View className="flex-row justify-between">
            <View className="items-center flex-1 px-1">
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3">
                <FileText size={20} color="#D4FF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">Trainer will review your request</Text>
            </View>
            
            <View className="items-center flex-1 px-1">
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3">
                <Bell size={20} color="#D4FF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">You'll get a notification</Text>
            </View>
            
            <View className="items-center flex-1 px-1">
              <View className="w-10 h-10 bg-[#2D3319] rounded-full items-center justify-center mb-3">
                <User size={20} color="#D4FF00" weight="regular" />
              </View>
              <Text className="text-[#8E8E93] text-[10px] text-center leading-tight">Start training once approved</Text>
            </View>
          </View>
        </View>

      </ScrollView>
      
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#0F0F0F]/95 border-t border-[#1A1A1A]">
        <Pressable 
          onPress={() => setShowCancelModal(true)}
          className="flex-row justify-center items-center py-4 border border-[#551818] rounded-2xl bg-[#1D0909] active:opacity-75"
        >
          <Trash size={18} color="#FF3B30" weight="bold" />
          <Text className="text-[#FF3B30] font-bold text-base ml-2">Cancel Request</Text>
        </Pressable>
      </View>

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

            <Text className="text-white text-xl font-extrabold text-center mb-2">
              Withdraw Booking Request?
            </Text>
            
            <Text className="text-[#A1A1AA] text-sm text-center leading-5 mb-7 px-2">
              Are you sure you want to cancel your pending personal training request with <Text className="text-white font-bold">{trainer.name}</Text>?
            </Text>

            <Pressable 
              onPress={handleConfirmCancel}
              className="bg-[#D32F2F] w-full py-4 rounded-2xl items-center flex-row justify-center mb-3 active:opacity-80"
            >
              <View className="mr-2">
                <Trash size={18} color="#FFFFFF" weight="bold" />
              </View>
              <Text className="text-white font-extrabold text-base">Yes, Cancel Request</Text>
            </Pressable>
            
            <Pressable 
              onPress={() => setShowCancelModal(false)}
              className="bg-[#27272A] w-full py-4 rounded-2xl items-center active:opacity-70"
            >
              <Text className="text-gray-200 font-bold text-base">Keep Request & Wait</Text>
            </Pressable>
            
          </View>
        </View>
      </Modal>

    </View>
  );
}
