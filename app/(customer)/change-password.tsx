import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Lock, Eye, EyeClosed, ShieldCheck, Check } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useUser();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const requirementsMet = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  const handleUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (!requirementsMet) {
      Alert.alert('Error', 'Please ensure your new password meets all requirements.');
      return;
    }
    if (!email) {
      Alert.alert('Error', 'User email not found. Please log in again.');
      return;
    }

    setIsPending(true);
    try {
      // 1. Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect.');
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setStep(2);
    } catch (err: any) {
      Alert.alert('Error Updating Password', err.message || 'An unexpected error occurred.');
    } finally {
      setIsPending(false);
    }
  };

  if (step === 2) {
    return (
      <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-5 py-4">
          <Pressable onPress={() => router.navigate('/(customer)/profile')} className="p-2 bg-[#1A1A1A] rounded-full active:opacity-70">
            <CaretLeft size={20} color="#FFFFFF" weight="bold" />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-6 pb-20">
          <View className="w-24 h-24 rounded-full bg-[#D4FF00] items-center justify-center mb-8">
            <Check size={48} color="#000000" weight="bold" />
          </View>
          
          <Text className="text-white text-3xl font-bold text-center mb-4 leading-9">
            Password Updated Successfully!
          </Text>
          
          <Text className="text-[#A1A1AA] text-base text-center leading-6 mb-12 px-4">
            Your password has been changed. You can now use your new password to log in to your account.
          </Text>

          <View className="w-full gap-4 mt-auto">
            <Pressable
              onPress={() => router.navigate('/(customer)/manage-account')}
              className="bg-[#D4FF00] rounded-2xl py-4 items-center active:opacity-80 w-full"
            >
              <Text className="text-black font-semibold text-base">Back to Manage Account</Text>
            </Pressable>

            <Pressable
              onPress={() => router.navigate('/(customer)/profile')}
              className="bg-transparent border border-[#27272A] rounded-2xl py-4 items-center active:opacity-80 w-full"
            >
              <Text className="text-white font-semibold text-base">Go to Profile</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} disabled={isPending} className="p-2 bg-[#1A1A1A] rounded-full active:opacity-70 mr-4">
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <View>
          <Text className="text-white text-2xl font-bold">Change Password</Text>
          <Text className="text-[#8E8E93] text-sm mt-0.5">Update your account password securely.</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        
        {/* Form Inputs */}
        <View className="bg-[#1A1A1A] border border-[#27272A] rounded-3xl p-2 mb-6">
          
          {/* Current Password */}
          <View className="flex-row items-center px-4 py-3 border-b border-[#27272A]">
            <View className="mr-3">
              <Lock size={20} color="#D4FF00" weight="regular" />
            </View>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current Password"
              placeholderTextColor="#555555"
              secureTextEntry={!showCurrent}
              editable={!isPending}
              className="flex-1 text-white text-base py-3"
            />
            <Pressable onPress={() => setShowCurrent(!showCurrent)} className="p-2 opacity-50 active:opacity-100">
              {showCurrent ? <Eye size={20} color="#FFFFFF" /> : <EyeClosed size={20} color="#FFFFFF" />}
            </Pressable>
          </View>

          {/* New Password */}
          <View className="flex-row items-center px-4 py-3 border-b border-[#27272A]">
            <View className="mr-3">
              <Lock size={20} color="#D4FF00" weight="regular" />
            </View>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor="#555555"
              secureTextEntry={!showNew}
              editable={!isPending}
              className="flex-1 text-white text-base py-3"
            />
            <Pressable onPress={() => setShowNew(!showNew)} className="p-2 opacity-50 active:opacity-100">
              {showNew ? <Eye size={20} color="#FFFFFF" /> : <EyeClosed size={20} color="#FFFFFF" />}
            </Pressable>
          </View>

          {/* Confirm Password */}
          <View className="flex-row items-center px-4 py-3">
            <View className="mr-3">
              <Lock size={20} color="#D4FF00" weight="regular" />
            </View>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              placeholderTextColor="#555555"
              secureTextEntry={!showConfirm}
              editable={!isPending}
              className="flex-1 text-white text-base py-3"
            />
            <Pressable onPress={() => setShowConfirm(!showConfirm)} className="p-2 opacity-50 active:opacity-100">
              {showConfirm ? <Eye size={20} color="#FFFFFF" /> : <EyeClosed size={20} color="#FFFFFF" />}
            </Pressable>
          </View>
        </View>

        {/* Requirements Box */}
        <View className="bg-[#1A1A1A] border border-[#27272A] rounded-3xl p-5 mb-5 flex-row items-start">
          <View className="w-10 h-10 rounded-xl bg-[#D4FF00]/10 items-center justify-center mr-4 border border-[#D4FF00]/20">
            <ShieldCheck size={20} color="#D4FF00" weight="regular" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base mb-1">Password Requirements</Text>
            <Text className="text-[#A1A1AA] text-sm leading-5 mb-4">Your password must meet the following criteria:</Text>
            
            <View className="gap-2.5">
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-3 ${hasMinLength ? 'bg-[#D4FF00]' : 'bg-[#D4FF00]'}`} />
                <Text className="text-[#E4E4E7] text-sm">Minimum 8 characters</Text>
              </View>
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-3 ${hasUppercase ? 'bg-[#D4FF00]' : 'bg-[#D4FF00]'}`} />
                <Text className="text-[#E4E4E7] text-sm">At least 1 uppercase letter</Text>
              </View>
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-3 ${hasNumber ? 'bg-[#D4FF00]' : 'bg-[#D4FF00]'}`} />
                <Text className="text-[#E4E4E7] text-sm">At least 1 number</Text>
              </View>
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-3 ${hasSpecial ? 'bg-[#D4FF00]' : 'bg-[#D4FF00]'}`} />
                <Text className="text-[#E4E4E7] text-sm">At least 1 special character</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Info Box */}
        <View className="bg-[#1A1A1A] border border-[#27272A] rounded-3xl p-5 mb-8 flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-[#D4FF00]/10 items-center justify-center mr-4 border border-[#D4FF00]/20">
            <Lock size={20} color="#D4FF00" weight="regular" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base mb-1">For your security</Text>
            <Text className="text-[#A1A1AA] text-sm leading-5">You may be asked to log in again after changing your password.</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <Pressable
          onPress={handleUpdate}
          disabled={isPending}
          className={`rounded-2xl py-4 flex-row justify-center items-center mb-4 ${
            isPending ? 'bg-[#D4FF00]/50' : 'bg-[#D4FF00] active:opacity-80'
          }`}
        >
          {isPending ? (
            <ActivityIndicator color="#000000" size="small" />
          ) : (
            <Text className="text-black font-semibold text-base">Update Password</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          disabled={isPending}
          className="bg-transparent border border-[#27272A] rounded-2xl py-4 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Cancel</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}
