import React, { useState } from 'react';
import { View, Pressable, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { User, SignOut, WarningCircle } from 'phosphor-react-native';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { name, email, role } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    setModalVisible(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Sign Out Error', error.message);
      } else {
        router.replace('/auth/otp-auth');
      }
    } catch (err: any) {
      Alert.alert('Sign Out Error', err.message || 'An error occurred.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#09090B]"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center mb-8">
        <View className="w-24 h-24 rounded-full bg-[#121214] border-2 border-[#C4EF00] items-center justify-center mb-4">
          <User size={48} color="#C4EF00" weight="duotone" />
        </View>
        <Text className="text-white text-2xl font-semibold mb-1">{name || 'Super Admin'}</Text>
        <Text className="text-[#8E8E93] text-sm mb-3">{email || 'admin@gkfitness.com'}</Text>
        <View className="bg-[#C4EF00]/10 border border-[#C4EF00]/30 rounded-full px-4 py-1">
          <Text className="text-[#C4EF00] text-xs font-semibold uppercase tracking-wider">
            {role || 'Superadmin'}
          </Text>
        </View>
      </View>

      <View className="bg-[#121214] border border-[#27272A] rounded-2xl p-4 mb-6">
        <View className="flex-row justify-between py-3 border-b border-[#27272A]">
          <Text className="text-[#8E8E93] text-sm">Role</Text>
          <Text className="text-white text-sm font-semibold">Super Administrator</Text>
        </View>
        <View className="flex-row justify-between py-3">
          <Text className="text-[#8E8E93] text-sm">Status</Text>
          <Text className="text-[#C4EF00] text-sm font-semibold">Active</Text>
        </View>
      </View>

      <Pressable
        onPress={() => setModalVisible(true)}
        disabled={signingOut}
        className="bg-red-500/10 border border-red-500/30 rounded-2xl py-4 flex-row items-center justify-center active:opacity-80 mt-10"
      >
        {signingOut ? (
          <ActivityIndicator color="#EF4444" size="small" />
        ) : (
          <View className="flex-row items-center gap-2">
            <SignOut size={20} color="#EF4444" weight="bold" />
            <Text className="text-red-500 font-semibold text-base">Sign Out</Text>
          </View>
        )}
      </Pressable>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-[#121214] border border-[#27272A] w-full max-w-[340px] rounded-3xl p-6 items-center shadow-2xl">
            <View className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center mb-4 border border-red-500/20">
              <WarningCircle size={28} color="#EF4444" weight="fill" />
            </View>
            <Text className="text-white text-lg font-semibold mb-2">Sign Out</Text>
            <Text className="text-[#8E8E93] text-sm text-center mb-6 leading-5">
              Are you sure you want to sign out of your account? You will need to log in again to access the platform.
            </Text>

            <View className="flex-row gap-3 w-full">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 bg-[#1C1C1E] rounded-xl py-3 items-center active:opacity-90"
              >
                <Text className="text-white font-semibold text-sm">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                className="flex-1 bg-red-500 rounded-xl py-3 items-center active:opacity-90"
              >
                <Text className="text-white font-semibold text-sm">Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
