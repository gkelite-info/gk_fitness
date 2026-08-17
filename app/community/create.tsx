import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Image as RNImage, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, Image as ImageIcon, Lightbulb, X } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@/context/UserContext';
import { useCreatePost } from '@/hooks/community/useCommunityFeed';

export default function CreatePostScreen() {
  const router = useRouter();
  const { gymId, userId } = useUser();
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const createPostMutation = useCreatePost();

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    if (!caption.trim() && !imageUri) {
      Alert.alert('Cannot post empty content.');
      return;
    }
    
    if (!gymId || !userId) {
      Alert.alert('User session not fully loaded.');
      return;
    }

    createPostMutation.mutate(
      { gymId, userId, caption: caption.trim(), imageUri: imageUri || undefined },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (error) => {
          Alert.alert('Error creating post', error.message);
        }
      }
    );
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pt-4">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 rounded-full bg-[#18181B] items-center justify-center active:opacity-70"
          disabled={createPostMutation.isPending}
        >
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide flex-1 text-center">Create Post</Text>
        <Pressable 
          className="bg-[#C4EF00] px-5 py-2 rounded-full active:opacity-80 justify-center items-center"
          onPress={handlePost}
          disabled={createPostMutation.isPending}
        >
          {createPostMutation.isPending ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text className="text-[#000000] font-bold text-[15px]">Post</Text>
          )}
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <Text className="text-[#A1A1AA] text-sm mb-5">
          Share your progress and inspire the community.
        </Text>

        {/* Caption Input */}
        <View className="bg-[#121214] border border-[#1F1F22] rounded-2xl p-4 mb-6">
          <TextInput
            placeholder="Write a caption..."
            placeholderTextColor="#71717A"
            className="text-white text-[15px] min-h-[100px]"
            multiline
            textAlignVertical="top"
            value={caption}
            onChangeText={setCaption}
            maxLength={500}
            selectionColor="#C4EF00"
            editable={!createPostMutation.isPending}
          />
          <Text className="text-[#71717A] text-[11px] text-right mt-2 font-medium">
            {caption.length}/500
          </Text>
        </View>

        <Text className="text-white font-bold text-base mb-3">Add Photo</Text>
        
        {/* Upload Box */}
        {imageUri ? (
          <View className="relative mb-6">
            <RNImage source={{ uri: imageUri }} className="w-full h-64 rounded-2xl bg-[#121214]" resizeMode="cover" />
            <Pressable 
              className="absolute top-3 right-3 bg-[#0A0A0A] bg-opacity-70 p-2 rounded-full"
              onPress={() => setImageUri(null)}
              disabled={createPostMutation.isPending}
            >
              <X size={16} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>
        ) : (
          <Pressable 
            className="bg-[#121214] border border-dashed border-[#27272A] rounded-2xl p-10 items-center justify-center mb-6 active:opacity-70"
            onPress={handlePickImage}
            disabled={createPostMutation.isPending}
          >
            <ImageIcon size={40} color="#C4EF00" weight="regular" style={{ marginBottom: 16 }} />
            <Text className="text-white font-semibold text-[15px] mb-1">Tap to upload photo</Text>
            <Text className="text-[#71717A] text-[13px]">Supported formats: JPG, PNG</Text>
          </Pressable>
        )}

        {/* Tips Box */}
        <View className="bg-[#121214] border border-[#1F1F22] rounded-2xl p-4 flex-row mb-8">
          <Lightbulb size={20} color="#C4EF00" weight="regular" style={{ marginTop: 2 }} />
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-[15px] mb-1">Community Guidelines</Text>
            <Text className="text-[#A1A1AA] text-[13px] leading-5">
              Keep it positive. By posting, you agree to our EULA and community rules. Any objectionable content or abusive behavior will result in a ban.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
