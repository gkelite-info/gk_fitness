import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  CaretLeft,
  User,
  EnvelopeSimple,
  Phone,
  MapPin,
  Flag,
  MapTrifold,
  GlobeHemisphereWest,
  Buildings,
  LockKey,
  Eye,
  EyeSlash,
  Barbell,
  Globe,
  MagnifyingGlass,
  X,
  CaretDown,
  UploadSimple
} from 'phosphor-react-native';
import { Country, State } from 'country-state-city';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { useCreateUser } from '@/hooks/auth/useCreateUser';
import { useCreateGymLead } from '@/hooks/gymLeads/useCreateGymLead';
import { useUploadGymLeadLogo } from '@/hooks/gymLeads/useUploadGymLeadLogo';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

const SearchableModalPicker = ({ visible, onClose, data, onSelect, placeholder, selectedValue }: any) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter((item: any) => item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/80">
        <View className="bg-[#121212] rounded-t-3xl h-[80%] p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-semibold">{placeholder}</Text>
            <Pressable onPress={onClose} className="p-2 -mr-2">
              <X size={24} color="#6B6B6B" />
            </Pressable>
          </View>
          <View className="flex-row items-center bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 mb-4">
            <MagnifyingGlass size={20} color="#6B6B6B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search..."
              placeholderTextColor="#6B6B6B"
              className="flex-1 text-white text-[15px] p-0 ml-3 font-medium"
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredData}
            keyExtractor={item => item.value}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onSelect(item.value); onClose(); setSearchQuery(''); }}
                className="py-4 border-b border-[#1E1E1E]"
              >
                <Text className={`text-[15px] ${selectedValue === item.value ? 'text-[#C3F400] font-semibold' : 'text-white'}`}>{item.label}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text className="text-[#8E8E93] text-center mt-10 text-[15px]">No results found.</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const typeId = (params.type as string) || 'individual';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [gymName, setGymName] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [branches, setBranches] = useState('');
  const [establishYear, setEstablishYear] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const { mutateAsync: createUser, isPending: isCreateUserPending } = useCreateUser();
  const { mutateAsync: createGymLead, isPending: isCreateGymLeadPending } = useCreateGymLead();
  const { mutateAsync: uploadGymLeadLogo, isPending: isUploadLogoPending } = useUploadGymLeadLogo();
  const isPending = isCreateUserPending || isCreateGymLeadPending || isUploadLogoPending;

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const compressedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setLogo(compressedImage.uri);
      }
    } catch (error) {
      console.error('[pickImage] Error:', error);
      toast.error('Failed to pick image');
    }
  };

  const handleSignup = async () => {
    if (typeId === 'owner') {
      if (!fullName || !gymName || !email || !phone || !address || !country || !state || !city || !pinCode || !branches || !password || !confirmPassword) {
        toast.error('Please fill in all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        let finalLogoUrl = logo || null;

        const isLocalLogo = logo && !logo.startsWith('http');
        if (isLocalLogo) {
          try {
            const uploadedUrl = await uploadGymLeadLogo(logo);
            if (uploadedUrl) {
              finalLogoUrl = uploadedUrl;
            }
          } catch (uploadError) {
            console.error('[handleSignup] Logo upload failed:', uploadError);
            toast.error('Failed to upload logo, continuing without it.');
            finalLogoUrl = null;
          }
        }

        const payload = {
          fullName,
          gymName,
          email,
          gymEmail: email,
          mobile: phone,
          gymMobile: phone,
          alternateMobile: alternatePhone || null,
          gymAlternateMobile: alternatePhone || null,
          address,
          gymAddress: address,
          gymState: state,
          gymCity: city,
          pincode: parseInt(pinCode, 10),
          gymPincode: parseInt(pinCode, 10),
          noOfBranches: parseInt(branches, 10),
          establishYear: establishYear || new Date().getFullYear().toString(),
          note: note,
          website: website || null,
          logo: finalLogoUrl,
          status: 'submitted' as const,
          password: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password),
        };

        const result = await createGymLead(payload);

        toast.success('Registration request sent successfully! We will get back to you.');
        if (result && result.gymLeadId) {
          router.replace(`/auth/registration-status?gymLeadId=${result.gymLeadId}`);
        } else {
          router.replace('/auth/otp-auth');
        }
      } catch (error: any) {
        console.error('[handleSignup] Error creating gym lead:', error);
        console.error('[handleSignup] Error full details:', JSON.stringify(error, null, 2));
        toast.error('Failed to submit request. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (typeId === 'individual') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              name: fullName.trim(),
              phone: phone.trim(),
              role: 'customer',
            },
          },
        });

        if (authError) {
          console.error('[handleSignup] Auth signUp error:', authError);
          throw authError;
        }

        if (!authData?.user?.id) {
          throw new Error('Authentication failed to generate a user ID.');
        }

        const result = await createUser({
          userId: authData.user.id,
          name: fullName,
          email,
          phone,
          address,
          country,
          state,
          city,
          pincode: pinCode ? parseInt(pinCode, 10) : null,
          role: 'customer'
        });
        toast.success('Account created! Please check your email to verify.');
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/auth/otp-auth');
        }
      } else {
        toast.error('Only individual customer signup is implemented currently.');
      }
    } catch (error: any) {
      console.error('[handleSignup] Error creating account:', error);
      let errorMessage = 'Failed to create account. Please try again.';

      if (error?.code === '42501') {
        errorMessage = 'Database security policy blocked this action. Please contact support.';
      } else if (error?.code === '23505') {
        if (error.message?.includes('email')) {
          errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.message?.includes('phone')) {
          errorMessage = 'This phone number is already registered. Please login instead.';
        } else {
          errorMessage = 'An account with these details already exists.';
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeLabel = () => {
    switch (typeId) {
      case 'owner': return 'Gym Owner';
      case 'global_trainer': return 'Global Trainer';
      case 'individual':
      default: return 'Individual Customer';
    }
  };

  const getAccountTypeIcon = () => {
    switch (typeId) {
      case 'owner': return Buildings;
      case 'global_trainer': return Globe;
      case 'individual':
      default: return User;
    }
  };

  const AccountIcon = getAccountTypeIcon();

  const countries = Country.getAllCountries().map(c => ({ label: c.name, value: c.isoCode }));
  const states = country ? State.getStatesOfCountry(country).map(s => ({ label: s.name, value: s.isoCode })) : [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-[#09090B]">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="pt-14 pb-6">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 bg-[#121212] border border-[#1E1E1E] rounded-full items-center justify-center mb-6"
            >
              <CaretLeft size={20} color="#FFFFFF" />
            </Pressable>

            <View className={typeId === 'owner' ? 'items-center' : ''}>
              <Text className={`text-white text-3xl font-semibold mb-2 ${typeId === 'owner' ? 'text-center' : ''}`}>
                {typeId === 'owner' ? (
                  <>
                    <Text className="text-[#C3F400] text-3xl">Gym Owner</Text> Registration
                  </>
                ) : (
                  <>
                    <Text className="text-[#C3F400] text-3xl">Create</Text> Your Account
                  </>
                )}
              </Text>
              <Text className={`text-[#8E8E93] text-[13px] ${typeId === 'owner' ? 'text-center' : ''}`}>
                {typeId === 'owner'
                  ? 'Fill in your details to send a request.\nOur team will review and get back to you.'
                  : 'Join GK-Gym Life and start your fitness journey.'}
              </Text>
              {typeId === 'owner' && (
                <View className="h-1 w-12 bg-[#C3F400] rounded-full mt-4" />
              )}
            </View>
          </View>

          {typeId !== 'owner' && (
            <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl p-4 mb-8">
              <View className="w-10 h-10 rounded-full border border-[#D4FF00]/30 items-center justify-center bg-[#D4FF00]/10 mr-4">
                <AccountIcon size={20} color="#C3F400" weight="regular" />
              </View>
              <Text className="text-white text-base font-semibold">{getAccountTypeLabel()}</Text>
            </View>
          )}

          <View className="gap-5 mb-8">
            {typeId === 'owner' && (
              <View>
                <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Category</Text>
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 justify-between">
                  <TextInput
                    value="Gym"
                    editable={false}
                    className="flex-1 text-[#6B6B6B] text-[14px] p-0 font-medium"
                  />
                  <CaretDown size={18} color="#6B6B6B" />
                </View>
              </View>
            )}

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">{typeId === 'owner' ? 'Owner Name' : 'Full Name'}</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <User size={18} color="#6B6B6B" />
                <TextInput
                  value={fullName}
                  onChangeText={(val) => setFullName(val.replace(/[0-9]/g, ''))}
                  placeholder={typeId === 'owner' ? "Enter Owner name" : "Enter your full name"}
                  placeholderTextColor="#6B6B6B"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            {typeId === 'owner' && (
              <View>
                <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Gym Name</Text>
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <User size={18} color="#6B6B6B" />
                  <TextInput
                    value={gymName}
                    onChangeText={setGymName}
                    placeholder="Enter gym name"
                    placeholderTextColor="#6B6B6B"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
              </View>
            )}

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">{typeId === 'owner' ? 'Gym Email' : 'Email'}</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <EnvelopeSimple size={18} color="#6B6B6B" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={typeId === 'owner' ? "Enter gym email" : "Enter your email"}
                  placeholderTextColor="#6B6B6B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Mobile Number</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <Phone size={18} color="#6B6B6B" />
                <TextInput
                  value={phone}
                  onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#6B6B6B"
                  keyboardType="phone-pad"
                  maxLength={10}
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            {typeId === 'owner' && (
              <View>
                <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Alternate Mobile Number <Text className="text-[#6B6B6B]">(Optional)</Text></Text>
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <Phone size={18} color="#6B6B6B" />
                  <TextInput
                    value={alternatePhone}
                    onChangeText={(val) => setAlternatePhone(val.replace(/[^0-9]/g, ''))}
                    placeholder="Enter alternate mobile number"
                    placeholderTextColor="#6B6B6B"
                    keyboardType="phone-pad"
                    maxLength={10}
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
              </View>
            )}

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Address</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 mb-3">
                <MapPin size={18} color="#6B6B6B" />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="House / Flat / Building / Street"
                  placeholderTextColor="#6B6B6B"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Pressable onPress={() => setCountryModalVisible(true)}>
                    <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                      <Flag size={18} color="#6B6B6B" />
                      <TextInput
                        value={country ? Country.getCountryByCode(country)?.name : ''}
                        placeholder="Country"
                        placeholderTextColor="#6B6B6B"
                        className="flex-1 text-white text-[14px] p-0 font-medium"
                        editable={false}
                        pointerEvents="none"
                      />
                    </View>
                  </Pressable>

                  <SearchableModalPicker
                    visible={countryModalVisible}
                    onClose={() => setCountryModalVisible(false)}
                    data={countries}
                    onSelect={(val: string) => { setCountry(val); setState(''); }}
                    placeholder="Select Country"
                    selectedValue={country}
                  />
                </View>

                <View className="flex-1">
                  <Pressable onPress={() => { if (country) setStateModalVisible(true); }}>
                    <View className={`flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 ${!country ? 'opacity-50' : ''}`}>
                      <MapTrifold size={18} color="#6B6B6B" />
                      <TextInput
                        value={country && state ? State.getStateByCodeAndCountry(state, country)?.name : ''}
                        placeholder="State"
                        placeholderTextColor="#6B6B6B"
                        className="flex-1 text-white text-[14px] p-0 font-medium"
                        editable={false}
                        pointerEvents="none"
                      />
                    </View>
                  </Pressable>

                  <SearchableModalPicker
                    visible={stateModalVisible}
                    onClose={() => setStateModalVisible(false)}
                    data={states}
                    onSelect={(val: string) => setState(val)}
                    placeholder="Select State"
                    selectedValue={state}
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 flex-1">
                  <Buildings size={18} color="#6B6B6B" />
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor="#6B6B6B"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 flex-1">
                  <GlobeHemisphereWest size={18} color="#6B6B6B" />
                  <TextInput
                    value={pinCode}
                    onChangeText={(val) => setPinCode(val.replace(/[^0-9]/g, ''))}
                    placeholder="PIN Code"
                    placeholderTextColor="#6B6B6B"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
              </View>
            </View>

            {typeId === 'owner' && (
              <>
                <View>
                  <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">No. of Branches</Text>
                  <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                    <TextInput
                      value={branches}
                      onChangeText={(val) => setBranches(val.replace(/[^0-9]/g, ''))}
                      placeholder="Branches"
                      placeholderTextColor="#6B6B6B"
                      keyboardType="number-pad"
                      className="flex-1 text-white text-[14px] p-0 font-medium"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Establish Year</Text>
                  <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                    <TextInput
                      value={establishYear}
                      onChangeText={(val) => setEstablishYear(val.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 2015"
                      placeholderTextColor="#6B6B6B"
                      keyboardType="number-pad"
                      maxLength={4}
                      className="flex-1 text-white text-[14px] p-0 font-medium"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Website</Text>
                  <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                    <Globe size={18} color="#6B6B6B" />
                    <TextInput
                      value={website}
                      onChangeText={setWebsite}
                      placeholder="https://www.yourgym.com"
                      placeholderTextColor="#6B6B6B"
                      keyboardType="url"
                      autoCapitalize="none"
                      className="flex-1 text-white text-[14px] p-0 font-medium"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Logo <Text className="text-[#6B6B6B]">(Optional)</Text></Text>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={pickImage}
                      className="flex-1 flex-row items-center bg-[#121212] border border-[#1E1E1E] border-dashed rounded-xl px-4 py-4 gap-3 justify-center"
                    >
                      {logo ? (
                        <View className="flex-row items-center gap-3">
                          <RNImage source={{ uri: logo }} style={{ width: 24, height: 24, borderRadius: 4 }} />
                          <Text className="text-[#C3F400] text-[14px] font-medium">Change Logo</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-3">
                          <UploadSimple size={20} color="#6B6B6B" />
                          <Text className="text-[#6B6B6B] text-[14px] font-medium">Upload Logo</Text>
                        </View>
                      )}
                    </Pressable>
                    {logo ? (
                      <Pressable
                        onPress={() => setLogo('')}
                        className="w-14 h-14 items-center justify-center bg-[#121212] border border-[#1E1E1E] rounded-xl active:opacity-70"
                      >
                        <X size={20} color="#FF453A" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <View>
                  <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Note <Text className="text-[#6B6B6B]">(Optional)</Text></Text>
                  <View className="flex-row bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="Any additional details..."
                      placeholderTextColor="#6B6B6B"
                      multiline
                      numberOfLines={3}
                      className="flex-1 text-white text-[14px] p-0 font-medium min-h-[60px]"
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </>
            )}

            <View>
              <Text className="text-white text-[13px] font-medium mb-2">Password</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <LockKey size={18} color="#6B6B6B" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#6B6B6B"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                  {showPassword ? <Eye size={18} color="#6B6B6B" /> : <EyeSlash size={18} color="#6B6B6B" />}
                </Pressable>
              </View>
            </View>

            <View>
              <Text className="text-white text-[13px] font-medium mb-2">Confirm Password</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <LockKey size={18} color="#6B6B6B" />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#6B6B6B"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
                  {showConfirmPassword ? <Eye size={18} color="#6B6B6B" /> : <EyeSlash size={18} color="#6B6B6B" />}
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleSignup}
            disabled={loading || isPending}
            className={`bg-[#C3F400] rounded-xl py-3.5 items-center flex-row justify-center mb-6 ${(loading || isPending) ? 'opacity-70' : 'active:opacity-80'}`}
          >
            {(loading || isPending) && <ActivityIndicator color="#000" size="small" style={{ marginRight: 8 }} />}
            <Text className="text-black font-semibold text-[15px]">Sign Up</Text>
          </Pressable>

          <View className="flex-row items-center justify-center">
            <View className="flex-1 h-[1px] bg-[#1E1E1E]" />
            <Text className="text-[#6B6B6B] text-[13px] mx-4">Already have an account?</Text>
            <View className="flex-1 h-[1px] bg-[#1E1E1E]" />
          </View>

          <Pressable onPress={() => router.back()} className="items-center mt-4 p-2">
            <Text className="text-[#C3F400] font-semibold text-[14px]">Login</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
