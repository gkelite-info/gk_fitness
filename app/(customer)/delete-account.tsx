import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, WarningCircle, Trash, CheckCircle } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useDeleteAccount } from '@/hooks/auth/useDeleteAccount';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const { mutateAsync: deleteAccount, isPending } = useDeleteAccount();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    if (!userId) {
      Alert.alert('Error', 'User session not found.');
      return;
    }

    try {
      await deleteAccount(userId);
      setStep(3);
    } catch (err: any) {
      Alert.alert('Error Deleting Account', err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-[#27272A]">
        <Pressable onPress={() => router.navigate('/(customer)/edit-profile')} disabled={isPending} className="mr-4 active:opacity-70">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Delete Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {step === 1 ? (
          <View>
            <View className="w-16 h-16 rounded-full bg-red-500/10 items-center justify-center mb-6 border border-red-500/20 mx-auto">
              <WarningCircle size={36} color="#EF4444" weight="fill" />
            </View>

            <Text className="text-white text-2xl font-bold text-center mb-4">
              Are you absolutely sure?
            </Text>

            <Text className="text-[#A1A1AA] text-sm leading-6 mb-6">
              Account deletion is a permanent action. If you proceed, the following data will be permanently deleted and cannot be recovered:
            </Text>

            <View className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-5 mb-8">
              <View className="flex-row items-start mb-4">
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 mr-3" />
                <Text className="text-[#E4E4E7] text-sm flex-1 leading-5">Your profile and personal information</Text>
              </View>
              <View className="flex-row items-start mb-4">
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 mr-3" />
                <Text className="text-[#E4E4E7] text-sm flex-1 leading-5">All workout logs, progress photos, and body measurements</Text>
              </View>
              <View className="flex-row items-start mb-4">
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 mr-3" />
                <Text className="text-[#E4E4E7] text-sm flex-1 leading-5">Your active gym memberships and trainer bookings</Text>
              </View>
              <View className="flex-row items-start">
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 mr-3" />
                <Text className="text-[#E4E4E7] text-sm flex-1 leading-5">All community posts and social interactions</Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.navigate('/(customer)/edit-profile')}
              className="bg-[#27272A] rounded-2xl py-4 items-center mb-3 active:opacity-80"
            >
              <Text className="text-white font-semibold text-base">Keep My Account</Text>
            </Pressable>

            <Pressable
              onPress={() => setStep(2)}
              className="border border-red-500/30 bg-red-500/10 rounded-2xl py-4 items-center active:opacity-80"
            >
              <Text className="text-red-500 font-semibold text-base">I Understand, Continue</Text>
            </Pressable>
          </View>
        ) : step === 2 ? (
          <View>
            <View className="w-16 h-16 rounded-full bg-red-500/10 items-center justify-center mb-6 border border-red-500/20 mx-auto">
              <Trash size={32} color="#EF4444" weight="fill" />
            </View>

            <Text className="text-white text-2xl font-bold text-center mb-4">
              Final Confirmation
            </Text>

            <Text className="text-[#A1A1AA] text-sm leading-6 mb-6 text-center">
              Please type DELETE in the box below to confirm you want to permanently delete your account.
            </Text>

            <View className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 mb-8">
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="Type DELETE"
                placeholderTextColor="#555"
                autoCapitalize="none"
                editable={!isPending}
                className="text-white text-lg font-semibold text-center h-12"
              />
            </View>

            <Pressable
              onPress={handleDelete}
              disabled={confirmText !== 'DELETE' || isPending}
              className={`rounded-2xl py-4 flex-row justify-center items-center gap-2 mb-4 ${
                confirmText === 'DELETE' && !isPending ? 'bg-red-500 active:opacity-80' : 'bg-[#27272A] opacity-50'
              }`}
            >
              {isPending ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-white font-semibold text-base">Deleting Account...</Text>
                </>
              ) : (
                <Text className="text-white font-semibold text-base">Delete My Account</Text>
              )}
            </Pressable>

            {!isPending && (
              <Pressable
                onPress={() => setStep(1)}
                className="py-4 items-center"
              >
                <Text className="text-[#A1A1AA] font-semibold text-sm">Cancel and Go Back</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="items-center justify-center py-10 mt-10">
            <View className="w-20 h-20 rounded-full bg-[#D4FF00]/10 items-center justify-center mb-6 border border-[#D4FF00]/20 mx-auto">
              <CheckCircle size={40} color="#D4FF00" weight="fill" />
            </View>
            <Text className="text-white text-2xl font-bold text-center mb-4">Account Deleted</Text>
            <Text className="text-[#A1A1AA] text-sm leading-6 mb-10 text-center px-2">
              Your account and all associated data have been successfully deleted. We're sorry to see you go!
            </Text>
            <Pressable
              onPress={() => router.replace('/auth/otp-auth')}
              className="bg-[#D4FF00] rounded-2xl py-4 px-10 w-full items-center active:opacity-80"
            >
              <Text className="text-black font-semibold text-base">Return to Login</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
