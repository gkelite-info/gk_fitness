import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  CaretLeft,
  CheckCircle,
  User,
  Barbell,
  CalendarBlank,
  Clock,
  Target,
  Check
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

function InfoRow({ icon: Icon, label, value, isLast = false }: { icon: any, label: string, value: string, isLast?: boolean }) {
  return (
    <View className={`flex-row items-center py-4 ${!isLast ? 'border-b border-[#27272A]' : ''}`}>
      <Icon size={20} color="#C4EF00" weight="regular" />
      <Text className="text-[#8E8E93] text-sm ml-4 flex-1">{label}</Text>
      <Text className="text-white text-sm">{value}</Text>
    </View>
  );
}

export default function PTSessionDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();


  const session = {
    member: 'Rahul Sharma',
    trainer: 'Aman Verma',
    type: 'Strength Training',
    date: '29 July 2026',
    time: '08:00 AM',
    duration: '60 Minutes',
    goal: 'Muscle Gain',
    img: 'https://i.pravatar.cc/150?u=11',
    status: 'Completed',
    attendance: 'Present'
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#18181B] items-center justify-center mr-3 active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>
        <View>
          <Text className="text-xl font-bold text-white tracking-wide">PT Session Details</Text>
          <Text className="text-[#8E8E93] text-[11px] mt-0.5">View personal training session information.</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

        {/* Top Profile Card */}
        <View className="px-5 mt-4 mb-6">
          <View className="bg-[#121214] rounded-[24px] p-5 flex-row items-center border border-[#27272A]">
            <View className="relative mr-4">
              <Image source={{ uri: session.img }} className="w-20 h-20 rounded-full bg-[#27272A]" />
              {session.status === 'Completed' && (
                <View className="absolute bottom-0 right-0 bg-[#09090B] rounded-full p-0.5">
                  <CheckCircle size={20} color="#C4EF00" weight="fill" />
                </View>
              )}
            </View>
            <View>
              <Text className="text-white text-xl font-bold mb-2">{session.member}</Text>
              <Text className="text-[#8E8E93] text-[9px] font-bold tracking-widest uppercase mb-1.5">Session Status</Text>
              <View className="px-2.5 py-1 rounded-md border flex-row items-center self-start mb-2" style={{ backgroundColor: '#C4EF001A', borderColor: '#C4EF004D' }}>
                <CheckCircle size={14} color="#C4EF00" weight="fill" />
                <Text className="text-[11px] font-bold ml-1.5" style={{ color: '#C4EF00' }}>{session.status}</Text>
              </View>
              <Text className="text-[#8E8E93] text-[10px]">
                Trainer: <Text className="text-white text-sm font-bold">{session.trainer}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Session Information Card */}
        <View className="px-5 mb-6">
          <View className="bg-[#121214] rounded-[24px] p-6 border border-[#27272A]">
            <Text className="text-white text-lg font-bold mb-2">Session Information</Text>

            <InfoRow icon={User} label="Member" value={session.member} />
            <InfoRow icon={User} label="Trainer" value={session.trainer} />
            <InfoRow icon={Barbell} label="Workout Type" value={session.type} />
            <InfoRow icon={CalendarBlank} label="Date" value={session.date} />
            <InfoRow icon={Clock} label="Time" value={session.time} />
            <InfoRow icon={Clock} label="Duration" value={session.duration} />
            <InfoRow icon={Target} label="Training Goal" value={session.goal} isLast={true} />
          </View>
        </View>

        {/* Attendance Card */}
        <View className="px-5 mb-6">
          <View className="bg-[#121214] rounded-[24px] p-6 border border-[#27272A]">
            <Text className="text-white text-lg font-bold mb-4">Attendance</Text>

            <View className="bg-[#18181B] rounded-[16px] p-4 flex-row items-center border border-[#27272A]">
              <View className="w-12 h-12 rounded-full border border-[#C4EF00]/30 items-center justify-center mr-4 bg-[#121214]">
                <Check size={20} color="#C4EF00" weight="regular" />
              </View>
              <View>
                <Text className="text-[#8E8E93] text-[10px] font-bold mb-0.5">Attendance Status</Text>
                <Text className="text-[#C4EF00] text-[16px] font-bold tracking-wide">{session.attendance}</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
