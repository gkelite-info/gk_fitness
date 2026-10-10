import React from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, EnvelopeSimple, CalendarDots, User, Tag, MapPin, Briefcase, Clock, Note, ArrowRight } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEnquiryById } from '@/hooks/enquiries/useEnquiries';
import { format } from 'date-fns';

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

const ADDED_VIA_MAP: Record<string, string> = {
  socialmedia: 'Social Media',
  walkin: 'Walk-in',
  owner: 'Owner Added'
};

const STATUS_MAP: Record<string, string> = {
  new: 'New',
  followup: 'Follow-up',
  inprogress: 'In Progress',
  converted: 'Converted',
  notinterested: 'Not Interested'
};

export default function ViewEnquiryScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: enquiry, isLoading } = useEnquiryById(id);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] justify-center items-center">
        <ActivityIndicator color="#CCF200" size="large" />
      </View>
    );
  }

  if (!enquiry) {
    return (
      <View className="flex-1 bg-[#0A0A0A] justify-center items-center">
        <Text className="text-white">Enquiry not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-[#1A2330] px-4 py-2 rounded">
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-4 pt-6 pb-4 bg-[#0A0A0A] border-b border-[#1F293D]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center active:opacity-75">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Enquiry Details</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        
        {/* Header Banner Card */}
        <View className="bg-[#141B24] border-b border-[#202938] p-5 mb-4">
          <View className="flex-row items-center gap-4 mb-4">
            <View className="w-16 h-16 rounded-full bg-[#101720] border-2 border-[#CCF200] items-center justify-center overflow-hidden">
              <Image source={{ uri: 'https://i.pravatar.cc/150?img=11' }} className="w-14 h-14 rounded-full" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-xl mb-1">{enquiry.fullName}</Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="flex-row items-center gap-1">
                  <Phone size={12} color="#9CA3AF" />
                  <Text className="text-[#D1D5DB] text-xs font-medium">{enquiry.mobile}</Text>
                </View>
                {enquiry.email && (
                  <View className="flex-row items-center gap-1">
                    <EnvelopeSimple size={12} color="#9CA3AF" />
                    <Text className="text-[#D1D5DB] text-xs">{enquiry.email}</Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center gap-1 mt-1">
                <CalendarDots size={12} color="#9CA3AF" />
                <Text className="text-[#9CA3AF] text-xs">Enquired: <Text className="text-[#D1D5DB] font-semibold text-xs">{enquiry.createdAt ? format(new Date(enquiry.createdAt), 'dd MMM yyyy') : '--'}</Text></Text>
              </View>
            </View>
          </View>

          {/* Badges */}
          <View className="flex-row flex-wrap gap-3 mt-2 pt-4 border-t border-[#1E2638]">
            <View>
              <Text className="text-[#5A697A] text-[9px] font-bold uppercase tracking-wider mb-1">Category</Text>
              <View className="bg-[#2E2012] px-2 py-1 rounded">
                <Text className="text-[#F59E0B] font-bold text-[10px] uppercase">{enquiry.enquiryCategory}</Text>
              </View>
            </View>
            <View>
              <Text className="text-[#5A697A] text-[9px] font-bold uppercase tracking-wider mb-1">Status</Text>
              <View className="bg-[#33240F] px-2 py-1 rounded-full">
                <Text className="text-[#F59E0B] font-bold text-[10px] uppercase">{STATUS_MAP[enquiry.status] || enquiry.status}</Text>
              </View>
            </View>
            <View>
              <Text className="text-[#5A697A] text-[9px] font-bold uppercase tracking-wider mb-1">Added Via</Text>
              <View className="bg-[#063327] px-2 py-1 rounded border border-[#22C55E]/20">
                <Text className="text-[#22C55E] font-bold text-[10px] uppercase">{ADDED_VIA_MAP[enquiry.addedThrough] || enquiry.addedThrough}</Text>
              </View>
            </View>
            <View>
              <Text className="text-[#5A697A] text-[9px] font-bold uppercase tracking-wider mb-1">Source</Text>
              <View className="bg-[#1A2330] px-2 py-1 rounded border border-[#2B3648]">
                <Text className="text-[#94A3B8] font-bold text-[10px] uppercase">{SOURCES_MAP[enquiry.enquirySource] || enquiry.enquirySource}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-4 gap-4">
          
          {/* Customer Info Card */}
          <View className="bg-[#10161C] border border-[#1C2631] rounded-2xl p-4">
            <Text className="text-white font-bold text-sm mb-4">Customer Info</Text>
            <View className="flex-row flex-wrap">
              <View className="w-1/2 mb-4">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <User size={14} color="#667688" />
                  <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider">Gender</Text>
                </View>
                <Text className="text-white text-sm capitalize">{enquiry.gender || 'Not specified'}</Text>
              </View>
              <View className="w-1/2 mb-4">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <CalendarDots size={14} color="#667688" />
                  <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider">DOB / Age</Text>
                </View>
                <Text className="text-white text-sm">--</Text>
              </View>
              <View className="w-1/2">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Briefcase size={14} color="#667688" />
                  <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider">Occupation</Text>
                </View>
                <Text className="text-white text-sm">--</Text>
              </View>
              <View className="w-1/2">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <MapPin size={14} color="#667688" />
                  <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider">Area / Location</Text>
                </View>
                <Text className="text-white text-sm">--</Text>
              </View>
            </View>
          </View>

          {/* Interest & Requirement */}
          <View className="bg-[#10161C] border border-[#1C2631] rounded-2xl p-4">
            <Text className="text-white font-bold text-sm mb-4">Interest & Requirements</Text>
            <View className="flex-row flex-wrap">
              <View className="w-1/2 mb-4">
                <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider mb-1">Service Interested</Text>
                <Text className="text-[#CCF200] font-semibold text-sm">{INTERESTS_MAP[enquiry.interestedIn] || enquiry.interestedIn}</Text>
              </View>
              <View className="w-1/2 mb-4">
                <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider mb-1">Expected Join Date</Text>
                <Text className="text-white text-sm">--</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider mb-1">Budget</Text>
                <Text className="text-white text-sm">--</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider mb-1">Preferred Timings</Text>
                <Text className="text-white text-sm">--</Text>
              </View>
            </View>
          </View>

          {/* Scheduled Actions Preview */}
          {enquiry.followUpDate && (
            <View className="bg-[#10161C] border border-[#CCF200]/20 rounded-2xl p-4 relative overflow-hidden">
              <View className="absolute top-0 right-0 w-32 h-32 bg-[#CCF200]/5 rounded-full -mr-10 -mt-10" />
              <Text className="text-[#9CA3AF] font-bold text-xs uppercase tracking-wider mb-3">Scheduled Actions</Text>
              <View className="bg-[#0A0F14] border border-[#1C2631] rounded-xl p-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Clock size={16} color="#A8B7C7" />
                  <Text className="text-[#A8B7C7] text-xs">Next Follow-up</Text>
                </View>
                <Text className="text-[#CCF200] font-bold text-sm">{format(new Date(enquiry.followUpDate), 'dd MMM yyyy, h:mm a')}</Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {enquiry.notes && (
            <View className="bg-[#10161C] border border-[#1C2631] rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-white font-bold text-sm">Notes</Text>
              </View>
              <Text className="text-[#A8B7C7] text-xs leading-5">{enquiry.notes}</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
