import React from 'react';
import { View, ScrollView, Text, Image, Pressable } from 'react-native';
import { CaretLeft, CaretRight, CalendarBlank, Check, Clock } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

export default function SessionHistoryScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#09090B] pb-10">
      <View className="flex-row items-center justify-between px-5 pt-12 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl border border-[#333333] items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#D7FF00" />
        </Pressable>
        <View className="items-center">
          <Text className="text-white text-xl font-semibold">Session History</Text>
          <Text className="text-[#888888] text-xs mt-1">Track all your training sessions</Text>
        </View>
        <Pressable className="w-10 h-10 rounded-xl border border-[#333333] items-center justify-center active:opacity-70">
          <CalendarBlank size={20} color="#D7FF00" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#18181B] rounded-2xl flex-row items-center justify-between p-4 mb-8 border border-[#2A2A2A]">
          <Pressable className="p-2 bg-[#2A2A2A] rounded-lg active:opacity-70">
            <CaretLeft size={16} color="#888888" />
          </Pressable>
          <View className="items-center">
            <Text className="text-white text-base font-semibold">August 2026</Text>
            <Text className="text-[#888888] text-xs mt-0.5">12 Sessions</Text>
          </View>
          <Pressable className="p-2 bg-[#2A2A2A] rounded-lg active:opacity-70">
            <CaretRight size={16} color="#888888" />
          </Pressable>
        </View>

        {/* Timeline container */}
        <View className="pl-4">
          <View className="mb-6">
            <Text className="text-[#D7FF00] text-[10px] font-semibold tracking-widest mb-4 ml-8 uppercase">TODAY • 13 AUG</Text>

            <TimelineItem
              time="09:00 AM"
              duration="60 min"
              name="Rahul Sharma"
              type="Strength Training"
              image="https://i.pravatar.cc/150?u=rahul"
              status="completed"
              isLast={false}
            />

            <TimelineItem
              time="05:30 PM"
              duration="60 min"
              name="Arjun Mehta"
              type="Personal Training"
              image="https://i.pravatar.cc/150?u=arjun"
              status="pending"
              isLast={true}
            />
          </View>

          {/* Section: YESTERDAY */}
          <View className="mb-6">
            <Text className="text-[#D7FF00] text-[10px] font-semibold tracking-widest mb-4 ml-8 uppercase">YESTERDAY • 12 AUG</Text>

            <TimelineItem
              time="10:00 AM"
              duration="60 min"
              name="Neha Reddy"
              type="Weight Training"
              image="https://i.pravatar.cc/150?u=neha"
              status="completed"
              isLast={false}
            />

            <TimelineItem
              time="06:00 PM"
              duration="60 min"
              name="Karan Patel"
              type="Strength Training"
              image="https://i.pravatar.cc/150?u=karan"
              status="completed"
              isLast={true}
            />
          </View>

          {/* Section: 12 AUG */}
          <View className="mb-6">
            <Text className="text-[#D7FF00] text-[10px] font-semibold tracking-widest mb-4 ml-8 uppercase">12 AUG</Text>

            <TimelineItem
              time="10:00 AM"
              duration="60 min"
              name="Neha Reddy"
              type="Weight Training"
              image="https://i.pravatar.cc/150?u=neha"
              status="completed"
              isLast={false}
            />

            <TimelineItem
              time="06:00 PM"
              duration="60 min"
              name="Karan Patel"
              type="Strength Training"
              image="https://i.pravatar.cc/150?u=karan"
              status="completed"
              isLast={true}
            />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

function TimelineItem({ time, duration, name, type, image, status, isLast }: any) {
  const dotColor = status === 'completed' ? '#D7FF00' : '#8A2BE2';

  return (
    <View className="flex-row mb-4">
      <View className="items-center mr-4 w-5 relative">
        <View className="absolute top-6 w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: `${dotColor}33`, zIndex: 1 }}>
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
        </View>
        {!isLast && (
          <View className="absolute top-10 bottom-[-20px] w-0.5" style={{ backgroundColor: '#333333' }} />
        )}
      </View>

      <View className="flex-1 bg-[#18181B] rounded-3xl p-4 flex-row items-center justify-between border border-[#2A2A2A]">
        <View className="mr-3 min-w-[70px]">
          <Text className="text-white text-sm font-semibold">{time}</Text>
          <Text className="text-[#888888] text-[11px] mt-0.5">{duration}</Text>
        </View>

        <View className="flex-row items-center flex-1 ml-2">
          <View className="w-10 h-10 bg-gray-700 rounded-full mr-3 overflow-hidden">
            <Image source={{ uri: image }} className="w-full h-full" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold" numberOfLines={1}>{name}</Text>
            <Text className="text-[#888888] text-[11px] mt-0.5" numberOfLines={1}>{type}</Text>
          </View>
        </View>

        <View className="ml-2 w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: dotColor }}>
          {status === 'completed' ? (
            <Check size={16} color="#000000" weight="bold" />
          ) : (
            <Clock size={16} color="#FFFFFF" weight="bold" />
          )}
        </View>
      </View>
    </View>
  );
}
