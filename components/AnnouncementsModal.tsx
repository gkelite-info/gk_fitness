import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { X, Megaphone } from 'phosphor-react-native';
import { GymAnnouncementAttributes } from '@/helpers/gymAnnouncements/gymAnnouncementsHelper';

interface AnnouncementsModalProps {
  visible: boolean;
  onClose: () => void;
  announcements: GymAnnouncementAttributes[];
  isLoading: boolean;
}

export function AnnouncementsModal({ visible, onClose, announcements, isLoading }: AnnouncementsModalProps) {
  const formatDate = (dateStr?: string | null | Date, timeStr?: string | null) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year} • ${timeStr || ''}`;
    } catch {
      return `${dateStr} • ${timeStr || ''}`;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-[#09090B] rounded-t-[32px] p-6 pb-10 h-[80%]">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-2xl font-semibold">Announcements</Text>
            <TouchableOpacity onPress={onClose} className="p-2 -mr-2 active:opacity-70">
              <X size={24} color="#888888" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {isLoading ? (
              <ActivityIndicator color="#CCF200" className="mt-10" />
            ) : announcements.length === 0 ? (
              <Text className="text-[#888888] text-center mt-10 font-sans">No announcements found.</Text>
            ) : (
              announcements.map((item, index) => {
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
        </View>
      </View>
    </Modal>
  );
}
