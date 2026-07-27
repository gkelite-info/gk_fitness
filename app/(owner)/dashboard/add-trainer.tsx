import React, { useState, useRef } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import {
  CaretLeft,
  Users,
  Barbell,
  FirstAidKit
} from 'phosphor-react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import { CustomerRegistrationForm } from '@/components/forms/CustomerRegistrationForm';
import { TrainerRegistrationForm } from '@/components/forms/TrainerRegistrationForm';

export default function AddTrainerScreen() {
  const [activeTab, setActiveTab] = useState('trainers');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitFnRef = useRef<(() => void) | null>(null);
  const isTrainer = activeTab === 'trainers';

  const handleRegisterSubmit = (fn: () => void, loading: boolean) => {
    submitFnRef.current = fn;
    setIsSubmitting(loading);
  };

  const onSavePress = () => {
    if (submitFnRef.current && !isSubmitting) {
      submitFnRef.current();
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pt-12">
      {/* Header */}
      <View className="flex-row items-center px-5 mb-6">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#161616] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-xl font-bold text-white mb-0.5">
            {isTrainer ? 'Add New Trainer' : 'Add New Customer'}
          </Text>
          <Text className="text-xs text-[#888]">
            {isTrainer
              ? 'Add trainer details and create their account'
              : 'Add customer details and create their account'}
          </Text>
        </View>
      </View>

      <KeyboardDismissView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Top Tabs with Native Reanimated Gliding Selection */}
        <AnimatedTabs
          tabs={[
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'trainers', label: 'Trainers', icon: Barbell },
            { id: 'doctors', label: 'Doctors', icon: FirstAidKit, disabled: true },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => {
            setActiveTab(id);
          }}
          containerClassName="mb-8"
        />

        {isTrainer ? (
          <TrainerRegistrationForm onRegisterSubmit={handleRegisterSubmit} />
        ) : (
          <CustomerRegistrationForm onRegisterSubmit={handleRegisterSubmit} />
        )}
      </KeyboardDismissView>

      {/* Footer Buttons */}
      <View className="flex-row gap-3 p-4 bg-[#0A0A0A] border-t border-[#161616]">
        <Pressable
          disabled={isSubmitting}
          onPress={() => router.back()}
          className="flex-1 items-center justify-center py-4 rounded-full border border-[#242424] bg-[#161616] active:opacity-80 disabled:opacity-40"
        >
          <Text className="text-white font-bold">CANCEL</Text>
        </Pressable>
        <Pressable
          disabled={isSubmitting}
          onPress={onSavePress}
          className="flex-[1.5] flex-row items-center justify-center py-4 rounded-full bg-[#C3F400] active:opacity-80 disabled:opacity-50 gap-2"
        >
          {isSubmitting && <ActivityIndicator size="small" color="#000" />}
          <Text className="text-black font-bold">
            {isTrainer ? 'SAVE TRAINER' : 'SAVE CUSTOMER'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
