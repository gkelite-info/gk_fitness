import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Lock, Eye, EyeClosed, ShieldCheck, Check } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import { executeChangePassword } from '@/helpers/auth/passwordHelper';
import { SafePasswordInput } from '@/components/ui/SafePasswordInput';
import { toast } from '@/lib/toast';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId, email, phone, role, setFallbackUserSession } = useUser();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const scrollViewRef = useRef<ScrollView>(null);

  const clearForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  useFocusEffect(
    useCallback(() => {
      setStep(1);
      clearForm();
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);

      return () => {
        clearTimeout(timer);
      };
    }, [])
  );

  useEffect(() => {
    const onBackPress = () => {
      clearForm();
      router.navigate('/(customer)/manage-account');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const requirementsMet = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  const handleUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      clearForm();
      toast.error('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      clearForm();
      toast.error('New passwords do not match.');
      return;
    }
    if (!requirementsMet) {
      clearForm();
      toast.error('Please ensure your new password meets all requirements.');
      return;
    }

    setIsPending(true);
    try {
      const result = await executeChangePassword({
        userId,
        email,
        phone,
        role,
        currentPassword,
        newPassword,
        logTag: 'ChangePassword',
      });

      if (setFallbackUserSession && result.userId) {
        try {
          await setFallbackUserSession({
            id: result.userId,
            email: result.email || email || '',
            role: result.role || 'individual',
            name: result.name || undefined,
          });
        } catch (fbErr) {
          console.warn('[ChangePassword] Notice syncing fallback session:', fbErr);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      if (result.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', 'id', result.userId] });
      }
      if (result.email) {
        queryClient.invalidateQueries({ queryKey: ['user', 'email', result.email.toLowerCase()] });
      }

      clearForm();
      toast.success('Password updated successfully!');
      setStep(2);
    } catch (err: any) {
      console.error('[ChangePassword] Error during change password:', err);
      clearForm();
      toast.error(err.message || 'An unexpected error occurred.');
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

          <Text className="text-white text-3xl font-semibold text-center mb-4 leading-9">
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
      <View className="flex-row items-center px-5 py-4">
        <Pressable
          onPress={() => {
            clearForm();
            router.navigate('/(customer)/manage-account');
          }}
          disabled={isPending}
          className="p-2 bg-[#1A1A1A] rounded-full active:opacity-70 mr-4"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <View>
          <Text className="text-white text-2xl font-semibold">Change Password</Text>
          <Text className="text-[#8E8E93] text-sm mt-0.5">Update your account password securely.</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: Math.max(insets.bottom, 20) + 120,
        }}
      >

        <View className="bg-[#1A1A1A] border border-[#27272A] rounded-3xl p-2 mb-6">
          <View className="flex-row items-center px-4 py-3 border-b border-[#27272A]">
            <View className="mr-3">
              <Lock size={20} color="#D4FF00" weight="regular" />
            </View>
            <SafePasswordInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current Password"
              placeholderTextColor="#555555"
              showPassword={showCurrent}
              editable={!isPending}
              className="flex-1 text-white text-base py-3 font-sans"
            />
            <Pressable onPress={() => setShowCurrent(!showCurrent)} className="p-2 opacity-50 active:opacity-100">
              {showCurrent ? <Eye size={20} color="#FFFFFF" /> : <EyeClosed size={20} color="#FFFFFF" />}
            </Pressable>
          </View>

          <View className="flex-row items-center px-4 py-3 border-b border-[#27272A]">
            <View className="mr-3">
              <Lock size={20} color="#D4FF00" weight="regular" />
            </View>
            <SafePasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor="#555555"
              showPassword={showNew}
              editable={!isPending}
              className="flex-1 text-white text-base py-3 font-sans"
            />
            <Pressable onPress={() => setShowNew(!showNew)} className="p-2 opacity-50 active:opacity-100">
              {showNew ? <Eye size={20} color="#FFFFFF" /> : <EyeClosed size={20} color="#FFFFFF" />}
            </Pressable>
          </View>

          <View className="flex-row items-center px-4 py-3">
            <View className="mr-3">
              <Lock size={20} color="#D4FF00" weight="regular" />
            </View>
            <SafePasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              placeholderTextColor="#555555"
              showPassword={showConfirm}
              editable={!isPending}
              className="flex-1 text-white text-base py-3 font-sans"
            />
            <Pressable onPress={() => setShowConfirm(!showConfirm)} className="p-2 opacity-50 active:opacity-100">
              {showConfirm ? <Eye size={20} color="#FFFFFF" /> : <EyeClosed size={20} color="#FFFFFF" />}
            </Pressable>
          </View>
        </View>

        <View className="bg-[#1A1A1A] border border-[#27272A] rounded-3xl p-5 mb-5 flex-row items-start">
          <View className="w-10 h-10 rounded-xl bg-[#D4FF00]/10 items-center justify-center mr-4 border border-[#D4FF00]/20">
            <ShieldCheck size={20} color="#D4FF00" weight="regular" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base mb-1">Password Requirements</Text>
            <Text className="text-[#A1A1AA] text-sm leading-5 mb-4">Your password must meet the following criteria:</Text>

            <View className="gap-2.5">
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-3 ${hasMinLength ? 'bg-[#D4FF00]' : 'bg-[#3F3F46]'}`} />
                <Text className={`text-sm ${hasMinLength ? 'text-[#E4E4E7]' : 'text-[#71717A]'}`}>Minimum 8 characters</Text>
              </View>
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-3 ${hasUppercase ? 'bg-[#D4FF00]' : 'bg-[#3F3F46]'}`} />
                <Text className={`text-sm ${hasUppercase ? 'text-[#E4E4E7]' : 'text-[#71717A]'}`}>At least 1 uppercase letter</Text>
              </View>
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-3 ${hasNumber ? 'bg-[#D4FF00]' : 'bg-[#3F3F46]'}`} />
                <Text className={`text-sm ${hasNumber ? 'text-[#E4E4E7]' : 'text-[#71717A]'}`}>At least 1 number</Text>
              </View>
              <View className="flex-row items-center">
                <View className={`w-1.5 h-1.5 rounded-full mr-3 ${hasSpecial ? 'bg-[#D4FF00]' : 'bg-[#3F3F46]'}`} />
                <Text className={`text-sm ${hasSpecial ? 'text-[#E4E4E7]' : 'text-[#71717A]'}`}>At least 1 special character</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-[#1A1A1A] border border-[#27272A] rounded-3xl p-5 mb-8 flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-[#D4FF00]/10 items-center justify-center mr-4 border border-[#D4FF00]/20">
            <Lock size={20} color="#D4FF00" weight="regular" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base mb-1">For your security</Text>
            <Text className="text-[#A1A1AA] text-sm leading-5">You may be asked to log in again after changing your password.</Text>
          </View>
        </View>

        <Pressable
          onPress={handleUpdate}
          disabled={isPending}
          className={`rounded-2xl py-4 flex-row justify-center items-center mb-4 ${isPending ? 'bg-[#D4FF00]/50' : 'bg-[#D4FF00] active:opacity-80'
            }`}
        >
          {isPending ? (
            <ActivityIndicator color="#000000" size="small" />
          ) : (
            <Text className="text-black font-semibold text-base">Update Password</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            clearForm();
            router.back();
          }}
          disabled={isPending}
          className="bg-transparent border border-[#27272A] rounded-2xl py-4 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">Cancel</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}
