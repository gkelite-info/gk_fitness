import React from 'react';
import { View, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Hourglass, ForkKnife, CalendarCheck } from 'phosphor-react-native';
import { useNotificationPreferences, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/hooks/notifications/useNotificationPreferences';
import { useUser } from '@/context/UserContext';

const PREFERENCE_MAPPING: { id: keyof NotificationPreferences, label: string }[] = [
  { id: 'workout_reminders', label: 'Workout Reminders' },
  { id: 'water_reminders', label: 'Water Reminders' },
  { id: 'meal_reminders', label: 'Meal Reminders' },
  { id: 'membership_renewal', label: 'Membership Renewal' },
  { id: 'pt_session_reminders', label: 'PT Session Reminders' },
  { id: 'gym_announcements', label: 'Gym Announcements' },
  { id: 'progress_milestones', label: 'Progress Milestones' },
  { id: 'community_activity', label: 'Community Activity' },
  { id: 'promotions', label: 'Promotions & Offers' },
];

export default function NotificationsPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const { data: preferences, isLoading, updatePreference } = useNotificationPreferences(userId ?? undefined);

  const toggleSwitch = (id: keyof NotificationPreferences, currentValue: boolean) => {
    updatePreference.mutate({ [id]: !currentValue });
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10 pb-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Notifications Preferences</Text>
        <View className="w-10 h-10 items-end justify-center">
          {/* Removed Gear icon as we are on the preferences page */}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[#D4FF00] text-xs font-bold mt-4 mb-6 tracking-wider uppercase">
          Notification Types
        </Text>

        {!preferences && isLoading ? (
          <ActivityIndicator color="#D4FF00" className="mt-10" />
        ) : (
          <View className="gap-y-2">
            {PREFERENCE_MAPPING.map((pref) => {
              const currentPrefs = preferences || DEFAULT_NOTIFICATION_PREFERENCES;
              const currentValue = currentPrefs[pref.id];
              return (
                <View key={pref.id} className="mb-8">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-white text-base font-bold">{pref.label}</Text>
                    <Switch
                      trackColor={{ false: "#555555", true: "#D4FF00" }}
                      thumbColor={"#FFFFFF"}
                      ios_backgroundColor="#555555"
                      onValueChange={() => toggleSwitch(pref.id, currentValue as boolean)}
                      value={currentValue as boolean}
                      style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                    />
                  </View>
                  
                  {/* Custom Water Hydration Settings */}
                  {pref.id === 'water_reminders' && currentValue && (
                    <View className="mt-4 bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
                      
                      {/* Mode Selector */}
                      <View className="flex-row bg-[#0F0F0F] rounded-lg p-1 mb-2">
                        <Pressable 
                          onPress={() => updatePreference.mutate({ water_mode: 'default' })}
                          className={`flex-1 py-2 items-center justify-center rounded-md ${currentPrefs.water_mode !== 'custom' ? 'bg-[#2A2A2A]' : ''}`}
                        >
                          <Text className={`font-bold ${currentPrefs.water_mode !== 'custom' ? 'text-[#D4FF00]' : 'text-gray-400'}`}>Default</Text>
                        </Pressable>
                        <Pressable 
                          onPress={() => updatePreference.mutate({ water_mode: 'custom' })}
                          className={`flex-1 py-2 items-center justify-center rounded-md ${currentPrefs.water_mode === 'custom' ? 'bg-[#2A2A2A]' : ''}`}
                        >
                          <Text className={`font-bold ${currentPrefs.water_mode === 'custom' ? 'text-[#D4FF00]' : 'text-gray-400'}`}>Custom</Text>
                        </Pressable>
                      </View>

                      {currentPrefs.water_mode !== 'custom' && (
                        <Text className="text-gray-400 text-xs text-center mt-2">
                          Reminds you every 2 hours from 8:00 AM to 8:00 PM.
                        </Text>
                      )}

                      {currentPrefs.water_mode === 'custom' && (
                        <View className="mt-4">
                          <Text className="text-[#D4FF00] font-bold text-xs uppercase tracking-widest mb-4">
                            Custom Schedule
                          </Text>
                          
                          {/* Start Time */}
                          <View className="flex-row justify-between items-center mb-4">
                            <View className="flex-row items-center gap-x-2">
                              <Clock size={16} color="#A3A3A3" />
                              <Text className="text-gray-400">Start Time</Text>
                            </View>
                            <View className="flex-row items-center gap-x-3">
                              <Pressable 
                                onPress={() => updatePreference.mutate({ water_start_hour: Math.max(4, (currentPrefs.water_start_hour || 8) - 1) })}
                                className="bg-[#2A2A2A] w-8 h-8 rounded-full items-center justify-center"
                              >
                                <Text className="text-white font-bold">-</Text>
                              </Pressable>
                              <Text className="text-white font-bold w-12 text-center">
                                {currentPrefs.water_start_hour || 8}:00
                              </Text>
                              <Pressable 
                                onPress={() => updatePreference.mutate({ water_start_hour: Math.min((currentPrefs.water_end_hour || 20) - 1, (currentPrefs.water_start_hour || 8) + 1) })}
                                className="bg-[#2A2A2A] w-8 h-8 rounded-full items-center justify-center"
                              >
                                <Text className="text-white font-bold">+</Text>
                              </Pressable>
                            </View>
                          </View>

                          {/* End Time */}
                          <View className="flex-row justify-between items-center mb-4">
                            <View className="flex-row items-center gap-x-2">
                              <Clock size={16} color="#A3A3A3" />
                              <Text className="text-gray-400">End Time</Text>
                            </View>
                            <View className="flex-row items-center gap-x-3">
                              <Pressable 
                                onPress={() => updatePreference.mutate({ water_end_hour: Math.max((currentPrefs.water_start_hour || 8) + 1, (currentPrefs.water_end_hour || 20) - 1) })}
                                className="bg-[#2A2A2A] w-8 h-8 rounded-full items-center justify-center"
                              >
                                <Text className="text-white font-bold">-</Text>
                              </Pressable>
                              <Text className="text-white font-bold w-12 text-center">
                                {currentPrefs.water_end_hour || 20}:00
                              </Text>
                              <Pressable 
                                onPress={() => updatePreference.mutate({ water_end_hour: Math.min(23, (currentPrefs.water_end_hour || 20) + 1) })}
                                className="bg-[#2A2A2A] w-8 h-8 rounded-full items-center justify-center"
                              >
                                <Text className="text-white font-bold">+</Text>
                              </Pressable>
                            </View>
                          </View>

                          {/* Interval */}
                          <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center gap-x-2">
                              <Hourglass size={16} color="#A3A3A3" />
                              <Text className="text-gray-400">Remind every</Text>
                            </View>
                            <View className="flex-row items-center gap-x-3">
                              <Pressable 
                                onPress={() => updatePreference.mutate({ water_interval_hours: Math.max(1, (currentPrefs.water_interval_hours || 2) - 1) })}
                                className="bg-[#2A2A2A] w-8 h-8 rounded-full items-center justify-center"
                              >
                                <Text className="text-white font-bold">-</Text>
                              </Pressable>
                              <Text className="text-[#D4FF00] font-bold w-12 text-center">
                                {currentPrefs.water_interval_hours || 2} hr
                              </Text>
                              <Pressable 
                                onPress={() => updatePreference.mutate({ water_interval_hours: Math.min(6, (currentPrefs.water_interval_hours || 2) + 1) })}
                                className="bg-[#2A2A2A] w-8 h-8 rounded-full items-center justify-center"
                              >
                                <Text className="text-white font-bold">+</Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Workout Reminders Smart Schedule */}
                  {pref.id === 'workout_reminders' && currentValue && (
                    <View className="mt-4 bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
                      <View className="flex-row items-center gap-x-2 mb-2">
                        <Clock size={16} color="#D4FF00" />
                        <Text className="text-[#D4FF00] font-bold text-xs uppercase tracking-widest">
                          Smart Workout Schedule
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center py-1.5 border-b border-white/5">
                        <Text className="text-white text-sm font-semibold">Weekdays (Mon – Fri)</Text>
                        <Text className="text-[#D4FF00] font-bold text-sm bg-[#0F0F0F] px-2.5 py-1 rounded-md">5:00 PM</Text>
                      </View>
                      <View className="flex-row justify-between items-center py-1.5 mt-1">
                        <Text className="text-white text-sm font-semibold">Weekends (Sat – Sun)</Text>
                        <Text className="text-[#D4FF00] font-bold text-sm bg-[#0F0F0F] px-2.5 py-1 rounded-md">10:00 AM</Text>
                      </View>
                    </View>
                  )}

                  {/* Meal Reminders Breakdown */}
                  {pref.id === 'meal_reminders' && currentValue && (
                    <View className="mt-4 bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
                      <View className="flex-row items-center gap-x-2 mb-3">
                        <ForkKnife size={16} color="#D4FF00" weight="bold" />
                        <Text className="text-[#D4FF00] font-bold text-xs uppercase tracking-widest">
                          Daily Meal Schedule
                        </Text>
                      </View>
                      
                      <View className="gap-y-2">
                        {/* Breakfast */}
                        <View className="flex-row justify-between items-center py-1 border-b border-white/5">
                          <View className="flex-row items-center gap-x-2">
                            <Text className="text-base">🍳</Text>
                            <Text className="text-white text-sm font-semibold">Breakfast Fuel</Text>
                          </View>
                          <Text className="text-[#D4FF00] font-bold text-sm bg-[#0F0F0F] px-2.5 py-1 rounded-md">8:30 AM</Text>
                        </View>

                        {/* Lunch */}
                        <View className="flex-row justify-between items-center py-1 border-b border-white/5">
                          <View className="flex-row items-center gap-x-2">
                            <Text className="text-base">🥗</Text>
                            <Text className="text-white text-sm font-semibold">Midday Nutrition</Text>
                          </View>
                          <Text className="text-[#D4FF00] font-bold text-sm bg-[#0F0F0F] px-2.5 py-1 rounded-md">1:15 PM</Text>
                        </View>

                        {/* Dinner */}
                        <View className="flex-row justify-between items-center py-1">
                          <View className="flex-row items-center gap-x-2">
                            <Text className="text-base">🍲</Text>
                            <Text className="text-white text-sm font-semibold">Dinner & Daily Wrap-up</Text>
                          </View>
                          <Text className="text-[#D4FF00] font-bold text-sm bg-[#0F0F0F] px-2.5 py-1 rounded-md">8:00 PM</Text>
                        </View>
                      </View>

                      <Text className="text-gray-400 text-xs mt-3 leading-4">
                        Industry-standard reminders designed to keep your calorie and protein tracking consistent without fatigue.
                      </Text>
                    </View>
                  )}

                  {/* Membership Renewal Breakdown */}
                  {pref.id === 'membership_renewal' && currentValue && (
                    <View className="mt-4 bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
                      <View className="flex-row items-center gap-x-2 mb-3">
                        <CalendarCheck size={16} color="#D4FF00" weight="bold" />
                        <Text className="text-[#D4FF00] font-bold text-xs uppercase tracking-widest">
                          Renewal Countdown Schedule
                        </Text>
                      </View>
                      
                      <View className="gap-y-2">
                        {/* 7 Days */}
                        <View className="flex-row justify-between items-center py-1 border-b border-white/5">
                          <View className="flex-row items-center gap-x-2">
                            <Text className="text-base">⏳</Text>
                            <Text className="text-white text-sm font-semibold">7 Days Before Expiry</Text>
                          </View>
                          <Text className="text-[#D4FF00] font-bold text-xs bg-[#0F0F0F] px-2.5 py-1 rounded-md">10:00 AM</Text>
                        </View>

                        {/* 3 Days */}
                        <View className="flex-row justify-between items-center py-1 border-b border-white/5">
                          <View className="flex-row items-center gap-x-2">
                            <Text className="text-base">⚠️</Text>
                            <Text className="text-white text-sm font-semibold">3 Days Before Expiry</Text>
                          </View>
                          <Text className="text-[#D4FF00] font-bold text-xs bg-[#0F0F0F] px-2.5 py-1 rounded-md">10:00 AM</Text>
                        </View>

                        {/* 1 Day */}
                        <View className="flex-row justify-between items-center py-1 border-b border-white/5">
                          <View className="flex-row items-center gap-x-2">
                            <Text className="text-base">🚨</Text>
                            <Text className="text-white text-sm font-semibold">1 Day Before (Tomorrow)</Text>
                          </View>
                          <Text className="text-[#D4FF00] font-bold text-xs bg-[#0F0F0F] px-2.5 py-1 rounded-md">10:00 AM</Text>
                        </View>

                        {/* Expiry Day */}
                        <View className="flex-row justify-between items-center py-1">
                          <View className="flex-row items-center gap-x-2">
                            <Text className="text-base">🛑</Text>
                            <Text className="text-white text-sm font-semibold">Day of Expiry (Final Day)</Text>
                          </View>
                          <Text className="text-[#D4FF00] font-bold text-xs bg-[#0F0F0F] px-2.5 py-1 rounded-md">9:00 AM</Text>
                        </View>
                      </View>

                      <Text className="text-gray-400 text-xs mt-3 leading-4">
                        Timed alerts synced with your active gym membership to prevent biometric scanner lockouts and uninterrupted workouts.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
