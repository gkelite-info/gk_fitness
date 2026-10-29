import React from 'react';
import { View, Text, BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { CheckCircle } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/context/UserContext';
import { useQueryClient } from '@tanstack/react-query';

export default function Step5() {
  const { userId } = useUser();
  const queryClient = useQueryClient();

  const handleContinue = async () => {
    if (userId) {
      await AsyncStorage.setItem(`@onboarding_completed_${userId}`, 'true');
    }
    await AsyncStorage.setItem('@onboarding_completed_global', 'true');
    queryClient.setQueryData(['customerOnboardingStatus', userId], { isOnboarded: true, isSkipped: false });
    queryClient.invalidateQueries({ queryKey: ['customerOnboardingStatus', userId] });

    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/(customer)/home');
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleContinue();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [userId])
  );

  const Title = (
    <Text className="text-white text-3xl font-semibold mb-2">
      You're all <Text className="text-neon">set!</Text>
    </Text>
  );

  return (
    <OnboardingLayout
      currentStep={5}
      title={Title}
      description="We've set up your profile. Get ready to achieve your fitness goals."
      onContinue={handleContinue}
      continueText="Let's Go"
    >
      <View className="flex-1 items-center justify-center mb-12">
        <View className="bg-neon/10 w-32 h-32 rounded-full items-center justify-center mb-6">
          <CheckCircle color="#d4ff00" weight="fill" size={80} />
        </View>
        <Text className="text-white text-xl font-semibold text-center mb-2">
          Profile Completed
        </Text>
        <Text className="text-gray-400 text-center px-4 font-sans">
          Your personalized dashboard is ready. Time to start your fitness journey.
        </Text>
      </View>
    </OnboardingLayout>
  );
}
