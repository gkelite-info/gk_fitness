import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  CalendarBlank,
  Phone,
  EnvelopeSimple,
  MapPin,
  ShieldCheck,
  Barbell
} from 'phosphor-react-native';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useCustomerProfile(id);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  const customer = data?.customerData;

  if (!customer) {
    return (
      <View className="flex-1 bg-[#09090B] items-center justify-center px-4">
        <Text className="text-white text-lg font-semibold mb-4">Customer Not Found</Text>
        <Pressable onPress={() => router.back()} className="px-6 py-3 bg-[#1C1C1E] rounded-xl border border-[#2A2A2D]">
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const displayId = `CUS-${(customer.customerId || id).substring(0, 5).toUpperCase()}`;
  const isActive = customer.is_Active !== false && customer.status !== 'INACTIVE';

  const renderRow = (icon: React.ReactNode, label: string, value: string) => (
    <View className="flex-row items-center justify-between py-4">
      <View className="flex-row items-center opacity-80 flex-1">
        <View className="mr-3">{icon}</View>
        <Text className="text-[#8E8E93] text-sm">{label}</Text>
      </View>
      <View className="flex-1 items-end pl-2">
        <Text className="text-white text-sm font-medium text-right">{value}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center mt-2 mb-4">
          <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70">
            <ArrowLeft size={24} color="#FFFFFF" weight="bold" />
          </Pressable>
          <Text className="text-white text-xl font-semibold">Customer Information</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 160 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5 flex-row items-center">
          <StaticAvatar uri={customer.profilePhoto} name={customer.fullName || 'Unknown'} size={70} className="w-[70px] h-[70px] rounded-full mr-4" />
          <View className="flex-1">
            <Text className="text-white text-xl font-semibold mb-1">{customer.fullName || 'Unknown'}</Text>
            <Text className="text-[#8E8E93] text-xs mb-1">Customer ID</Text>
            <Text className="text-[#CCFF00] text-sm font-semibold mb-2">{displayId}</Text>

            <View className={`self-start px-2.5 py-1 rounded-full flex-row items-center border ${isActive ? 'border-[#CCFF00]/20 bg-[#CCFF00]/10' : 'border-[#EF4444]/20 bg-[#EF4444]/10'}`}>
              <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-[#CCFF00]' : 'bg-[#EF4444]'}`} />
              <Text className={`text-[10px] font-semibold ${isActive ? 'text-[#CCFF00]' : 'text-[#EF4444]'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View className="w-10 h-10 rounded-full bg-[#CCFF00]/10 items-center justify-center">
            <User size={20} color="#CCFF00" weight="fill" />
          </View>
        </View>

        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5">
          <View className="flex-row items-center mb-2">
            <View className="mr-3"><User size={20} color="#CCFF00" weight="regular" /></View>
            <Text className="text-white text-base font-semibold">Personal Information</Text>
          </View>

          {renderRow(
            <CalendarBlank size={18} color="#8E8E93" />,
            "Date of Birth",
            customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />

          {renderRow(
            <Text className="text-[#8E8E93] text-lg leading-5 -mt-1 ml-1 mr-1">♂</Text>, // Mocking Gender Icon
            "Gender",
            customer.gender ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : 'N/A'
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />

          {renderRow(
            <Phone size={18} color="#8E8E93" />,
            "Phone Number",
            customer.phone || 'N/A'
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />

          {renderRow(
            <EnvelopeSimple size={18} color="#8E8E93" />,
            "Email Address",
            customer.email || 'N/A'
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />

          {renderRow(
            <MapPin size={18} color="#8E8E93" />,
            "Address",
            customer.address || 'Not Provided'
          )}
        </View>

        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5">
          <View className="flex-row items-center mb-2">
            <View className="mr-3"><ShieldCheck size={20} color="#CCFF00" weight="regular" /></View>
            <Text className="text-white text-base font-semibold">Account Information</Text>
          </View>

          {renderRow(
            <CalendarBlank size={18} color="#8E8E93" />,
            "Joined Date",
            customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />

          {renderRow(
            <Barbell size={18} color="#8E8E93" />,
            "Current Gym",
            customer.gymName || 'N/A'
          )}
        </View>

      </ScrollView>
    </View>
  );
}
