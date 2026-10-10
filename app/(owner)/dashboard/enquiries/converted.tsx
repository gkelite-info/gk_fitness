import React from 'react';
import { View, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, User, Tag, CheckCircle } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useEnquiries } from '@/hooks/enquiries/useEnquiries';
import { GymEnquiryAttributes } from '@/helpers/enquiries/enquiriesHelper';

const INTERESTS_MAP: Record<string, string> = {
  membership: 'Gym Membership',
  personaltraining: 'Personal Training',
  groupclass: 'Group Class',
  others: 'Other'
};

const SOURCES_MAP: Record<string, string> = {
  walkin: 'Walk-in',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  referral: 'Referral',
  owner: 'Owner Added',
  socialmedia: 'Social Media',
  others: 'Other'
};

export default function ConvertedEnquiriesScreen() {
  const insets = useSafeAreaInsets();
  
  const { data: enquiriesData, isLoading } = useEnquiries(1, 100, '', 'converted', 'all', 'all');
  const enquiries = enquiriesData?.data || [];
  
  const renderEnquiryCard = ({ item }: { item: GymEnquiryAttributes }) => {
    return (
      <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-4 mb-3">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-white font-semibold text-lg">{item.fullName}</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Phone size={12} color="#A8B7C7" />
              <Text className="text-[#A8B7C7] text-xs">{item.mobile}</Text>
            </View>
          </View>
          <View className="bg-[#082E20] px-2 py-1 rounded-full flex-row items-center gap-1">
            <CheckCircle size={12} color="#10B981" weight="bold" />
            <Text className="text-[#10B981] text-[10px] font-bold uppercase">Converted</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2 mb-3">
          <View className="flex-row items-center gap-1 bg-[#1A1A1A] px-2 py-1 rounded border border-[#2A2A2A]">
            <Tag size={12} color="#888888" />
            <Text className="text-gray-400 text-xs">{INTERESTS_MAP[item.interestedIn] || item.interestedIn}</Text>
          </View>
          <View className="flex-row items-center gap-1 bg-[#1A1A1A] px-2 py-1 rounded border border-[#2A2A2A]">
            <User size={12} color="#888888" />
            <Text className="text-gray-400 text-xs">{SOURCES_MAP[item.enquirySource] || item.enquirySource}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-4 pt-6 pb-4 bg-[#0A0A0A] border-b border-[#1F293D]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Converted Members</Text>
        <View className="w-10 h-10" />
      </View>

      <View className="flex-1 px-4 pt-4">
        <Text className="text-gray-400 mb-6 text-sm">Track members converted from enquiries and review their original source and conversion details.</Text>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#CCF200" size="large" />
          </View>
        ) : enquiries.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500">No converted enquiries yet.</Text>
          </View>
        ) : (
          <FlatList
            data={enquiries}
            keyExtractor={(item) => item.gymEnquiryId!}
            renderItem={renderEnquiryCard}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}
