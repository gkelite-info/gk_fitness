import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  CaretLeft, 
  UserMinus,
  FileText,
  ShieldCheck,
  CaretRight,
  X,
  WarningCircle
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';

type ModalType = 'guidelines' | 'terms' | null;

export default function CommunitySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-[#1F1F22]">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-wide flex-1 text-center pr-8">
          Community Settings
        </Text>
      </View>

      <ScrollView 
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Moderation Section */}
        <Text className="text-[#71717A] text-[13px] font-bold uppercase tracking-wider mb-3">
          Moderation
        </Text>
        <View className="bg-[#121214] border border-[#1F1F22] rounded-2xl overflow-hidden mb-8">
          <Pressable 
            className="flex-row items-center justify-between p-4 active:bg-[#18181B]"
            onPress={() => router.push('/community/blocklist')}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-[#27272A] items-center justify-center">
                <UserMinus size={18} color="#E4E4E7" />
              </View>
              <Text className="text-white text-[15px] font-semibold">Blocked Users</Text>
            </View>
            <CaretRight size={18} color="#71717A" />
          </Pressable>
        </View>

        {/* About Section */}
        <Text className="text-[#71717A] text-[13px] font-bold uppercase tracking-wider mb-3">
          About
        </Text>
        <View className="bg-[#121214] border border-[#1F1F22] rounded-2xl overflow-hidden">
          <Pressable 
            onPress={() => setActiveModal('guidelines')}
            className="flex-row items-center justify-between p-4 active:bg-[#18181B] border-b border-[#1F1F22]"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-[#27272A] items-center justify-center">
                <ShieldCheck size={18} color="#E4E4E7" />
              </View>
              <Text className="text-white text-[15px] font-semibold">Community Guidelines</Text>
            </View>
            <CaretRight size={18} color="#71717A" />
          </Pressable>
          <Pressable 
            onPress={() => setActiveModal('terms')}
            className="flex-row items-center justify-between p-4 active:bg-[#18181B]"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-[#27272A] items-center justify-center">
                <FileText size={18} color="#E4E4E7" />
              </View>
              <Text className="text-white text-[15px] font-semibold">Terms of Service</Text>
            </View>
            <CaretRight size={18} color="#71717A" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Guidelines & Terms Modal */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <View 
            className="bg-[#121214] border-t border-[#27272A] rounded-t-3xl max-h-[85%]"
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 pt-5 pb-4 border-b border-[#27272A]">
              <Text className="text-white font-bold text-lg">
                {activeModal === 'guidelines' ? 'Community Guidelines' : 'Terms of Service'}
              </Text>
              <Pressable 
                onPress={() => setActiveModal(null)} 
                className="w-9 h-9 rounded-full bg-[#27272A] items-center justify-center active:opacity-70"
              >
                <X size={18} color="#E4E4E7" weight="bold" />
              </Pressable>
            </View>

            {/* Modal Body */}
            <ScrollView className="px-6 pt-4" showsVerticalScrollIndicator={false}>
              {activeModal === 'guidelines' ? (
                <View className="gap-y-4 pb-6">
                  <View className="flex-row items-center gap-2 bg-[#D4FF00]/10 border border-[#D4FF00]/30 rounded-xl p-3">
                    <WarningCircle size={20} color="#D4FF00" weight="fill" />
                    <Text className="text-[#D4FF00] text-xs font-semibold flex-1">
                      Zero tolerance policy for objectionable content and abusive users.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">1. Respectful Environment</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      Treat every member, trainer, and staff member with dignity. Bullying, harassment, hate speech, threats, and discrimination are strictly prohibited.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">2. Appropriate Content</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      Only share fitness-related media, achievements, healthy lifestyle updates, and workout motivation. Nudity, sexually explicit material, violence, and promotional spam will be removed immediately.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">3. Content Moderation & Reporting</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      Users can flag any inappropriate post or story using the in-app Report button. Our moderation team reviews reported content within 24 hours. You can also block any user instantly via their profile or post menu.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">4. Account Consequences</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      Violations will result in content removal, temporary restrictions, or permanent account termination across all GK Fitness services.
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="gap-y-4 pb-6">
                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">1. Agreement to Terms</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      By registering, downloading, or using the GK Fitness application, you agree to comply with and be bound by these Terms of Service and our Privacy Policy.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">2. Service Scope</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      GK Fitness provides gym membership management, attendance tracking, workout plans, hydration monitoring, and community features. Physical gym memberships and facilities are provided directly by each independent gym branch.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">3. User Conduct</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree not to misuse the service or assist others in doing so.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">4. Health & Safety Disclaimer</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      Exercise instructions and nutrition guidance in the app are for informational purposes only. Always consult a physician or healthcare professional before beginning any physical exercise or dietary program.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white font-semibold text-sm mb-1">5. Account Termination</Text>
                    <Text className="text-[#A1A1AA] text-xs leading-5">
                      You may delete your account at any time through Profile → Manage Account → Delete Account. We reserve the right to suspend or terminate accounts that violate our community standards or terms.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
