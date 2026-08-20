import React from 'react';
import { View, Pressable, SafeAreaView, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, Stack } from 'expo-router';
import { User, Buildings, Barbell, Globe, ShieldCheck, CaretRight } from 'phosphor-react-native';

const ACCOUNT_TYPES = [
  { id: 'individual', title: 'Individual', icon: User, color: '#C3F400' },
  { id: 'owner', title: 'Gym Owner', icon: Buildings, color: '#C3F400' },
  { id: 'customer', title: 'Gym Customer', icon: User, color: '#C3F400' },
  { id: 'gym_trainer', title: 'Gym Trainer', icon: Barbell, color: '#C3F400' },
  { id: 'global_trainer', title: 'Global Trainer', icon: Globe, color: '#C3F400' },
];

export default function AccountTypeScreen() {
  const handleSelect = (typeId: string) => {
    if (typeId === 'customer' || typeId === 'gym_trainer') {
      router.push('/auth/find-organization');
    } else if (typeId === 'individual' || typeId === 'owner' || typeId === 'global_trainer') {
      router.push({ pathname: '/auth/otp-auth', params: { type: typeId } });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#09090B]">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-6 pt-20 pb-8">
        <View className="items-center mb-10">
          <View className="flex-row items-center justify-center mb-3">
            <Text className="text-white text-3xl font-semibold tracking-widest">GK</Text>
            <View className="mx-2">
              <Barbell size={24} color="#C3F400" weight="fill" style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
            <Text className="text-white text-3xl font-semibold tracking-widest">GYM</Text>
          </View>
          <View className="flex-row items-center justify-center">
            <View className="h-[1px] w-8 bg-[#333333]" />
            <Text className="text-[#C3F400] text-[10px] font-semibold tracking-[0.3em] mx-3">LIFE</Text>
            <View className="h-[1px] w-8 bg-[#333333]" />
          </View>
        </View>

        <View className="items-center mb-8">
          <Text className="text-white text-2xl font-semibold mb-2">
            Welcome to <Text className="text-[#C3F400]">GK-Gym Life</Text>
          </Text>
          <Text className="text-[#C6C6C7] text-sm">
            Choose your account type to continue
          </Text>
          <View className="h-[2px] w-12 bg-[#C3F400] mt-6 rounded-full" />
        </View>

        <View className="flex-1">
          {ACCOUNT_TYPES.map((type) => {
            const IconComp = type.icon;
            return (
              <Pressable
                key={type.id}
                onPress={() => handleSelect(type.id)}
                className="flex-row items-center bg-[#18181B] rounded-xl p-4 mb-4 border border-[#27272A] active:opacity-75"
              >
                <View className="w-12 h-12 rounded-full border border-[#27272A] items-center justify-center bg-[#101012] mr-4">
                  <IconComp size={24} color={type.color} weight="regular" />
                </View>
                <Text className="flex-1 text-white text-base font-semibold">{type.title}</Text>
                <CaretRight size={20} color="#C3F400" weight="bold" />
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-center justify-center mt-auto">
          <View className="mr-2">
            <ShieldCheck size={20} color="#C3F400" weight="regular" />
          </View>
          <Text className="text-[#C6C6C7] text-sm font-medium">
            Your fitness journey, our priority.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
