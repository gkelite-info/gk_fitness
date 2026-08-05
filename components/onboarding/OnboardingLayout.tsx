import React from 'react';
import { View, Text, Pressable, ScrollView, SafeAreaView, Platform } from 'react-native';
import { Stepper } from './Stepper';
import { ArrowRight } from 'phosphor-react-native';

interface OnboardingLayoutProps {
  currentStep?: number;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  onContinue: () => void;
  continueText?: string;
  isContinueDisabled?: boolean;
  headerRight?: React.ReactNode;
}

export function OnboardingLayout({
  currentStep,
  title,
  description,
  children,
  onContinue,
  continueText = 'Continue',
  isContinueDisabled = false,
  headerRight,
}: OnboardingLayoutProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }} className="flex-1 bg-[#09090b] dark:bg-[#09090b]">
      <ScrollView
        className={`flex-1 px-5 ${Platform.OS === 'android' ? 'pt-14' : 'pt-4'}`}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between mb-8">
          {currentStep ? <Stepper currentStep={currentStep} /> : <View />}
          {headerRight}
        </View>

        {title && (
          <Text className="text-white text-3xl font-semibold mb-2">
            {title}
          </Text>
        )}

        {description && (
          <Text className="text-gray-400 text-base font-sans mb-8">
            {description}
          </Text>
        )}

        <View className="flex-1">
          {children}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#09090b]">
        <Pressable
          onPress={onContinue}
          disabled={isContinueDisabled}
          className={`flex-row items-center justify-center py-4 rounded-xl ${isContinueDisabled ? 'bg-gray-700 opacity-50' : 'bg-neon'
            }`}
        >
          <Text className="text-black font-semibold text-lg mr-2">
            {continueText}
          </Text>
          <ArrowRight weight="bold" color="#000" size={20} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
