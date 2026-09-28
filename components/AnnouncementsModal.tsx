import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Pressable } from 'react-native';
import { X, Megaphone, Gift, Trash, GearSix } from 'phosphor-react-native';
import { GymAnnouncementAttributes } from '@/helpers/gymAnnouncements/gymAnnouncementsHelper';
import { useRouter } from 'expo-router';

interface AnnouncementsModalProps {
  visible: boolean;
  onClose: () => void;
  announcements: GymAnnouncementAttributes[];
  isLoading: boolean;
}

const initialNotifications = [
  { id: 1, title: 'Workout Reminder', message: 'Chest Day starts in 30 minutes.', time: '10 min ago', unread: true },
  { id: 2, title: 'Membership', message: 'Your Gold Membership expires in 18 days.', time: '45 min ago', unread: true },
  { id: 3, title: 'Trainer Update', message: 'Rahul Sharma accepted your trainer request.', time: '1 hr ago', unread: true },
  { id: 4, title: 'Hydration Reminder', message: 'Time to drink water. 500 ml remaining today.', time: '2 hrs ago', unread: true },
  { id: 5, title: 'Nutrition', message: "Today's meal plan is ready.", time: '3 hrs ago', unread: true },
  { id: 6, title: 'Progress Milestone', message: 'Congratulations! 🎉 You reached your weekly workout goal.', time: 'Yesterday, 8:30 PM', unread: true },
];

export function AnnouncementsModal({ visible, onClose, announcements, isLoading }: AnnouncementsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');
  const [notifications, setNotifications] = useState(initialNotifications);

  const clearRead = () => {
    setNotifications([]);
  };

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
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => setActiveTab('announcements')}
                className={`pb-2 mr-6 border-b-2 ${activeTab === 'announcements' ? 'border-[#CCF200]' : 'border-transparent'}`}
              >
                <Text className={`text-xl font-semibold ${activeTab === 'announcements' ? 'text-white' : 'text-[#888888]'}`}>
                  Announcements
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('notifications')}
                className={`pb-2 border-b-2 ${activeTab === 'notifications' ? 'border-[#CCF200]' : 'border-transparent'}`}
              >
                <Text className={`text-xl font-semibold ${activeTab === 'notifications' ? 'text-white' : 'text-[#888888]'}`}>
                  Notifications
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center">
              {activeTab === 'notifications' && (
                <TouchableOpacity 
                  onPress={() => {
                    onClose();
                    router.push('/(customer)/notifications/preferences' as any);
                  }} 
                  className="p-2 mr-2 active:opacity-70"
                >
                  <GearSix size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} className="p-2 -mr-2 active:opacity-70">
                <X size={24} color="#888888" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {activeTab === 'announcements' ? (
              isLoading ? (
                <ActivityIndicator color="#CCF200" className="mt-10" />
              ) : announcements.length === 0 ? (
                <Text className="text-[#888888] text-center mt-10 font-sans">No announcements found.</Text>
              ) : (
                announcements.map((item, index) => {
                  const isNew = index === 0;
                  return (
                    <View key={item.gymAnnouncementId} className="bg-[#1C1C1E] rounded-2xl p-4 flex-row mb-4 border border-[#27272A]">
                      <View className="w-12 h-12 rounded-full bg-[#2B3012] items-center justify-center mt-1">
                        {item.announcementType === 'BIRTHDAY' ? (
                          <Gift size={20} color="#CCF200" />
                        ) : (
                          <Megaphone size={20} color="#CCF200" />
                        )}
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
              )
            ) : (
              // Notifications Tab
              <View>
                {notifications.map((item) => (
                  <View key={item.id} className="bg-[#1C1C1E] border border-[#27272A] rounded-2xl p-4 mb-3">
                    <View className="flex-row justify-between items-start">
                      <Text className="text-white font-bold text-base">{item.title}</Text>
                      {item.unread && (
                        <View className="w-2.5 h-2.5 rounded-full bg-[#CCF200] mt-1" />
                      )}
                    </View>
                    <Text className="text-[#888888] text-sm mt-1">{item.message}</Text>
                    <Text className="text-[#666666] text-xs mt-3">{item.time}</Text>
                  </View>
                ))}

                {notifications.length > 0 && (
                  <Pressable 
                    onPress={clearRead}
                    className="flex-row items-center justify-center border border-[#CCF200] rounded-xl py-3.5 mt-2 mb-6"
                  >
                    <Trash size={20} color="#CCF200" weight="regular" />
                    <Text className="text-[#CCF200] font-bold text-base ml-2">Clear Read Notifications</Text>
                  </Pressable>
                )}
                {notifications.length === 0 && (
                  <Text className="text-[#888888] text-center mt-10 font-sans">No notifications found.</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
