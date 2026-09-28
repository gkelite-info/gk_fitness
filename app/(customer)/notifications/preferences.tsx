import React, { useState } from 'react';
import { View, ScrollView, Pressable, Switch } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, GearSix } from 'phosphor-react-native';

const initialPreferences = [
  { id: 'workout', label: 'Workout Reminders', value: true },
  { id: 'water', label: 'Water Reminders', value: true },
  { id: 'meal', label: 'Meal Reminders', value: true },
  { id: 'membership', label: 'Membership Renewal', value: true },
  { id: 'pt', label: 'PT Session Reminders', value: true },
  { id: 'gym', label: 'Gym Announcements', value: true },
  { id: 'progress', label: 'Progress Milestones', value: true },
  { id: 'community', label: 'Community Activity', value: false },
  { id: 'promotions', label: 'Promotions & Offers', value: false },
];

export default function NotificationsPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [preferences, setPreferences] = useState(initialPreferences);

  const toggleSwitch = (id: string) => {
    setPreferences(prev => 
      prev.map(pref => pref.id === id ? { ...pref, value: !pref.value } : pref)
    );
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Notifications Preferences</Text>
        <Pressable className="w-10 h-10 items-end justify-center">
          <GearSix size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[#D4FF00] text-xs font-bold mt-4 mb-6 tracking-wider uppercase">
          Notification Types
        </Text>

        <View className="gap-y-8">
          {preferences.map((pref) => (
            <View key={pref.id} className="flex-row justify-between items-center">
              <Text className="text-white text-base font-bold">{pref.label}</Text>
              <Switch
                trackColor={{ false: "#555555", true: "#D4FF00" }}
                thumbColor={"#FFFFFF"}
                ios_backgroundColor="#555555"
                onValueChange={() => toggleSwitch(pref.id)}
                value={pref.value}
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
