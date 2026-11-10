import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/context/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import { sessionSkippedUsers } from '@/hooks/auth/useCustomerOnboardingStatus';

export function useOnboardingSkip() {
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [doNotAskAgain, setDoNotAskAgain] = useState(true);
  const { userId } = useUser();
  const queryClient = useQueryClient();

  const handleSkip = async () => {
    if (userId) {
      // Store in mobile localstorage so user is not prompted again
      await AsyncStorage.setItem(`@onboarding_skipped_${userId}`, 'true');
      sessionSkippedUsers.add(userId);
    }
    await AsyncStorage.removeItem('@onboarding_skipped_global');
    queryClient.setQueryData(['customerOnboardingStatus', userId], { isOnboarded: false, isSkipped: true });
    queryClient.invalidateQueries({ queryKey: ['customerOnboardingStatus', userId] });
    setSkipModalVisible(false);
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/(customer)/home');
  };

  const SkipButton = (
    <Pressable
      onPress={() => setSkipModalVisible(true)}
      className="px-4 py-2 bg-[#1a1a1a] rounded-full border border-gray-800 active:opacity-80"
    >
      <Text className="text-gray-300 font-semibold text-xs">Skip</Text>
    </Pressable>
  );

  const SkipModal = (
    <Modal
      visible={skipModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setSkipModalVisible(false)}
    >
      <View className="flex-1 bg-black/80 items-center justify-center p-6">
        <View className="bg-[#111] border border-gray-800 rounded-3xl p-6 w-full max-w-sm">
          <Text className="text-white text-xl font-semibold mb-3">Skip Onboarding?</Text>
          <Text className="text-gray-400 text-sm mb-6 leading-5 font-sans">
            Are you sure? You won't get personalized workout or diet plans. You can always complete this later from your Profile settings.
          </Text>

          <Pressable
            className="flex-row items-center gap-3 mb-8 active:opacity-80"
            onPress={() => setDoNotAskAgain(!doNotAskAgain)}
          >
            <View
              className={`w-6 h-6 rounded-md border flex items-center justify-center ${
                doNotAskAgain ? 'bg-neon border-neon' : 'border-gray-600 bg-[#1a1a1a]'
              }`}
            >
              {doNotAskAgain && <View className="w-3 h-3 bg-black rounded-sm" />}
            </View>
            <Text className="text-gray-300 font-medium">Do not ask me again</Text>
          </Pressable>

          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 py-4 rounded-xl border border-gray-700 items-center justify-center active:opacity-50"
              onPress={() => setSkipModalVisible(false)}
            >
              <Text className="text-gray-300 font-semibold">Cancel</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-4 rounded-xl bg-neon items-center justify-center active:opacity-80"
              onPress={handleSkip}
            >
              <Text className="text-black font-semibold">Yes, Skip</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  return {
    skipModalVisible,
    setSkipModalVisible,
    doNotAskAgain,
    setDoNotAskAgain,
    handleSkip,
    SkipButton,
    SkipModal,
  };
}

