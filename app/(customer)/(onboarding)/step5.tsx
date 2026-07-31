import React from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { CheckCircle } from 'phosphor-react-native';

export default function Step5() {
  const handleContinue = () => {
    router.replace('/(customer)/home');
  };

  const Title = (
    <Text className="text-white text-3xl font-bold mb-2">
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
        <Text className="text-white text-xl font-bold text-center mb-2">
          Profile Completed
        </Text>
        <Text className="text-gray-400 text-center px-4">
          Your personalized dashboard is ready. Time to start your fitness journey.
        </Text>
      </View>
    </OnboardingLayout>
  );
}
