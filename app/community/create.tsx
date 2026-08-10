import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, Image as ImageIcon, Lightbulb } from 'phosphor-react-native';

export default function CreatePostScreen() {
  const router = useRouter();
  const [caption, setCaption] = useState('');

  return (
    <View className="flex-1 bg-[#0A0A0A] pt-4">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 rounded-full bg-[#18181B] items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide flex-1 text-center">Create Post</Text>
        <Pressable 
          className="bg-[#C4EF00] px-5 py-2 rounded-full active:opacity-80"
          onPress={() => router.back()}
        >
          <Text className="text-[#000000] font-bold text-[15px]">Post</Text>
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
          />
          <Text className="text-[#71717A] text-[11px] text-right mt-2 font-medium">
            {caption.length}/500
          </Text>
        </View>

        <Text className="text-white font-bold text-base mb-3">Add Photo</Text>
        
        {/* Upload Box */}
        <Pressable className="bg-[#121214] border border-dashed border-[#27272A] rounded-2xl p-10 items-center justify-center mb-6 active:opacity-70">
          <ImageIcon size={40} color="#C4EF00" weight="regular" style={{ marginBottom: 16 }} />
          <Text className="text-white font-semibold text-[15px] mb-1">Tap to upload photo</Text>
          <Text className="text-[#71717A] text-[13px]">You can add up to 5 photos</Text>
        </Pressable>

        {/* Tips Box */}
        <View className="bg-[#121214] border border-[#1F1F22] rounded-2xl p-4 flex-row mb-8">
          <Lightbulb size={20} color="#C4EF00" weight="regular" style={{ marginTop: 2 }} />
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-[15px] mb-1">Tips</Text>
            <Text className="text-[#A1A1AA] text-[13px] leading-5">
              Share your workouts, progress, meals or achievements with the community.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
