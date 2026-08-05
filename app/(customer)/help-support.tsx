import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { ArrowLeft, EnvelopeSimple, Question } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HelpSupport() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.push('/(customer)/profile');
  }

  const handleEmailSupport = () => {
    Linking.openURL('mailto:gkeliteinfo@gmail.com?subject=GK-GYMLIFE App Support');
  };

  const FaqItem = ({ question, answer }: { question: string, answer: string }) => (
    <View className="mb-6">
      <Text className="text-base font-semibold text-[#D4FF00] mb-2">{question}</Text>
      <Text className="text-sm text-white leading-5 font-sans">{answer}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0F0F0F] pb-10" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-5 py-4 border-b border-[#27272A]">
        <Pressable onPress={handleBack} className="mr-4 active:opacity-70">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Help & Support</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        <View className="items-center mb-8 mt-4">
          <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center mb-4 border border-[#27272A]">
            <Question size={32} color="#D4FF00" weight="fill" />
          </View>
          <Text className="text-[#D4FF00] font-semibold text-2xl text-center">How can we help you?</Text>
          <Text className="text-sm mt-3 text-center text-[#A1A1AA] leading-5 font-sans px-4">
            If you're experiencing issues with the app, have questions about your membership, or need to contact your gym, you're in the right place.
          </Text>
        </View>

        <Pressable
          onPress={handleEmailSupport}
          className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 flex-row items-center mb-8 active:opacity-80"
        >
          <View className="w-10 h-10 rounded-full bg-[#27272A] items-center justify-center mr-4">
            <EnvelopeSimple size={20} color="#D4FF00" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base mb-1">Contact Support</Text>
            <Text className="text-[#A1A1AA] text-xs font-sans">Email us directly for assistance</Text>
          </View>
        </Pressable>

        <Text className="text-xl font-semibold text-white mb-6 border-b border-[#27272A] pb-3">Frequently Asked Questions</Text>

        <FaqItem
          question="How do I mark my daily attendance?"
          answer="Go to the Home tab and tap the 'Check-in (QR)' button. Point your camera at the gym's QR screen to instantly log your attendance."
        />

        <FaqItem
          question="Why is my membership showing as expired?"
          answer="Your membership might have passed its end date. If you believe this is an error or if you have recently renewed, please contact your gym owner directly to update your records on the platform."
        />

        <FaqItem
          question="How do I view my workout plan?"
          answer="Navigate to the Home or Workout tab to see your assigned exercises for the day. You can also view your entire weekly schedule from the Workout section."
        />

        <FaqItem
          question="How can I track my water and calories?"
          answer="You can log your daily water intake and calories directly from the Home screen by tapping on the Water Drop or Flame icons in your progress overview."
        />

      </ScrollView>
    </View>
  );
}
