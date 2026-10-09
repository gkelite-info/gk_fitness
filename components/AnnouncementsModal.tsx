import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Pressable } from 'react-native';
import { X, Megaphone, Gift, Trash, GearSix, Checks, Bell, Heart, ChatCircle, UserPlus, Drop, Barbell } from 'phosphor-react-native';
import { GymAnnouncementAttributes } from '@/helpers/gymAnnouncements/gymAnnouncementsHelper';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { useUser } from '@/context/UserContext';
import { formatDistanceToNow } from 'date-fns';
import { triggerLightHaptic } from '@/lib/haptics';

interface AnnouncementsModalProps {
  visible: boolean;
  onClose: () => void;
  announcements: GymAnnouncementAttributes[];
  isLoading: boolean;
}

export function AnnouncementsModal({ visible, onClose, announcements, isLoading }: AnnouncementsModalProps) {
  const router = useRouter();
  const { userId } = useUser();
  const [activeTab, setActiveTab] = useState<'notifications' | 'announcements'>('notifications');
  const { data: notifications = [], isLoading: isLoadingNotifs, markRead, markAllRead, deleteRead, unreadCount } = useNotifications(userId ?? undefined);

  const clearRead = () => {
    triggerLightHaptic();
    deleteRead.mutate();
  };

  const handleMarkAllRead = () => {
    triggerLightHaptic();
    markAllRead.mutate();
  };

  const handleOpenPreferences = () => {
    triggerLightHaptic();
    onClose();
    router.push('/(customer)/notifications/preferences' as any);
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

  const renderNotificationIcon = (item: any) => {
    if (item.category === 'COMMUNITY') {
      const type = item.data?.type;
      if (type === 'like') {
        return (
          <View className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/30 items-center justify-center">
            <Heart size={16} color="#EF4444" weight="fill" />
          </View>
        );
      }
      if (type === 'comment' || type === 'reply') {
        return (
          <View className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-500/30 items-center justify-center">
            <ChatCircle size={16} color="#38BDF8" weight="fill" />
          </View>
        );
      }
      if (type === 'follow') {
        return (
          <View className="w-9 h-9 rounded-full bg-[#D4FF00]/20 border border-[#D4FF00]/30 items-center justify-center">
            <UserPlus size={16} color="#D4FF00" weight="fill" />
          </View>
        );
      }
    }

    if (item.category === 'GYM_ANNOUNCEMENT') {
      return (
        <View className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 items-center justify-center">
          <Megaphone size={16} color="#60A5FA" weight="fill" />
        </View>
      );
    }

    if (item.category === 'WATER') {
      return (
        <View className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 items-center justify-center">
          <Drop size={16} color="#22D3EE" weight="fill" />
        </View>
      );
    }

    if (item.category === 'WORKOUT') {
      return (
        <View className="w-9 h-9 rounded-full bg-[#D4FF00]/20 border border-[#D4FF00]/30 items-center justify-center">
          <Barbell size={16} color="#D4FF00" weight="fill" />
        </View>
      );
    }

    return (
      <View className="w-9 h-9 rounded-full bg-[#27272A] items-center justify-center">
        <Bell size={16} color="#A1A1AA" weight="fill" />
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-[#0D0D0D] rounded-t-[32px] p-6 pb-10 h-[82%] border-t border-white/10">
          
          {/* Header Bar */}
          <View className="flex-row items-center justify-between mb-5">
            {/* Tabs */}
            <View className="flex-row items-center gap-x-6">
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setActiveTab('notifications');
                }}
                className={`pb-2.5 border-b-2 flex-row items-center gap-x-2 ${activeTab === 'notifications' ? 'border-[#D4FF00]' : 'border-transparent'}`}
              >
                <Text className={`text-lg font-bold ${activeTab === 'notifications' ? 'text-white' : 'text-[#71717A]'}`}>
                  Notifications
                </Text>
                {unreadCount > 0 && (
                  <View className="bg-[#D4FF00] px-1.5 py-0.5 rounded-full min-w-[18px] items-center justify-center">
                    <Text className="text-black text-[10px] font-black">{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setActiveTab('announcements');
                }}
                className={`pb-2.5 border-b-2 flex-row items-center gap-x-2 ${activeTab === 'announcements' ? 'border-[#D4FF00]' : 'border-transparent'}`}
              >
                <Text className={`text-lg font-bold ${activeTab === 'announcements' ? 'text-white' : 'text-[#71717A]'}`}>
                  Announcements
                </Text>
                {announcements.length > 0 && (
                  <View className="w-2 h-2 rounded-full bg-[#D4FF00]" />
                )}
              </TouchableOpacity>
            </View>

            {/* Action Buttons: Preferences + Close */}
            <View className="flex-row items-center gap-x-2">
              <TouchableOpacity 
                onPress={handleOpenPreferences} 
                className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-white/10 items-center justify-center active:opacity-70"
                accessibilityLabel="Notification Preferences"
              >
                <GearSix size={18} color="#D4FF00" weight="bold" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  triggerLightHaptic();
                  onClose();
                }} 
                className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-white/10 items-center justify-center active:opacity-70"
                accessibilityLabel="Close"
              >
                <X size={18} color="#A1A1AA" weight="bold" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {activeTab === 'notifications' ? (
              // Notifications Tab (First)
              <View>
                {/* Subheader with Mark All Read & Status */}
                {notifications.length > 0 && (
                  <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider">
                      Recent Alerts
                    </Text>
                    {unreadCount > 0 && (
                      <Pressable onPress={handleMarkAllRead} className="flex-row items-center active:opacity-70">
                        <Checks size={14} color="#D4FF00" />
                        <Text className="text-[#D4FF00] text-xs font-bold ml-1">Mark all read</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {isLoadingNotifs ? (
                  <ActivityIndicator color="#D4FF00" className="mt-10" />
                ) : notifications.length === 0 ? (
                  <View className="items-center justify-center py-16">
                    <View className="w-14 h-14 rounded-full bg-[#1C1C1E] items-center justify-center mb-3">
                      <Bell size={24} color="#71717A" />
                    </View>
                    <Text className="text-white font-bold text-base mb-1">No notifications yet</Text>
                    <Text className="text-[#71717A] text-xs text-center px-6">
                      You'll see activity, workouts, hydration, and gym alerts here.
                    </Text>
                  </View>
                ) : (
                  notifications.map((item) => (
                    <Pressable 
                      key={item.id} 
                      className={`border rounded-2xl p-3.5 mb-2.5 flex-row items-start transition-all ${
                        item.is_read 
                          ? 'bg-[#141414] border-white/5' 
                          : 'bg-[#1C1C1E] border-[#D4FF00]/30 shadow-sm'
                      }`}
                      onPress={() => {
                        if (!item.is_read) markRead.mutate(item.id);
                        if (item.data?.route) {
                          onClose();
                          router.push(item.data.route as any);
                        }
                      }}
                    >
                      <View className="mr-3 mt-0.5">
                        {renderNotificationIcon(item)}
                      </View>
                      <View className="flex-1 justify-center">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-white font-bold text-sm flex-1 mr-2" numberOfLines={1}>
                            {item.title}
                          </Text>
                          {!item.is_read && (
                            <View className="w-2 h-2 rounded-full bg-[#D4FF00]" />
                          )}
                        </View>
                        <Text className="text-[#D1D5DB] text-xs leading-4 mt-1">
                          {item.body}
                        </Text>
                        <Text className="text-[#71717A] text-[10px] font-medium mt-2">
                          {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ''}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                )}

                {notifications.some(n => n.is_read) && (
                  <Pressable 
                    onPress={clearRead}
                    className="flex-row items-center justify-center border border-white/10 rounded-xl py-3 mt-3 mb-4 bg-[#141414] active:bg-[#1C1C1E]"
                  >
                    <Trash size={16} color="#A1A1AA" weight="regular" />
                    <Text className="text-[#A1A1AA] font-bold text-xs ml-2">Clear Read Notifications</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              // Announcements Tab (Second)
              <View>
                {isLoading ? (
                  <ActivityIndicator color="#D4FF00" className="mt-10" />
                ) : announcements.length === 0 ? (
                  <View className="items-center justify-center py-16">
                    <View className="w-14 h-14 rounded-full bg-[#1C1C1E] items-center justify-center mb-3">
                      <Megaphone size={24} color="#71717A" />
                    </View>
                    <Text className="text-white font-bold text-base mb-1">No announcements yet</Text>
                    <Text className="text-[#71717A] text-xs text-center px-6">
                      Check back later for gym events, birthday wishes, and news!
                    </Text>
                  </View>
                ) : (
                  announcements.map((item, index) => {
                    const isNew = index === 0;
                    return (
                      <View key={item.gymAnnouncementId} className="bg-[#1C1C1E] rounded-2xl p-4 flex-row mb-3 border border-white/5">
                        <View className="w-11 h-11 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/30 items-center justify-center mt-0.5">
                          {item.announcementType === 'BIRTHDAY' ? (
                            <Gift size={20} color="#D4FF00" weight="fill" />
                          ) : (
                            <Megaphone size={20} color="#D4FF00" weight="fill" />
                          )}
                        </View>
                        <View className="flex-1 ml-3.5 justify-center">
                          <View className="flex-row items-center justify-between mb-1.5">
                            <Text className="text-white font-bold text-sm">
                              {item.announcementType === 'BIRTHDAY' ? '🎂 Birthday Celebration' : '📢 Gym Notice'}
                            </Text>
                            {isNew && (
                              <View className="bg-[#D4FF00] px-1.5 py-0.5 rounded-md">
                                <Text className="text-black text-[9px] font-black tracking-wider">NEW</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-[#E5E5E7] text-xs leading-5 font-normal mb-2">{item.message}</Text>
                          <Text className="text-[#71717A] text-[11px] font-medium">
                            {formatDate(item.announcementDate || item.createdAt, item.announcementTime)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
