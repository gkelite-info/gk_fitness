import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Keyboard, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { User, CalendarBlank, Info, GenderMale, GenderFemale, GenderIntersex } from 'phosphor-react-native';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { useOnboarding } from './_OnboardingContext';
import { useUser } from '@/context/UserContext';
import { useUserById } from '@/hooks/users';
import { useOnboardingSkip } from '@/components/onboarding/OnboardingSkipModal';

export default function Step1() {
  const { data, updateData } = useOnboarding();
  const { userId, role } = useUser();
  const { data: userRecord } = useUserById(userId);
  const { SkipButton, SkipModal } = useOnboardingSkip();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const autoScrollToGap = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardActive(true);
      autoScrollToGap();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardActive(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isKeyboardActive) {
      autoScrollToGap();
    }
  }, [isKeyboardActive]);

  const isIndividual = (role || '').trim().toLowerCase() === 'individual';

  useEffect(() => {
    if (isIndividual && userRecord) {
      const rawGender = (userRecord.gender || '').toLowerCase();
      const normalizedGender = rawGender === 'others' ? 'other' : rawGender;
      updateData({
        fullName: userRecord.name || data.fullName,
        gender: normalizedGender || data.gender,
        dateOfBirth: userRecord.dob || data.dateOfBirth,
      });
    }
  }, [isIndividual, userRecord]);

  const fullNameValue = isIndividual ? (userRecord?.name || data.fullName) : data.fullName;
  const rawGender = isIndividual
    ? ((userRecord?.gender || data.gender || '').toLowerCase() === 'others' ? 'other' : (userRecord?.gender || data.gender || '').toLowerCase())
    : (data.gender || '').toLowerCase();
  const currentGender = rawGender;
  const dobValue = isIndividual ? (userRecord?.dob || data.dateOfBirth) : data.dateOfBirth;

  const handleContinue = () => {
    // Ensure final sync before moving forward
    if (isIndividual && userRecord) {
      updateData({
        fullName: fullNameValue,
        gender: currentGender,
        dateOfBirth: dobValue,
      });
    }
    router.push('/(customer)/(onboarding)/step2');
  };

  const isValidNumber = (val: string) => {
    if (!val) return false;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  };

  const isFormValid = (fullNameValue.length > 0) &&
    (currentGender !== '') &&
    isValidNumber(data.height) &&
    isValidNumber(data.weight);

  const Title = (
    <Text className="text-white text-3xl font-semibold mb-2">
      Let's start with{'\n'}your <Text className="text-neon">Basic Information</Text>
    </Text>
  );

  return (
    <>
      <OnboardingLayout
        currentStep={1}
        title={Title}
        description="This helps us personalize your fitness journey."
        onContinue={handleContinue}
        isContinueDisabled={!isFormValid}
        headerRight={SkipButton}
        scrollViewRef={scrollViewRef}
        contentContainerStyle={{ paddingBottom: isKeyboardActive ? 180 : 120 }}
      >
        <View className="mb-6 opacity-60" pointerEvents="none">
          <Text className="text-white mb-2 font-medium">Full Name <Text className="text-red-500">*</Text></Text>
          <TextInput
            className="border border-gray-800 rounded-xl p-4 text-white bg-[#111] font-sans"
            placeholder="Enter your full name"
            placeholderTextColor="#666"
            value={fullNameValue}
            editable={false}
          />
        </View>

        <View className="mb-6 opacity-60" pointerEvents="none">
          <Text className="text-white mb-2 font-medium">Gender <Text className="text-red-500">*</Text></Text>
          <View className="flex-row gap-2">
            <SelectableCard
              className="flex-1 px-2 py-3"
              checkPosition="none"
              selected={currentGender === 'male'}
              onPress={() => { }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <GenderMale color={currentGender === 'male' ? '#d4ff00' : '#888'} size={20} />
                <Text className={currentGender === 'male' ? 'text-neon font-medium' : 'text-gray-400'}>Male</Text>
              </View>
            </SelectableCard>
            <SelectableCard
              className="flex-1 px-2 py-3"
              checkPosition="none"
              selected={currentGender === 'female'}
              onPress={() => { }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <GenderFemale color={currentGender === 'female' ? '#d4ff00' : '#888'} size={20} />
                <Text className={currentGender === 'female' ? 'text-neon font-medium' : 'text-gray-400'}>Female</Text>
              </View>
            </SelectableCard>
            <SelectableCard
              className="flex-1 px-2 py-3"
              checkPosition="none"
              selected={currentGender === 'other'}
              onPress={() => { }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <GenderIntersex color={currentGender === 'other' ? '#d4ff00' : '#888'} size={20} />
                <Text className={currentGender === 'other' ? 'text-neon font-medium' : 'text-gray-400'}>Other</Text>
              </View>
            </SelectableCard>
          </View>
        </View>

        <View className="mb-6 opacity-60" pointerEvents="none">
          <Text className="text-white mb-2 font-medium">Date of Birth <Text className="text-red-500">*</Text></Text>
          <View className="border border-gray-800 rounded-xl p-4 bg-[#111] flex-row items-center">
            <CalendarBlank color="#888" size={20} />
            <TextInput
              className="flex-1 ml-3 text-white font-sans"
              placeholder="DD / MM / YYYY"
              placeholderTextColor="#666"
              value={dobValue}
              editable={false}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View className="flex-row gap-4 mb-8">
          <View className="flex-1" style={isKeyboardActive ? { paddingBottom: 80 } : undefined}>
            <Text className="text-white mb-2 font-medium">Height <Text className="text-red-500">*</Text></Text>
            <View className={`border rounded-xl p-4 bg-[#111] flex-row items-center justify-between ${data.height && !isValidNumber(data.height) ? 'border-red-500' : 'border-gray-800'}`}>
              <TextInput
                className="text-white flex-1 font-sans"
                placeholder="Enter height"
                placeholderTextColor="#666"
                value={data.height}
                onChangeText={(text) => {
                  updateData({ height: text });
                  autoScrollToGap();
                }}
                onFocus={autoScrollToGap}
                keyboardType="numeric"
              />
              <Text className="text-gray-500 font-sans">cm</Text>
            </View>
            {data.height && !isValidNumber(data.height) ? <Text className="text-red-500 text-xs mt-1">Valid height required</Text> : null}
          </View>
          <View className="flex-1" style={isKeyboardActive ? { paddingBottom: 80 } : undefined}>
            <Text className="text-white mb-2 font-medium">Weight <Text className="text-red-500">*</Text></Text>
            <View className={`border rounded-xl p-4 bg-[#111] flex-row items-center justify-between ${data.weight && !isValidNumber(data.weight) ? 'border-red-500' : 'border-gray-800'}`}>
              <TextInput
                className="text-white flex-1 font-sans"
                placeholder="Enter weight"
                placeholderTextColor="#666"
                value={data.weight}
                onChangeText={(text) => {
                  updateData({ weight: text });
                  autoScrollToGap();
                }}
                onFocus={autoScrollToGap}
                keyboardType="numeric"
              />
              <Text className="text-gray-500 font-sans">kg</Text>
            </View>
            {data.weight && !isValidNumber(data.weight) ? <Text className="text-red-500 text-xs mt-1">Valid weight required</Text> : null}
          </View>
        </View>

        <View className="bg-[#1a1a1a] p-4 rounded-xl flex-row gap-3 items-start mb-8">
          <View className="bg-neon/10 p-2 rounded-full mt-1">
            <Info color="#d4ff00" weight="fill" size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold mb-1">Why do we need this?</Text>
            <Text className="text-gray-400 text-sm leading-5 font-sans">
              This information helps us create a workout and nutrition plan that's perfect for you.
            </Text>
          </View>
        </View>
      </OnboardingLayout>

      {SkipModal}
    </>
  );
}
