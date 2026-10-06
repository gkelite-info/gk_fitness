import React, { useState } from 'react';
import { View, ScrollView, Pressable, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, User, Tag, CheckCircle } from 'phosphor-react-native';
import { router } from 'expo-router';

const ALL_MEMBERS = [
  { id: "1", name: "Rahul Sharma", email: "rahul.sharma@gmail.com", phone: "9876543210", source: "Instagram", addedVia: "Social Media", plan: "Gym Membership", date: "22 Sep 2026" },
  { id: "2", name: "Sneha Patel", email: "sneha.patel@gmail.com", phone: "9876543211", source: "Google", addedVia: "Owner Added", plan: "Personal Training", date: "23 Sep 2026" },
  { id: "3", name: "Amit Kumar", email: "amit.kumar99@outlook.com", phone: "9876543212", source: "Facebook", addedVia: "Social Media", plan: "Gym Membership", date: "25 Sep 2026" },
  { id: "4", name: "Neha Kapoor", email: "neha.kapoor@gmail.com", phone: "9876543213", source: "Referral", addedVia: "Owner Added", plan: "Group Class", date: "21 Sep 2026" },
  { id: "5", name: "Vikram Singh", email: "vikram.singh@yahoo.com", phone: "9876543214", source: "Walk-in", addedVia: "Owner Added", plan: "Gym Membership", date: "20 Sep 2026" },
  { id: "6", name: "Priya Nair", email: "priya.nair@hotmail.com", phone: "9876543215", source: "Instagram", addedVia: "Social Media", plan: "Personal Training", date: "24 Sep 2026" },
  { id: "7", name: "Karan Mehta", email: "mehta.karan@gmail.com", phone: "9876543216", source: "Google", addedVia: "Owner Added", plan: "Gym Membership", date: "26 Sep 2026" },
  { id: "8", name: "Ananya Reddy", email: "ananya.reddy@gmail.com", phone: "9876543217", source: "Facebook", addedVia: "Social Media", plan: "Group Class", date: "28 Sep 2026" },
];

export default function ConvertedEnquiriesScreen() {
  const insets = useSafeAreaInsets();
  
  const renderEnquiryCard = ({ item }: { item: typeof ALL_MEMBERS[0] }) => {
    return (
      <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-4 mb-3">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-white font-semibold text-lg">{item.name}</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Phone size={12} color="#A8B7C7" />
              <Text className="text-[#A8B7C7] text-xs">{item.phone}</Text>
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
            <Text className="text-gray-400 text-xs">{item.plan}</Text>
          </View>
          <View className="flex-row items-center gap-1 bg-[#1A1A1A] px-2 py-1 rounded border border-[#2A2A2A]">
            <User size={12} color="#888888" />
            <Text className="text-gray-400 text-xs">{item.source}</Text>
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

        <FlatList
          data={ALL_MEMBERS}
          keyExtractor={(item) => item.id}
          renderItem={renderEnquiryCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}
