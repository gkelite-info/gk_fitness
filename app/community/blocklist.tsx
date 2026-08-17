import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, UserMinus } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useBlocklist, useUnblockUser } from '@/hooks/community/useModeration';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

export default function BlocklistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const { data: blockedUsers, isLoading } = useBlocklist(userId ?? null);
  const unblockUserMutation = useUnblockUser();

  const [activeModal, setActiveModal] = useState<'none' | 'confirmUnblock'>('none');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const handleUnblock = (user: any) => {
    setSelectedUser(user);
    setActiveModal('confirmUnblock');
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-[#1F1F22]">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide flex-1 text-center pr-8">
          Blocked Users
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C4EF00" />
        </View>
      ) : (
        <ScrollView 
          className="flex-1 px-5 pt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          <Text className="text-[#A1A1AA] text-[14px] leading-5 mb-6">
            When you block someone, you won't see their posts or comments in the community feed.
          </Text>

          {blockedUsers && blockedUsers.length > 0 ? (
            blockedUsers.map((item: any) => (
              <View 
                key={item.gymCommunityBlockId} 
                className="flex-row items-center justify-between bg-[#121214] p-4 rounded-2xl border border-[#1F1F22] mb-3"
              >
                <View className="flex-row items-center gap-3">
                  <StaticAvatar 
                    uri={item.users?.profilePhoto || item.users?.avatar} 
                    name={item.users?.name || 'Unknown User'}
                    size={48}
                    className="w-12 h-12 rounded-full" 
                  />
                  <View>
                    <Text className="text-white font-bold text-[15px]">
                      {item.users?.name || 'Unknown User'}
                    </Text>
                    <Text className="text-[#71717A] text-[12px] mt-0.5">
                      Blocked on {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Pressable 
                  className="bg-[#27272A] px-4 py-2 rounded-full active:opacity-70"
                  onPress={() => handleUnblock(item)}
                  disabled={unblockUserMutation.isPending}
                >
                  <Text className="text-white font-bold text-[12px]">Unblock</Text>
                </Pressable>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-10 mt-10">
              <View className="w-16 h-16 rounded-full bg-[#121214] items-center justify-center mb-4">
                <UserMinus size={32} color="#71717A" />
              </View>
              <Text className="text-white font-bold text-lg mb-2">No blocked users</Text>
              <Text className="text-[#71717A] text-sm text-center">
                Users you block will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <ActionSheetModal
        visible={activeModal === 'confirmUnblock'}
        onClose={() => setActiveModal('none')}
        title="Unblock User"
        message={`Are you sure you want to unblock ${selectedUser?.users?.name || 'this user'}? You will start seeing their posts in the community feed again.`}
        options={[
          { label: 'Unblock', destructive: false, onPress: () => {
              if (selectedUser && userId) {
                unblockUserMutation.mutate({ blockerId: userId, blockedId: selectedUser.blockedId });
              }
              setActiveModal('none');
          }}
        ]}
      />
    </View>
  );
}
