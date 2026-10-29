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
import { useGymTrainerById } from '@/hooks/trainers/useGymTrainers';
import { useGlobalTrainer } from '@/hooks/globalTrainers/useGlobalTrainer';
import {
  Star,
  Bell,
  ShieldCheck,
  Question,
  SignOut,
  CaretRight,
  Barbell,
  MapPin,
  PencilSimple,
  User,
  Camera,
  Fire,
  Leaf
} from 'phosphor-react-native';

const MenuItem = ({ icon, title, subtitle, onPress, isDanger = false }: any) => (
  <>
    {/* @ts-ignore */}
    <Pressable className="flex-row items-center justify-between p-4 border-b border-[#27272A] active:opacity-70"
      onPress={onPress}
    >
      <View className="flex-row items-center flex-1 pr-4">
        <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${isDanger ? 'bg-[#2A1515]' : 'bg-[#18181B]'}`}>
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
  </>
);

export default function TrainerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, trainerId, globalTrainerId, profilePhoto, name, role, refreshUserContext } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);
  const updatePhotoMutation = useUpdateProfilePhoto();
  const deletePhotoMutation = useDeleteProfilePhoto();

  const isGlobalTrainer = (role || '').toLowerCase().replace(/[\s_-]/g, '') === 'globaltrainer';
  const { data: trainerData, refetch: refetchTrainer } = useGymTrainerById(!isGlobalTrainer ? (trainerId ?? undefined) : undefined);
  const { data: globalTrainerData, refetch: refetchGlobalTrainer } = useGlobalTrainer(globalTrainerId || (isGlobalTrainer ? trainerId : undefined));

  const trainer = isGlobalTrainer ? globalTrainerData : (trainerData?.trainer || globalTrainerData);

  const currentPhoto = profilePhoto || trainer?.profilePhoto || trainer?.profilePic;
  const hasProfilePhoto = Boolean(
    currentPhoto &&
    typeof currentPhoto === 'string' &&
    currentPhoto.trim() !== '' &&
    currentPhoto !== 'null' &&
    currentPhoto !== 'undefined' &&
    !currentPhoto.includes('pravatar.cc')
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      typeof refreshUserContext === 'function' ? refreshUserContext() : Promise.resolve(),
      typeof refetchTrainer === 'function' ? refetchTrainer() : Promise.resolve(),
      typeof refetchGlobalTrainer === 'function' ? refetchGlobalTrainer() : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }),
      queryClient.invalidateQueries({ queryKey: ['gymTrainer'] }),
      queryClient.invalidateQueries({ queryKey: ['globalTrainer'] }),
    ]);
    setRefreshing(false);
  }, [refreshUserContext, refetchTrainer, refetchGlobalTrainer, userId]);

  useFocusEffect(
    React.useCallback(() => {
      if (typeof refreshUserContext === 'function') refreshUserContext();
      if (typeof refetchTrainer === 'function') refetchTrainer();
      if (typeof refetchGlobalTrainer === 'function') refetchGlobalTrainer();
    }, [refreshUserContext, refetchTrainer, refetchGlobalTrainer])
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
        fileName: currentPhoto,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['gymTrainer'] }),
        queryClient.invalidateQueries({ queryKey: ['globalTrainer'] }),
      ]);
      if (typeof refreshUserContext === 'function') {
        await refreshUserContext();
      }
      if (typeof refetchTrainer === 'function') {
        await refetchTrainer();
      }
      if (typeof refetchGlobalTrainer === 'function') {
        await refetchGlobalTrainer();
      }
      toast.success('Profile picture removed!');
    } catch (err: any) {
      console.error('[TrainerProfile] Error deleting photo:', err);
      toast.error('Failed to remove profile picture.');
    }
  };

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

  const getSpecializationChips = () => {
    if (!trainer?.specialization) return null;
    const specs = trainer.specialization.split(',').map((s: string) => s.trim());
    return specs.map((spec: string, index: number) => {
      let icon = <Barbell size={14} color="#C4EF18" weight="fill" />;
      if (spec.toLowerCase().includes('loss')) icon = <Fire size={14} color="#C4EF18" weight="fill" />;
      if (spec.toLowerCase().includes('nutrition')) icon = <Leaf size={14} color="#C4EF18" weight="fill" />;
      if (spec.toLowerCase().includes('gain')) icon = <User size={14} color="#C4EF18" weight="fill" />;

      return (
        <View key={index} className="flex-row items-center border border-[#27272A] rounded-full px-3 py-1.5 mr-2 mb-2 bg-[#1C1C1E]">
          {icon}
          <Text className="text-white text-[11px] ml-1.5">{spec}</Text>
        </View>
      );
    });
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      <View className="px-5 py-3 pb-2">
        <Text className="text-white text-[24px] font-semibold tracking-wide">My Profile</Text>
        <Text className="text-[#A1A1AA] text-sm mt-1">Manage your professional profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="bg-[#1C1C1E] rounded-3xl p-5 mt-4 border border-[#27272A]">
          {/* @ts-ignore */}
          <Pressable onPress={() => setPhotoOptionsVisible(true)} className="absolute right-4 top-4 w-8 h-8 rounded-full border border-[#27272A] items-center justify-center bg-[#18181B] active:opacity-70 z-10">
            <PencilSimple size={14} color="#C4EF18" weight="fill" />
          </Pressable>

          <View className="flex-row items-start mb-6">
            <Pressable onPress={() => setPhotoOptionsVisible(true)} className="relative active:opacity-80">
              <View className="w-[84px] h-[84px] rounded-full border-2 border-[#27272A] bg-[#18181B] items-center justify-center overflow-hidden">
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} className="w-full h-full" />
                ) : (
                  <User size={32} color="#71717A" weight="fill" />
                )}
              </View>
              <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#1A2D22] items-center justify-center border border-[#1C1C1E]">
                <Camera size={12} color="#C4EF18" weight="fill" />
              </View>
            </Pressable>

            <View className="ml-4 pt-1 flex-1">
              <Text className="text-white text-xl font-semibold mb-1">{trainer?.fullName || name || 'Trainer'}</Text>
              <View className="bg-[#1A2D22] self-start px-2.5 py-1 rounded-md">
                <Text className="text-[#C4EF18] text-[10px] font-medium">{trainer?.specialization || (isGlobalTrainer ? 'Global Trainer' : 'Fitness Trainer')}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4 px-1">
            <View className="flex-row items-center">
              <Star size={14} color="#C4EF18" weight="fill" style={{ marginRight: 6 }} />
              <Text className="text-[#A1A1AA] text-xs"><Text className="text-white font-medium">4.8</Text> (128 reviews)</Text>
            </View>
            <View className="flex-row items-center">
              <MapPin size={14} color="#A1A1AA" weight="fill" style={{ marginRight: 6 }} />
              <Text className="text-[#A1A1AA] text-xs">{(trainer as any)?.city || 'Global'}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between px-1">
            <View className="flex-row items-center">
              <Barbell size={14} color="#A1A1AA" weight="fill" style={{ marginRight: 6 }} />
              <Text className="text-[#A1A1AA] text-xs">{trainer?.experienceYears || (trainer as any)?.experience || 0}+ Years Experience</Text>
            </View>
            <View className="flex-row items-center">
              <User size={14} color="#A1A1AA" style={{ marginRight: 6 }} />
              <Text className="text-[#A1A1AA] text-xs">512 Total Sessions</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#1C1C1E] rounded-3xl p-5 mt-4 border border-[#27272A]">
          <Text className="text-white text-[15px] font-semibold mb-3">About Me</Text>
          <Text className="text-[#A1A1AA] text-sm leading-5 mb-2" numberOfLines={3}>
            {trainer?.bio || 'Certified strength and conditioning coach passionate about helping clients reach their full potential.'}
          </Text>
          {/* @ts-ignore */}
          <Pressable className="self-end active:opacity-70">
            <Text className="text-[#C4EF18] text-xs font-semibold">View More {'>'}</Text>
          </Pressable>
        </View>

        <View className="bg-[#1C1C1E] rounded-3xl p-5 mt-4 border border-[#27272A]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-[15px] font-semibold">Specializations</Text>
            {/* @ts-ignore */}
            <Pressable className="active:opacity-70">
              <Text className="text-[#C4EF18] text-xs font-semibold">Manage {'>'}</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap">
            {getSpecializationChips() || (
              <>
                <View className="flex-row items-center border border-[#27272A] rounded-full px-3 py-1.5 mr-2 mb-2 bg-[#1C1C1E]">
                  <Barbell size={14} color="#C4EF18" weight="fill" />
                  <Text className="text-white text-[11px] ml-1.5">Strength Training</Text>
                </View>
                <View className="flex-row items-center border border-[#27272A] rounded-full px-3 py-1.5 mr-2 mb-2 bg-[#1C1C1E]">
                  <User size={14} color="#C4EF18" weight="fill" />
                  <Text className="text-white text-[11px] ml-1.5">Muscle Gain</Text>
                </View>
                <View className="flex-row items-center border border-[#27272A] rounded-full px-3 py-1.5 mr-2 mb-2 bg-[#1C1C1E]">
                  <Fire size={14} color="#C4EF18" weight="fill" />
                  <Text className="text-white text-[11px] ml-1.5">Weight Loss</Text>
                </View>
                <View className="flex-row items-center border border-[#27272A] rounded-full px-3 py-1.5 mr-2 mb-2 bg-[#1C1C1E]">
                  <Leaf size={14} color="#C4EF18" weight="fill" />
                  <Text className="text-white text-[11px] ml-1.5">Nutrition Guidance</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#27272A] mt-4">
          <MenuItem
            icon={<Bell size={18} color="#C4EF18" />}
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => { }}
          />
          <MenuItem
            icon={<ShieldCheck size={18} color="#C4EF18" />}
            title="Privacy & Security"
            subtitle="Change password and security settings"
            onPress={() => { }}
          />
          <MenuItem
            icon={<Question size={18} color="#C4EF18" />}
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => { }}
          />
        </View>

        <View className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#27272A] mt-4 mb-6">
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
          <View className="bg-[#1C1C1E] border border-[#27272A] w-full max-w-[340px] rounded-3xl p-6 items-center shadow-2xl">
            <View className="w-12 h-12 rounded-full bg-[#2A1515] items-center justify-center mb-4">
              <SignOut size={24} color="#EF4444" weight="regular" />
            </View>
            <Text className="text-white text-[17px] font-semibold mb-2">Sign Out</Text>
            <Text className="text-[#A1A1AA] text-[13px] text-center mb-6 px-4">
              Are you sure you want to sign out of your account? You will need to login again to access your account.
            </Text>
            <View className="flex-row w-full gap-3">
              {/* @ts-ignore */}
              <Pressable className="flex-1 py-3.5 rounded-xl bg-[#18181B] items-center justify-center active:opacity-70"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-white font-semibold text-[13px]">Cancel</Text>
              </Pressable>
              {/* @ts-ignore */}
              <Pressable className="flex-1 py-3.5 rounded-xl bg-[#EF4444] items-center justify-center active:opacity-80"
                onPress={handleSignOut}
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
