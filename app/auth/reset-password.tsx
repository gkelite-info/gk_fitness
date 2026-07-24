import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, Stack } from 'expo-router';
import { CaretLeft, Lock, Eye, EyeSlash, CheckCircle, ArrowRight } from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '@/lib/toast';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation rules
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isFormValid = hasMinLength && hasUppercase && hasNumber && hasSpecialChar && password === confirmPassword && password.length > 0;

  const strength = useMemo(() => {
    let score = 0;
    if (hasMinLength) score++;
    if (hasUppercase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;
    return score;
  }, [hasMinLength, hasUppercase, hasNumber, hasSpecialChar]);

  const getStrengthText = () => {
    if (password.length === 0) return '';
    if (strength <= 1) return 'Weak';
    if (strength <= 3) return 'Fair';
    return 'Strong';
  };

  const getStrengthColor = () => {
    if (password.length === 0) return '#333333';
    if (strength <= 1) return '#FF3B30'; // Red
    if (strength <= 3) return '#FF9500'; // Orange
    return '#D4FF00'; // Green
  };

  const handleSavePassword = async () => {
    if (!isFormValid) {
      toast.error('Please ensure all requirements are met and passwords match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Password updated successfully.');
      setTimeout(() => {
        router.replace('/auth/otp-auth');
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#09090B]"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View className="flex-1 px-6 pb-8" style={{ paddingTop: Math.max(insets.top + 16, 48) }}>
          
          <Pressable onPress={() => router.back()} className="mb-6 self-start p-2 -ml-2">
            <CaretLeft size={24} color="#FFFFFF" weight="bold" />
          </Pressable>

          <View className="items-center mb-8 mt-2">
            <View className="w-20 h-20 rounded-full border border-[#D4FF00] items-center justify-center bg-[#D4FF00]/10">
              <View className="w-16 h-16 rounded-full border border-[#D4FF00]/50 items-center justify-center">
                <Lock size={32} color="#D4FF00" weight="fill" />
              </View>
            </View>
          </View>

          <Text className="text-white text-3xl font-bold tracking-tight text-center mb-3">
            Reset Password
          </Text>

          <Text className="text-[#8E8E93] text-[14px] text-center leading-5 mb-8">
            Enter a new password for your account.{'\n'}
            Make sure it&apos;s strong and secure.
          </Text>

          {/* New Password */}
          <Text className="text-white text-sm font-semibold mb-2">
            New Password
          </Text>
          <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 mb-2">
            <Lock size={20} color="#D4FF00" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter new password"
              placeholderTextColor="#6B6B6B"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              className="flex-1 text-white text-[14px] p-0 font-medium"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
              {showPassword ? (
                <Eye size={20} color="#6B6B6B" />
              ) : (
                <EyeSlash size={20} color="#6B6B6B" />
              )}
            </Pressable>
          </View>

          {/* Password Strength Indicator */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[#6B6B6B] text-[12px]">Password Strength</Text>
            <Text style={{ color: getStrengthColor() }} className="text-[12px] font-bold">
              {getStrengthText()}
            </Text>
          </View>
          <View className="flex-row gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((level) => (
              <View 
                key={level} 
                className="h-1 flex-1 rounded-full"
                style={{ 
                  backgroundColor: password.length > 0 && level <= (strength === 4 ? 5 : strength) ? getStrengthColor() : '#333333' 
                }}
              />
            ))}
          </View>

          {/* Confirm Password */}
          <Text className="text-white text-sm font-semibold mb-2">
            Confirm Password
          </Text>
          <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 mb-6">
            <Lock size={20} color="#D4FF00" />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter confirm password"
              placeholderTextColor="#6B6B6B"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              className="flex-1 text-white text-[14px] p-0 font-medium"
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
              {showConfirmPassword ? (
                <Eye size={20} color="#6B6B6B" />
              ) : (
                <EyeSlash size={20} color="#6B6B6B" />
              )}
            </Pressable>
          </View>

          {/* Validation Checklist */}
          <View className="bg-[#121212] border border-[#1E1E1E] rounded-2xl p-5 mb-8">
            <Text className="text-[#D4FF00] text-[13px] font-bold mb-4">Password must contain:</Text>
            <View className="flex-row flex-wrap">
              <View className="w-1/2 mb-3 flex-row items-center gap-2">
                <CheckCircle size={16} color={hasMinLength ? "#D4FF00" : "#6B6B6B"} weight={hasMinLength ? "fill" : "regular"} />
                <Text className="text-[#8E8E93] text-[12px]">At least 8 characters</Text>
              </View>
              <View className="w-1/2 mb-3 flex-row items-center gap-2">
                <CheckCircle size={16} color={hasNumber ? "#D4FF00" : "#6B6B6B"} weight={hasNumber ? "fill" : "regular"} />
                <Text className="text-[#8E8E93] text-[12px]">One number</Text>
              </View>
              <View className="w-1/2 flex-row items-center gap-2">
                <CheckCircle size={16} color={hasUppercase ? "#D4FF00" : "#6B6B6B"} weight={hasUppercase ? "fill" : "regular"} />
                <Text className="text-[#8E8E93] text-[12px]">One uppercase letter</Text>
              </View>
              <View className="w-1/2 flex-row items-center gap-2">
                <CheckCircle size={16} color={hasSpecialChar ? "#D4FF00" : "#6B6B6B"} weight={hasSpecialChar ? "fill" : "regular"} />
                <Text className="text-[#8E8E93] text-[12px]">One special character</Text>
              </View>
            </View>
          </View>

          <View className="flex-1 justify-end">
            <Pressable
              onPress={handleSavePassword}
              disabled={loading || !isFormValid}
              className={`rounded-2xl py-4 flex-row items-center justify-center active:opacity-80 ${isFormValid ? 'bg-[#D4FF00]' : 'bg-[#D4FF00]/50'}`}
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-black font-bold text-[16px] mr-2">
                    Save Password
                  </Text>
                  <ArrowRight size={18} color="#000000" weight="bold" />
                </View>
              )}
            </Pressable>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
