import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, EnvelopeSimple, CalendarDots, User, Tag, MapPin, Briefcase, Clock, Note, ArrowRight } from 'phosphor-react-native';
import { router } from 'expo-router';

export default function ViewEnquiryScreen() {
  const insets = useSafeAreaInsets();

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
              <Text className="text-white font-bold text-xl mb-1">Rahul Sharma</Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="flex-row items-center gap-1">
                  <Phone size={12} color="#9CA3AF" />
                  <Text className="text-[#D1D5DB] text-xs font-medium">9876543210</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <EnvelopeSimple size={12} color="#9CA3AF" />
                  <Text className="text-[#D1D5DB] text-xs">rahul@gmail.com</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1 mt-1">
                <CalendarDots size={12} color="#9CA3AF" />
                <Text className="text-[#9CA3AF] text-xs">Enquired: <Text className="text-[#D1D5DB] font-semibold text-xs">22 Sep 2026</Text></Text>
              </View>
            </View>
          </View>

          {/* Badges */}
          <View className="flex-row flex-wrap gap-3 mt-2 pt-4 border-t border-[#1E2638]">
            <View>
              <Text className="text-[#5A697A] text-[9px] font-bold uppercase tracking-wider mb-1">Category</Text>
              <View className="bg-[#2E2012] px-2 py-1 rounded">
                <Text className="text-[#F59E0B] font-bold text-[10px] uppercase">Warm</Text>
              </View>
            </View>
            <View>
              <Text className="text-[#5A697A] text-[9px] font-bold uppercase tracking-wider mb-1">Status</Text>
              <View className="bg-[#33240F] px-2 py-1 rounded-full">
                <Text className="text-[#F59E0B] font-bold text-[10px] uppercase">Follow-up</Text>
              </View>
            </View>
            <View>
              <Text className="text-[#5A697A] text-[9px] font-bold uppercase tracking-wider mb-1">Added Via</Text>
              <View className="bg-[#063327] px-2 py-1 rounded border border-[#22C55E]/20">
                <Text className="text-[#22C55E] font-bold text-[10px] uppercase">Social Media</Text>
              </View>
            </View>
            <View>
              <Text className="text-[#5A697A] text-[9px] font-bold uppercase tracking-wider mb-1">Source</Text>
              <View className="bg-[#1A2330] px-2 py-1 rounded border border-[#2B3648]">
                <Text className="text-[#94A3B8] font-bold text-[10px] uppercase">Instagram</Text>
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
                <Text className="text-white text-sm">Male</Text>
              </View>
              <View className="w-1/2 mb-4">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <CalendarDots size={14} color="#667688" />
                  <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider">DOB / Age</Text>
                </View>
                <Text className="text-white text-sm">12 Oct 1995 (30 yrs)</Text>
              </View>
              <View className="w-1/2">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Briefcase size={14} color="#667688" />
                  <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider">Occupation</Text>
                </View>
                <Text className="text-white text-sm">Software Engineer</Text>
              </View>
              <View className="w-1/2">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <MapPin size={14} color="#667688" />
                  <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider">Area / Location</Text>
                </View>
                <Text className="text-white text-sm">Andheri West</Text>
              </View>
            </View>
          </View>

          {/* Interest & Requirement */}
          <View className="bg-[#10161C] border border-[#1C2631] rounded-2xl p-4">
            <Text className="text-white font-bold text-sm mb-4">Interest & Requirements</Text>
            <View className="flex-row flex-wrap">
              <View className="w-1/2 mb-4">
                <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider mb-1">Service Interested</Text>
                <Text className="text-[#CCF200] font-semibold text-sm">Gym Membership</Text>
              </View>
              <View className="w-1/2 mb-4">
                <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider mb-1">Expected Join Date</Text>
                <Text className="text-white text-sm">Within 1 Week</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider mb-1">Budget</Text>
                <Text className="text-white text-sm">₹10,000 - ₹15,000 /yr</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-[#667688] text-[10px] font-bold uppercase tracking-wider mb-1">Preferred Timings</Text>
                <Text className="text-white text-sm">Evening (6PM - 9PM)</Text>
              </View>
            </View>
          </View>

          {/* Scheduled Actions Preview */}
          <View className="bg-[#10161C] border border-[#CCF200]/20 rounded-2xl p-4 relative overflow-hidden">
            <View className="absolute top-0 right-0 w-32 h-32 bg-[#CCF200]/5 rounded-full -mr-10 -mt-10" />
            <Text className="text-[#9CA3AF] font-bold text-xs uppercase tracking-wider mb-3">Scheduled Actions</Text>
            <View className="bg-[#0A0F14] border border-[#1C2631] rounded-xl p-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Clock size={16} color="#A8B7C7" />
                <Text className="text-[#A8B7C7] text-xs">Next Call</Text>
              </View>
              <Text className="text-[#CCF200] font-bold text-sm">23 Sep 2026, 6:00 PM</Text>
            </View>
          </View>

          {/* Follow Up History */}
          <View className="bg-[#10161C] border border-[#1C2631] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-white font-bold text-sm">Follow-up History</Text>
              <Pressable className="flex-row items-center gap-1 bg-[#1A2330] px-2 py-1 rounded border border-[#2B3648]">
                <Text className="text-[#CCF200] text-[10px] font-bold uppercase">Add Note</Text>
              </Pressable>
            </View>

            {/* Timeline Item 1 */}
            <View className="flex-row gap-3 mb-4">
              <View className="items-center">
                <View className="w-6 h-6 rounded-full bg-[#1A2330] items-center justify-center border border-[#2B3648]">
                  <Phone size={12} color="#A8B7C7" />
                </View>
                <View className="w-[1px] h-full bg-[#1C2631] my-1" />
              </View>
              <View className="flex-1 pb-4">
                <View className="flex-row justify-between items-start mb-1">
                  <Text className="text-white text-sm font-semibold">First Contact Attempt</Text>
                  <Text className="text-[#5A697A] text-[10px]">22 Sep, 11:00 AM</Text>
                </View>
                <Text className="text-[#A8B7C7] text-xs mb-2 leading-5">Called the prospect. They were busy at work and requested to call back in the evening around 6 PM.</Text>
                <View className="bg-[#2E2012] self-start px-2 py-1 rounded">
                  <Text className="text-[#F59E0B] font-bold text-[9px] uppercase">Status changed to Follow-up</Text>
                </View>
              </View>
            </View>

            {/* Timeline Item 2 */}
            <View className="flex-row gap-3">
              <View className="items-center">
                <View className="w-6 h-6 rounded-full bg-[#063327] items-center justify-center border border-[#22C55E]/30">
                  <Note size={12} color="#22C55E" />
                </View>
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-start mb-1">
                  <Text className="text-white text-sm font-semibold">Enquiry Received</Text>
                  <Text className="text-[#5A697A] text-[10px]">22 Sep, 10:30 AM</Text>
                </View>
                <Text className="text-[#A8B7C7] text-xs leading-5">Lead generated via Instagram Ad campaign (Summer Promo).</Text>
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}
