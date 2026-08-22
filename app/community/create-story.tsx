import React, { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions, Image as RNImage } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, Check, Camera, Image as ImageIcon, VideoCamera } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useUser } from '@/context/UserContext';
import { useCreateStory } from '@/hooks/community/useStories';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, userId } = useUser();
  
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  
  const createStoryMutation = useCreateStory();

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission required', 'Allow access to your photo library to post a story.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  const handleLaunchCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission required', 'Allow access to your camera to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  const handlePostStory = () => {
    if (!mediaUri) {
      Alert.alert('Error', 'Please select or capture media first.');
      return;
    }
    
    if (!gymId || !userId) {
      Alert.alert('Error', 'User session not fully loaded.');
      return;
    }

    createStoryMutation.mutate(
      { gymId, createdBy: userId, mediaUri, caption: caption.trim() },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (error) => {
          Alert.alert('Failed to post story', error.message);
        }
      }
    );
  };

  if (!mediaUri) {
    return (
      <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="p-2 active:opacity-70">
            <CaretLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-lg font-bold ml-2">Add to Story</Text>
        </View>
        
        <View className="flex-1 items-center justify-center gap-8">
          <Pressable 
            className="items-center justify-center active:opacity-70"
            onPress={handleLaunchCamera}
          >
            <View className="w-20 h-20 rounded-full bg-[#1C1C1E] items-center justify-center mb-3 border border-[#2A2A2D]">
              <Camera size={32} color="#C4EF00" weight="fill" />
            </View>
            <Text className="text-white font-bold">Take Photo</Text>
          </Pressable>

          <Pressable 
            className="items-center justify-center active:opacity-70"
            onPress={handlePickImage}
          >
            <View className="w-20 h-20 rounded-full bg-[#1C1C1E] items-center justify-center mb-3 border border-[#2A2A2D]">
              <VideoCamera size={32} color="#C4EF00" weight="fill" />
            </View>
            <Text className="text-white font-bold">Upload from Gallery</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#000' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 bg-black">
        {/* Full Screen Media */}
        {mediaType === 'video' ? (
          <Video
            source={{ uri: mediaUri }}
            style={{ width, height, position: 'absolute' }}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
          />
        ) : (
          <RNImage 
            source={{ uri: mediaUri }} 
            style={{ width, height, position: 'absolute' }}
            resizeMode="cover"
          />
        )}

        {/* Top Overlay */}
        <View 
          className="absolute top-0 left-0 right-0 px-4 flex-row justify-between items-center bg-black/30"
          style={{ paddingTop: insets.top, paddingBottom: 10 }}
        >
          <Pressable onPress={() => { setMediaUri(null); setMediaType(null); }} className="p-2 bg-black/50 rounded-full active:opacity-70">
            <CaretLeft size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Bottom Overlay & Caption Input */}
        <View 
          className="absolute bottom-0 left-0 right-0 bg-black/50 px-4 py-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption..."
            placeholderTextColor="#A1A1AA"
            className="text-white text-lg font-medium px-4 py-3 bg-black/40 rounded-2xl mb-4"
            maxLength={100}
          />
          
          <Pressable 
            className="bg-[#C4EF00] flex-row items-center justify-center rounded-xl py-3 active:opacity-80"
            onPress={handlePostStory}
            disabled={createStoryMutation.isPending}
          >
            {createStoryMutation.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text className="text-black font-bold text-base mr-2">Post Story</Text>
                <Check size={20} color="#000" weight="bold" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
