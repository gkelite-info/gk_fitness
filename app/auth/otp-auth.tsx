import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  EnvelopeSimple,
  Key,
  ArrowRight,
  // DeviceMobile,
  Eye,
  EyeSlash,
  Barbell,
  ChartLine,
  Heart,
  CheckCircle,
  User,
  Phone,
  MapPin,
  Building,
  CaretLeft,
} from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { navigateBasedOnRole, createUser } from '@/helpers/otpHelper';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';
import { getSelectedGym, SelectedGym, clearSelectedGym } from '@/helpers/tenantHelper';

export default function OtpAuthScreen() {
  const { role, loading: userLoading, refreshUserContext, isGymSuspended } = useUser();
  const router = useRouter();
  const params = useLocalSearchParams();
  const typeId = params.type as string;
  const [purpose, setPurpose] = useState<'login' | 'signup'>('login');
  const [loginMethod /* , setLoginMethod */] = useState<'email' | 'phone'>('email');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // const [phoneStep, setPhoneStep] = useState<'request' | 'verify'>('request');
  // const [otpCode, setOtpCode] = useState('');

  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successBody, setSuccessBody] = useState('');
  const [selectedGym, setSelectedGymState] = useState<SelectedGym | null>(null);

  React.useEffect(() => {
    const fetchGym = async () => {
      const gym = await getSelectedGym();
      setSelectedGymState(gym);
    };
    fetchGym();
  }, []);

  React.useEffect(() => {
    const checkAndNavigate = async () => {
      if (!userLoading) {
        if (isGymSuspended) {
          await supabase.auth.signOut();
          toast.error('gym suspended due to subscription');
          setLoading(false);
        } else if (role) {
          navigateBasedOnRole(role);
        }
      }
    };

    checkAndNavigate();
  }, [role, userLoading, isGymSuspended]);

  const handleAuth = async () => {
    /*
    if (loginMethod === 'phone') {
      if (!phone.trim()) {
        return Alert.alert('Validation Error', 'Phone number is required.');
      }

      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });

        if (error) throw error;

        setPhoneStep('verify');
        Alert.alert('OTP Sent', 'An OTP has been sent to your phone number.');
      } catch (err: any) {
        Alert.alert('Authentication Error', err.message || 'Operation failed.');
      } finally {
        setLoading(false);
      }
      return;
    }
    */

    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail && loginMethod === 'email') {
      toast.error('Email Address is required.');
      return;
    }

    if (purpose === 'login') {
      if (!password) {
        toast.error('Password is required.');
        return;
      }
    }

    setLoading(true);

    try {
      if (purpose === 'login') {
        // console.log('[SignIn] Attempting signInWithPassword for email:', targetEmail);
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });

        if (authError) {
          let errorMessage = authError.message || 'Unable to sign in.';
          if (errorMessage.includes('sql:') || errorMessage.includes('converting NULL')) {
            errorMessage = 'Your account is currently recovering. Please try again or contact support.';
          }
          toast.error(errorMessage);
          console.error(errorMessage);
          setLoading(false);
          return;
        }

        // console.log('[SignIn] Auth success, user ID:', authData?.user?.id);

        if (authData?.user?.id) {
          const { data: profile, error: profileSelectError } = await supabase
            .from('users')
            .select('role')
            .eq('userId', authData.user.id)
            .maybeSingle();

          if (profileSelectError) {
            // console.error('[SignIn] Error checking profile in public.users:', profileSelectError);
          }

          let fetchedRole = profile?.role;

          if (!profile) {
            // console.log('[SignIn] Profile missing in public.users. Creating profile via createUser helper...');
            const metadata = authData.user.user_metadata || {};
            const userPhone = metadata.phone || (phone ? '+91' + phone.replace(/[^0-9]/g, '') : '');
            try {
              await createUser({
                userId: authData.user.id,
                name: metadata.name || name.trim() || 'User',
                email: authData.user.email || targetEmail,
                phone: userPhone,
                address: metadata.address || address.trim() || '',
                role: metadata.role || 'customer',
              });
              // console.log('[SignIn] Successfully created user profile via createUser:', insertedUser);
            } catch (insertError) {
              // console.error('[SignIn] Error creating user profile via createUser:', insertError);
            }
            fetchedRole = metadata.role || 'customer';
          } else {
            // console.log('[SignIn] Existing user profile found with role:', fetchedRole);
          }

          // Refresh context in background
          refreshUserContext();

        }

        toast.success('Signed in successfully!');
      } else if (purpose === 'signup') {
        if (!name.trim()) {
          toast.error('Name is required.');
          return;
        }
        if (!phone.trim()) {
          toast.error('Phone number is required.');
          return;
        }
        const cleanedPhone = phone.replace(/[^0-9]/g, '');
        if (cleanedPhone.length !== 10) {
          toast.error('Phone number must be exactly 10 digits.');
          return;
        }
        if (!password) {
          toast.error('Password is required.');
          return;
        }

        const hasMinLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasMinLength || !hasNumber || !hasUpper || !hasSpecial) {
          toast.error('Password must be at least 8 characters, and contain one number, one uppercase letter, and one special character.');
          return;
        }

        const fullPhone = '+91' + cleanedPhone;
        // console.log('[SignUp] Calling supabase.auth.signUp for:', { email: targetEmail, name: name.trim(), phone: fullPhone });

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: targetEmail,
          password: password,
          options: {
            data: {
              name: name.trim(),
              phone: fullPhone,
              address: address.trim(),
              role: 'customer',
            },
          },
        });

        if (authError) {
          // console.error('[SignUp] Auth signUp error:', authError);
          throw authError;
        }

        // console.log('[SignUp] Auth signUp success, user ID:', authData?.user?.id, 'Session active:', !!authData?.session);

        // Attempt inserting into public.users immediately via createUser helper
        if (authData?.user?.id) {
          // console.log('[SignUp] Attempting immediate insertion into public.users via createUser for userId:', authData.user.id);
          try {
            await createUser({
              userId: authData.user.id,
              name: name.trim(),
              email: targetEmail,
              phone: fullPhone,
              address: address.trim(),
              role: 'customer',
            });
            // console.log('[SignUp] Immediate insertion via createUser succeeded:', insertedData);
          } catch (insertError) {
            // console.error('[SignUp] Immediate insertion via createUser failed (likely RLS if unconfirmed):', insertError);
          }
        }

        setSuccessTitle('Verification Email Sent!');
        setSuccessBody('Please check your email inbox and spam folder to confirm your email address and activate your account.');
        setVerifiedSuccess(true);
      }
    } catch (err: any) {
      // console.error('[AuthError]', err);
      toast.error(err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  /*
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      return Alert.alert('Validation Error', 'Please enter the OTP.');
    }

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode.trim(),
        type: 'sms',
      });

      if (authError) throw authError;

      if (authData?.user?.id) {
        // Check if the user exists in public.users
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('userId', authData.user.id)
          .maybeSingle();

        let fetchedRole = profile?.role;

        if (!profile) {
          // Profile doesn't exist, create it as 'customer'
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                userId: authData.user.id,
                name: 'User',
                email: authData.user.email || '',
                phone: formattedPhone,
                role: 'customer',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]);

          if (insertError) {
            console.error('Error creating user profile:', insertError);
          }
          fetchedRole = 'customer';
        }

        // Refresh context in background
        refreshUserContext();

        if (fetchedRole) {
          navigateBasedOnRole(fetchedRole);
        }
      }
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };
  */

  if (verifiedSuccess) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center p-6">
        <View className="bg-[#141414] border border-[#D4FF00]/40 rounded-3xl p-6 items-center justify-center w-full py-10">
          <View className="w-16 h-16 rounded-full bg-[#D4FF00]/10 items-center justify-center mb-4 border border-[#D4FF00]/30">
            <CheckCircle size={36} color="#D4FF00" weight="fill" />
          </View>
          <Text className="text-white text-xl font-semibold mb-2">{successTitle}</Text>
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
            <Text className="text-black font-semibold text-sm">Back to Sign In</Text>
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
        <Pressable
          onPress={() => router.push('/auth/account-type')}
          className="absolute top-12 left-6 z-10 w-10 h-10 bg-[#121212] border border-[#1E1E1E] rounded-full items-center justify-center"
        >
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>
        <View className="h-[300px] w-full relative justify-end pb-8 px-6 mt-8">
          <View className="absolute top-0 right-0 bottom-0 opacity-40 items-end justify-center overflow-visible">
            <Image
              source={require('../../assets/login-posture.png')}
              className="w-[300px] h-full translate-x-4"
              resizeMode="cover"
            />
            <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090B] to-transparent" />
          </View>

          <Text className="text-white text-[32px] font-semibold mb-1 tracking-tight">
            {purpose === 'signup' ? 'Create Account' : 'Welcome Back!'}
          </Text>
          <Text className="text-[#8E8E93] text-[13px]">
            {purpose === 'signup'
              ? 'Sign up to start your fitness journey'
              : 'Sign in to continue your fitness journey'}
          </Text>
        </View>

        <View className="flex-1 px-6">
          {selectedGym && (
            <View className="bg-[#121212] border border-[#1E1E1E] rounded-xl p-4 mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-3 border border-[#2A2A2A] overflow-hidden">
                  {selectedGym.logo ? (
                    <Image source={{ uri: selectedGym.logo }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <Building size={20} color="#6B6B6B" />
                  )}
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-[#8E8E93] text-[10px] uppercase tracking-wider mb-0.5">Organization</Text>
                  <Text className="text-white text-sm font-semibold" numberOfLines={1}>{selectedGym.gymName}</Text>
                </View>
              </View>
              <Pressable
                onPress={async () => {
                  await clearSelectedGym();
                  router.replace('/auth/find-organization');
                }}
                className="bg-[#2A2A2A] px-3 py-1.5 rounded-lg active:opacity-80"
              >
                <Text className="text-white text-xs font-medium">Change</Text>
              </Pressable>
            </View>
          )}

          {/* {purpose === 'login' && (
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
          )} */}

          <View className="gap-3 mb-3">
            {/* {purpose === 'signup' && (
              <>
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <User size={18} color="#6B6B6B" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor="#6B6B6B"
                    autoCapitalize="words"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>

                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <Phone size={18} color="#6B6B6B" />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone Number"
                    placeholderTextColor="#6B6B6B"
                    keyboardType="phone-pad"
                    maxLength={10}
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>

                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <MapPin size={18} color="#6B6B6B" />
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Address (Optional)"
                    placeholderTextColor="#6B6B6B"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
              </>
            )} */}

            {loginMethod === 'email' && (
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

            {/* {(purpose === 'login' && loginMethod === 'phone' && phoneStep === 'request') && (
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

            {(purpose === 'login' && loginMethod === 'phone' && phoneStep === 'verify') && (
              <View className="gap-3">
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <Key size={18} color="#6B6B6B" />
                  <TextInput
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#6B6B6B"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
                <Pressable onPress={() => setPhoneStep('request')} className="self-end">
                  <Text className="text-[#D4FF00] text-xs font-medium">Change Phone Number</Text>
                </Pressable>
              </View>
            )} */}

            {loginMethod === 'email' && (
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

          {/* {purpose === 'login' && loginMethod === 'email' && (
            <Pressable onPress={() => router.push('/auth/forgot-password')} className="self-end mb-6">
              <Text className="text-[#D4FF00] text-xs font-medium">Forgot Password?</Text>
            </Pressable>
          )} */}

          <Pressable
            onPress={handleAuth}
            disabled={loading}
            className="bg-[#D4FF00] rounded-2xl py-3.5 flex-row items-center justify-center active:opacity-80 mt-1"
          >
            {loading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <View className="flex-row items-center">
                <Text className="text-black font-semibold text-[15px] mr-2">
                  Sign In
                </Text>
                <ArrowRight size={16} color="#000000" weight="bold" />
              </View>
            )}
          </Pressable>

          {/* {purpose === 'login' ? (
            <Pressable onPress={() => setPurpose('signup')} className="self-center mt-6">
              <Text className="text-[#8E8E93] text-sm">
                Don&apos;t have an account? <Text className="text-[#D4FF00] font-semibold">Sign Up</Text>
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setPurpose('login')} className="self-center mt-6">
              <Text className="text-[#8E8E93] text-sm">
                Already have an account? <Text className="text-[#D4FF00] font-semibold">Sign In</Text>
              </Text>
            </Pressable>
          )} */}

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

          {purpose === 'login' && (
            <Pressable onPress={() => router.push({ pathname: '/auth/signup', params: { type: typeId } })} className="self-center mt-2 mb-4">
              <Text className="text-[#8E8E93] text-sm">
                Don't have an account? <Text className="text-[#C3F400] font-semibold">Sign Up</Text>
              </Text>
            </Pressable>
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
