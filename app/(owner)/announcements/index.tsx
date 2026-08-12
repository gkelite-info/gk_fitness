import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { CaretLeft, MagnifyingGlass, Megaphone, Plus, X, Faders, CalendarIcon } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '@/context/UserContext';
import { useGymAnnouncements, useSaveGymAnnouncement } from '@/hooks/gymAnnouncements/useGymAnnouncements';
import { useGymOwners } from '@/hooks/gymOwners/useGymOwners';
import { toast } from '@/lib/toast';

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const { data: announcements = [], isLoading } = useGymAnnouncements(userId || null);
  const { data: gymOwners } = useGymOwners();
  const { mutateAsync: saveAnnouncement, isPending: isSaving } = useSaveGymAnnouncement();

  const owner = gymOwners?.find((o) => o.userId === userId);
  const gymId = owner?.gymId;
  const gymOwnerId = owner?.gymOwnerId;

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const filteredAnnouncements = announcements.filter((a: any) => {
    const matchesSearch = a.message?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!selectedDate) return matchesSearch;

    const annDateStr = a.announcementDate || a.createdAt;
    if (!annDateStr) return matchesSearch;

    const annDate = new Date(annDateStr);
    const isSameDate =
      annDate.getDate() === selectedDate.getDate() &&
      annDate.getMonth() === selectedDate.getMonth() &&
      annDate.getFullYear() === selectedDate.getFullYear();

    return matchesSearch && isSameDate;
  });

  const handleBack = () => {
    router.push("/(owner)/dashboard");
  }

  const handleSend = async () => {
    if (!newMessage.trim()) {
      toast.error('Message cannot be empty.');
      return;
    }
    if (!gymId || !gymOwnerId) {
      toast.error('Could not identify gym or owner. Please try again.');
      return;
    }

    try {
      const saved = await saveAnnouncement({
        gymId,
        createdBy: gymOwnerId,
        message: newMessage.trim(),
        announcementDate: new Date().toLocaleDateString('en-CA'),
        announcementTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
      
      // Notify customers via Supabase Broadcast
      if (saved) {
        try {
          const channel = supabase.channel(`gym_broadcast_${gymId}`);
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.send({
                type: 'broadcast',
                event: 'new_announcement',
                payload: saved,
              });
              supabase.removeChannel(channel);
            }
          });
        } catch (e) {
          console.error('Failed to notify via Supabase Broadcast:', e);
        }
      }

      toast.success('Announcement sent successfully!');
      setModalVisible(false);
      setNewMessage('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send announcement.');
    }
  };

  const formatDate = (dateStr: string, timeStr: string) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year} • ${timeStr || ''}`;
    } catch {
      return `${dateStr} • ${timeStr}`;
    }
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <View className="px-5 pb-4 flex-row items-center justify-between" style={{ paddingTop: insets.top + 20 }}>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => handleBack()} className="w-10 h-10 bg-[#1A1A1A] rounded-full items-center justify-center active:opacity-70">
            <CaretLeft size={20} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-semibold">Announcements</Text>
            <Text className="text-[#888888] text-xs mt-0.5 font-sans">View all announcements sent to members.</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          {selectedDate && (
            <TouchableOpacity onPress={() => setSelectedDate(null)} className="w-10 h-10 bg-[#1A1A1A] rounded-lg items-center justify-center">
              <X size={18} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowDatePicker(true)} className="w-10 h-10 bg-[#1A1A1A] rounded-lg items-center justify-center">
            <CalendarIcon size={18} color={selectedDate ? "#CCF200" : "#888888"} weight="fill" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-5 mb-5 mt-2">
        <View className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl flex-row items-center px-4 py-3 h-12">
          <MagnifyingGlass size={18} color="#8E8E93" weight="bold" />
          <TextInput
            placeholder="Search announcements..."
            placeholderTextColor="#8E8E93"
            className="flex-1 text-white ml-3 text-sm font-medium h-full"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 150 }}>
        {isLoading ? (
          <ActivityIndicator color="#CCF200" className="mt-10" />
        ) : filteredAnnouncements.length === 0 ? (
          <Text className="text-[#888888] text-center mt-10 font-sans">No announcements found.</Text>
        ) : (
          filteredAnnouncements.map((item: any, index: number) => {
            const isNew = index === 0;
            return (
              <View key={item.gymAnnouncementId} className="bg-[#1C1C1E] rounded-2xl p-4 flex-row mb-4">
                <View className="w-12 h-12 rounded-full bg-[#2B3012] items-center justify-center mt-1">
                  <Megaphone size={20} color="#CCF200" />
                </View>
                <View className="flex-1 ml-4 justify-center">
                  <Text className="text-[#E5E5E7] text-[15px] leading-5 font-medium mb-2">{item.message}</Text>
                  {isNew && (
                    <View className="bg-[#CCF200] px-2 py-0.5 rounded self-start mb-2">
                      <Text className="text-black text-[10px] font-semibold">NEW</Text>
                    </View>
                  )}
                  <View className="flex-row items-center">
                    <Text className="text-[#888888] text-xs font-medium">
                      {formatDate(item.announcementDate || item.createdAt, item.announcementTime)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="absolute bottom-28 right-5 w-14 h-14 bg-[#CCF200] rounded-full items-center justify-center shadow-lg active:opacity-80"
        style={{ elevation: 5 }}>
        <Plus size={24} color="#000000" weight="bold" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-[#0A0A0A]">
          <View className="bg-[#09090B] rounded-t-[32px] p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-2xl font-semibold">New Announcement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#888888" />
              </TouchableOpacity>
            </View>

            <Text className="text-white text-base mb-3 font-medium">Message</Text>

            <View className="bg-[#1C1C1E] border border-[#27272A] rounded-2xl p-4 h-40 mb-6 relative">
              <TextInput
                className="text-white text-sm text-left h-full font-sans"
                placeholder="Write your announcement..."
                placeholderTextColor="#555555"
                multiline
                textAlignVertical="top"
                maxLength={500}
                value={newMessage}
                onChangeText={setNewMessage}
              />
              <Text className="absolute bottom-3 right-4 text-[#555555] text-xs font-medium">
                {newMessage.length}/500
              </Text>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 border border-[#27272A] bg-transparent py-4 rounded-xl items-center"
              >
                <Text className="text-white font-semibold text-base">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                disabled={isSaving}
                className="flex-1 bg-[#CCF200] py-4 rounded-xl items-center flex-row justify-center"
              >
                {isSaving ? <ActivityIndicator color="#000" /> : <Text className="text-black font-semibold text-base">Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-[#1C1C1E] p-4 rounded-t-3xl pb-8">
              <View className="flex-row justify-between items-center mb-4 px-2">
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className="text-white text-base">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className="text-[#CCF200] font-bold text-base">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="inline"
                themeVariant="dark"
                onChange={(event, date) => {
                  if (date) setSelectedDate(date);
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
