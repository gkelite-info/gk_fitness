import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  CaretLeft, 
  UserMinus,
  FileText,
  ShieldCheck,
  CaretRight
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';

export default function CommunitySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-[#1F1F22]">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide flex-1 text-center pr-8">
          Community Settings
        </Text>
      </View>

      <ScrollView 
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Moderation Section */}
        <Text className="text-[#71717A] text-[13px] font-bold uppercase tracking-wider mb-3">
          Moderation
        </Text>
        <View className="bg-[#121214] border border-[#1F1F22] rounded-2xl overflow-hidden mb-8">
          <Pressable 
            className="flex-row items-center justify-between p-4 active:bg-[#18181B]"
            onPress={() => router.push('/community/blocklist')}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-[#27272A] items-center justify-center">
                <UserMinus size={18} color="#E4E4E7" />
              </View>
              <Text className="text-white text-[15px] font-semibold">Blocked Users</Text>
            </View>
            <CaretRight size={18} color="#71717A" />
          </Pressable>
        </View>

        {/* About Section */}
        <Text className="text-[#71717A] text-[13px] font-bold uppercase tracking-wider mb-3">
          About
        </Text>
        <View className="bg-[#121214] border border-[#1F1F22] rounded-2xl overflow-hidden">
          <Pressable className="flex-row items-center justify-between p-4 active:bg-[#18181B] border-b border-[#1F1F22]">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-[#27272A] items-center justify-center">
                <ShieldCheck size={18} color="#E4E4E7" />
              </View>
              <Text className="text-white text-[15px] font-semibold">Community Guidelines</Text>
            </View>
            <CaretRight size={18} color="#71717A" />
          </Pressable>
          <Pressable className="flex-row items-center justify-between p-4 active:bg-[#18181B]">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-[#27272A] items-center justify-center">
                <FileText size={18} color="#E4E4E7" />
              </View>
              <Text className="text-white text-[15px] font-semibold">Terms of Service</Text>
            </View>
            <CaretRight size={18} color="#71717A" />
          </Pressable>
        </View>
      </ScrollView>

    </View>
  );
}
