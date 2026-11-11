import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Modal, Keyboard, Alert, BackHandler } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useUserById } from '@/hooks/users';
import { useUpdateGymCustomer } from '@/hooks/customers/useGymCustomers';
import { useUpdateCustomerProfile, useUpdateProfilePhoto, useDeleteProfilePhoto } from '@/hooks/auth/useUpdateCustomerProfile';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/Skeleton';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { DatePickerModal } from '@/components/DatePickerModal';
import { formatToDDMMYYYY, ddmmyyyyToPgDate } from '@/helpers/customers/customerHelper';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import * as ImagePicker from 'expo-image-picker';
import {
  CaretLeft, Info, Camera, CaretRight, PencilSimple,
  User, Envelope, Phone, Heart, CalendarBlank,
  Ruler, Scales, Target, ChartBar, WarningCircle,
  LockIcon
} from 'phosphor-react-native';

import { mockProfileData } from '@/constants/mockProfileData';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' }
];

const FITNESS_GOAL_OPTIONS = [
  { label: 'Lose Weight', value: 'loseweight' },
  { label: 'Build Muscle', value: 'buildmuscle' },
  { label: 'Stay Fit', value: 'stayfit' },
  { label: 'Gain Weight', value: 'gainweight' },
  { label: 'Improve Endurance', value: 'imporoveendurance' }
];

const ACTIVITY_LEVEL_OPTIONS = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Lightly Active', value: 'lightly_active' },
  { label: 'Moderately Active', value: 'moderately_active' },
  { label: 'Very Active', value: 'very_active' },
  { label: 'Super Active', value: 'super_active' }
];

const getLabel = (value: string, options: any[]) => {
  if (!value || value === '-') return '-';
  const cleanVal = value.toLowerCase().replace(/[\s_-]/g, '');
  const match = options.find(o => o.value.toLowerCase().replace(/[\s_-]/g, '') === cleanVal);
  return match ? match.label : value;
};

export default function EditProfileScreen() {
  const userContext = useUser();
  const userId = userContext.userId || (userContext as any).id;
  const { data: userRecord, isLoading: isUserLoading, refetch: refetchUser } = useUserById(userId);
  const { data, isLoading } = useCustomerProfile(userId);

  return <EditProfileView
    data={mockProfileData}
    userRecord={userRecord}
    customerData={data?.customerData}
    onboardingData={data?.onboardingData}
    loading={isLoading || isUserLoading}
    fallbackUser={userContext}
    userId={userId}
    refetchUser={refetchUser}
  />;
}

function EditProfileView({
  data,
  userRecord,
  customerData,
  onboardingData,
  loading,
  fallbackUser,
  userId,
  refetchUser,
}: {
  data: typeof mockProfileData,
  userRecord?: any,
  customerData: any,
  onboardingData: any,
  loading: boolean,
  fallbackUser: any,
  userId: string | null,
  refetchUser?: () => Promise<any>,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    height: '',
    weight: '',
    fitnessGoal: '',
    activityLevel: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const updateMutation = useUpdateCustomerProfile();
  const updateGymCustomerMutation = useUpdateGymCustomer();
  const updatePhotoMutation = useUpdateProfilePhoto();
  const deletePhotoMutation = useDeleteProfilePhoto();
  const queryClient = useQueryClient();
  const { refreshUserContext } = useUser();

  const currentPhoto = userRecord?.profilePhoto || fallbackUser?.profilePhoto || fallbackUser?.profilePic || customerData?.profilePhoto || customerData?.profilePic;
  const hasProfilePhoto = Boolean(
    currentPhoto &&
    typeof currentPhoto === 'string' &&
    currentPhoto.trim() !== '' &&
    currentPhoto !== 'null' &&
    currentPhoto !== 'undefined' &&
    !currentPhoto.includes('pravatar.cc')
  );

  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectorState, setSelectorState] = useState<{ visible: boolean, type: keyof typeof form | '', title: string, options: any[] }>({
    visible: false,
    type: '',
    title: '',
    options: []
  });

  const isInitializedRef = React.useRef(false);
  const updateMutationRef = React.useRef(updateMutation);
  updateMutationRef.current = updateMutation;
  const updateGymCustomerMutationRef = React.useRef(updateGymCustomerMutation);
  updateGymCustomerMutationRef.current = updateGymCustomerMutation;

  useFocusEffect(
    useCallback(() => {
      setIsSaving(false);
      updateMutationRef.current?.reset();
      updateGymCustomerMutationRef.current?.reset();
    }, [])
  );

  useEffect(() => {
    const onBackPress = () => {
      router.navigate('/(customer)/profile');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  React.useEffect(() => {
    if (loading) return;

    if (!isInitializedRef.current && (userRecord || customerData || fallbackUser)) {
      const preferredName = userRecord?.name || customerData?.fullName || fallbackUser?.name || '';
      const preferredPhone = userRecord?.phone || customerData?.phone || fallbackUser?.phone || '';
      const preferredDob = userRecord?.dob || customerData?.dateOfBirth || fallbackUser?.dob;
      const preferredGender = userRecord?.gender || customerData?.gender || fallbackUser?.gender || '';

      setForm((prev) => ({
        fullName: prev.fullName || preferredName,
        email: prev.email || userRecord?.email || customerData?.email || fallbackUser?.email || '',
        phone: prev.phone || preferredPhone,
        gender: prev.gender || preferredGender,
        dateOfBirth: prev.dateOfBirth || formatToDDMMYYYY(preferredDob),
        height: prev.height || (onboardingData?.height && onboardingData.height !== '-' ? onboardingData.height.toString() : ''),
        weight: prev.weight || (onboardingData?.weight && onboardingData.weight !== '-' ? onboardingData.weight.toString() : ''),
        fitnessGoal: prev.fitnessGoal || (onboardingData?.primaryGoal && onboardingData.primaryGoal !== '-' ? onboardingData.primaryGoal.toString() : ''),
        activityLevel: prev.activityLevel || (onboardingData?.activityLevel && onboardingData.activityLevel !== '-' ? onboardingData.activityLevel.toString() : ''),
      }));

      isInitializedRef.current = true;
    }
  }, [loading, userRecord, customerData, onboardingData, fallbackUser]);

  // Synchronize onboarding physical fields whenever onboardingData arrives or updates
  React.useEffect(() => {
    if (!onboardingData) return;
    setForm((prev) => {
      let changed = false;
      const next = { ...prev };
      if ((!next.height || next.height === '-') && onboardingData.height && onboardingData.height !== '-') {
        next.height = onboardingData.height.toString();
        changed = true;
      }
      if ((!next.weight || next.weight === '-') && onboardingData.weight && onboardingData.weight !== '-') {
        next.weight = onboardingData.weight.toString();
        changed = true;
      }
      if ((!next.fitnessGoal || next.fitnessGoal === '-') && onboardingData.primaryGoal && onboardingData.primaryGoal !== '-') {
        next.fitnessGoal = onboardingData.primaryGoal.toString();
        changed = true;
      }
      if ((!next.activityLevel || next.activityLevel === '-') && onboardingData.activityLevel && onboardingData.activityLevel !== '-') {
        next.activityLevel = onboardingData.activityLevel.toString();
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [onboardingData]);

  const handleSave = async () => {
    if (!userId) return;
    if (isSaving) return;

    if (!form.fullName || !form.fullName.trim()) {
      toast.error('Full name is required.');
      return;
    }

    if (form.phone) {
      const cleanPhone = form.phone.replace(/[^\d+]/g, '');
      const numberPart = cleanPhone.startsWith('+91') ? cleanPhone.slice(3) : cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;

      if (numberPart.length !== 10) {
        toast.error('Phone number must be exactly 10 digits.');
        return;
      }
    }

    setIsSaving(true);

    const currentRole = userRecord?.role || fallbackUser?.role || 'customer';
    const normalizedRole = currentRole.trim().toLowerCase().replace(/[\s_-]/g, '');
    const isIndividual = normalizedRole === 'individual';
    const targetCustomerId = customerData?.customerId || fallbackUser?.customerId || userId;

    try {
      // 1. Update public.users, gym_customers (if customer), customer_onboarding, customer_measurements, customer_goal_preferences
      await updateMutation.mutateAsync({
        userId,
        customerId: targetCustomerId,
        form,
        role: currentRole,
      });

      // 2. Extra guarantee: if logged in as customer, also invoke updateGymCustomer directly to ensure double confirmation
      if (!isIndividual) {
        try {
          await updateGymCustomerMutation.mutateAsync({
            userId,
            customerId: targetCustomerId,
            email: form.email || userRecord?.email || fallbackUser?.email,
            phone: form.phone,
            fullName: form.fullName.trim(),
            gender: form.gender,
            dateOfBirth: form.dateOfBirth,
          });
        } catch (extraErr) {
          console.warn('[EditProfile] updateGymCustomerMutation extra confirmation notice:', extraErr);
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'id', userId] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['customerProfile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['customer', userId] }),
        targetCustomerId ? queryClient.invalidateQueries({ queryKey: ['customer', targetCustomerId] }) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customersPaginated'] }),
        queryClient.invalidateQueries({ queryKey: ['customerOnboarding', userId] }),
        queryClient.invalidateQueries({ queryKey: ['customerGoalPreference', userId] }),
        queryClient.invalidateQueries({ queryKey: ['customerMeasurements', userId] }),
        queryClient.invalidateQueries({ queryKey: ['progressHistory', userId] }),
        queryClient.invalidateQueries({ queryKey: ['latestMeasurement', userId] }),
      ]);

      if (typeof refreshUserContext === 'function') {
        await refreshUserContext();
      }
      if (typeof refetchUser === 'function') {
        await refetchUser();
      }

      toast.success('Profile updated successfully!');
      setIsSaving(false);
      isInitializedRef.current = false;
      router.navigate('/(customer)/profile');
    } catch (err: any) {
      console.error('[EditProfile] Error saving:', err);
      toast.error(err?.message || 'Failed to save changes.');
      setIsSaving(false);
    }
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'We need permission to access your camera or gallery to update your profile picture.');
        setPhotoOptionsVisible(false);
        return;
      }

      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      if (useCamera) {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      setPhotoOptionsVisible(false); // Close AFTER picking

      if (!result.canceled && result.assets && result.assets.length > 0 && userId) {
        updatePhotoMutation.mutate(
          { userId, imageUri: result.assets[0].uri },
          {
            onSuccess: async () => {
              toast.success('Profile picture updated!');
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['user', 'id', userId] }),
                queryClient.invalidateQueries({ queryKey: ['users'] }),
                queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }),
                queryClient.invalidateQueries({ queryKey: ['customerProfile', userId] }),
              ]);
              if (typeof refreshUserContext === 'function') {
                await refreshUserContext();
              }
              if (typeof refetchUser === 'function') {
                await refetchUser();
              }
            },
            onError: (err: any) => Alert.alert('Upload Failed', err.message)
          }
        );
      }
    } catch (error: any) {
      setPhotoOptionsVisible(false);
      console.error("ImagePicker Error:", error);
      Alert.alert('Error', error.message || 'An unexpected error occurred while opening the image picker.');
    }
  };

  const handleDeletePhoto = async () => {
    if (!userId) return;
    try {
      await deletePhotoMutation.mutateAsync({
        userId,
        fileName: userRecord?.profilePhoto || fallbackUser?.profilePic || fallbackUser?.profilePhoto || customerData?.profilePic || customerData?.profilePhoto,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'id', userId] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['customerProfile', userId] }),
      ]);
      if (typeof refreshUserContext === 'function') {
        await refreshUserContext();
      }
      if (typeof refetchUser === 'function') {
        await refetchUser();
      }
      toast.success('Profile picture removed!');
    } catch (err: any) {
      console.error('[EditProfile] Error deleting photo:', err);
      toast.error('Failed to remove profile picture.');
    }
  };

  const openSelector = (type: keyof typeof form, title: string, options: any[]) => {
    Keyboard.dismiss();
    setSelectorState({ visible: true, type, title, options });
  };

  const handleSelect = (value: string) => {
    if (selectorState.type) {
      setForm(prev => ({ ...prev, [selectorState.type as keyof typeof form]: value }));
    }
  };

  const getFeetInches = (cm: string) => {
    const num = parseInt(cm.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return '';
    const totalInches = num / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}' ${inches}"`;
  };

  const getLbs = (kg: string) => {
    const num = parseInt(kg.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return '';
    const lbs = Math.round(num * 2.20462);
    return `${lbs} lbs`;
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={() => router.navigate('/(customer)/profile')} className="p-2">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-semibold">Personal Information</Text>
        <Pressable className="p-2">
          <Info size={24} color="#D4FF00" weight="regular" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

        {loading ? (
          <View className="items-center mt-6 mb-6">
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="w-40 h-8 mt-4" />
            <Skeleton className="w-48 h-4 mt-2" />
          </View>
        ) : (
          <View className="items-center mt-4 mb-6">
            <Pressable
              className="relative active:opacity-70"
              onPress={() => setPhotoOptionsVisible(true)}
              disabled={updatePhotoMutation.isPending || deletePhotoMutation.isPending}
            >
              {
                updatePhotoMutation.isPending || deletePhotoMutation.isPending ? (
                  <View className="w-24 h-24 rounded-full bg-[#27272A] items-center justify-center border-2 border-[#1F1F22]">
                    <ActivityIndicator color="#C4EF00" />
                  </View>
                ) : (
                  <StaticAvatar
                    uri={currentPhoto}
                    userId={userId}
                    name={form.fullName}
                    size={96}
                    className="w-24 h-24 rounded-full border-2 border-[#1F1F22]"
                  />
                )
              }
              < View className="absolute bottom-0 right-0 bg-[#C4EF00] p-1.5 rounded-full border-2 border-[#0A0A0A]">
                <PencilSimple size={14} color="#0A0A0A" weight="bold" />
              </View>
            </Pressable>
            <Text className="text-white text-xl font-semibold mt-4">{form.fullName}</Text>
            <Text className="text-[#A1A1AA] text-[15px] mt-1">{form.email}</Text>
          </View>
        )
        }

        <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-[1px] mb-3 mt-2 ml-1">PERSONAL DETAILS</Text>

        <InputField icon={<User size={20} color="#D4FF00" />} label="FULL NAME" value={form.fullName} onChangeText={(val: string) => setForm(prev => ({ ...prev, fullName: val }))} />
        <InputField icon={<Envelope size={20} color="#D4FF00" />} label="EMAIL ADDRESS" value={form.email} editable={false} />
        <InputField
          icon={<Phone size={20} color="#D4FF00" />}
          label="PHONE NUMBER"
          value={form.phone}
          keyboardType="phone-pad"
          onChangeText={(val: string) => {
            let clean = val.replace(/[^\d+]/g, '');
            if (clean.includes('+')) {
              clean = (clean.startsWith('+') ? '+' : '') + clean.replace(/\+/g, '');
            }

            let prefix = '';
            let number = clean;

            if (clean.startsWith('+91')) {
              prefix = '+91';
              number = clean.slice(3);
            } else if (clean.startsWith('+')) {
              prefix = '+';
              number = clean.slice(1);
            }

            if (number.length > 10) {
              number = number.slice(0, 10);
            }

            setForm(prev => ({ ...prev, phone: prefix + (prefix && prefix !== '+' ? ' ' : '') + number }));
          }}
        />

        <InputField
          icon={<Heart size={20} color="#D4FF00" />}
          label="GENDER"
          value={form.gender ? getLabel(form.gender, GENDER_OPTIONS) : '-'}
          editable={false}
        />

        <InputField
          icon={<CalendarBlank size={20} color="#D4FF00" />}
          label="DATE OF BIRTH"
          value={form.dateOfBirth ? form.dateOfBirth : 'DD-MM-YYYY'}
          onPress={() => {
            Keyboard.dismiss();
            setShowDatePicker(true);
          }}
        />

        <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-[1px] mt-6 mb-3 ml-1">PHYSICAL INFORMATION</Text>

        <View className="flex-row gap-x-3">
          <View className="flex-1">
            <InputField
              icon={<Ruler size={20} color="#D4FF00" />}
              label="HEIGHT"
              value={form.height ? form.height.toString() : '-'}
              onChangeText={(val: string) => setForm(prev => ({ ...prev, height: val }))}
              suffix="cm"
            />
            {form.height && form.height !== '-' ? (
              <Text className="text-[#8E8E93] text-[10px] font-medium mt-1 ml-1 text-center">~ {getFeetInches(form.height.toString())}</Text>
            ) : null}
          </View>
          <View className="flex-1">
            <InputField
              icon={<Scales size={20} color="#D4FF00" />}
              label="WEIGHT"
              value={form.weight ? form.weight.toString() : '-'}
              onChangeText={(val: string) => setForm(prev => ({ ...prev, weight: val }))}
              suffix="kg"
            />
            {form.weight && form.weight !== '-' ? (
              <Text className="text-[#8E8E93] text-[10px] font-medium mt-1 ml-1 text-center">~ {getLbs(form.weight.toString())}</Text>
            ) : null}
          </View>
        </View>

        <View className="flex-row gap-x-3 mt-4">
          <View className="flex-1">
            <InputField
              icon={<Target size={20} color="#D4FF00" />}
              label="FITNESS GOAL"
              value={getLabel(form.fitnessGoal, FITNESS_GOAL_OPTIONS)}
              onPress={() => openSelector('fitnessGoal', 'Select Fitness Goal', FITNESS_GOAL_OPTIONS)}
            />
          </View>
          <View className="flex-1">
            <InputField
              icon={<ChartBar size={20} color="#D4FF00" />}
              label="ACTIVITY LEVEL"
              value={getLabel(form.activityLevel, ACTIVITY_LEVEL_OPTIONS)}
              onPress={() => openSelector('activityLevel', 'Select Activity Level', ACTIVITY_LEVEL_OPTIONS)}
            />
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving || updateMutation.isPending || updateGymCustomerMutation.isPending}
          className="bg-[#D4FF00] rounded-xl py-4 items-center justify-center mt-8 active:opacity-80"
        >
          {isSaving || updateMutation.isPending || updateGymCustomerMutation.isPending ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text className="text-black text-base font-semibold">Save Changes</Text>
          )}
        </Pressable>
        <Pressable className="border border-[#27272A] bg-transparent rounded-xl py-4 items-center justify-center mt-3 active:opacity-50" onPress={() => router.navigate('/(customer)/profile')}>
          <Text className="text-[#D4FF00] text-base font-semibold">Cancel</Text>
        </Pressable>
      </ScrollView >

      <BottomSelector
        visible={selectorState.visible}
        onClose={() => setSelectorState(prev => ({ ...prev, visible: false }))}
        title={selectorState.title}
        options={selectorState.options}
        selectedValue={selectorState.type ? form[selectorState.type as keyof typeof form] : ''}
        onSelect={handleSelect}
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

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        title="Select Date of Birth"
        maxYear={new Date().getFullYear()}
        minYear={1930}
        initialDate={form.dateOfBirth ? (ddmmyyyyToPgDate(form.dateOfBirth) || '1998-01-01') : '1998-01-01'}
        onSelectDate={(dateString: string) => {
          setForm(prev => ({ ...prev, dateOfBirth: formatToDDMMYYYY(dateString) }));
        }}
      />
    </View >
  );
}

function InputField({ icon, label, value, onChangeText, editable = true, onPress, suffix, keyboardType, maxLength }: any) {
  const Component = onPress ? Pressable : View;
  const isDash = !value || value === '-';
  return (
    <Component
      onPress={onPress}
      className={`bg-[#1A1A1A] rounded-2xl p-4 flex-row items-center mb-2 border border-[#27272A] ${onPress ? 'active:opacity-70' : ''}`}
    >
      <View className="mr-4">
        {icon}
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-[#8E8E93] text-[8px] uppercase tracking-wider font-semibold mb-1">{label}</Text>
        {onPress ? (
          <Text className="text-white text-[15px] font-medium p-0" numberOfLines={1}>{value || '-'}</Text>
        ) : (
          <TextInput
            value={isDash ? '' : value}
            placeholder={isDash ? '-' : ''}
            onChangeText={onChangeText}
            editable={editable}
            className="text-white text-[15px] font-medium p-0"
            placeholderTextColor="#8E8E93"
            keyboardType={keyboardType || (suffix ? 'numeric' : 'default')}
            maxLength={maxLength}
          />
        )}
      </View>
      {!editable && !onPress && (
        <View className="bg-[#27272A] px-2 py-1 rounded">
          <Text className="text-[10px] font-semibold"><LockIcon size={20} weight="fill" color='#DCDCDC' /></Text>
        </View>
      )}
      {suffix && !isDash && (
        <Text className="text-[#8E8E93] text-sm ml-2 font-semibold">{suffix}</Text>
      )}
      {onPress && (
        <CaretRight size={16} color="#8E8E93" />
      )}
    </Component>
  );
}

function BottomSelector({ visible, onClose, options, selectedValue, onSelect, title }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable className="bg-[#1A1A1A] rounded-t-3xl min-h-[40%] max-h-[80%] border-t border-[#27272A]">
          <View className="items-center py-3 border-b border-[#27272A]">
            <View className="w-12 h-1 bg-[#27272A] rounded-full mb-3" />
            <Text className="text-white text-lg font-semibold">{title}</Text>
          </View>
          <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
            {options.map((option: any, index: number) => {
              const isSelected = selectedValue === option.value;
              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect(option.value);
                    onClose();
                  }}
                  className={`py-4 px-4 rounded-2xl mb-2 flex-row justify-between items-center ${isSelected ? 'bg-[#D4FF00]/10 border border-[#D4FF00]/20' : 'bg-[#27272A]'}`}
                >
                  <Text className={`text-base font-semibold ${isSelected ? 'text-[#D4FF00]' : 'text-white'}`}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <View className="w-3 h-3 rounded-full bg-[#D4FF00]" />
                  )}
                </Pressable>
              );
            })}
            <View className="h-10" />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
