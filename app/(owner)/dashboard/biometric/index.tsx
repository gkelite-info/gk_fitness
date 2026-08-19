import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, Fingerprint, Users, Clock } from 'phosphor-react-native';
import DevicesTab from './components/DevicesTab';
import CredentialsTab from './components/CredentialsTab';
import LogsTab from './components/LogsTab';

type BiometricTab = 'devices' | 'credentials' | 'logs';

export default function BiometricManagementScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BiometricTab>('devices');

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center px-4 pt-5 pb-4 bg-[#0F0F0F] border-b border-[#1F293D]">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-semibold text-white ml-2">Biometric Management</Text>
      </View>

      <View className="flex-row p-4 gap-x-2 border-b border-[#1F293D]">
        <Pressable
          onPress={() => setActiveTab('devices')}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg border ${activeTab === 'devices'
            ? 'bg-[#CCF200] border-[#CCF200]'
            : 'bg-[#141414] border-[#2A2A2A]'
            }`}
        >
          <Fingerprint size={18} color={activeTab === 'devices' ? '#000000' : '#888888'} />
          <Text
            className={`ml-1.5 font-semibold text-xs ${activeTab === 'devices' ? 'text-black' : 'text-[#888888]'
              }`}
          >
            Devices
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('credentials')}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg border ${activeTab === 'credentials'
            ? 'bg-[#CCF200] border-[#CCF200]'
            : 'bg-[#141414] border-[#2A2A2A]'
            }`}
        >
          <Users size={18} color={activeTab === 'credentials' ? '#000000' : '#888888'} />
          <Text
            className={`ml-1.5 font-semibold text-xs ${activeTab === 'credentials' ? 'text-black' : 'text-[#888888]'
              }`}
          >
            Credentials
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('logs')}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg border ${activeTab === 'logs'
            ? 'bg-[#CCF200] border-[#CCF200]'
            : 'bg-[#141414] border-[#2A2A2A]'
            }`}
        >
          <Clock size={18} color={activeTab === 'logs' ? '#000000' : '#888888'} />
          <Text
            className={`ml-1.5 font-semibold text-xs ${activeTab === 'logs' ? 'text-black' : 'text-[#888888]'
              }`}
          >
            Logs
          </Text>
        </Pressable>
      </View>

      <View className="flex-1">
        {activeTab === 'devices' && <DevicesTab />}
        {activeTab === 'credentials' && <CredentialsTab />}
        {activeTab === 'logs' && <LogsTab />}
      </View>
    </View>
  );
}
