import React, { useState, useEffect } from 'react';
import { View, Pressable, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, CheckCircle, XCircle } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import * as ImagePicker from 'expo-image-picker';
import { useUpdateProfilePhoto } from '@/hooks/auth/useUpdateCustomerProfile';
import { useCommunityProfile, useUpdateProfile, useCheckUsername } from '@/hooks/community/useProfile';
import { useDebounce } from '@/hooks/useDebounce';

export default function EditCommunityProfileScreen() {
  const { userId } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { data: profileData, isLoading: loadingProfile } = useCommunityProfile(userId ?? '');
  const updateMutation = useUpdateProfile();
  const updatePhotoMutation = useUpdateProfilePhoto();
  
  const [form, setForm] = useState({
    username: '',
    bio: '',
    website: ''
  });

  const debouncedUsername = useDebounce(form.username, 500);
  const { data: isUsernameAvailable, isLoading: checkingUsername } = useCheckUsername(debouncedUsername, userId ?? undefined);

  useEffect(() => {
    if (profileData) {
      setForm({
        username: profileData.username || '',
        bio: profileData.bio || '',
        website: profileData.website || ''
      });
    }
  }, [profileData]);

  const handleSave = () => {
    if (!userId) return;
    
    // Validate username
    const usernameRegex = /^[a-z0-9._]{3,30}$/;
    if (!usernameRegex.test(form.username)) {
      Alert.alert('Invalid Username', 'Username must be 3-30 characters, lowercase letters, numbers, dots, or underscores only.');
      return;
    }

    if (debouncedUsername === form.username && isUsernameAvailable === false && form.username !== profileData?.username) {
      Alert.alert('Username taken', 'Please choose a different username.');
      return;
    }

    updateMutation.mutate(
      { userId, ...form },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err) => {
          console.error('Error updating profile:', err);
          Alert.alert('Error', 'Failed to update profile.');
        }
      }
    );
  };

  const handleChangePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'We need permission to access your gallery to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].uri && userId) {
        updatePhotoMutation.mutate({
          userId,
          imageUri: result.assets[0].uri
        }, {
          onError: (err) => {
            console.error('Error updating photo:', err);
            Alert.alert('Error', 'Failed to update photo.');
          }
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  if (loadingProfile) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  const isUsernameTaken = isUsernameAvailable === false && form.username !== profileData?.username;

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-2 border-b border-[#1C1C1E]" style={{ paddingTop: insets.top || 20 }}>
        <Pressable onPress={() => router.back()} className="w-16 h-10 items-start justify-center">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-lg font-bold text-white">Edit Profile</Text>
        <Pressable 
          onPress={handleSave} 
          disabled={updateMutation.isPending || isUsernameTaken || checkingUsername}
          className="w-16 h-10 items-end justify-center"
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#3fbe73" />
          ) : (
            <Text className={`text-[16px] font-bold ${isUsernameTaken ? 'text-white/30' : 'text-[#3fbe73]'}`}>Done</Text>
          )}
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 py-6" keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <View className="items-center mb-8">
          <StaticAvatar 
            uri={profileData?.users?.profilePhoto} 
            name={profileData?.users?.name || 'User'} 
            size={96} 
            className="w-24 h-24 rounded-full border border-[#333]" 
          />
          <Pressable onPress={handleChangePhoto} disabled={updatePhotoMutation.isPending} className="mt-4">
            {updatePhotoMutation.isPending ? (
              <ActivityIndicator size="small" color="#3fbe73" />
            ) : (
              <Text className="text-[#3fbe73] font-semibold text-base">Change Profile Photo</Text>
            )}
          </Pressable>
        </View>

        {/* Username */}
        <View className="mb-6">
          <Text className="text-white/60 text-sm mb-2">Username</Text>
          <View className="flex-row items-center border-b border-[#1C1C1E] pb-2">
            <Text className="text-white/60 text-base mr-1">@</Text>
            <TextInput
              value={form.username}
              onChangeText={(text) => setForm({ ...form, username: text.toLowerCase() })}
              placeholder="username"
              placeholderTextColor="#666"
              className="flex-1 text-white text-base"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {form.username.length >= 3 && form.username !== profileData?.username && (
              <View className="ml-2">
                {checkingUsername ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : isUsernameTaken ? (
                  <XCircle size={20} color="#EF4444" weight="fill" />
                ) : (
                  <CheckCircle size={20} color="#3fbe73" weight="fill" />
                )}
              </View>
            )}
          </View>
        </View>

        {/* Bio */}
        <View className="mb-6">
          <Text className="text-white/60 text-sm mb-2">Bio</Text>
          <TextInput
            value={form.bio}
            onChangeText={(text) => setForm({ ...form, bio: text })}
            placeholder="Write something about yourself..."
            placeholderTextColor="#666"
            className="text-white text-base border-b border-[#1C1C1E] pb-2"
            multiline
            maxLength={150}
          />
          <Text className="text-white/40 text-xs mt-1 text-right">{form.bio.length}/150</Text>
        </View>

        {/* Website */}
        <View className="mb-6">
          <Text className="text-white/60 text-sm mb-2">Links</Text>
          <TextInput
            value={form.website}
            onChangeText={(text) => setForm({ ...form, website: text })}
            placeholder="Website URL"
            placeholderTextColor="#666"
            className="text-white text-base border-b border-[#1C1C1E] pb-2"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      </ScrollView>
    </View>
  );
}
