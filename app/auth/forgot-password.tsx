import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, Stack } from 'expo-router';
import { CaretLeft, EnvelopeSimple, ShieldCheck, ArrowRight } from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '@/lib/toast';
import * as Linking from 'expo-linking';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendLink = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = Linking.createURL('/auth/reset-password');
      console.log('--- EXPO LINKING URL TO WHITELIST IN SUPABASE ---');
      console.log(redirectUrl);
      console.log('------------------------------------------------');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (error) throw error;

      toast.success('Reset link sent to your email.');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link.');
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

          <Text className="text-white text-[32px] font-semibold tracking-tight">
            Forgot{'\n'}
            <Text className="text-[#D4FF00] text-4xl font-semibold">Password?</Text>
          </Text>

          <Text className="text-[#8E8E93] text-[14px] mt-4 leading-6 mb-8">
            No worries! Enter your email address and we&apos;ll send you a link to reset your password.
          </Text>

          <Text className="text-white text-sm font-semibold mb-3">
            Email Address
          </Text>

          <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 mb-6">
            <EnvelopeSimple size={20} color="#D4FF00" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#6B6B6B"
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 text-white text-[14px] p-0 font-medium"
            />
          </View>

          <Text className="text-[#6B6B6B] text-[12px] mb-6">
            We&apos;ll send you a link to verify your identity.
          </Text>

          <View className="bg-[#121212] border border-[#1E1E1E] rounded-2xl p-5 flex-row gap-4 mb-8">
            <View className="w-10 h-10 rounded-full border border-[#D4FF00] items-center justify-center">
              <ShieldCheck size={20} color="#D4FF00" weight="regular" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold mb-1">Keep your account secure</Text>
              <Text className="text-[#8E8E93] text-[12px] leading-5">
                For your safety, we&apos;ll only send reset links to registered email addresses. Please check your spam or inbox to get the forgot password link.
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-end">
            <Pressable
              onPress={handleSendLink}
              disabled={loading}
              className="bg-[#D4FF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-black font-semibold text-[16px] mr-2">
                    Send Link
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
