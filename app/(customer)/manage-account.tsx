import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, WarningCircle, CaretRight, Trash } from 'phosphor-react-native';

export default function ManageAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#27272A]">
        <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Manage Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        
        <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1px] mb-4 mt-2">ACCOUNT ACTIONS</Text>

        <Pressable 
          onPress={() => router.navigate('/(customer)/delete-account')}
          className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 flex-row items-center mb-4 active:opacity-70"
        >
          <View className="w-10 h-10 rounded-full bg-red-500/10 items-center justify-center mr-4 border border-red-500/20">
            <Trash size={20} color="#EF4444" weight="bold" />
          </View>
          <View className="flex-1 pr-2">
            <Text className="text-[#EF4444] text-base font-semibold mb-0.5">Delete Account</Text>
            <Text className="text-[#8E8E93] text-sm">Permanently remove your data</Text>
          </View>
          <CaretRight size={16} color="#8E8E93" />
        </Pressable>
        
        <View className="mt-6 p-4 bg-[#2A1515] border border-[#4A1515] rounded-2xl flex-row items-start">
          <View className="mt-0.5 mr-3">
            <WarningCircle size={20} color="#FF3B30" weight="fill" />
          </View>
          <Text className="text-[#FFB4B4] text-sm leading-5 flex-1">
            Deleting your account will permanently erase all your workout logs, active memberships, and personal data. This action cannot be undone.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
