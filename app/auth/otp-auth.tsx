import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  EnvelopeSimple,
  Key,
  ArrowRight,
  DeviceMobile,
  Eye,
  EyeSlash,
  Barbell,
  ChartLine,
  Heart,
  CheckCircle,
} from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { OtpPurpose, getUserRole } from '@/helpers/otpHelper';
import { Stack, router } from 'expo-router';
import { useUser } from '@/context/UserContext';

export default function OtpAuthScreen() {
  const { role, loading: userLoading, refreshUserContext } = useUser();
  const [purpose, setPurpose] = useState<'login' | 'reset_password'>('login');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successBody, setSuccessBody] = useState('');

  React.useEffect(() => {
    if (!userLoading && role) {
      console.log('[OtpAuthScreen] Active user found in context. Routing role:', role);
      if (role === 'superadmin') {
        router.replace('/(superadmin)/dashboard');
      } else if (role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else if (role === 'doctor') {
        router.replace('/(doctor)/patients');
      } else {
        router.replace('/(customer)/home');
      }
    }
  }, [role, userLoading]);

  const handleAuth = async () => {
    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail && loginMethod === 'email') {
      return Alert.alert('Validation Error', 'Email Address is required.');
    }
    
    if (purpose === 'login') {
      if (!password) return Alert.alert('Validation Error', 'Password is required.');
    }

    setLoading(true);

    try {
      if (purpose === 'login') {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });

        if (authError) {
          throw authError;
        }

        // Refresh UserContext immediately on successful sign in
        await refreshUserContext();

        setSuccessTitle('Login Successful!');
        setSuccessBody(`Welcome back, ${authData.user?.email || 'User'}! You are successfully authenticated.`);
        setVerifiedSuccess(true);

      } else if (purpose === 'reset_password') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(targetEmail);

        if (authError) {
          throw authError;
        }

        setSuccessTitle('Reset Link Sent!');
        setSuccessBody('If the email is registered, you will receive a link to reset your password shortly.');
        setVerifiedSuccess(true);
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (verifiedSuccess) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center p-6">
        <View className="bg-[#141414] border border-[#D4FF00]/40 rounded-3xl p-6 items-center justify-center w-full py-10">
          <View className="w-16 h-16 rounded-full bg-[#D4FF00]/10 items-center justify-center mb-4 border border-[#D4FF00]/30">
            <CheckCircle size={36} color="#D4FF00" weight="fill" />
          </View>
          <Text className="text-white text-xl font-bold mb-2">{successTitle}</Text>
          <Text className="text-[#8E8E93] text-xs text-center px-4 mb-6 leading-5">
            {successBody}
          </Text>
          <Pressable
            onPress={() => {
              setVerifiedSuccess(false);
              setPurpose('login');
              setPassword('');
            }}
            className="bg-[#D4FF00] rounded-xl py-3 px-6 active:opacity-90 w-full items-center"
          >
            <Text className="text-black font-bold text-sm">Back to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#09090B]"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View className="h-[300px] w-full relative justify-end pb-8 px-6">
          <View className="absolute top-0 right-0 bottom-0 opacity-40 items-end justify-center overflow-visible">
            <Image
              source={require('../../assets/login-posture.png')}
              className="w-[300px] h-full translate-x-4"
              resizeMode="cover"
            />
            <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090B] to-transparent" />
          </View>

          <Text className="text-white text-[32px] font-semibold mb-1 tracking-tight">
            {purpose === 'reset_password' ? 'Reset Password' : 'Welcome Back!'}
          </Text>
          <Text className="text-[#8E8E93] text-[13px]">
            {purpose === 'reset_password'
                ? 'Enter your email to receive a reset link'
                : 'Sign in to continue your fitness journey'}
          </Text>
        </View>

        <View className="flex-1 px-6">
          {purpose === 'login' && (
            <View className="flex-row bg-[#121212] border border-[#1E1E1E] rounded-xl mb-6 overflow-hidden">
              <Pressable
                onPress={() => setLoginMethod('email')}
                className="flex-1 py-4 items-center justify-center relative"
              >
                <Text className={`text-[13px] tracking-wide ${loginMethod === 'email' ? 'text-[#D4FF00] font-semibold' : 'text-[#6B6B6B] font-medium'}`}>
                  Email
                </Text>
                {loginMethod === 'email' && (
                  <View className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4FF00]" />
                )}
              </Pressable>

              <Pressable
                onPress={() => setLoginMethod('phone')}
                className="flex-1 py-4 items-center justify-center relative"
              >
                <Text className={`text-[13px] tracking-wide ${loginMethod === 'phone' ? 'text-[#D4FF00] font-semibold' : 'text-[#6B6B6B] font-medium'}`}>
                  Phone
                </Text>
                {loginMethod === 'phone' && (
                  <View className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4FF00]" />
                )}
              </Pressable>
            </View>
          )}

          <View className="gap-3 mb-3">
            {(purpose === 'reset_password' || (purpose === 'login' && loginMethod === 'email')) && (
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <EnvelopeSimple size={18} color="#6B6B6B" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email Address"
                  placeholderTextColor="#6B6B6B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            )}

            {(purpose === 'login' && loginMethod === 'phone') && (
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <DeviceMobile size={18} color="#6B6B6B" />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone Number"
                  placeholderTextColor="#6B6B6B"
                  keyboardType="phone-pad"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            )}

            {purpose !== 'reset_password' && (
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <Key size={18} color="#6B6B6B" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#6B6B6B"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                  {showPassword ? (
                    <Eye size={18} color="#6B6B6B" />
                  ) : (
                    <EyeSlash size={18} color="#6B6B6B" />
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {purpose === 'login' && (
            <Pressable onPress={() => setPurpose('reset_password')} className="self-end mb-6">
              <Text className="text-[#D4FF00] text-xs font-medium">Forgot Password?</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleAuth}
            disabled={loading}
            className="bg-[#D4FF00] rounded-2xl py-3.5 flex-row items-center justify-center active:opacity-80 mt-1"
          >
            {loading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <View className="flex-row items-center">
                <Text className="text-black font-extrabold text-[15px] mr-2">
                  {purpose === 'login' ? 'Sign In' : 'Send Link'}
                </Text>
                <ArrowRight size={16} color="#000000" weight="bold" />
              </View>
            )}
          </Pressable>

          {purpose === 'login' && (
            <View className="bg-[#121212] border border-[#1E1E1E] rounded-3xl p-5 mt-6 flex-row justify-between mb-4">

              <View className="items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mb-2">
                  <Barbell size={20} color="#D4FF00" weight="regular" />
                </View>
                <Text className="text-[#8E8E93] text-[9px] text-center font-medium leading-[14px]">Personalized{'\n'}Workouts</Text>
              </View>

              <View className="items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mb-2">
                  <ChartLine size={20} color="#D4FF00" weight="regular" />
                </View>
                <Text className="text-[#8E8E93] text-[9px] text-center font-medium leading-[14px]">Track Your{'\n'}Progress</Text>
              </View>

              <View className="items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mb-2">
                  <Heart size={20} color="#D4FF00" weight="regular" />
                </View>
                <Text className="text-[#8E8E93] text-[9px] text-center font-medium leading-[14px]">Achieve Your{'\n'}Goals</Text>
              </View>

            </View>
          )}

          <View className="flex-row justify-center items-center pb-8 mt-2">
            <Barbell size={14} color="#D4FF00" weight="fill" />
            <Text className="text-[#6B6B6B] text-xs ml-1.5 font-medium">Stronger every day, better you.</Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
