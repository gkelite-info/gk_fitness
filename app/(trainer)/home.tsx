import React from 'react';
import { View, ScrollView, Text, Image, Pressable } from 'react-native';
import { CaretRight, Plus, Users, User, ArrowRight, ClipboardText, Bag, Star } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

export default function TrainerHome() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-[#09090B]" contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="px-5 pt-12 pb-6">
        <Text className="text-white text-[28px] font-semibold">Good Morning, <Text className="text-[#CCFF00]">Rahul</Text> 👋</Text>
        <Text className="text-[#A3A3A3] text-sm mt-1">Strength & Conditioning Coach</Text>
      </View>

      <View className="px-5 mb-6">
        <View className="bg-[#141414] rounded-2xl p-5 border border-[#1A1A1A] flex-row justify-between items-center">
          <View className="flex-1 border-r border-[#2A2A2A] pr-4">
            <View className="flex-row items-center mb-3">
              <View className="w-6 h-6 rounded-full bg-[#CCFF00] items-center justify-center mr-2">
                <Star size={12} color="#000" weight="fill" />
              </View>
              <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider">MY ATTENDANCE</Text>
            </View>
            <View className="flex-row items-baseline mb-3">
              <Text className="text-white text-5xl font-semibold mr-2">28</Text>
              <Text className="text-[#A3A3A3] text-sm">Days Left</Text>
            </View>
            <View className="h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
              <View className="h-full bg-[#CCFF00] w-1/3 rounded-full" />
            </View>
          </View>

          <View className="pl-6 items-center justify-center">
            <View className="w-10 h-10 mb-2 items-center justify-center">
              <View className="flex-row flex-wrap w-6 h-6 justify-between content-between">
                <View className="w-2.5 h-2.5 bg-[#CCFF00] rounded-sm" />
                <View className="w-2.5 h-2.5 bg-[#CCFF00] rounded-sm" />
                <View className="w-2.5 h-2.5 bg-[#CCFF00] rounded-sm" />
                <View className="w-2.5 h-2.5 bg-[#CCFF00] rounded-sm" />
              </View>
            </View>
            <Text className="text-[#A3A3A3] text-xs text-center mb-1">Check-in{'\n'}(QR)</Text>
            <Pressable>
              <Text className="text-[#CCFF00] text-xs underline">View</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="px-5 mb-6">
        <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3">TODAY</Text>
        <View className="flex-row justify-between">
          <View className="bg-[#141414] rounded-2xl p-4 border border-[#1A1A1A] flex-1 mr-2">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-full border border-[#CCFF00]/30 items-center justify-center mr-3">
                <Users size={20} color="#CCFF00" />
              </View>
              <View>
                <Text className="text-[#A3A3A3] text-xs">PT Sessions</Text>
                <Text className="text-white text-2xl font-semibold">3</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between mt-2 pt-3 border-t border-[#1A1A1A]">
              <Text className="text-[#A3A3A3] text-[10px]">Scheduled today</Text>
              <Pressable 
                onPress={() => router.push('/(trainer)/session-history' as any)}
                className="w-5 h-5 rounded-full border border-[#CCFF00] items-center justify-center active:opacity-70"
              >
                <ArrowRight size={12} color="#CCFF00" />
              </Pressable>
            </View>
          </View>

          <View className="bg-[#141414] rounded-2xl p-4 border border-[#1A1A1A] flex-1 ml-2">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-full border border-[#CCFF00]/30 items-center justify-center mr-3">
                <User size={20} color="#CCFF00" />
              </View>
              <View>
                <Text className="text-[#A3A3A3] text-xs">PT Customers</Text>
                <Text className="text-white text-2xl font-semibold">12</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between mt-2 pt-3 border-t border-[#1A1A1A]">
              <Text className="text-[#A3A3A3] text-[10px]">Assigned to you</Text>
              <Pressable 
                onPress={() => router.push('/(trainer)/pt-customers' as any)}
                className="w-5 h-5 rounded-full border border-[#CCFF00] items-center justify-center active:opacity-70"
              >
                <ArrowRight size={12} color="#CCFF00" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View className="px-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider">NEW ASSIGNMENTS</Text>
          <Pressable 
            className="flex-row items-center active:opacity-70"
            onPress={() => router.push('/(trainer)/new-assignments' as any)}
          >
            <Text className="text-[#CCFF00] text-xs mr-1">View All</Text>
            <ArrowRight size={10} color="#CCFF00" />
          </Pressable>
        </View>
        <View className="bg-[#141414] rounded-2xl border border-[#1A1A1A]">
          <Pressable className="flex-row items-center p-4 border-b border-[#1A1A1A]">
            <View className="w-12 h-12 bg-gray-700 rounded-full mr-4 overflow-hidden">
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=arjun' }} className="w-full h-full" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-white text-base font-semibold mr-2">Arjun Mehta</Text>
                <View className="bg-[#4D5900] px-1.5 py-0.5 rounded">
                  <Text className="text-[#CCFF00] text-[10px] font-semibold">NEW</Text>
                </View>
              </View>
              <Text className="text-[#A3A3A3] text-xs mb-0.5">CUST-1024</Text>
              <Text className="text-[#A3A3A3] text-xs">Added today</Text>
            </View>
            <CaretRight size={16} color="#A3A3A3" />
          </Pressable>

          <Pressable className="flex-row items-center p-4">
            <View className="w-12 h-12 bg-gray-700 rounded-full mr-4 overflow-hidden">
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=neha' }} className="w-full h-full" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-white text-base font-semibold mr-2">Neha Reddy</Text>
                <View className="bg-[#4D5900] px-1.5 py-0.5 rounded">
                  <Text className="text-[#CCFF00] text-[10px] font-semibold">NEW</Text>
                </View>
              </View>
              <Text className="text-[#A3A3A3] text-xs mb-0.5">CUST-1025</Text>
              <Text className="text-[#A3A3A3] text-xs">Added yesterday</Text>
            </View>
            <CaretRight size={16} color="#A3A3A3" />
          </Pressable>
        </View>
      </View>

      <View className="px-5 mb-6">
        <Text className="text-[#CCFF00] text-xs font-semibold tracking-wider mb-3">QUICK ACTIONS</Text>
        <View className="flex-row justify-between">
          <Pressable className="bg-[#141414] rounded-2xl p-4 border border-[#1A1A1A] flex-1 mr-2 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-2 border border-[#2A2A2A]">
                <ClipboardText size={18} color="#A3A3A3" />
              </View>
              <View>
                <Text className="text-[#A3A3A3] text-[10px]">Create</Text>
                <Text className="text-white text-sm font-semibold">Workout{'\n'}Plan</Text>
              </View>
            </View>
            <View className="w-6 h-6 rounded-full bg-[#CCFF00] items-center justify-center ml-1">
              <Plus size={14} color="#000" weight="bold" />
            </View>
          </Pressable>

          <Pressable className="bg-[#141414] rounded-2xl p-4 border border-[#1A1A1A] flex-1 ml-2 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-2 border border-[#2A2A2A]">
                <Bag size={18} color="#A3A3A3" />
              </View>
              <View>
                <Text className="text-[#A3A3A3] text-[10px]">Create</Text>
                <Text className="text-white text-sm font-semibold">Diet Plan</Text>
              </View>
            </View>
            <View className="w-6 h-6 rounded-full bg-[#CCFF00] items-center justify-center ml-1">
              <Plus size={14} color="#000" weight="bold" />
            </View>
          </Pressable>
        </View>
      </View>

      <View className="px-5 mb-10">
        <View className="bg-[#141414] rounded-2xl p-5 border border-[#1A1A1A]">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-row items-center pr-2 shrink">
              <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-3 border border-[#2A2A2A] relative">
                <Bag size={20} color="#CCFF00" weight="fill" />
                <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#CCFF00] rounded-full border border-[#141414]" />
              </View>
              <View className="shrink pr-2">
                <Text className="text-white text-xs font-semibold tracking-wider mb-1">GLOBAL SESSION REQUESTS</Text>
                <Text className="text-[#A3A3A3] text-xs">New customers want to book a session</Text>
              </View>
            </View>
            <View className="bg-[#CCFF00] px-2 py-1 rounded-full flex-row items-center">
              <Text className="text-black text-[12px] font-semibold mr-1">4</Text>
              <Text className="text-black text-[9px] font-semibold">PENDING</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-[#1A1A1A]">
            <Text className="text-[#A3A3A3] text-xs">Check new inquiries</Text>
            <Pressable className="bg-[#1A1A1A] px-3 py-1.5 rounded-full flex-row items-center">
              <Text className="text-[#CCFF00] text-xs mr-1">View All</Text>
              <ArrowRight size={10} color="#CCFF00" />
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
