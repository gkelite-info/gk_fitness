import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, Fingerprint, Users } from 'phosphor-react-native';
import DevicesTab from './components/DevicesTab';
import CredentialsTab from './components/CredentialsTab';

type BiometricTab = 'devices' | 'credentials';

export default function BiometricManagementScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BiometricTab>('devices');

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-5 pb-4 bg-[#0F0F0F] border-b border-[#1F293D]">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-semibold text-white ml-2">Biometric Management</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row p-4 gap-x-3 border-b border-[#1F293D]">
        <Pressable
          onPress={() => setActiveTab('devices')}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg border ${activeTab === 'devices'
            ? 'bg-[#CCF200] border-[#CCF200]'
            : 'bg-[#141414] border-[#2A2A2A]'
            }`}
        >
          <Fingerprint size={20} color={activeTab === 'devices' ? '#000000' : '#888888'} />
          <Text
            className={`ml-2 font-semibold ${activeTab === 'devices' ? 'text-black' : 'text-[#888888]'
              }`}
          >
            Entrance Device
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('credentials')}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg border ${activeTab === 'credentials'
            ? 'bg-[#CCF200] border-[#CCF200]'
            : 'bg-[#141414] border-[#2A2A2A]'
            }`}
        >
          <Users size={20} color={activeTab === 'credentials' ? '#000000' : '#888888'} />
          <Text
            className={`ml-2 font-semibold ${activeTab === 'credentials' ? 'text-black' : 'text-[#888888]'
              }`}
          >
            Credentials
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <View className="flex-1">
        {activeTab === 'devices' && <DevicesTab />}
        {activeTab === 'credentials' && <CredentialsTab />}
      </View>
    </View>
  );
}
