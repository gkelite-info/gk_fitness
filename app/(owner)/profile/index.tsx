import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal, Alert, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { useUpdateProfilePhoto, useDeleteProfilePhoto } from '@/hooks/auth/useUpdateCustomerProfile';
import * as ImagePicker from 'expo-image-picker';
import { toast } from '@/lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/react-query';
import { useGym } from '@/hooks/gyms/useGym';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useGymTrainers } from '@/hooks/trainers/useGymTrainers';
import { useGymMembershipPlans } from '@/hooks/useGymMembershipPlans';
import {
  Bell,
  ShieldCheck,
  Question,
  SignOut,
  CaretRight,
  Barbell,
  CheckCircle,
  MapPin,
  Phone,
  EnvelopeSimple,
  Globe,
  UsersThree,
  ArrowUp,
  ArrowDown,
  CreditCard,
  PencilSimple,
  Crown,
  UserCircle,
  Bank,
  QrCode,
  LockKey
} from 'phosphor-react-native';

const MenuItem = ({ icon, title, subtitle, onPress, isDanger = false }: any) => (
  <Pressable
    className="flex-row items-center justify-between p-4 border-b border-[#1F1F22] active:opacity-70"
    onPress={onPress}
  >
    <View className="flex-row items-center flex-1 pr-4">
      <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${isDanger ? 'bg-[#2A1515]' : 'bg-[#1E2015]'}`}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] font-semibold mb-0.5 ${isDanger ? 'text-[#EF4444]' : 'text-white'}`}>
          {title}
        </Text>
        <Text className="text-[#A1A1AA] text-xs leading-4" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
    <CaretRight size={16} color={isDanger ? '#EF4444' : '#71717A'} />
  </Pressable>
);

export default function OwnerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, gymId, profilePhoto, refreshUserContext } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);
  const updatePhotoMutation = useUpdateProfilePhoto();
  const deletePhotoMutation = useDeleteProfilePhoto();

  const currentPhoto = profilePhoto;
  const hasProfilePhoto = Boolean(
    currentPhoto &&
    typeof currentPhoto === 'string' &&
    currentPhoto.trim() !== '' &&
    currentPhoto !== 'null' &&
    currentPhoto !== 'undefined' &&
    !currentPhoto.includes('pravatar.cc')
  );

  const { data: gym, refetch: refetchGym } = useGym(gymId ?? null);

  const { data: customers } = useGymCustomers(gymId ?? undefined);
  const activeCustomersCount = customers?.filter(c => c.is_Active === true).length || 0;

  const { data: trainers } = useGymTrainers(gymId ?? undefined);
  const totalTrainers = trainers?.length || 0;
  const activeTrainersCount = trainers?.filter((t: any) => t.is_Active !== false).length || 0;

  const { data: membershipPlans, refetch: refetchPlans } = useGymMembershipPlans(userId ?? null);
  const totalPlans = membershipPlans?.length || 0;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      typeof refreshUserContext === 'function' ? refreshUserContext() : Promise.resolve(),
      typeof refetchGym === 'function' ? refetchGym() : Promise.resolve(),
      typeof refetchPlans === 'function' ? refetchPlans() : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }),
      queryClient.invalidateQueries({ queryKey: ['gym', gymId] }),
    ]);
    setRefreshing(false);
  }, [refreshUserContext, refetchGym, refetchPlans, userId, gymId]);

  useFocusEffect(
    React.useCallback(() => {
      if (typeof refreshUserContext === 'function') refreshUserContext();
      if (typeof refetchGym === 'function') refetchGym();
    }, [refreshUserContext, refetchGym])
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
      console.error('[OwnerProfile] Error deleting photo:', err);
      toast.error('Failed to remove profile picture.');
    }
  };

  const getNetGrowthThisMonth = (items?: any[]) => {
    if (!items) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let added = 0;
    let removed = 0;

    items.forEach(item => {
      if (item.createdAt && new Date(item.createdAt) >= startOfMonth) {
        added++;
      }
      if (
        (item.is_deleted === true || item.is_Active === false) &&
        item.updatedAt && new Date(item.updatedAt) >= startOfMonth
      ) {
        removed++;
      }
    });

    return added - removed;
  };

  const getNewPlansThisMonth = (items?: any[]) => {
    if (!items) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return items.filter(item => {
      if (!item.createdAt) return false;
      return new Date(item.createdAt) >= startOfMonth;
    }).length;
  };

  const netCustomersThisMonth = getNetGrowthThisMonth(customers);
  const netTrainersThisMonth = getNetGrowthThisMonth(trainers);
  const newPlansThisMonth = getNewPlansThisMonth(membershipPlans);

  const totalActiveMembers = activeCustomersCount + activeTrainersCount;
  const totalNetMembersThisMonth = netCustomersThisMonth + netTrainersThisMonth;

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Sign Out Error', error.message);
        setModalVisible(false);
      } else {
        queryClient.clear();
        setModalVisible(false);
        router.replace('/auth/account-type');
      }
    } catch (err: any) {
      Alert.alert('Sign Out Error', err.message || 'An error occurred.');
      setModalVisible(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      <View className="px-5 py-3 pb-2">
        <Text className="text-white text-[22px] font-semibold tracking-wide">Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="bg-[#161616] rounded-3xl p-6 items-center mt-2 border border-[#1F1F22]">
          <Pressable onPress={() => setPhotoOptionsVisible(true)} className="relative active:opacity-80 mb-4">
            <View className="w-[84px] h-[84px] rounded-2xl bg-[#000000] border border-[#C4EF00] items-center justify-center overflow-hidden">
              {profilePhoto || gym?.logo ? (
                <Image source={{ uri: profilePhoto || gym?.logo }} className="w-full h-full" />
              ) : (
                <>
                  <Barbell size={32} color="#C4EF00" weight="fill" />
                  <Text className="text-[#C4EF00] text-[8px] font-semibold tracking-wider mt-1 text-center px-1" numberOfLines={1}>{gym?.gymName?.toUpperCase() || 'GYM'}</Text>
                </>
              )}
            </View>
          </Pressable>

          <Pressable 
            className="border border-[#C4EF00] rounded-full px-5 py-1.5 mb-4 flex-row items-center active:opacity-70"
            onPress={() => router.push('/(owner)/profile/edit-profile' as any)}
          >
            <PencilSimple size={14} color="#C4EF00" weight="regular" style={{ marginRight: 6 }} />
            <Text className="text-white text-xs font-semibold">Edit Profile</Text>
          </Pressable>

          <View className="flex-row items-center mb-1">
            <Text className="text-white text-xl font-semibold mr-1.5">{gym?.gymName || 'Gym Name'}</Text>
            <CheckCircle size={18} color="#C4EF00" weight="fill" />
          </View>

          <Text className="text-[#A1A1AA] text-sm mb-2">Premium Gym</Text>

          <View className="flex-row items-center mb-6">
            <Text className="text-[#A1A1AA] text-xs">Since {gym?.establishYear || new Date().getFullYear()}</Text>
          </View>
          <View className="w-full h-[1px] bg-[#1F1F22] mb-5" />
          <View className="w-full flex-row flex-wrap justify-between gap-y-3">
            {gym?.city && gym?.state && (
              <View className="w-[48%] flex-row items-start">
                <MapPin size={14} color="#A1A1AA" style={{ marginRight: 8, marginTop: 2 }} />
                <Text className="text-[#A1A1AA] text-xs flex-1">{gym.city}, {gym.state}</Text>
              </View>
            )}
            {gym?.phone && (
              <View className="w-[48%] flex-row items-start">
                <Phone size={14} color="#A1A1AA" style={{ marginRight: 8, marginTop: 2 }} />
                <Text className="text-[#A1A1AA] text-xs flex-1">{gym.phone}</Text>
              </View>
            )}
            {gym?.gymEmail && (
              <View className="w-[48%] flex-row items-start">
                <EnvelopeSimple size={14} color="#A1A1AA" style={{ marginRight: 8, marginTop: 2 }} />
                <Text className="text-[#A1A1AA] text-xs flex-1">{gym.gymEmail}</Text>
              </View>
            )}
            {gym?.website && (
              <View className="w-[48%] flex-row items-start">
                <Globe size={14} color="#A1A1AA" style={{ marginRight: 8, marginTop: 2 }} />
                <Text className="text-[#A1A1AA] text-xs flex-1">{gym.website}</Text>
              </View>
            )}
          </View>
        </View>
        <Text className="text-white text-[15px] font-semibold mt-6 mb-3">Gym Overview</Text>
        <View className="flex-row justify-between mb-6">
          <View className="w-[31%] bg-[#161616] rounded-xl p-3 border border-[#1F1F22]">
            <UsersThree size={22} color="#C4EF00" weight="fill" style={{ marginBottom: 6 }} />
            <Text className="text-[#A1A1AA] text-[9px] mb-1">Active Members</Text>
            <Text className="text-white text-lg font-semibold mb-3">{totalActiveMembers}</Text>
            <View className="flex-row items-center mt-auto">
              {totalNetMembersThisMonth >= 0 ? (
                <ArrowUp size={10} color="#C4EF00" weight="bold" />
              ) : (
                <ArrowDown size={10} color="#EF4444" weight="bold" />
              )}
              <Text className={`text-[9px] font-semibold ml-0.5 ${totalNetMembersThisMonth >= 0 ? 'text-[#C4EF00]' : 'text-[#EF4444]'}`}>
                {totalNetMembersThisMonth === 0
                  ? '0 this month'
                  : `${Math.abs(totalNetMembersThisMonth)} ${totalNetMembersThisMonth > 0 ? 'higher' : 'lower'}`}
              </Text>
            </View>
            <View className="absolute left-0 top-2 bottom-2 w-1 bg-[#C4EF00] rounded-r-full" />
          </View>

          <View className="w-[31%] bg-[#161616] rounded-xl p-3 border border-[#1F1F22]">
            <Barbell size={22} color="#C4EF00" weight="fill" style={{ marginBottom: 6 }} />
            <Text className="text-[#A1A1AA] text-[9px] mb-1">Total Trainers</Text>
            <Text className="text-white text-lg font-semibold mb-3">{totalTrainers}</Text>
            <View className="flex-row items-center mt-auto">
              {netTrainersThisMonth >= 0 ? (
                <ArrowUp size={10} color="#C4EF00" weight="bold" />
              ) : (
                <ArrowDown size={10} color="#EF4444" weight="bold" />
              )}
              <Text className={`text-[9px] font-semibold ml-0.5 ${netTrainersThisMonth >= 0 ? 'text-[#C4EF00]' : 'text-[#EF4444]'}`}>
                {netTrainersThisMonth === 0
                  ? '0 this month'
                  : `${Math.abs(netTrainersThisMonth)} ${netTrainersThisMonth > 0 ? 'higher' : 'lower'}`}
              </Text>
            </View>
            <View className="absolute left-0 top-2 bottom-2 w-1 bg-[#F97316] rounded-r-full" />
          </View>

          <View className="w-[31%] bg-[#161616] rounded-xl p-3 border border-[#1F1F22]">
            <CreditCard size={22} color="#C4EF00" weight="fill" style={{ marginBottom: 6 }} />
            <Text className="text-[#A1A1AA] text-[9px] mb-1">Membership Plans</Text>
            <Text className="text-white text-lg font-semibold mb-1">{totalPlans}</Text>
            <Text className="text-[#71717A] text-[9px] leading-3 mt-auto">
              {newPlansThisMonth > 0 ? `${newPlansThisMonth} this month` : 'No change this month'}
            </Text>
            <View className="absolute left-0 top-2 bottom-2 w-1 bg-[#8B5CF6] rounded-r-full" />
          </View>
        </View>
        <Text className="text-white text-[15px] font-semibold mb-3">Manage Your Gym</Text>
        <View className="bg-[#161616] rounded-2xl overflow-hidden border border-[#1F1F22] mb-6">
          <MenuItem
            icon={<PencilSimple size={18} color="#C4EF00" />}
            title="Edit Gym Profile"
            subtitle="Update your gym information, logo, contact details and business hours"
            onPress={() => router.push('/(owner)/profile/edit-profile' as any)}
          />
          <MenuItem
            icon={<Bank size={18} color="#C4EF00" weight="fill" />}
            title="Payment Settings"
            subtitle="Manage where your membership payments are received"
            onPress={() => router.push('/(owner)/payment-details' as any)}
          />
          <MenuItem
            icon={<QrCode size={18} color="#C4EF00" weight="fill" />}
            title="Open Check-In QR"
            subtitle="Display QR code for member check-in"
            onPress={() => router.push('/(owner)/dashboard/qr')}
          />
          <MenuItem
            icon={<Crown size={18} color="#C4EF00" weight="fill" />}
            title="Membership Plans"
            subtitle="Create, edit and manage membership plans"
            onPress={() => router.push('/(owner)/membership')}
          />
          <MenuItem
            icon={<UsersThree size={18} color="#C4EF00" weight="fill" />}
            title="Personal Training"
            subtitle="Manage trainer requests and assign trainers"
            onPress={() => router.push('/(owner)/profile/personal-training' as any)}
          />
          <MenuItem
            icon={<Barbell size={18} color="#C4EF00" weight="fill" />}
            title="Gym Access"
            subtitle="Manage gym timings and customer check-in rules."
            onPress={() => router.push('/(owner)/profile/gym-access' as any)}
          />
          <MenuItem
            icon={<Bell size={18} color="#C4EF00" />}
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => { }}
          />
          <MenuItem
            icon={<UserCircle size={18} color="#C4EF00" />}
            title="Member App Access"
            subtitle="Choose how long members can continue"
            onPress={() => router.push('/(owner)/profile/member-app-access' as any)}
          />
          <MenuItem
            icon={<LockKey size={18} color="#C4EF00" weight="bold" />}
            title="Change Password"
            subtitle="Update your account password securely"
            onPress={() => router.push('/(owner)/profile/change-password' as any)}
          />
          <MenuItem
            icon={<ShieldCheck size={18} color="#C4EF00" />}
            title="Privacy & Security"
            subtitle="Change password and security settings"
            onPress={() => router.push('/(owner)/profile/change-password' as any)}
          />
          <MenuItem
            icon={<Question size={18} color="#C4EF00" />}
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => { }}
          />
        </View>
        <View className="bg-[#161616] rounded-2xl overflow-hidden border border-[#1F1F22] mb-6">
          <MenuItem
            icon={<SignOut size={18} color="#EF4444" weight="bold" />}
            title="Logout"
            subtitle="Sign out from your account"
            isDanger={true}
            onPress={() => setModalVisible(true)}
          />
        </View>
      </ScrollView>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-[#161616] border border-[#27272A] w-full max-w-[340px] rounded-3xl p-6 items-center shadow-2xl">
            <View className="w-12 h-12 rounded-full bg-[#2A1515] items-center justify-center mb-4">
              <SignOut size={24} color="#EF4444" weight="regular" />
            </View>
            <Text className="text-white text-[17px] font-semibold mb-2">Sign Out</Text>
            <Text className="text-[#A1A1AA] text-[13px] text-center mb-6 px-4">
              Are you sure you want to sign out of your account? You will need to login again to access your gym.
            </Text>
            <View className="flex-row w-full gap-3">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3.5 rounded-xl bg-[#1F1F22] items-center justify-center active:opacity-70"
              >
                <Text className="text-white font-semibold text-[13px]">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                className="flex-1 py-3.5 rounded-xl bg-[#EF4444] items-center justify-center active:opacity-80"
              >
                <Text className="text-white font-semibold text-[13px]">Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
