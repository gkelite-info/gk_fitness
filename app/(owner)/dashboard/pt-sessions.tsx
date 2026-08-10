import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { 
  CaretLeft, 
  CalendarBlank, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MagnifyingGlass, 
  CaretRight 
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const SESSIONS_DATA = [
  { id: '1', time: '08:00', ampm: 'AM', member: 'Rahul Sharma', trainer: 'Aman Verma', type: 'Strength Training', status: 'Completed', img: 'https://i.pravatar.cc/150?u=11' },
  { id: '2', time: '09:30', ampm: 'AM', member: 'Priya Patel', trainer: 'Rohit Singh', type: 'Fat Loss', status: 'Upcoming', img: 'https://i.pravatar.cc/150?u=12' },
  { id: '3', time: '11:00', ampm: 'AM', member: 'Siddharth Mehta', trainer: 'Rahul Sharma', type: 'Muscle Gain', status: 'Completed', img: 'https://i.pravatar.cc/150?u=13' },
  { id: '4', time: '01:00', ampm: 'PM', member: 'Ananya Singh', trainer: 'Neha Kapoor', type: 'Weight Loss', status: 'Upcoming', img: 'https://i.pravatar.cc/150?u=14' },
  { id: '5', time: '07:30', ampm: 'PM', member: 'Neha Agarwal', trainer: 'Neha Kapoor', type: 'Fat Loss', status: 'Cancelled', img: 'https://i.pravatar.cc/150?u=15' },
  { id: '6', time: '01:00', ampm: 'PM', member: 'Ananya Singh', trainer: 'Neha Kapoor', type: 'Weight Loss', status: 'Upcoming', img: 'https://i.pravatar.cc/150?u=14' },
  { id: '7', time: '11:00', ampm: 'PM', member: 'Siddharth Mehta', trainer: 'Rahul Sharma', type: 'Muscle Gain', status: 'Completed', img: 'https://i.pravatar.cc/150?u=13' },
];

function StatCard({ icon: Icon, color, title, count, sub }: { icon: any, color: string, title: string, count: string, sub: string }) {
  return (
    <View 
      className="bg-[#121214] rounded-xl p-3 border-l-2 mr-3" 
      style={{ borderLeftColor: color, minWidth: 100 }}
    >
      <Icon size={16} color={color} style={{ marginBottom: 6 }} />
      <Text className="text-[#8E8E93] text-[9px] mb-0.5 font-medium">{title}</Text>
      <Text className="text-white text-xl font-bold tracking-tight mb-0.5">{count}</Text>
      <Text className="text-[#8E8E93] text-[8px] font-medium">{sub}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = '#8E8E93';
  let Icon = Clock;
  
  if (status === 'Completed') {
    color = '#22C55E';
    Icon = CheckCircle;
  } else if (status === 'Upcoming') {
    color = '#EAB308';
    Icon = Clock;
  } else if (status === 'Cancelled') {
    color = '#EF4444';
    Icon = XCircle;
  }

  return (
    <View 
      className="px-2.5 py-1 rounded-full border flex-row items-center" 
      style={{ backgroundColor: color + '1A', borderColor: color + '4D' }}
    >
      <Icon size={12} color={color} weight="regular" />
      <Text className="text-[10px] font-bold ml-1.5" style={{ color }}>{status}</Text>
    </View>
  );
}

function SessionRow({ item, onPress }: { item: any; onPress: () => void }) {
  let color = '#8E8E93';
  if (item.status === 'Completed') color = '#22C55E';
  if (item.status === 'Upcoming') color = '#EAB308';
  if (item.status === 'Cancelled') color = '#EF4444';

  return (
    <Pressable onPress={onPress} className="bg-[#121214] rounded-2xl mb-3 flex-row items-center py-3 pl-0 pr-4 border border-[#27272A] active:opacity-70">
      {/* Time & Bar */}
      <View className="flex-row items-center w-[85px]">
        <View className="w-[3px] h-[32px] rounded-r-full mr-4" style={{ backgroundColor: color }} />
        <View>
          <Text className="text-white font-bold text-[15px]">{item.time}</Text>
          <Text className="text-[#8E8E93] text-xs font-bold tracking-wider mt-0.5">{item.ampm}</Text>
        </View>
      </View>

      {/* Profile */}
      <View className="flex-1 flex-row items-center ml-1">
        <Image source={{ uri: item.img }} className="w-10 h-10 rounded-full mr-3 bg-[#27272A]" />
        <View className="flex-1 justify-center">
          <Text className="text-white font-bold text-xs mb-1" numberOfLines={1}>{item.member}</Text>
          <Text className="text-[#8E8E93] text-[10px]" numberOfLines={1}>{item.type}</Text>
        </View>
      </View>

      {/* Status & Trainer */}
      <View className="items-end justify-center ml-2">
        <View className="flex-row items-center mb-1.5">
          <StatusBadge status={item.status} />
          <CaretRight size={14} color="#8E8E93" style={{ marginLeft: 8 }} />
        </View>
        <Text className="text-[#8E8E93] text-[9px] mr-6">
          Trainer: <Text className="text-[#C4EF00] text-[10px] font-bold">{item.trainer}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

export default function PTSessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View className="flex-1 bg-[#09090B]">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center flex-1">
          <Pressable 
            onPress={() => router.back()} 
            className="w-10 h-10 rounded-full bg-[#18181B] items-center justify-center mr-3 active:opacity-70"
          >
            <CaretLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-white tracking-wide">PT Sessions</Text>
            <Text className="text-[#8E8E93] text-[11px] mt-0.5">Manage personal training sessions for today.</Text>
          </View>
        </View>
        <Pressable className="w-10 h-10 items-center justify-center bg-[#18181B] rounded-full ml-3">
          <CalendarBlank size={20} color="#C4EF00" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        
        {/* Stats Cards Row */}
        <View className="mt-4 mb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            <StatCard icon={CalendarBlank} color="#A855F7" title="Today's Sessions" count="18" sub="All scheduled" />
            <StatCard icon={Clock} color="#EAB308" title="Upcoming" count="6" sub="Yet to start" />
            <StatCard icon={CheckCircle} color="#22C55E" title="Completed" count="10" sub="Sessions done" />
            <StatCard icon={XCircle} color="#EF4444" title="Cancelled" count="2" sub="Not happening" />
          </ScrollView>
        </View>

        {/* Search */}
        <View className="px-5 mb-8">
          <View className="flex-row items-center bg-[#18181B] rounded-2xl px-4 py-3.5">
            <MagnifyingGlass size={20} color="#8E8E93" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search member or trainer..."
              placeholderTextColor="#8E8E93"
              className="flex-1 ml-3 text-white text-sm"
            />
          </View>
        </View>

        {/* Section Header */}
        <View className="px-5 mb-4 flex-row justify-between items-center">
          <Text className="text-white font-bold text-sm">Today <Text className="text-[#8E8E93] font-normal">• 29 July 2026</Text></Text>
          <Text className="text-[#8E8E93] text-xs">18 Sessions</Text>
        </View>

        {/* Sessions List */}
        <View className="px-5">
          {SESSIONS_DATA.map((item) => (
            <SessionRow 
              key={item.id} 
              item={item} 
              onPress={() => router.push(`/(owner)/dashboard/pt-sessions/${item.id}` as any)} 
            />
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
