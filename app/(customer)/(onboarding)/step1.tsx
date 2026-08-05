import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { User, CalendarBlank, Info, GenderMale, GenderFemale, GenderIntersex } from 'phosphor-react-native';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { useOnboarding } from './_OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/context/UserContext';
import { useCustomerOnboardingStatus, sessionSkippedUsers } from '@/hooks/auth/useCustomerOnboardingStatus';

export default function Step1() {
  const { data, updateData } = useOnboarding();
  const { userId } = useUser();
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [doNotAskAgain, setDoNotAskAgain] = useState(false);

  const handleContinue = () => {
    router.push('/(customer)/(onboarding)/step2');
  };

  const isValidNumber = (val: string) => {
    if (!val) return false;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  };

  const isFormValid = data.fullName.length > 0 && data.gender !== '' && isValidNumber(data.height) && isValidNumber(data.weight);

  const Title = (
    <Text className="text-white text-3xl font-bold mb-2">
      Let's start with{'\n'}your <Text className="text-neon">basic information</Text>
    </Text>
  );

  const handleSkip = async () => {
    if (!userId) return;
    if (doNotAskAgain) {
      await AsyncStorage.setItem(`@onboarding_skipped_${userId}`, 'true');
    } else {
      sessionSkippedUsers.add(userId);
    }
    setSkipModalVisible(false);
    router.replace('/(customer)/home');
  };

  const SkipButton = (
    <Pressable onPress={() => setSkipModalVisible(true)} className="px-4 py-2 bg-[#1a1a1a] rounded-full border border-gray-800 active:opacity-80">
      <Text className="text-gray-300 font-semibold text-xs">Skip</Text>
    </Pressable>
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
      >
      <View className="mb-6 opacity-60" pointerEvents="none">
        <Text className="text-white mb-2 font-medium">Full Name <Text className="text-red-500">*</Text></Text>
        <TextInput
          className="border border-gray-800 rounded-xl p-4 text-white bg-[#111]"
          placeholder="Enter your full name"
          placeholderTextColor="#666"
          value={data.fullName}
          editable={false}
        />
      </View>

      <View className="mb-6 opacity-60" pointerEvents="none">
        <Text className="text-white mb-2 font-medium">Gender <Text className="text-red-500">*</Text></Text>
        <View className="flex-row gap-2">
          <SelectableCard
            className="flex-1 px-2 py-3"
            checkPosition="none"
            selected={data.gender === 'male'}
            onPress={() => {}}
          >
            <View className="flex-row items-center justify-center gap-2">
              <GenderMale color={data.gender === 'male' ? '#d4ff00' : '#888'} size={20} />
              <Text className={data.gender === 'male' ? 'text-neon font-medium' : 'text-gray-400'}>Male</Text>
            </View>
          </SelectableCard>
          <SelectableCard
            className="flex-1 px-2 py-3"
            checkPosition="none"
            selected={data.gender === 'female'}
            onPress={() => {}}
          >
            <View className="flex-row items-center justify-center gap-2">
              <GenderFemale color={data.gender === 'female' ? '#d4ff00' : '#888'} size={20} />
              <Text className={data.gender === 'female' ? 'text-neon font-medium' : 'text-gray-400'}>Female</Text>
            </View>
          </SelectableCard>
          <SelectableCard
            className="flex-1 px-2 py-3"
            checkPosition="none"
            selected={data.gender === 'other'}
            onPress={() => {}}
          >
            <View className="flex-row items-center justify-center gap-2">
              <GenderIntersex color={data.gender === 'other' ? '#d4ff00' : '#888'} size={20} />
              <Text className={data.gender === 'other' ? 'text-neon font-medium' : 'text-gray-400'}>Other</Text>
            </View>
          </SelectableCard>
        </View>
      </View>

      <View className="mb-6 opacity-60" pointerEvents="none">
        <Text className="text-white mb-2 font-medium">Date of Birth <Text className="text-red-500">*</Text></Text>
        <View className="border border-gray-800 rounded-xl p-4 bg-[#111] flex-row items-center">
          <CalendarBlank color="#888" size={20} />
          <TextInput
            className="flex-1 ml-3 text-white"
            placeholder="DD / MM / YYYY"
            placeholderTextColor="#666"
            value={data.dateOfBirth}
            editable={false}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <View className="flex-row gap-4 mb-8">
        <View className="flex-1">
          <Text className="text-white mb-2 font-medium">Height <Text className="text-red-500">*</Text></Text>
          <View className={`border rounded-xl p-4 bg-[#111] flex-row items-center justify-between ${data.height && !isValidNumber(data.height) ? 'border-red-500' : 'border-gray-800'}`}>
            <TextInput
              className="text-white flex-1"
              placeholder="Enter height"
              placeholderTextColor="#666"
              value={data.height}
              onChangeText={(text) => updateData({ height: text })}
              keyboardType="numeric"
            />
            <Text className="text-gray-500">cm</Text>
          </View>
          {data.height && !isValidNumber(data.height) ? <Text className="text-red-500 text-xs mt-1">Valid height required</Text> : null}
        </View>
        <View className="flex-1">
          <Text className="text-white mb-2 font-medium">Weight <Text className="text-red-500">*</Text></Text>
          <View className={`border rounded-xl p-4 bg-[#111] flex-row items-center justify-between ${data.weight && !isValidNumber(data.weight) ? 'border-red-500' : 'border-gray-800'}`}>
            <TextInput
              className="text-white flex-1"
              placeholder="Enter weight"
              placeholderTextColor="#666"
              value={data.weight}
              onChangeText={(text) => updateData({ weight: text })}
              keyboardType="numeric"
            />
            <Text className="text-gray-500">kg</Text>
          </View>
          {data.weight && !isValidNumber(data.weight) ? <Text className="text-red-500 text-xs mt-1">Valid weight required</Text> : null}
        </View>
      </View>

      <View className="bg-[#1a1a1a] p-4 rounded-xl flex-row gap-3 items-start mb-8">
        <View className="bg-neon/10 p-2 rounded-full mt-1">
          <Info color="#d4ff00" weight="fill" size={24} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold mb-1">Why do we need this?</Text>
          <Text className="text-gray-400 text-sm leading-5">
            This information helps us create a workout and nutrition plan that's perfect for you.
          </Text>
        </View>
      </View>
    </OnboardingLayout>

      <Modal visible={skipModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="bg-[#111] border border-gray-800 rounded-3xl p-6 w-full max-w-sm">
            <Text className="text-white text-xl font-bold mb-3">Skip Onboarding?</Text>
            <Text className="text-gray-400 text-sm mb-6 leading-5">
              Are you sure? You won't get personalized workout or diet plans. You can always complete this later from your Profile settings.
            </Text>
            
            <Pressable 
              className="flex-row items-center gap-3 mb-8 active:opacity-80"
              onPress={() => setDoNotAskAgain(!doNotAskAgain)}
            >
              <View className={`w-6 h-6 rounded-md border flex items-center justify-center ${doNotAskAgain ? 'bg-neon border-neon' : 'border-gray-600 bg-[#1a1a1a]'}`}>
                {doNotAskAgain && <View className="w-3 h-3 bg-black rounded-sm" />}
              </View>
              <Text className="text-gray-300 font-medium">Do not ask me again</Text>
            </Pressable>

            <View className="flex-row gap-3">
              <Pressable 
                className="flex-1 py-4 rounded-xl border border-gray-700 items-center justify-center active:opacity-50"
                onPress={() => setSkipModalVisible(false)}
              >
                <Text className="text-gray-300 font-bold">Cancel</Text>
              </Pressable>
              <Pressable 
                className="flex-1 py-4 rounded-xl bg-neon items-center justify-center active:opacity-80"
                onPress={handleSkip}
              >
                <Text className="text-black font-bold">Yes, Skip</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

