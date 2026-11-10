import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView, Keyboard, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  isLoading?: boolean;
  headerRight?: React.ReactNode;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function OnboardingLayout({
  currentStep,
  title,
  description,
  children,
  onContinue,
  continueText = 'Continue',
  isContinueDisabled = false,
  isLoading = false,
  headerRight,
  scrollViewRef: externalScrollViewRef,
  contentContainerStyle,
}: OnboardingLayoutProps) {
  const insets = useSafeAreaInsets();
  const internalRef = useRef<ScrollView>(null);
  const scrollRef = externalScrollViewRef || internalRef;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }} edges={['top', 'bottom']} className="flex-1 bg-[#09090b] dark:bg-[#09090b]">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef as any}
          className={`flex-1 px-5 ${Platform.OS === 'android' ? 'pt-14' : 'pt-4'}`}
          contentContainerStyle={[
            {
              paddingBottom: keyboardHeight > 0 ? (Platform.OS === 'android' ? keyboardHeight + 80 : 160) : 120,
            },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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

        <View className="p-5 bg-[#09090b] border-t border-gray-900/60">
          <Pressable
            onPress={onContinue}
            disabled={isContinueDisabled || isLoading}
            className={`flex-row items-center justify-center py-4 rounded-xl ${
              isContinueDisabled || isLoading ? 'bg-gray-700 opacity-50' : 'bg-neon'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text className="text-black font-semibold text-lg mr-2">
                  {continueText}
                </Text>
                <ArrowRight weight="bold" color="#000" size={20} />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
