import React, { useState, useCallback } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { toast } from '@/lib/toast';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/react-query';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { useUpdateProfilePhoto, useDeleteProfilePhoto } from '@/hooks/auth/useUpdateCustomerProfile';
import * as ImagePicker from 'expo-image-picker';
import {
  CaretLeft,
  PencilSimple,
  EnvelopeSimple,
  Phone,
  Calendar,
  Bell,
  Shield,
  Headphones,
  SignOut,
  CaretRight,
  WarningCircle,
  Camera
} from 'phosphor-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmModal from '@/components/ConfirmModal';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

export default function SuperAdminProfileScreen() {
  const { userId, name, email, role, profilePhoto, refreshUserContext } = useUser();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);

  const updatePhotoMutation = useUpdateProfilePhoto();
  const deletePhotoMutation = useDeleteProfilePhoto();

  const hasProfilePhoto = Boolean(
    profilePhoto &&
    typeof profilePhoto === 'string' &&
    profilePhoto.trim() !== '' &&
    profilePhoto !== 'null' &&
    profilePhoto !== 'undefined' &&
    !profilePhoto.includes('pravatar.cc')
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      typeof refreshUserContext === 'function' ? refreshUserContext() : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }),
    ]);
    setRefreshing(false);
  }, [refreshUserContext, userId]);

  useFocusEffect(
    useCallback(() => {
      if (typeof refreshUserContext === 'function') refreshUserContext();
    }, [refreshUserContext])
  );

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permissionResult.granted === false) {
        toast.error('Camera or gallery permission is required.');
        setPhotoOptionsVisible(false);
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      setPhotoOptionsVisible(false);

      if (!result.canceled && result.assets && result.assets.length > 0 && userId) {
        updatePhotoMutation.mutate(
          { userId, imageUri: result.assets[0].uri },
          {
            onSuccess: async () => {
              toast.success('Profile picture updated!');
              await queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
              if (typeof refreshUserContext === 'function') {
                await refreshUserContext();
              }
            },
            onError: (err: any) => toast.error(err.message || 'Upload failed.')
          }
        );
      }
    } catch (error: any) {
      setPhotoOptionsVisible(false);
      console.error('ImagePicker Error:', error);
      toast.error(error.message || 'Unexpected error picking image.');
    }
  };

  const handleDeletePhoto = async () => {
    if (!userId) return;
    try {
      await deletePhotoMutation.mutateAsync({
        userId,
        fileName: profilePhoto,
      });
      await queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      if (typeof refreshUserContext === 'function') {
        await refreshUserContext();
      }
      toast.success('Profile picture removed!');
    } catch (err: any) {
      console.error('[SuperAdminProfile] Error deleting photo:', err);
      toast.error('Failed to remove profile picture.');
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setModalVisible(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        router.replace('/auth/account-type');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setSigningOut(false);
    }
  };

  const renderRow = (icon: React.ReactNode, title: string, value: string, isRed = false, onPress?: () => void) => (
    <Pressable onPress={onPress} className="flex-row items-center py-4 active:opacity-70">
      <View className="mr-4">
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`text-sm ${isRed ? 'text-[#EF4444]' : 'text-white'} font-medium mb-0.5`}>{title}</Text>
        <Text className="text-[#8E8E93] text-xs">{value}</Text>
      </View>
      <CaretRight size={16} color="#8E8E93" />
    </Pressable>
  );

  return (
    <View className="flex-1 bg-[#09090B]">
      <View style={{ paddingTop: insets.top }} className="px-5 pb-2">
        <View className="flex-row justify-between items-center mt-2 mb-4">
          <Pressable onPress={() => router.back()} className="w-10 h-10 border border-[#2A2A2D] rounded-xl items-center justify-center active:opacity-70">
            <CaretLeft size={20} color="#D4FF00" weight="bold" />
          </Pressable>
          <View className="items-center">
            <Text className="text-white text-xl font-semibold">Profile</Text>
            <Text className="text-[#8E8E93] text-xs">Super Admin</Text>
          </View>
          <Pressable 
            onPress={() => setPhotoOptionsVisible(true)}
            className="w-10 h-10 border border-[#2A2A2D] rounded-xl items-center justify-center active:opacity-70"
          >
            <PencilSimple size={20} color="#D4FF00" weight="regular" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5">
          <View className="items-center mb-6">
            <Pressable onPress={() => setPhotoOptionsVisible(true)} className="relative active:opacity-80">
              <StaticAvatar
                uri={profilePhoto}
                userId={userId}
                name={name || 'Super Admin'}
                size={80}
                className="w-24 h-24 rounded-full mb-3"
              />
              <View className="absolute bottom-3 right-0 w-7 h-7 rounded-full bg-[#18181B] border border-[#2A2A2D] items-center justify-center">
                <Camera size={14} color="#D4FF00" weight="fill" />
              </View>
            </Pressable>
            <Text className="text-[#D4FF00] text-xs font-semibold mb-1">GKfitness</Text>
            <Text className="text-white text-2xl font-semibold mb-3">{name || 'Amit Verma'}</Text>
            <View className="border border-[#D4FF00] rounded-full px-4 py-1">
              <Text className="text-[#D4FF00] text-xs">Super Admin</Text>
            </View>
          </View>

          <View className="h-[1px] bg-[#2A2A2D] mb-2" />

          <Pressable className="flex-row items-center py-4">
            <View className="mr-4"><EnvelopeSimple size={20} color="#D4FF00" weight="regular" /></View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-xs mb-0.5">Email</Text>
              <Text className="text-white text-sm">{email || 'amit.verma@gkgymlife.com'}</Text>
            </View>
            <CaretRight size={16} color="#8E8E93" />
          </Pressable>

          <View className="h-[1px] bg-[#2A2A2D]" />

          <Pressable className="flex-row items-center py-4">
            <View className="mr-4"><Phone size={20} color="#D4FF00" weight="fill" /></View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-xs mb-0.5">Phone</Text>
              <Text className="text-white text-sm">+91 98765 43210</Text>
            </View>
            <CaretRight size={16} color="#8E8E93" />
          </Pressable>

          <View className="h-[1px] bg-[#2A2A2D]" />

          <Pressable className="flex-row items-center py-4">
            <View className="mr-4"><Calendar size={20} color="#D4FF00" weight="regular" /></View>
            <View className="flex-1">
              <Text className="text-[#8E8E93] text-xs mb-0.5">Joined On</Text>
              <Text className="text-white text-sm">20 May 2026</Text>
            </View>
            <CaretRight size={16} color="#8E8E93" />
          </Pressable>
        </View>

        <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-5">
          {renderRow(
            <Bell size={20} color="#D4FF00" weight="regular" />,
            "Notifications",
            "Manage notification preferences"
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />
          {renderRow(
            <Shield size={20} color="#D4FF00" weight="fill" />,
            "Privacy & Security",
            "Manage password and security settings"
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />
          {renderRow(
            <Headphones size={20} color="#D4FF00" weight="fill" />,
            "Help & Support",
            "Get help and contact support"
          )}
          <View className="h-[1px] bg-[#2A2A2D]" />
          {renderRow(
            <SignOut size={20} color="#EF4444" weight="bold" />,
            "Logout",
            "Sign out from your account",
            true,
            () => setModalVisible(true)
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleSignOut}
        title="Logout"
        description="Are you sure you want to sign out from your account? You will need to log in again to access the platform."
        confirmText="Logout"
        icon={
          <View className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center border border-red-500/20">
            <WarningCircle size={28} color="#EF4444" weight="fill" />
          </View>
        }
      />

      <ActionSheetModal
        visible={photoOptionsVisible}
        onClose={() => setPhotoOptionsVisible(false)}
        title="Update Profile Picture"
        options={[
          { label: 'Take Photo', keepOpen: true, onPress: () => handlePickImage(true) },
          { label: 'Choose from Gallery', keepOpen: true, onPress: () => handlePickImage(false) },
          ...(hasProfilePhoto ? [
            {
              label: 'Delete Existing',
              destructive: true,
              onPress: handleDeletePhoto,
            }
          ] : [])
        ]}
      />
    </View>
  );
}
