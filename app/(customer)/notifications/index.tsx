import React, { useState } from 'react';
import { View, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, GearSix, Trash } from 'phosphor-react-native';

const initialNotifications = [
  { id: 1, title: 'Workout Reminder', message: 'Chest Day starts in 30 minutes.', time: '10 min ago', unread: true },
  { id: 2, title: 'Membership', message: 'Your Gold Membership expires in 18 days.', time: '45 min ago', unread: true },
  { id: 3, title: 'Trainer Update', message: 'Rahul Sharma accepted your trainer request.', time: '1 hr ago', unread: true },
  { id: 4, title: 'Hydration Reminder', message: 'Time to drink water. 500 ml remaining today.', time: '2 hrs ago', unread: true },
  { id: 5, title: 'Nutrition', message: "Today's meal plan is ready.", time: '3 hrs ago', unread: true },
  { id: 6, title: 'Progress Milestone', message: 'Congratulations! 🎉 You reached your weekly workout goal.', time: 'Yesterday, 8:30 PM', unread: true },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(initialNotifications);

  const clearRead = () => {
    // For UI purposes, we'll just clear all or handle it as requested.
    setNotifications([]);
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Notifications</Text>
        <Pressable 
          onPress={() => router.push('/(customer)/notifications/preferences' as any)} 
          className="w-10 h-10 items-end justify-center"
        >
          <GearSix size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text className="text-white text-xl font-bold mt-2 mb-4">Recent Notifications</Text>

        {notifications.map((item) => (
          <View key={item.id} className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 mb-3">
            <View className="flex-row justify-between items-start">
              <Text className="text-white font-bold text-base">{item.title}</Text>
              {item.unread && (
                <View className="w-2.5 h-2.5 rounded-full bg-[#D4FF00] mt-1" />
              )}
            </View>
            <Text className="text-[#8E8E93] text-sm mt-1">{item.message}</Text>
            <Text className="text-[#666666] text-xs mt-3">{item.time}</Text>
          </View>
        ))}

        {notifications.length > 0 && (
          <Pressable 
            onPress={clearRead}
            className="flex-row items-center justify-center border border-[#D4FF00] rounded-xl py-3.5 mt-2 mb-6"
          >
            <Trash size={20} color="#D4FF00" weight="regular" />
            <Text className="text-[#D4FF00] font-bold text-base ml-2">Clear Read Notifications</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
