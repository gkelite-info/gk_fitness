import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Keyboard, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';
import { useGym } from '@/hooks/gyms/useGym';
import { useUpdateGymDetails, useUpdateGymLogo } from '@/hooks/gyms/useUpdateGym';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import * as ImagePicker from 'expo-image-picker';
import {
  CaretLeft, CaretRight, Info, Camera,
  MapPin, Phone, Envelope,
  Buildings, Barbell
} from 'phosphor-react-native';

export default function GymEditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId } = useUser();
  const { data: gym, isLoading } = useGym(gymId ?? null);
  
  const [form, setForm] = useState({
    gymName: '',
    gymEmail: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    website: ''
  });
  
  const updateDetailsMutation = useUpdateGymDetails();
  const updateLogoMutation = useUpdateGymLogo();
  
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);

  useEffect(() => {
    if (gym) {
      setForm({
        gymName: gym.gymName || '',
        gymEmail: gym.gymEmail || '',
        phone: gym.phone || '',
        address: gym.address || '',
        city: gym.city || '',
        state: gym.state || '',
        pinCode: gym.pinCode || '',
        website: gym.website || ''
      });
    }
  }, [gym]);

  const handleSave = () => {
    if (!gymId) return;
    if (!form.gymName.trim()) {
      toast.error('Gym Name is required.');
      return;
    }
    
    if (form.phone) {
      const cleanPhone = form.phone.replace(/[^\d+]/g, '');
      const numberPart = cleanPhone.startsWith('+91') ? cleanPhone.slice(3) : cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;
      
      if (numberPart.length > 0 && numberPart.length !== 10) {
        toast.error('Phone number must be exactly 10 digits.');
        return;
      }
    }

    updateDetailsMutation.mutate(
      { 
        ...gym,
        gymId, 
        ...form, 
        createdBy: gym?.createdBy || '' 
      } as any,
      {
        onSuccess: () => {
          toast.success('Gym profile updated successfully!');
          router.navigate('/(owner)/profile' as any);
        },
        onError: (err) => {
          console.error('[EditProfile] Error saving:', err);
          toast.error('Failed to save changes.');
        }
      }
    );
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
        Alert.alert('Permission Required', 'We need permission to access your camera or gallery to update the gym logo.');
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

      setPhotoOptionsVisible(false);

      if (!result.canceled && result.assets && result.assets.length > 0 && gymId) {
        updateLogoMutation.mutate(
          { gymId, imageUri: result.assets[0].uri },
          {
            onSuccess: () => toast.success('Gym logo updated!'),
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0F0F0F] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  const InputField = ({ icon, label, value, onChangeText, editable = true, keyboardType = 'default' }: any) => (
    <View className="mb-4">
      <Text className="text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider mb-2 ml-1">{label}</Text>
      <View className={`flex-row items-center bg-[#1A1A1A] rounded-2xl px-4 h-14 border ${!editable ? 'border-[#1A1A1A] opacity-60' : 'border-[#27272A]'}`}>
        <View className="w-8 items-center justify-center mr-2">
          {icon}
        </View>
        <TextInput
          className="flex-1 text-white text-[15px]"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          placeholderTextColor="#71717A"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={() => router.navigate('/(owner)/profile' as any)} className="p-2">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-bold">Gym Profile</Text>
        <Pressable className="p-2">
          <Info size={24} color="#D4FF00" weight="regular" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View className="items-center mt-6 mb-8">
          <Pressable onPress={() => setPhotoOptionsVisible(true)} className="relative active:opacity-80">
            <View className="w-28 h-28 rounded-full border-[3px] border-[#C4EF00] bg-[#1A1A1A] items-center justify-center overflow-hidden">
              {updateLogoMutation.isPending ? (
                <ActivityIndicator size="small" color="#C4EF00" />
              ) : gym?.logo ? (
                <Image source={{ uri: gym.logo }} className="w-full h-full" />
              ) : (
                <Barbell size={48} color="#C4EF00" weight="fill" />
              )}
            </View>
            <View className="absolute bottom-0 right-0 w-8 h-8 bg-[#C4EF00] rounded-full items-center justify-center border-2 border-[#0F0F0F]">
              <Camera size={16} color="#000000" weight="bold" />
            </View>
          </Pressable>
          <Text className="text-white text-[16px] font-bold mt-4">{gym?.gymName || 'Update Logo'}</Text>
          <Text className="text-[#A1A1AA] text-sm mt-1">{gym?.city ? `${gym.city}, ${gym.state}` : 'Add location'}</Text>
        </View>

        {/* Form Fields */}
        <View className="px-5">
          <InputField 
            icon={<Buildings size={20} color="#71717A" weight="fill" />}
            label="Gym Name" 
            value={form.gymName} 
            onChangeText={(t: string) => setForm(prev => ({ ...prev, gymName: t }))} 
          />
          <InputField 
            icon={<Envelope size={20} color="#71717A" weight="fill" />}
            label="Email Address" 
            value={form.gymEmail} 
            onChangeText={(t: string) => setForm(prev => ({ ...prev, gymEmail: t }))} 
            keyboardType="email-address"
            editable={false}
          />
          <InputField 
            icon={<Phone size={20} color="#71717A" weight="fill" />}
            label="Phone Number" 
            value={form.phone} 
            onChangeText={(t: string) => setForm(prev => ({ ...prev, phone: t }))} 
            keyboardType="phone-pad"
          />
          
          <View className="mt-4 mb-2">
            <Text className="text-white text-lg font-bold mb-4">Location Details</Text>
          </View>

          <InputField 
            icon={<MapPin size={20} color="#71717A" weight="fill" />}
            label="Address" 
            value={form.address} 
            onChangeText={(t: string) => setForm(prev => ({ ...prev, address: t }))} 
          />

          <View className="flex-row justify-between">
            <View className="flex-1 mr-2">
              <InputField 
                icon={null}
                label="City" 
                value={form.city} 
                onChangeText={(t: string) => setForm(prev => ({ ...prev, city: t }))} 
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField 
                icon={null}
                label="State" 
                value={form.state} 
                onChangeText={(t: string) => setForm(prev => ({ ...prev, state: t }))} 
              />
            </View>
          </View>
          
          <InputField 
            icon={null}
            label="PIN Code" 
            value={form.pinCode} 
            onChangeText={(t: string) => setForm(prev => ({ ...prev, pinCode: t }))} 
            keyboardType="number-pad"
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0F0F0F] border-t border-[#1A1A1A]" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
        <Pressable 
          className="bg-[#C4EF00] h-14 rounded-full items-center justify-center flex-row shadow-sm active:opacity-80"
          onPress={handleSave}
          disabled={updateDetailsMutation.isPending}
        >
          {updateDetailsMutation.isPending ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text className="text-black text-[16px] font-bold tracking-wide">Save Changes</Text>
          )}
        </Pressable>
      </View>

      {/* Photo Picker Bottom Sheet */}
      <ActionSheetModal 
        visible={photoOptionsVisible} 
        onClose={() => setPhotoOptionsVisible(false)}
        title="Update Gym Logo"
        options={[
          {
            label: "Take a photo",
            onPress: () => handlePickImage(true)
          },
          {
            label: "Choose from gallery",
            onPress: () => handlePickImage(false)
          }
        ]}
      />

    </View>
  );
}
