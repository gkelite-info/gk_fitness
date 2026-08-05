import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, Modal, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GearSix, PencilSimple, Scales, Fire, CalendarBlank,
  User, Target, BookOpen, Star, Bell, ShieldCheck, Question, SignOut, CaretRight, ClipboardText, WarningCircle
} from 'phosphor-react-native';

import { mockProfileData } from '@/constants/mockProfileData';
import { useTrainerStore } from '@/constants/trainerStore';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { queryClient } from '@/lib/react-query';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProfileScreen() {
  const userContext = useUser();
  const userId = userContext.userId;
  const { data, isLoading } = useCustomerProfile(userId);

  return <ProfileView
    data={mockProfileData}
    customerData={data?.customerData}
    onboardingData={data?.onboardingData}
    loading={isLoading}
    fallbackUser={userContext}
  />;
}

function ProfileView({ data, customerData, onboardingData, loading, fallbackUser }: { data: typeof mockProfileData, customerData: any, onboardingData: any, loading: boolean, fallbackUser: any }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, trainer } = useTrainerStore();


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

  const displayFullName = customerData?.fullName || fallbackUser?.name || data.user.fullName;
  const displayEmail = customerData?.email || fallbackUser?.email || data.user.email;

  //mock avatar
  const displayAvatar = data.user.avatarUrl;

  const displayWeight = onboardingData?.weight || data.progress.currentWeight;
  const displayActiveSince = customerData?.createdAt
    ? new Date(customerData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : data.progress.activeSince;

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row justify-between items-center px-5 py-4">
        <Text className="text-white text-3xl font-semibold">Profile</Text>
        <Pressable>
          <GearSix size={28} color="#FFFFFF" weight="regular" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-row items-center mt-2 border border-[#27272A]">
          <Image
            source={{ uri: displayAvatar }}
            className="w-20 h-20 rounded-full bg-[#27272A]"
          />
          <View className="ml-4 flex-1 justify-center">
            {loading ? (
              <>
                <Skeleton className="w-40 h-6 mb-2" />
                <Skeleton className="w-32 h-4" />
              </>
            ) : (
              <>
                <Text className="text-white text-xl font-semibold">{displayFullName}</Text>
                <Text className="text-[#A1A1AA] text-sm mt-1">{displayEmail}</Text>
              </>
            )}
            <Pressable
              onPress={() => router.push('/(customer)/edit-profile')}
              className="mt-3 flex-row items-center border border-[#D4FF00] rounded-full px-4 py-1.5 self-start"
            >
              <PencilSimple size={14} color="#D4FF00" weight="bold" />
              <Text className="text-white text-xs font-semibold ml-2">Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        <Text className="text-white text-lg font-semibold mt-8 mb-4">Your Progress Overview</Text>
        <View className="flex-row justify-between gap-x-3">
          <ProgressCard
            icon={<Scales size={24} color="#D4FF00" />}
            title="Current Weight"
            value={displayWeight}
            subtitle={onboardingData ? "Current" : data.progress.weightChange}
            subtitleColor="#D4FF00"
          />
          <ProgressCard
            icon={<Fire size={24} color="#D4FF00" />}
            title="Workout Streak"
            value={data.progress.workoutStreak}
            subtitle={data.progress.streakSubtitle}
            subtitleColor="#D4FF00"
            valueHighlight={data.progress.workoutStreak}
            valueSuffix={data.progress.streakSuffix}
          />
          <ProgressCard
            icon={<CalendarBlank size={24} color="#D4FF00" />}
            title="Active Since"
            value={displayActiveSince}
            subtitle={onboardingData ? "Joined" : data.progress.activeSinceSubtitle}
            subtitleColor="#D4FF00"
          />
        </View>

        <Text className="text-white text-lg font-semibold mt-8 mb-4">Manage Your Account</Text>
        <View className="bg-[#1A1A1A] rounded-3xl overflow-hidden border border-[#27272A]">
          {!loading && !onboardingData && (
            <MenuItem
              icon={<ClipboardText size={20} color="#000000" weight="bold" />}
              title="Complete Onboarding"
              subtitle="Finish setting up your personalized plan"
              isNew={true}
              iconContainerStyle="bg-[#FF9F0A]"
              onPress={() => router.push('/(customer)/(onboarding)/step1')}
            />
          )}
          <MenuItem icon={<User size={20} color="#D4FF00" />} title="Personal Information" subtitle="Update your personal details" onPress={() => router.push('/(customer)/edit-profile')} />
          <MenuItem icon={<Target size={20} color="#D4FF00" />} title="Goals & Preferences" subtitle="Manage your fitness goals and preferences" onPress={() => router.push('/(customer)/goals-preferences')} />
          {status === 'approved' ? (
            <MenuItem
              icon={<User size={20} color="#000000" weight="bold" />}
              title="My Trainer"
              subtitle={`Training with ${trainer.name}`}
              iconContainerStyle="bg-[#D4FF00]"
              onPress={() => router.push('/(customer)/my-trainer')}
            />
          ) : status === 'pending' ? (
            <MenuItem
              icon={<BookOpen size={20} color="#000000" weight="bold" />}
              title="Trainer Request"
              subtitle="Request pending gym approval"
              iconContainerStyle="bg-[#FF9F0A]"
              onPress={() => router.push('/(customer)/trainer-request')}
            />
          ) : (
            <MenuItem
              icon={<BookOpen size={20} color="#000000" weight="bold" />}
              title="Book Trainer"
              subtitle="Find and book a personal trainer"
              isNew={true}
              iconContainerStyle="bg-[#D4FF00]"
              onPress={() => router.push('/(customer)/book-trainer')}
            />
          )}
          <MenuItem icon={<Star size={20} color="#D4FF00" />} title="Membership & Subscription" subtitle="Manage your plan and billing" />
          <MenuItem icon={<Bell size={20} color="#D4FF00" />} title="Notifications" subtitle="Manage your notification preferences" />
          <MenuItem 
            icon={<ShieldCheck size={20} color="#D4FF00" />} 
            title="Privacy & Security" 
            subtitle="Manage your privacy and security settings" 
            onPress={() => router.push('/(customer)/privacy-policy')}
          />
          <MenuItem 
            icon={<Question size={20} color="#D4FF00" />} 
            title="Help & Support" 
            subtitle="Get help and support" 
            onPress={() => router.push('/(customer)/help-support')}
          />
          <MenuItem
            icon={<SignOut size={20} color="#FF3B30" />}
            title="Logout"
            subtitle="Sign out from your account"
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
          <View className="bg-[#1A1A1A] border border-[#27272A] w-full max-w-[340px] rounded-3xl p-6 items-center shadow-2xl">
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

function ProgressCard({ icon, title, value, subtitle, subtitleColor, valueHighlight, valueSuffix }: any) {
  return (
    <View className="bg-[#1A1A1A] rounded-2xl p-4 flex-1 items-center justify-center border border-[#27272A]">
      <View className="mb-2">
        {icon}
      </View>
      <Text className="text-[#8E8E93] text-[10px] mb-2 font-medium">{title}</Text>
      {valueHighlight ? (
        <View className="flex-row items-baseline mb-2">
          <Text className="text-white text-xl font-semibold">{valueHighlight}</Text>
          <Text className="text-white text-[10px] ml-1">{valueSuffix}</Text>
        </View>
      ) : (
        <Text className="text-white text-base font-semibold text-center mb-2">{value}</Text>
      )}
      <Text className="text-[9px] text-center font-semibold" style={{ color: subtitleColor }}>{subtitle}</Text>
    </View>
  );
}

function MenuItem({ icon, title, subtitle, isNew, hideBorder, titleColor, onPress, iconContainerStyle }: any) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center p-4 ${!hideBorder ? 'border-b border-[#27272A]' : ''}`}>
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${iconContainerStyle || 'bg-[#222222]'}`}>
        {icon}
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-sm font-semibold" style={{ color: titleColor || '#FFFFFF' }}>{title}</Text>
        <Text className="text-[#8E8E93] text-[11px] mt-0.5">{subtitle}</Text>
      </View>
      {isNew && (
        <View className="bg-[#D4FF00] rounded-full px-2 py-0.5 mr-3">
          <Text className="text-black text-[10px] font-semibold">New</Text>
        </View>
      )}
      <CaretRight size={16} color="#48484A" weight="bold" />
    </Pressable>
  );
}