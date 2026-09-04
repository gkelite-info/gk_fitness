import React from 'react';
import { View, ScrollView, Text, Image, Pressable, TextInput } from 'react-native';
import { CaretLeft, MagnifyingGlass, User, Users, Phone, CaretRight } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

export default function PTCustomersScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#09090B] pb-28">
      <View className="flex-row items-center px-5 pt-12 pb-4">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#CCFF00" />
        </Pressable>
        <Text className="flex-1 text-white text-xl font-semibold text-center mr-6">PT Customers</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#18181B] rounded-[24px] p-5 border border-[#27272A] flex-row mb-6">
          <View className="flex-1 flex-row items-center border-r border-[#27272A] pr-4">
            <View className="w-14 h-14 rounded-full border border-[#CCFF00] items-center justify-center mr-4">
              <User size={28} color="#CCFF00" />
            </View>
            <View>
              <Text className="text-[#A3A3A3] text-sm">Total PT Customers</Text>
              <Text className="text-white text-3xl font-semibold mt-1 mb-1">12</Text>
              <Text className="text-[#A3A3A3] text-xs">Assigned to you</Text>
            </View>
          </View>

          <View className="pl-6 items-center justify-center min-w-[90px]">
            <Users size={24} color="#A3A3A3" style={{ marginBottom: 2 }} />
            <Text className="text-white text-2xl font-semibold">3</Text>
            <Text className="text-[#A3A3A3] text-[10px] mt-1">Expiring soon</Text>
          </View>
        </View>

        <View className="flex-row items-center bg-[#18181B] rounded-xl px-4 py-1 mb-6 border border-[#27272A]">
          <MagnifyingGlass size={20} color="#A3A3A3" />
          <TextInput
            placeholder="Search customers..."
            placeholderTextColor="#A3A3A3"
            className="flex-1 text-white ml-3 text-base font-sans"
          />
        </View>

        <CustomerCard
          name="Arjun Mehta"
          id="CUST-1024"
          phone="+91 98765 43210"
          status="Active"
          dateText="Member since"
          date="15 Jul 2026"
          image="https://i.pravatar.cc/150?u=arjun"
        />
        <CustomerCard
          name="Neha Reddy"
          id="CUST-1025"
          phone="+91 91234 56789"
          status="Active"
          dateText="Member since"
          date="10 Jul 2026"
          image="https://i.pravatar.cc/150?u=neha"
        />
        <CustomerCard
          name="Vikram Singh"
          id="CUST-1026"
          phone="+91 99876 54321"
          status="Expiring Soon"
          dateText="Plan expires on"
          date="05 Aug 2026"
          image="https://i.pravatar.cc/150?u=vikram"
          isExpiring
        />
        <CustomerCard
          name="Pooja Sharma"
          id="CUST-1027"
          phone="+91 90123 45678"
          status="Active"
          dateText="Member since"
          date="28 Jun 2026"
          image="https://i.pravatar.cc/150?u=pooja"
        />
      </ScrollView>
    </View>
  );
}

function CustomerCard({ name, id, phone, status, dateText, date, image, isExpiring }: any) {
  return (
    <Pressable className="bg-[#18181B] rounded-[24px] p-4 border border-[#27272A] mb-4 flex-row items-center active:opacity-80">
      <View className="w-16 h-16 bg-gray-700 rounded-full mr-4 overflow-hidden">
        <Image source={{ uri: image }} className="w-full h-full" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-start justify-between mb-1">
          <View>
            <Text className="text-white text-lg font-semibold">{name}</Text>
            <View className="bg-[#09090B] px-2 py-1 rounded-md self-start mt-1.5 border border-[#27272A]/50">
              <Text className="text-[#A3A3A3] text-[10px] font-medium">{id}</Text>
            </View>
          </View>
          <View className={`px-2 py-1 rounded-md border ${isExpiring ? 'bg-[#09090B] border-[#F59E0B]/20' : 'bg-[#09090B] border-[#CCFF00]/20'}`}>
            <Text className={`text-[10px] font-semibold ${isExpiring ? 'text-[#F59E0B]' : 'text-[#CCFF00]'}`}>{status}</Text>
          </View>
        </View>

        <View className="flex-row items-end justify-between mt-2">
          <View className="flex-row items-center">
            <Phone size={14} color="#A3A3A3" style={{ marginRight: 1.5 }} />
            <Text className="text-[#A3A3A3] text-xs font-medium">{phone}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="items-end mr-3">
              <Text className="text-[#A3A3A3] text-[10px] mb-0.5">{dateText}</Text>
              <Text className="text-white text-xs font-semibold">{date}</Text>
            </View>
            <CaretRight size={16} color="#A3A3A3" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
