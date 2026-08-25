import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, Stack } from 'expo-router';
import {
  CaretLeft,
  User,
  EnvelopeSimple,
  Phone,
  MapPin,
  Flag,
  MapTrifold,
  GlobeHemisphereWest,
  LockKey,
  Eye,
  EyeSlash,
  Globe,
  MagnifyingGlass,
  X,
  CalendarBlank,
  CaretDown,
  Briefcase,
  FileText,
  WarningCircle
} from 'phosphor-react-native';
import { Country, State } from 'country-state-city';
import { toast } from '@/lib/toast';
import { useCreateGlobalTrainerLead } from '@/hooks/globalTrainerLeads/useCreateGlobalTrainerLead';
import * as Crypto from 'expo-crypto';
import { DatePickerModal } from '@/components/DatePickerModal';
import { ActionSheet } from '@/components/ActionSheet';

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

export default function GlobalTrainerSignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Select gender' | 'Male' | 'Female' | 'Others'>('Select gender');
  const [specialization, setSpecialization] = useState<'strength' | 'fatloss' | 'crossfit' | null>(null);
  const [experience, setExperience] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qualification, setQualification] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('English, Hindi');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [joiningModalVisible, setJoiningModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const { mutateAsync: createGlobalTrainerLead } = useCreateGlobalTrainerLead();

  const handleSignup = async () => {
    if (!fullName.trim()) { toast.error('Please enter Full Name.'); return; }
    if (!email.trim()) { toast.error('Please enter Email.'); return; }
    if (!phone.trim()) { toast.error('Please enter Mobile Number.'); return; }
    if (!dateOfBirth) { toast.error('Please select Date of Birth.'); return; }
    if (gender === 'Select gender') { toast.error('Please select Gender.'); return; }
    if (!specialization) { toast.error('Please select Specialization.'); return; }
    if (!experience.trim()) { toast.error('Please enter Experience.'); return; }
    if (!qualification.trim()) { toast.error('Please enter Qualification.'); return; }
    if (!address.trim()) { toast.error('Please enter Address.'); return; }
    if (!country) { toast.error('Please select Country.'); return; }
    if (!state) { toast.error('Please select State.'); return; }
    if (!city.trim()) { toast.error('Please enter City.'); return; }
    if (!pinCode.trim()) { toast.error('Please enter PIN Code.'); return; }
    if (!password) { toast.error('Please enter Password.'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const passwordHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);

      const newLead = await createGlobalTrainerLead({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: phone.trim(),
        alternateMobile: alternatePhone.trim() || null,
        dateOfBirth: dateOfBirth,
        gender: gender.toLowerCase() as 'male' | 'female' | 'others',
        specialization: specialization,
        experience: parseInt(experience, 10),
        joiningDate: joiningDate,
        qualification: qualification.trim(),
        bio: bio.trim() || null,
        languagesSpoken: languages.split(',').map(l => l.trim()).filter(l => l),
        address: address.trim(),
        country,
        state,
        city: city.trim(),
        pincode: parseInt(pinCode, 10),
        password: passwordHash,
        status: 'submitted',
        isActive: true,
      });

      if (!newLead) {
        throw new Error('Failed to create registration request.');
      }

      toast.success('Registration submitted successfully! It is under review.');
      router.replace(`/auth/registration-status?globalTrainerLeadId=${newLead.globalTrainerLeadId}`);

    } catch (error: any) {
      console.error('[GlobalTrainerSignup] Error:', error);
      let errorMessage = 'Failed to create account. Please try again.';

      if (error?.code === '23505') {
        errorMessage = 'This email or phone is already registered. Please login instead.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const countries = Country.getAllCountries().map(c => ({ label: c.name, value: c.isoCode }));
  const states = country ? State.getStatesOfCountry(country).map(s => ({ label: s.name, value: s.isoCode })) : [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-[#09090B]">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <DatePickerModal
            visible={dobModalVisible}
            title="Select Date of Birth"
            initialDate={dateOfBirth || '1995-05-15'}
            onClose={() => setDobModalVisible(false)}
            onSelectDate={setDateOfBirth}
            minYear={1950}
            maxYear={2008}
          />

          <DatePickerModal
            visible={joiningModalVisible}
            title="Select Joining Date"
            initialDate={joiningDate || new Date().toISOString().split('T')[0]}
            onClose={() => setJoiningModalVisible(false)}
            onSelectDate={setJoiningDate}
            minYear={2020}
            maxYear={2030}
          />

          <ActionSheet
            visible={genderModalVisible}
            onClose={() => setGenderModalVisible(false)}
            title="Select Gender"
            options={['Male', 'Female', 'Others']}
            onSelect={(idx) => {
              if (idx === 0) setGender('Male');
              if (idx === 1) setGender('Female');
              if (idx === 2) setGender('Others');
            }}
          />

          <View className="pt-5 pb-6">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 bg-[#121212] border border-[#1E1E1E] rounded-full items-center justify-center mb-6"
            >
              <CaretLeft size={20} color="#FFFFFF" />
            </Pressable>

            <View className="items-center">
              <Text className="text-white text-3xl font-semibold mb-2 text-center">
                <Text className="text-[#C3F400] text-3xl">Global Trainer</Text> Registration
              </Text>
              <Text className="text-[#8E8E93] text-[13px] text-center">
                Join our platform as a global expert and reach clients worldwide.
              </Text>
              <View className="h-1 w-12 bg-[#C3F400] rounded-full mt-4" />
            </View>
          </View>

          <View className="gap-5 mb-8">
            <View className="mb-2">
              <Text className="text-[#C3F400] text-sm font-semibold tracking-wider">PERSONAL DETAILS</Text>
              <View className="h-[1px] bg-[#1E1E1E] mt-2 mb-2" />
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Full Name <Text className="text-red-500">*</Text></Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <User size={18} color="#6B6B6B" />
                <TextInput
                  value={fullName}
                  onChangeText={(val) => setFullName(val.replace(/[0-9]/g, ''))}
                  placeholder="Enter full name"
                  placeholderTextColor="#6B6B6B"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Email <Text className="text-red-500">*</Text></Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <EnvelopeSimple size={18} color="#6B6B6B" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#6B6B6B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Mobile Number <Text className="text-red-500">*</Text></Text>
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

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Alternate Mobile <Text className="text-[#6B6B6B]">(Optional)</Text></Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <Phone size={18} color="#6B6B6B" />
                <TextInput
                  value={alternatePhone}
                  onChangeText={(val) => setAlternatePhone(val.replace(/[^0-9]/g, ''))}
                  placeholder="Enter alternate mobile"
                  placeholderTextColor="#6B6B6B"
                  keyboardType="phone-pad"
                  maxLength={10}
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Date of Birth <Text className="text-red-500">*</Text></Text>
                <Pressable
                  onPress={() => setDobModalVisible(true)}
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl border border-[#1E1E1E] bg-[#121212] active:opacity-80"
                >
                  <Text className={dateOfBirth ? 'text-white font-medium text-[14px]' : 'text-[#6B6B6B] text-[14px]'}>
                    {dateOfBirth || 'Select Date'}
                  </Text>
                  <CalendarBlank size={18} color="#6B6B6B" />
                </Pressable>
              </View>

              <View className="flex-1">
                <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Gender <Text className="text-red-500">*</Text></Text>
                <Pressable
                  onPress={() => setGenderModalVisible(true)}
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl border border-[#1E1E1E] bg-[#121212] active:opacity-80"
                >
                  <Text className={gender === 'Select gender' ? 'text-[#6B6B6B] text-[14px]' : 'text-white font-medium text-[14px]'}>
                    {gender}
                  </Text>
                  <CaretDown size={18} color="#6B6B6B" />
                </Pressable>
              </View>
            </View>

            <View className="mt-6 mb-2">
              <Text className="text-[#C3F400] text-sm font-semibold tracking-wider">PROFESSIONAL DETAILS</Text>
              <View className="h-[1px] bg-[#1E1E1E] mt-2 mb-2" />
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Specialization <Text className="text-red-500">*</Text></Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => setSpecialization('strength')}
                  className={`px-4 py-2.5 rounded-full border ${specialization === 'strength' ? 'bg-[#C3F400] border-[#C3F400]' : 'bg-[#121212] border-[#1E1E1E]'}`}
                >
                  <Text className={`text-[13px] ${specialization === 'strength' ? 'text-black font-semibold' : 'text-[#888]'}`}>Strength</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSpecialization('fatloss')}
                  className={`px-4 py-2.5 rounded-full border ${specialization === 'fatloss' ? 'bg-[#C3F400] border-[#C3F400]' : 'bg-[#121212] border-[#1E1E1E]'}`}
                >
                  <Text className={`text-[13px] ${specialization === 'fatloss' ? 'text-black font-semibold' : 'text-[#888]'}`}>Fatloss</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSpecialization('crossfit')}
                  className={`px-4 py-2.5 rounded-full border ${specialization === 'crossfit' ? 'bg-[#C3F400] border-[#C3F400]' : 'bg-[#121212] border-[#1E1E1E]'}`}
                >
                  <Text className={`text-[13px] ${specialization === 'crossfit' ? 'text-black font-semibold' : 'text-[#888]'}`}>Crossfit</Text>
                </Pressable>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Experience (Years) <Text className="text-red-500">*</Text></Text>
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <Briefcase size={18} color="#6B6B6B" />
                  <TextInput
                    value={experience}
                    onChangeText={(val) => setExperience(val.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 5"
                    placeholderTextColor="#6B6B6B"
                    keyboardType="number-pad"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Joining Date <Text className="text-red-500">*</Text></Text>
                <Pressable
                  onPress={() => setJoiningModalVisible(true)}
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl border border-[#1E1E1E] bg-[#121212] active:opacity-80"
                >
                  <Text className={joiningDate ? 'text-white font-medium text-[14px]' : 'text-[#6B6B6B] text-[14px]'}>
                    {joiningDate || 'Select Date'}
                  </Text>
                  <CalendarBlank size={18} color="#6B6B6B" />
                </Pressable>
              </View>
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Qualification / Certification <Text className="text-red-500">*</Text></Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <FileText size={18} color="#6B6B6B" />
                <TextInput
                  value={qualification}
                  onChangeText={setQualification}
                  placeholder="e.g. NASM Certified"
                  placeholderTextColor="#6B6B6B"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Languages Spoken (comma separated) <Text className="text-red-500">*</Text></Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <Globe size={18} color="#6B6B6B" />
                <TextInput
                  value={languages}
                  onChangeText={setLanguages}
                  placeholder="e.g. English, Spanish"
                  placeholderTextColor="#6B6B6B"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Bio <Text className="text-[#6B6B6B]">(Optional)</Text></Text>
              <View className="bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5">
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#6B6B6B"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="text-white text-[14px] p-0 font-medium min-h-[80px]"
                />
              </View>
            </View>

            <View className="mt-6 mb-2">
              <Text className="text-[#C3F400] text-sm font-semibold tracking-wider">LOCATION DETAILS</Text>
              <View className="h-[1px] bg-[#1E1E1E] mt-2 mb-2" />
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Address <Text className="text-red-500">*</Text></Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <MapPin size={18} color="#6B6B6B" />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter full address"
                  placeholderTextColor="#6B6B6B"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
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
                <MapPin size={18} color="#6B6B6B" />
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

            <View className="mt-6 mb-2">
              <Text className="text-[#C3F400] text-sm font-semibold tracking-wider">SECURITY</Text>
              <View className="h-[1px] bg-[#1E1E1E] mt-2 mb-2" />
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Password <Text className="text-red-500">*</Text></Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <LockKey size={18} color="#6B6B6B" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  placeholderTextColor="#6B6B6B"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                  {showPassword ? <Eye size={18} color="#6B6B6B" /> : <EyeSlash size={18} color="#6B6B6B" />}
                </Pressable>
              </View>
            </View>

            <View>
              <Text className="text-[#E0E0E0] text-[13px] font-medium mb-2">Confirm Password <Text className="text-red-500">*</Text></Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <LockKey size={18} color="#6B6B6B" />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#6B6B6B"
                  secureTextEntry={!showConfirmPassword}
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
            disabled={loading}
            className="bg-[#D4FF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80 mb-6"
          >
            {loading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text className="text-black font-semibold text-[15px]">Create Account</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
