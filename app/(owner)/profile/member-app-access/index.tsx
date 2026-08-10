import React, { useState } from 'react';
import { View, ScrollView, Pressable, Switch } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, CalendarBlank, Clock, CaretDown, Info, ArrowRight } from 'phosphor-react-native';

export default function MemberAppAccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [allowAccess, setAllowAccess] = useState(true);

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center mr-2 active:opacity-70 -ml-2"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide">Member App Access</Text>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[#A1A1AA] text-[13px] leading-5 mb-6">
          Choose how long members can continue using the app after their membership expires.
        </Text>
        <View className="bg-[#161616] border border-[#1F1F22] rounded-2xl p-5 flex-row items-center justify-between mb-6">
          <View className="flex-row items-center flex-1 pr-4">
            <View className="w-10 h-10 rounded-xl bg-[#1E2015] items-center justify-center mr-4">
              <CalendarBlank size={20} color="#C4EF00" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-[15px] font-semibold mb-0.5">Allow access after membership expiry</Text>
              <Text className="text-[#A1A1AA] text-xs leading-4">Members can continue using the app for a selected period.</Text>
            </View>
          </View>
          <Switch 
            value={allowAccess}
            onValueChange={setAllowAccess}
            trackColor={{ false: '#3F3F46', true: '#C4EF00' }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor="#3F3F46"
          />
        </View>
        <View className={`bg-[#161616] border border-[#1F1F22] rounded-2xl p-5 ${!allowAccess ? 'opacity-50' : ''}`}>
          
          <View className="flex-row items-center mb-5">
            <View className="w-10 h-10 rounded-xl bg-[#1E2015] items-center justify-center mr-4">
              <Clock size={20} color="#C4EF00" weight="regular" />
            </View>
            <View>
              <Text className="text-white text-[15px] font-semibold mb-0.5">Access Duration</Text>
              <Text className="text-[#A1A1AA] text-xs">Select the duration for app access after expiry.</Text>
            </View>
          </View>

          <Pressable 
            className="flex-row items-center justify-between border border-[#C4EF00] rounded-xl px-4 py-3.5 mb-4 active:opacity-70"
            onPress={() => {
              if(allowAccess) {
                router.push('/(owner)/profile/member-app-access/custom-days');
              }
            }}
          >
            <View className="flex-row items-center">
              <CalendarBlank size={18} color="#C4EF00" weight="fill" style={{ marginRight: 8 }} />
              <Text className="text-white text-[15px] font-medium">30 Days</Text>
            </View>
            <CaretDown size={18} color="#A1A1AA" />
          </Pressable>

          <View className="bg-[#121214] border border-[#1F1F22] rounded-lg p-3 flex-row items-center mb-5">
            <Info size={16} color="#C4EF00" weight="fill" style={{ marginRight: 8 }} />
            <Text className="text-[#A1A1AA] text-xs">This duration will be applied to all members.</Text>
          </View>
          <View className="bg-[#0A0A0A] border border-[#1F1F22] rounded-2xl p-4">
            <View className="bg-[#1E2015] self-start px-2 py-1 rounded mb-4 flex-row items-center">
              <CalendarBlank size={12} color="#C4EF00" weight="fill" style={{ marginRight: 4 }} />
              <Text className="text-[#C4EF00] text-[10px] font-bold tracking-wide">Example</Text>
            </View>

            <View className="flex-row items-center justify-between">
              
              <View>
                <Text className="text-[#A1A1AA] text-[10px] mb-1">Membership expires on</Text>
                <View className="flex-row items-center">
                  <CalendarBlank size={14} color="#A1A1AA" weight="regular" style={{ marginRight: 6 }} />
                  <Text className="text-white text-[13px] font-semibold">10 Aug 2026</Text>
                </View>
              </View>

              <View className="w-10 items-center justify-center -mr-2">
                <ArrowRight size={14} color="#C4EF00" weight="bold" />
              </View>

              <View>
                <Text className="text-[#A1A1AA] text-[10px] mb-1">Access ends on</Text>
                <View className="flex-row items-center">
                  <CalendarBlank size={14} color="#C4EF00" weight="fill" style={{ marginRight: 6 }} />
                  <Text className="text-[#C4EF00] text-[13px] font-bold">09 Sep 2026</Text>
                </View>
                <Text className="text-[#71717A] text-[9px] mt-1">(30 Days after expiry)</Text>
              </View>
              
            </View>
          </View>

        </View>

      </ScrollView>
      <View 
        className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#1F1F22] px-5 pt-4 pb-6 items-center"
        style={{ paddingBottom: Math.max(insets.bottom + 65, 85) }}
      >
        <Pressable 
          className="w-full bg-[#C4EF00] py-4 rounded-xl flex-row items-center justify-center active:opacity-80 mb-3"
          onPress={() => router.back()}
        >
          <Text className="text-[#000000] font-bold text-[15px]">Save Changes</Text>
        </Pressable>
        <Text className="text-[#71717A] text-[10px]">
          Changes will be applied to all members immediately.
        </Text>
      </View>
    </View>
  );
}
