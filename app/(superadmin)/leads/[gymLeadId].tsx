import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Buildings,
  MapPin,
  CalendarBlank,
  User,
  Phone,
  EnvelopeSimple,
  Globe,
  Briefcase,
  Image as ImageIcon,
  Tag,
  CaretDown
} from 'phosphor-react-native';
import { useGymLeadById } from '@/hooks/gymLeads/useGymLeads';
import { getGymLeadLogoUrl } from '@/helpers/gymLeads/gymLeadsHelper';

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved': return '#84CC16';
    case 'underreview': return '#FBBF24';
    case 'rejected': return '#EF4444';
    case 'submitted':
    default: return '#38BDF8';
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'Approved';
    case 'underreview': return 'Under Review';
    case 'rejected': return 'Rejected';
    case 'submitted':
    default: return 'Submitted';
  }
};

export default function GymLeadDetailsScreen() {
  const { gymLeadId } = useLocalSearchParams<{ gymLeadId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: lead, isLoading } = useGymLeadById(gymLeadId);

  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0E1014] justify-center items-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#C8F51D" />
      </View>
    );
  }

  if (!lead) {
    return (
      <View className="flex-1 bg-[#0E1014] justify-center items-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-white text-lg font-semibold">Lead not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-[#1D1F27] px-4 py-2 rounded-xl border border-[#20232C]">
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const appliedDate = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown';

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top + 20 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 pb-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#1D1F27] rounded-full items-center justify-center mr-4 active:opacity-70 border border-[#20232C]"
        >
          <CaretLeft size={20} color="#A1A1AA" />
        </Pressable>
        <View>
          <Text className="text-[#C8F51D] text-xl font-semibold">Gym Owner <Text className="text-white font-semibold">Details</Text></Text>
          <Text className="text-[#A1A1AA] text-xs mt-0.5">Review registration request</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row justify-between items-start">
            <View className="flex-row items-center flex-1">
              <View className="w-14 h-14 rounded-xl bg-[#0E1014] items-center justify-center mr-4 border border-[#20232C]">
                <Buildings size={28} color="#C8F51D" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-semibold mb-1" numberOfLines={1}>{lead.gymName}</Text>
                <View className="flex-row items-center mb-1">
                  <MapPin size={14} color="#A1A1AA" />
                  <Text className="text-[#A1A1AA] text-xs ml-1 flex-1" numberOfLines={1}>{lead.gymCity}, {lead.gymState}</Text>
                </View>
                <View className="flex-row items-center">
                  <CalendarBlank size={14} color="#A1A1AA" />
                  <Text className="text-[#A1A1AA] text-xs ml-1 flex-1" numberOfLines={1}>Applied on {appliedDate}</Text>
                </View>
              </View>
            </View>

            <View
              className="px-3 py-1 rounded-md border"
              style={{ backgroundColor: `${getStatusColor(lead.status)}15`, borderColor: `${getStatusColor(lead.status)}30` }}
            >
              <Text className="text-[10px] font-semibold tracking-wider" style={{ color: getStatusColor(lead.status) }}>
                {getStatusLabel(lead.status).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <User size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Basic Information</Text>
          </View>
          <View className="bg-[#0E1014] rounded-xl border border-[#20232C] overflow-hidden">
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Category</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">Gym</Text>
            </View>
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Owner Name</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">{lead.fullName}</Text>
            </View>
            <View className="flex-row py-3 px-4">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Gym Name</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">{lead.gymName}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <Phone size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Contact Information</Text>
          </View>
          <View className="bg-[#0E1014] rounded-xl border border-[#20232C] overflow-hidden">
            <View className="flex-row py-3 px-4 border-b border-[#20232C] items-center">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Gym Email</Text>
              <View className="flex-row flex-1 items-center">
                <EnvelopeSimple size={16} color="#A1A1AA" />
                <Text className="text-[#E4E4E7] text-sm font-medium ml-2 shrink-1" numberOfLines={1}>{lead.gymEmail || lead.email}</Text>
              </View>
            </View>
            <View className="flex-row py-3 px-4 border-b border-[#20232C] items-center">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Mobile Number</Text>
              <View className="flex-row flex-1 items-center">
                <Phone size={16} color="#A1A1AA" />
                <Text className="text-[#E4E4E7] text-sm font-medium ml-2">{lead.gymMobile || lead.mobile}</Text>
              </View>
            </View>
            <View className="flex-row py-3 px-4 items-center">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Alternate Mobile Number</Text>
              <View className="flex-row flex-1 items-center">
                <Phone size={16} color="#A1A1AA" />
                <Text className="text-[#E4E4E7] text-sm font-medium ml-2">{lead.gymAlternateMobile || lead.alternateMobile || '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <MapPin size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Address</Text>
          </View>
          <View className="bg-[#0E1014] rounded-xl border border-[#20232C] overflow-hidden mb-3">
            <View className="flex-row py-3 px-4 items-center">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Address</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium" numberOfLines={2}>{lead.gymAddress}</Text>
            </View>
          </View>

          <View className="flex-row justify-between">
            <View className="bg-[#0E1014] rounded-xl border border-[#20232C] px-3 py-2 flex-1 mr-2 flex-row items-center">
              <Globe size={16} color="#A1A1AA" />
              <Text className="text-[#A1A1AA] text-xs ml-2 mr-1">Country</Text>
              <Text className="text-[#E4E4E7] text-sm font-medium ml-auto">India</Text>
            </View>
            <View className="bg-[#0E1014] rounded-xl border border-[#20232C] px-3 py-2 flex-1 ml-2 flex-row items-center">
              <Buildings size={16} color="#A1A1AA" />
              <Text className="text-[#A1A1AA] text-xs ml-2 mr-1">State</Text>
              <Text className="text-[#E4E4E7] text-sm font-medium ml-auto" numberOfLines={1}>{lead.gymState}</Text>
            </View>
          </View>

          <View className="flex-row justify-between mt-3">
            <View className="bg-[#0E1014] rounded-xl border border-[#20232C] px-3 py-2 flex-1 mr-2 flex-row items-center">
              <MapPin size={16} color="#A1A1AA" />
              <Text className="text-[#A1A1AA] text-xs ml-2 mr-1">PIN Code</Text>
              <Text className="text-[#E4E4E7] text-sm font-medium ml-auto">{lead.gymPincode}</Text>
            </View>
            <View className="bg-[#0E1014] rounded-xl border border-[#20232C] px-3 py-2 flex-1 ml-2 flex-row items-center">
              <Buildings size={16} color="#A1A1AA" />
              <Text className="text-[#A1A1AA] text-xs ml-2 mr-1">City</Text>
              <Text className="text-[#E4E4E7] text-sm font-medium ml-auto" numberOfLines={1}>{lead.gymCity}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <Briefcase size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Business Information</Text>
          </View>
          <View className="bg-[#0E1014] rounded-xl border border-[#20232C] overflow-hidden">
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">No. of Branches</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">{lead.noOfBranches}</Text>
            </View>
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Establish Year</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">{lead.establishYear}</Text>
            </View>
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Note</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium" numberOfLines={3}>{lead.note || '-'}</Text>
            </View>
            <View className="flex-row py-3 px-4">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Website</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium" numberOfLines={1}>{lead.website || '-'}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <ImageIcon size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Branding</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[#A1A1AA] text-sm">Logo</Text>
            <View className="w-24 h-12 bg-[#0E1014] rounded-xl border border-[#20232C] items-center justify-center overflow-hidden">
              {lead.logo ? (
                <Image source={{ uri: getGymLeadLogoUrl(lead.logo) as string }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              ) : (
                <Text className="text-[#C8F51D] text-[10px] font-semibold text-center">NO LOGO</Text>
              )}
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <Tag size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Select Label</Text>
          </View>
          <Pressable
            onPress={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}
            className="flex-row items-center justify-between bg-[#0E1014] rounded-xl border border-[#20232C] px-4 py-3"
          >
            <Text className="text-[#A1A1AA] text-sm">{selectedLabel || 'Choose Label'}</Text>
            <CaretDown size={16} color="#A1A1AA" />
          </Pressable>
          {isLabelDropdownOpen && (
            <View className="mt-2 bg-[#2B2F3D] rounded-xl border border-[#20232C] overflow-hidden">
              <Pressable
                onPress={() => { setSelectedLabel('Normal'); setIsLabelDropdownOpen(false); }}
                className="px-4 py-3 border-b border-white/10"
              >
                <Text className="text-white text-sm">Normal</Text>
              </Pressable>
              <Pressable
                onPress={() => { setSelectedLabel('White'); setIsLabelDropdownOpen(false); }}
                className="px-4 py-3"
              >
                <Text className="text-white text-sm">White</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
