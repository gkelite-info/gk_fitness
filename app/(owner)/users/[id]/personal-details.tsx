import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Linking, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  User,
  Phone,
  EnvelopeSimple,
  CalendarBlank,
  MapPin,
  Heartbeat,
  FirstAid,
  Target,
  Barbell,
  CheckCircle,
} from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useCustomerOnboardingData } from '@/hooks/customers/useCustomerOnboardingData';
import { useCustomerGoalPreference } from '@/hooks/customers/useCustomerGoalPreferences';

export default function UserPersonalDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(id);
  const { data: trainers, isLoading: isTrainersLoading } = useAssignedTrainersByCustomer(id);
  const { data: onboardingData, isLoading: isOnboardingLoading } = useCustomerOnboardingData(customer?.userId || id);
  const { data: goalPreference, isLoading: isGoalLoading } = useCustomerGoalPreference(customer?.userId || id);

  const calculateAge = (dob?: string | null) => {
    if (!dob) return '-';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return '-';
    const diff_ms = Date.now() - birthDate.getTime();
    const age_dt = new Date(diff_ms);
    return `${Math.abs(age_dt.getUTCFullYear() - 1970)} Years`;
  };

  const memberCode = useMemo(() => {
    if (!id) return 'CUST-XXXX';
    return `CUST-${id.substring(0, 6).toUpperCase()}`;
  }, [id]);

  const assignedTrainer = useMemo(() => {
    if (!trainers || trainers.length === 0) return 'None';
    const active = trainers.find((t: any) => t.isActive && !t.is_deleted);
    return active?.trainer?.fullName || 'None';
  }, [trainers]);

  const isLoading = isCustomerLoading || isTrainersLoading || isOnboardingLoading || isGoalLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading personal details...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center px-6">
        <Text className="text-white text-lg font-bold mb-2">Customer Not Found</Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-[#1A1A1A] border border-[#27272A] px-6 py-3 rounded-xl mt-4"
        >
          <Text className="text-[#CCF200] font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isActive = Boolean(customer.is_Active);
  const initials = customer.fullName
    ? customer.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  const userAddress = customer?.user?.address || customer?.address || '-';
  const userCity = customer?.user?.city || customer?.city || '-';
  const userState = customer?.user?.state || customer?.state || '-';
  const userPincode = customer?.user?.pincode || customer?.pincode || '-';

  const renderDetailRow = (
    icon: React.ReactNode,
    label: string,
    value: string | number | undefined | null,
    isActionable?: boolean,
    onPress?: () => void
  ) => (
    <View className="flex-row items-center justify-between py-3 border-b border-[#222226]">
      <View className="flex-row items-center flex-1 pr-2">
        <View className="w-7 h-7 rounded-lg bg-[#1C1F26] items-center justify-center mr-3">
          {icon}
        </View>
        <Text className="text-gray-400 text-xs font-medium">{label}</Text>
      </View>
      {isActionable && onPress ? (
        <Pressable onPress={onPress} className="active:opacity-70">
          <Text className="text-[#CCF200] text-sm font-semibold text-right underline">
            {value || '-'}
          </Text>
        </Pressable>
      ) : (
        <Text className="text-white text-sm font-medium text-right flex-1 pl-2" numberOfLines={2}>
          {value || '-'}
        </Text>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1F1F22]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Personal Details</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Identity Banner */}
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
          <View className="flex-row items-center">
            {customer?.user?.profilePhoto ? (
              <Image
                source={{ uri: customer.user.profilePhoto }}
                className="w-16 h-16 rounded-2xl border border-[#333] mr-4"
              />
            ) : (
              <View className="w-16 h-16 rounded-2xl bg-[#1C1F26] border border-[#333] items-center justify-center mr-4">
                <Text className="text-[#CCF200] text-xl font-bold">{initials}</Text>
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-white text-xl font-bold mr-2" numberOfLines={1}>
                  {customer.fullName}
                </Text>
                {isActive && <CheckCircle size={16} color="#CCF200" weight="fill" />}
              </View>
              <Text className="text-[#CCF200] text-xs font-semibold mt-0.5 tracking-wider">
                {memberCode}
              </Text>
              <View className="flex-row items-center gap-2 mt-2">
                <View
                  className={`px-2.5 py-0.5 rounded-md ${
                    isActive ? 'bg-[#373F0E]' : 'bg-[#4A1D1D]'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? 'text-[#CCF200]' : 'text-[#FFB6C1]'
                    }`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View className="px-2 py-0.5 rounded-md bg-[#1C1F26] border border-[#2A2E38]">
                  <Text className="text-gray-300 text-[10px] font-semibold">
                    Trainer: {assignedTrainer}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 1. Personal Information Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4">
          <View className="flex-row items-center mb-3">
            <User size={18} color="#CCF200" weight="bold" />
            <Text className="text-white text-base font-bold ml-2">Personal Information</Text>
          </View>

          {renderDetailRow(<User size={14} color="#A1A1AA" />, 'Full Name', customer.fullName)}
          {renderDetailRow(
            <User size={14} color="#A1A1AA" />,
            'Gender',
            customer.gender ? customer.gender.toUpperCase() : '-'
          )}
          {renderDetailRow(
            <CalendarBlank size={14} color="#A1A1AA" />,
            'Date of Birth',
            customer.dateOfBirth
              ? new Date(customer.dateOfBirth).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '-'
          )}
          {renderDetailRow(<CalendarBlank size={14} color="#A1A1AA" />, 'Age', calculateAge(customer.dateOfBirth))}
          {renderDetailRow(
            <Phone size={14} color="#A1A1AA" />,
            'Phone',
            customer.phone,
            true,
            () => customer.phone && Linking.openURL(`tel:${customer.phone}`)
          )}
          {renderDetailRow(
            <EnvelopeSimple size={14} color="#A1A1AA" />,
            'Email',
            customer.email,
            true,
            () => customer.email && Linking.openURL(`mailto:${customer.email}`)
          )}
        </View>

        {/* 2. Address Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4">
          <View className="flex-row items-center mb-3">
            <MapPin size={18} color="#CCF200" weight="bold" />
            <Text className="text-white text-base font-bold ml-2">Address Details</Text>
          </View>

          {renderDetailRow(<MapPin size={14} color="#A1A1AA" />, 'Full Address', userAddress)}
          {renderDetailRow(<MapPin size={14} color="#A1A1AA" />, 'City', userCity)}
          {renderDetailRow(<MapPin size={14} color="#A1A1AA" />, 'State', userState)}
          {renderDetailRow(<MapPin size={14} color="#A1A1AA" />, 'Pincode', userPincode)}
        </View>

        {/* 3. Health & Fitness Metrics Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4">
          <View className="flex-row items-center mb-3">
            <Heartbeat size={18} color="#CCF200" weight="bold" />
            <Text className="text-white text-base font-bold ml-2">Health & Fitness</Text>
          </View>

          {renderDetailRow(
            <Barbell size={14} color="#A1A1AA" />,
            'Height',
            onboardingData?.height ? `${onboardingData.height} cm` : '-'
          )}
          {renderDetailRow(
            <Barbell size={14} color="#A1A1AA" />,
            'Weight',
            onboardingData?.weight ? `${onboardingData.weight} kg` : '-'
          )}
          {renderDetailRow(
            <Target size={14} color="#A1A1AA" />,
            'Primary Goal',
            onboardingData?.primaryGoal || goalPreference?.fitnessGoal || '-'
          )}
          {renderDetailRow(
            <Barbell size={14} color="#A1A1AA" />,
            'Target Weight',
            onboardingData?.targetWeight ? `${onboardingData.targetWeight} kg` : '-'
          )}
        </View>

        {/* 4. Emergency Contact Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4">
          <View className="flex-row items-center mb-3">
            <FirstAid size={18} color="#CCF200" weight="bold" />
            <Text className="text-white text-base font-bold ml-2">Emergency Contact</Text>
          </View>

          {renderDetailRow(
            <User size={14} color="#A1A1AA" />,
            'Contact Person',
            customer.emergencyContactName || '-'
          )}
          {renderDetailRow(
            <User size={14} color="#A1A1AA" />,
            'Relationship',
            customer.relationship || '-'
          )}
          {renderDetailRow(
            <Phone size={14} color="#A1A1AA" />,
            'Emergency Phone',
            customer.emergencyContactNumber || '-',
            Boolean(customer.emergencyContactNumber),
            () =>
              customer.emergencyContactNumber &&
              Linking.openURL(`tel:${customer.emergencyContactNumber}`)
          )}
        </View>
      </ScrollView>
    </View>
  );
}
