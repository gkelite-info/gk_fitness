import React from 'react';
import { View, ScrollView, Text, Image, Pressable } from 'react-native';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

export default function NewAssignmentsScreen() {
  const router = useRouter();

  const assignments = [
    { id: '1', name: 'Arjun Mehta', custId: 'CUST-1024', date: 'Added today', image: 'https://i.pravatar.cc/150?u=arjun' },
    { id: '2', name: 'Neha Reddy', custId: 'CUST-1025', date: 'Added yesterday', image: 'https://i.pravatar.cc/150?u=neha' },
    { id: '3', name: 'Arjun Mehta', custId: 'CUST-1024', date: 'Added today', image: 'https://i.pravatar.cc/150?u=arjun' },
    { id: '4', name: 'Neha Reddy', custId: 'CUST-1025', date: 'Added yesterday', image: 'https://i.pravatar.cc/150?u=neha' },
    { id: '5', name: 'Arjun Mehta', custId: 'CUST-1024', date: 'Added today', image: 'https://i.pravatar.cc/150?u=arjun' },
    { id: '6', name: 'Neha Reddy', custId: 'CUST-1025', date: 'Added yesterday', image: 'https://i.pravatar.cc/150?u=neha' },
    { id: '7', name: 'Arjun Mehta', custId: 'CUST-1024', date: 'Added today', image: 'https://i.pravatar.cc/150?u=arjun' },
    { id: '8', name: 'Neha Reddy', custId: 'CUST-1025', date: 'Added yesterday', image: 'https://i.pravatar.cc/150?u=neha' },
  ];

  return (
    <View className="flex-1 bg-[#09090B] pb-10">
      <View className="flex-row items-center px-5 pt-12 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl border border-[#333333] items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#CCFF00" />
        </Pressable>
        <Text className="flex-1 text-white text-xl font-semibold text-center mr-10">New Assignments</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#141414] rounded-[20px] border border-[#1A1A1A] overflow-hidden mb-8">
          {assignments.map((assignment, index) => (
            <AssignmentItem
              key={assignment.id}
              assignment={assignment}
              isLast={index === assignments.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function AssignmentItem({ assignment, isLast }: any) {
  return (
    <Pressable className={`flex-row items-center p-4 active:opacity-80 ${!isLast ? 'border-b border-[#1A1A1A]' : ''}`}>
      <View className="w-12 h-12 bg-gray-700 rounded-full mr-4 overflow-hidden">
        <Image source={{ uri: assignment.image }} className="w-full h-full" />
      </View>

      <View className="flex-1 justify-center">
        <View className="flex-row items-center mb-1">
          <Text className="text-white text-base font-semibold mr-2">{assignment.name}</Text>
          <View className="bg-[#4D5900] px-1.5 py-0.5 rounded">
            <Text className="text-[#CCFF00] text-[10px] font-semibold">NEW</Text>
          </View>
        </View>
        <Text className="text-[#A3A3A3] text-[11px] mb-0.5">{assignment.custId}</Text>
        <Text className="text-[#A3A3A3] text-[11px]">{assignment.date}</Text>
      </View>

      <CaretRight size={16} color="#A3A3A3" style={{ marginLeft: 2 }} />
    </Pressable>
  );
}
