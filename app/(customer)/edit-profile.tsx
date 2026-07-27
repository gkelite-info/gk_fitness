import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft, Info, Camera, CaretRight,
  User, Envelope, Phone, Heart, CalendarBlank,
  Ruler, Scales, Target, ChartBar
} from 'phosphor-react-native';

import { mockProfileData } from '@/constants/mockProfileData';

export default function EditProfileScreen() {
  return <EditProfileView data={mockProfileData} />;
}

function EditProfileView({ data }: { data: typeof mockProfileData }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={() => router.back()} className="p-2">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-bold">Personal Information</Text>
        <Pressable className="p-2">
          <Info size={24} color="#D4FF00" weight="regular" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mt-6 mb-6">
          <View className="relative">
            <View className="w-28 h-28 rounded-full border-[3px] border-[#D4FF00] p-0.5">
               <Image 
                  source={{ uri: data.user.avatarUrl }} 
                  className="w-full h-full rounded-full" 
                />
            </View>
            <View className="absolute bottom-0 right-1 bg-[#D4FF00] w-8 h-8 rounded-full items-center justify-center border-[3px] border-[#0F0F0F]">
              <Camera size={14} color="#000000" weight="fill" />
            </View>
          </View>
          <Text className="text-white text-2xl font-bold mt-4">{data.user.fullName}</Text>
          <Text className="text-[#8E8E93] text-sm mt-1">{data.user.email}</Text>
          <Pressable className="mt-3 flex-row items-center">
            <Text className="text-[#D4FF00] text-sm font-bold mr-1">Change Photo</Text>
            <CaretRight size={14} color="#D4FF00" weight="bold" />
          </Pressable>
        </View>

        <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1px] mb-3 mt-2 ml-1">PERSONAL DETAILS</Text>
        
        <InputField icon={<User size={20} color="#D4FF00" />} label="FULL NAME" value={data.user.fullName} />
        <InputField icon={<Envelope size={20} color="#D4FF00" />} label="EMAIL ADDRESS" value={data.user.email} />
        <InputField icon={<Phone size={20} color="#D4FF00" />} label="PHONE NUMBER" value={data.user.phone} />
        <InputField icon={<Heart size={20} color="#D4FF00" />} label="GENDER" value={data.user.gender} />
        <InputField icon={<CalendarBlank size={20} color="#D4FF00" />} label="DATE OF BIRTH" value={data.user.dateOfBirth} hasArrow />

        <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1px] mt-6 mb-3 ml-1">PHYSICAL INFORMATION</Text>
        
        <View className="flex-row gap-x-3">
          <View className="flex-1">
            <InputField icon={<Ruler size={20} color="#D4FF00" />} label="HEIGHT" value={data.physical.height} hasArrow />
          </View>
          <View className="flex-1">
            <InputField icon={<Scales size={20} color="#D4FF00" />} label="WEIGHT" value={data.physical.weight} hasArrow />
          </View>
        </View>
        
        <View className="flex-row gap-x-3 mt-3">
          <View className="flex-1">
            <InputField icon={<Target size={20} color="#D4FF00" />} label="FITNESS GOAL" value={data.physical.fitnessGoal} hasArrow />
          </View>
          <View className="flex-1">
            <InputField icon={<ChartBar size={20} color="#D4FF00" />} label="ACTIVITY LEVEL" value={data.physical.activityLevel} hasArrow />
          </View>
        </View>

        <Pressable className="bg-[#D4FF00] rounded-xl py-4 items-center justify-center mt-8 active:opacity-80">
          <Text className="text-black text-base font-bold">Save Changes</Text>
        </Pressable>
        <Pressable className="border border-[#27272A] bg-transparent rounded-xl py-4 items-center justify-center mt-3 active:opacity-50" onPress={() => router.back()}>
          <Text className="text-[#D4FF00] text-base font-bold">Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function InputField({ icon, label, value, hasArrow }: any) {
  return (
    <View className="bg-[#1A1A1A] rounded-2xl p-4 flex-row items-center mb-3 border border-[#27272A]">
      <View className="mr-4">
        {icon}
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-[#8E8E93] text-[8px] uppercase tracking-wider font-bold mb-1">{label}</Text>
        <Text className="text-white text-[15px] font-medium">{value}</Text>
      </View>
      {hasArrow && (
        <CaretRight size={16} color="#8E8E93" />
      )}
    </View>
  );
}
