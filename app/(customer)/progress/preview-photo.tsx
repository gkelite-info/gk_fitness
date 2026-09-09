import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { X, CalendarBlank, CaretRight, CheckCircle, Camera } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUploadProgressPhoto } from '@/hooks/fitness/useUpdateProgress';
import { useUser } from '@/context/UserContext';

const PROGRESS_DAYS = [1, 30, 40, 60, 90];

export default function PreviewProgressPhotoModal() {
  const router = useRouter();
  const { userId } = useUser();
  const [selectedDay, setSelectedDay] = useState(40);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const { mutateAsync: uploadPhoto, isPending } = useUploadProgressPhoto();

  const handleTakeImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setBase64Image(result.assets[0].base64);
    }
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setBase64Image(result.assets[0].base64);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Upload Progress Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakeImage },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!base64Image) {
      Alert.alert('No image', 'Please select an image first.');
      return;
    }

    try {
      const fileName = `progress-${Date.now()}.jpg`;
      await uploadPhoto({
        userId: userId,
        base64Image,
        fileName,
      });
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to upload photo.');
    }
  };

  return (
    <View className="flex-1 bg-[#09090B] pt-8 px-5">
      
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        {/* Placeholder for centering */}
        <View className="w-8 h-8" />
        <Text className="text-white text-xl font-bold tracking-tight">Preview Progress Photo</Text>
        <Pressable 
          className="w-8 h-8 rounded-full bg-[#1C1C1E] items-center justify-center active:opacity-70"
          onPress={() => router.back()}
        >
          <X size={16} color="#8E8E93" weight="bold" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* Image Preview */}
        <Pressable 
          onPress={showImageOptions}
          className="w-full h-64 bg-[#1C1C1E] rounded-3xl overflow-hidden mb-6 border border-[#2A2A2D]/50 items-center justify-center active:opacity-80"
        >
          {imageUri ? (
            <Image 
              source={{ uri: imageUri }} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="items-center">
              <Camera size={48} color="#D4FF00" />
              <Text className="text-[#D4FF00] mt-4 text-sm font-bold">Tap to select photo</Text>
            </View>
          )}
        </Pressable>

        {/* Date Selector */}
        <Pressable className="bg-[#1C1C1E] rounded-2xl p-5 flex-row items-center justify-between mb-8 border border-[#2A2A2D]/50 active:opacity-80">
          <View className="flex-row items-center gap-4">
            <CalendarBlank size={20} color="#8E8E93" weight="regular" />
            <Text className="text-white text-[15px]">Date</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-[#8E8E93] text-[15px]">{new Date().toLocaleDateString()}</Text>
            <CaretRight size={16} color="#6B6B6B" weight="bold" />
          </View>
        </Pressable>

        {/* Progress Day Selection */}
        <Text className="text-white text-[17px] font-bold mb-1">Progress Day</Text>
        <Text className="text-[#8E8E93] text-[13px] mb-4">Track your journey by selecting the day number.</Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="mb-10"
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {PROGRESS_DAYS.map((day) => {
            const isSelected = day === selectedDay;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                className={`w-[72px] h-[80px] rounded-2xl items-center justify-center relative ${
                  isSelected ? 'bg-[#1C1C1E] border border-[#D4FF00]' : 'bg-[#1C1C1E] border border-[#2A2A2D]/50'
                }`}
              >
                {isSelected && (
                  <View className="absolute -top-2 -right-2 bg-[#09090B] rounded-full">
                    <CheckCircle size={18} weight="fill" color="#D4FF00" />
                  </View>
                )}
                <Text className={`${isSelected ? 'text-white' : 'text-white'} text-[15px] mb-0.5`}>Day</Text>
                <Text className={`${isSelected ? 'text-[#D4FF00]' : 'text-white'} text-[17px] font-bold`}>{day}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Action Buttons */}
        <View className="gap-3">
          <Pressable 
            className={`rounded-2xl py-4 items-center justify-center active:opacity-80 shadow-lg ${isPending ? 'bg-[#D4FF00]/50' : 'bg-[#D4FF00]'}`}
            onPress={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#09090B" />
            ) : (
              <Text className="text-[#09090B] text-[17px] font-bold">Save Progress Photo</Text>
            )}
          </Pressable>
          <Pressable 
            className="bg-[#1C1C1E] rounded-2xl py-4 items-center justify-center active:opacity-80 border border-[#2A2A2D]/50"
            onPress={() => router.back()}
          >
            <Text className="text-white text-[17px] font-bold">Cancel</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
