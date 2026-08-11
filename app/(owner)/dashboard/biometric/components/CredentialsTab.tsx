import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useBiometricCredentials, useSaveBiometricCredential, useDeleteBiometricCredential } from '@/hooks/biometrics/useBiometricCredentials';
import { useBiometricDevices } from '@/hooks/biometrics/useBiometricDevices';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { Fingerprint, Scan, Trash, MagnifyingGlass, HardDrives } from 'phosphor-react-native';
import { BiometricCredentialPayload } from '@/helpers/biometrics/biometricCredentialAPI';

export default function CredentialsTab() {
  const { gymId } = useUser();
  const { data: devices } = useBiometricDevices(gymId ?? undefined);
  const { data: credentials, isLoading: credsLoading } = useBiometricCredentials(gymId ?? undefined);
  const { data: customers, isLoading: customersLoading } = useGymCustomers(gymId ?? undefined);
  const saveCredential = useSaveBiometricCredential();
  const deleteCredential = useDeleteBiometricCredential();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [deviceUserId, setDeviceUserId] = useState('');

  if (credsLoading || customersLoading) {
    return (
      <View className="flex-1 items-center justify-center pt-20">
        <ActivityIndicator size="large" color="#CCF200" />
      </View>
    );
  }

  const device = devices && devices.length > 0 ? devices[0] : null;

  if (!device) {
    return (
      <View className="flex-1 items-center justify-center pt-20 p-4">
        <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center mb-4">
          <HardDrives size={32} color="#EF4444" />
        </View>
        <Text className="text-white text-lg font-semibold mb-2 text-center">No Device Found</Text>
        <Text className="text-[#888888] text-center">
          You must add an Entrance Device in the previous tab before you can enroll credentials.
        </Text>
      </View>
    );
  }

  // Combine customers and credentials
  const enrolledCustomerIds = new Set(credentials?.map(c => c.customerId) || []);

  let filteredCustomers = (customers || []).filter((c: any) =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleEnroll = () => {
    if (!selectedCustomer || !deviceUserId) return;
    saveCredential.mutate(
      {
        gymId: gymId as string,
        customerId: selectedCustomer.customerId,
        deviceId: device.deviceId,
        deviceUserId: deviceUserId,
        hasFingerprint: true, // we assume true for now, actual status can be updated from device later
        hasFace: true,
      },
      {
        onSuccess: () => {
          setSelectedCustomer(null);
          setDeviceUserId('');
        }
      }
    );
  };

  const handleUnenroll = (credentialId: string) => {
    deleteCredential.mutate({ credentialId, gymId: gymId as string });
  };

  if (selectedCustomer) {
    const isEnrolled = enrolledCustomerIds.has(selectedCustomer.customerId);
    const existingCred = credentials?.find(c => c.customerId === selectedCustomer.customerId);

    return (
      <View className="flex-1 p-4">
        <View className="bg-[#141414] rounded-2xl p-4 border border-[#2A2A2A]">
          <Text className="text-white text-lg font-semibold mb-1">{selectedCustomer.fullName}</Text>
          <Text className="text-[#888888] text-sm mb-4">{selectedCustomer.phone}</Text>

          {isEnrolled && existingCred ? (
            <View>
              <View className="flex-row items-center bg-[#CCF200]/10 p-3 rounded-lg mb-4">
                <Scan size={24} color="#CCF200" />
                <View className="ml-3">
                  <Text className="text-[#CCF200] font-semibold">Enrolled</Text>
                  <Text className="text-[#888888] text-xs">Device User ID: {existingCred.deviceUserId}</Text>
                </View>
              </View>

              <Pressable
                className="bg-[#3A1414] rounded-xl py-3 items-center flex-row justify-center"
                onPress={() => {
                  handleUnenroll(existingCred.credentialId);
                  setSelectedCustomer(null);
                }}
              >
                <Trash size={18} color="#EF4444" />
                <Text className="text-[#EF4444] font-semibold ml-2">Unenroll Customer</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text className="text-[#888888] text-xs font-medium mb-1">Device User ID</Text>
              <Text className="text-[#555555] text-xs mb-3">
                Enter the ID number assigned to this customer on the physical ZKTeco device.
              </Text>
              <TextInput
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white mb-6"
                value={deviceUserId}
                onChangeText={setDeviceUserId}
                placeholder="e.g. 105"
                placeholderTextColor="#555"
                keyboardType="numeric"
              />

              <View className="flex-row items-center gap-3">
                <Pressable
                  className="flex-1 bg-[#2A2A2A] rounded-xl py-3 items-center"
                  onPress={() => {
                    setSelectedCustomer(null);
                    setDeviceUserId('');
                  }}
                >
                  <Text className="text-white font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  className={`flex-1 rounded-xl py-3 items-center ${deviceUserId ? 'bg-[#CCF200]' : 'bg-[#CCF200]/50'}`}
                  onPress={handleEnroll}
                  disabled={!deviceUserId || saveCredential.isPending}
                >
                  <Text className="text-black font-semibold">
                    {saveCredential.isPending ? 'Saving...' : 'Enroll'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <View className="flex-row items-center bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2.5 mb-4">
        <MagnifyingGlass size={20} color="#888888" />
        <TextInput
          className="flex-1 ml-2 text-white"
          placeholder="Search customers..."
          placeholderTextColor="#888888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {filteredCustomers.length === 0 ? (
          <Text className="text-center text-[#888888] mt-10">No customers found.</Text>
        ) : (
          filteredCustomers.map((customer: any) => {
            const isEnrolled = enrolledCustomerIds.has(customer.customerId);
            return (
              <Pressable
                key={customer.customerId}
                onPress={() => setSelectedCustomer(customer)}
                className="flex-row items-center justify-between bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-3 active:opacity-70"
              >
                <View className="flex-1">
                  <Text className="text-white font-medium">{customer.fullName}</Text>
                  <Text className="text-[#888888] text-xs mt-1">{customer.phone}</Text>
                </View>
                <View>
                  {isEnrolled ? (
                    <View className="bg-[#CCF200]/20 px-3 py-1 rounded-full flex-row items-center">
                      <Fingerprint size={14} color="#CCF200" />
                      <Text className="text-[#CCF200] text-xs font-semibold ml-1">Enrolled</Text>
                    </View>
                  ) : (
                    <View className="bg-[#2A2A2A] px-3 py-1 rounded-full">
                      <Text className="text-[#888888] text-xs font-semibold">Not Enrolled</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
