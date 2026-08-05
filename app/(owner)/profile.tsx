import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/react-query';
import {
  GearSix,
  User,
  Star,
  Bell,
  ShieldCheck,
  Question,
  SignOut,
  CaretRight,
  Buildings,
  WarningCircle
} from 'phosphor-react-native';

export default function OwnerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { name, email, role } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Sign Out Error', error.message);
        setModalVisible(false);
      } else {
        queryClient.clear();
        setModalVisible(false);
        router.replace('/auth/otp-auth');
      }
    } catch (err: any) {
      Alert.alert('Sign Out Error', err.message || 'An error occurred.');
      setModalVisible(false);
    } finally {
      setSigningOut(false);
    }
  };

  const getRoleDisplayName = (roleStr: string | null) => {
    if (!roleStr) return 'Gym Owner';
    if (roleStr === 'superadmin') return 'Super Administrator';
    return roleStr.charAt(0).toUpperCase() + roleStr.slice(1);
  };

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top }}>
      <View className="flex-row justify-between items-center px-5 py-4">
        <Text className="text-white text-3xl font-bold">Profile</Text>
        <Pressable>
          <GearSix size={28} color="#FFFFFF" weight="regular" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Profile Identity Card */}
        <View className="bg-[#121214] rounded-3xl p-6 items-center mt-2 border border-[#27272A]">
          <View className="w-20 h-20 rounded-full bg-[#1C1C20] border-2 border-[#D4FF00] items-center justify-center mb-4">
            <User size={40} color="#D4FF00" weight="duotone" />
          </View>
          <Text className="text-white text-xl font-bold mb-1">{name || 'Alex Morgan'}</Text>
          <Text className="text-[#A1A1AA] text-sm mb-3">{email || 'alex.owner@gkfitness.com'}</Text>
          
          <View className="flex-row items-center gap-2">
            <View className="bg-[#D4FF00]/10 border border-[#D4FF00]/30 rounded-full px-4 py-1">
              <Text className="text-[#D4FF00] text-xs font-semibold uppercase tracking-wider">
                {getRoleDisplayName(role)}
              </Text>
            </View>
            <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
              <Text className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                Active
              </Text>
            </View>
          </View>
        </View>

        {/* Manage Account Section */}
        <Text className="text-white text-lg font-bold mt-8 mb-4">Manage Your Gym & Account</Text>
        <View className="bg-[#121214] rounded-3xl overflow-hidden border border-[#27272A]">
          <MenuItem 
            icon={<User size={20} color="#D4FF00" />} 
            title="Personal Information" 
            subtitle="Update your profile details and preferences" 
            onPress={() => {}}
          />
          <MenuItem 
            icon={<Buildings size={20} color="#D4FF00" />} 
            title="Gym Facilities" 
            subtitle="Manage facility timings and amenities" 
            onPress={() => {}}
          />
          
          {/* Membership and Subscription Tile as in Customer Profile */}
          <MenuItem 
            icon={<Star size={20} color="#D4FF00" weight="fill" />} 
            title="Membership & Subscription" 
            subtitle="Create and manage membership plans for your gym" 
            onPress={() => router.push('/(owner)/membership')} 
          />

          <MenuItem 
            icon={<Bell size={20} color="#D4FF00" />} 
            title="Notifications" 
            subtitle="Manage your alert and notification settings" 
            onPress={() => {}}
          />
          <MenuItem 
            icon={<ShieldCheck size={20} color="#D4FF00" />} 
            title="Privacy & Security" 
            subtitle="Manage passwords and security protocols" 
            onPress={() => {}}
          />
          <MenuItem 
            icon={<Question size={20} color="#D4FF00" />} 
            title="Help & Support" 
            subtitle="Get administrative help and system support" 
            onPress={() => {}}
          />
          <MenuItem 
            icon={<SignOut size={20} color="#FF3B30" weight="bold" />} 
            title="Logout" 
            subtitle="Sign out from your owner account" 
            titleColor="#FF3B30" 
            hideBorder={true} 
            iconContainerStyle="bg-[#2A1515]" 
            onPress={() => setModalVisible(true)}
          />
        </View>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
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
                className="flex-1 bg-[#27272A] rounded-2xl py-3.5 items-center active:opacity-80"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                disabled={signingOut}
                className="flex-1 bg-red-500 rounded-2xl py-3.5 items-center active:opacity-80 flex-row justify-center gap-2"
              >
                {signingOut ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Sign Out</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuItem({ 
  icon, 
  title, 
  subtitle, 
  hideBorder, 
  titleColor, 
  onPress, 
  iconContainerStyle 
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  hideBorder?: boolean;
  titleColor?: string;
  onPress?: () => void;
  iconContainerStyle?: string;
}) {
  return (
    <Pressable 
      onPress={onPress} 
      className={`flex-row items-center p-4 active:bg-[#1A1A1E] ${!hideBorder ? 'border-b border-[#27272A]' : ''}`}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${iconContainerStyle || 'bg-[#1D1D20]'}`}>
        {icon}
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-sm font-semibold" style={{ color: titleColor || '#FFFFFF' }}>{title}</Text>
        <Text className="text-[#8E8E93] text-[11px] mt-0.5">{subtitle}</Text>
      </View>
      <CaretRight size={16} color="#48484A" weight="bold" />
    </Pressable>
  );
}
