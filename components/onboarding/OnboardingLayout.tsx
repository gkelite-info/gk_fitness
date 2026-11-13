import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView, Keyboard, Animated } from 'react-native';
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
}: OnboardingLayoutProps) {
  const insets = useSafeAreaInsets();
  const internalRef = useRef<ScrollView>(null);
  const scrollRef = externalScrollViewRef || internalRef;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const isScrollable = contentHeight > containerHeight + 5;
  const trackHeight = Math.max(40, containerHeight - 32);
  const maxScroll = Math.max(1, contentHeight - containerHeight);
  const thumbHeight = isScrollable
    ? Math.max(36, Math.min(trackHeight * 0.7, (containerHeight / contentHeight) * trackHeight))
    : trackHeight;
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);

  const thumbTop = scrollY.interpolate({
    inputRange: [0, maxScroll],
    outputRange: [0, maxThumbTop],
    extrapolate: 'clamp',
  });

  const progressHeight = scrollY.interpolate({
    inputRange: [0, maxScroll],
    outputRange: [thumbHeight, trackHeight],
    extrapolate: 'clamp',
  });

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
        <View
          style={{ flex: 1, position: 'relative' }}
          onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        >
          <ScrollView
            ref={scrollRef as any}
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: keyboardHeight > 0 ? (Platform.OS === 'android' ? 40 : 100) : 40,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            nestedScrollEnabled={true}
            bounces={true}
            alwaysBounceVertical={true}
            overScrollMode="always"
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            onContentSizeChange={(_, h) => setContentHeight(h)}
          >
            <View className="flex-row items-center justify-between mb-8">
              {currentStep ? <Stepper currentStep={currentStep} /> : <View />}
              {headerRight}
            </View>

            {title && (
              React.isValidElement(title) ? (
                title
              ) : (
                <Text className="text-white text-3xl font-semibold mb-2">
                  {title}
                </Text>
              )
            )}

            {description && (
              <Text className="text-gray-400 text-base font-sans mb-8">
                {description}
              </Text>
            )}

            <View style={{ flexGrow: 1, width: '100%' }}>
              {children}
            </View>
          </ScrollView>

          {/* Custom Brand Neon Scroll Indicator on Right Edge */}
          {containerHeight > 0 && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: 3,
                top: 16,
                height: trackHeight,
                width: 4,
                borderRadius: 9999,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              {/* Progress Trail: highlights scrolled portion */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: progressHeight,
                  backgroundColor: 'rgba(212, 255, 0, 0.35)',
                  borderRadius: 9999,
                }}
              />

              {/* Glowing Neon Thumb: shows active scroll position */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: thumbTop,
                  left: 0,
                  right: 0,
                  height: thumbHeight,
                  backgroundColor: '#d4ff00',
                  borderRadius: 9999,
                  shadowColor: '#d4ff00',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              />
            </View>
          )}
        </View>

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
