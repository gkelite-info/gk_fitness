import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CaretDown, CheckCircle, WarningCircle, X } from 'phosphor-react-native';
import { State } from 'country-state-city';
import { toast } from '@/lib/toast';
import { fetchGlobalTrainerLeadById, updateGlobalTrainerLeadStatus } from '@/helpers/globalTrainerLeads/globalTrainerLeadsHelper';
import { supabaseAdminAuth } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { createUser } from '@/helpers/otpHelper';
import { saveGlobalTrainer } from '@/helpers/globalTrainer/globalTrainerHelper';
import { useUser } from '@/context/UserContext';

export default function CreateGlobalTrainerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ globalTrainerLeadId?: string }>();
  const insets = useSafeAreaInsets();
  const { userId: currentUserId } = useUser();

  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'others' | ''>('');
  const [specialization, setSpecialization] = useState<'strength' | 'fatloss' | 'crossfit' | ''>('');
  const [experience, setExperience] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [qualification, setQualification] = useState('');
  const [bio, setBio] = useState('');
  const [languagesSpoken, setLanguagesSpoken] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('India');
  const [stateName, setStateName] = useState('Telangana');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [password, setPassword] = useState('');

  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [specModalVisible, setSpecModalVisible] = useState(false);

  useEffect(() => {
    const fetchLeadData = async () => {
      if (params.globalTrainerLeadId) {
        setSaving(true);
        try {
          const leadDetails = await fetchGlobalTrainerLeadById(params.globalTrainerLeadId);
          if (leadDetails) {
            setFullName(leadDetails.fullName || '');
            setEmail(leadDetails.email || '');
            setMobile(leadDetails.mobile || '');
            setAlternateMobile(leadDetails.alternateMobile || '');
            setDateOfBirth(leadDetails.dateOfBirth || '');
            setGender((leadDetails.gender as any) || '');
            setSpecialization((leadDetails.specialization as any) || '');
            setExperience(leadDetails.experience ? leadDetails.experience.toString() : '');
            setJoiningDate(leadDetails.joiningDate || '');
            setQualification(leadDetails.qualification || '');
            setBio(leadDetails.bio || '');
            setLanguagesSpoken(
              Array.isArray(leadDetails.languagesSpoken)
                ? leadDetails.languagesSpoken.join(', ')
                : leadDetails.languagesSpoken || ''
            );
            setAddress(leadDetails.address || '');
            setCountry(leadDetails.country || 'India');
            setStateName(leadDetails.state || 'Telangana');
            setCity(leadDetails.city || '');
            setPincode(leadDetails.pincode ? leadDetails.pincode.toString() : '');
            setPassword(leadDetails.password || '');
          }
        } catch (error) {
          toast.error('Failed to load lead details');
        } finally {
          setSaving(false);
        }
      }
    };
    fetchLeadData();
  }, [params.globalTrainerLeadId]);

  const indianStates = State.getStatesOfCountry('IN');

  const handleSave = async () => {
    if (!fullName.trim()) return toast.error('Full Name is required');
    if (!email.trim() || !email.includes('@')) return toast.error('Valid Email is required');
    if (!mobile.trim() || mobile.length < 10) return toast.error('Valid Mobile number is required');
    if (!dateOfBirth.trim()) return toast.error('Date of Birth is required');
    if (!gender) return toast.error('Gender is required');
    if (!specialization) return toast.error('Specialization is required');
    if (!experience.trim()) return toast.error('Experience is required');
    if (!joiningDate.trim()) return toast.error('Joining Date is required');
    if (!qualification.trim()) return toast.error('Qualification is required');
    if (!languagesSpoken.trim()) return toast.error('Languages Spoken are required');
    if (!address.trim()) return toast.error('Address is required');
    if (!stateName.trim()) return toast.error('State is required');
    if (!pincode.trim()) return toast.error('Pincode is required');
    if (!params.globalTrainerLeadId && !password.trim()) return toast.error('Password is required');

    setSaving(true);
    try {
      const uuid = Crypto.randomUUID();
      const tempPassword = `TK-${uuid.substring(0, 5).toUpperCase()}-${uuid.substring(9, 10).toUpperCase()}`;
      const actualPassword = params.globalTrainerLeadId ? password : (password.trim() || tempPassword);

      const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
        email: email.trim().toLowerCase(),
        password: actualPassword,
        options: {
          data: {
            name: fullName.trim(),
            phone: mobile.trim(),
            role: 'globaltrainer',
          },
        },
      });

      if (authError) {
        throw authError;
      }

      const authUserId = authData?.user?.id;
      if (!authUserId) {
        throw new Error('Supabase Auth did not return a valid user ID.');
      }

      const newUser = await createUser({
        userId: authUserId,
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: mobile.trim(),
        address: address.trim(),
        role: 'globaltrainer',
      });

      if (!newUser) {
        throw new Error('Failed to create user account.');
      }

      await saveGlobalTrainer({
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender: gender as 'male' | 'female' | 'others',
        mobile: mobile.trim(),
        alternateMobile: alternateMobile.trim() || null,
        email: email.trim().toLowerCase(),
        specialization: specialization as 'strength' | 'fatloss' | 'crossfit',
        experience: Number(experience),
        joiningDate: joiningDate.trim(),
        qualification: qualification.trim(),
        bio: bio.trim() || null,
        languagesSpoken: languagesSpoken.split(',').map(s => s.trim()).filter(s => s),
        address: address.trim(),
        country: country.trim(),
        state: stateName.trim(),
        city: city.trim(),
        pincode: Number(pincode),
        isActive: true,
      });

      if (params.globalTrainerLeadId) {
        await updateGlobalTrainerLeadStatus(params.globalTrainerLeadId, 'approved');
      }

      toast.success('Global Trainer created successfully!');
      router.replace('/(superadmin)/dashboard/globalTrainers' as any);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create global trainer.');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (label: string, value: string, onChangeText: (text: string) => void, placeholder: string, keyboardType: any = 'default', optional = false, multiline = false, isEditable = true, isSecure = false) => (
    <View className="mb-4">
      <Text className="text-xs text-[#888888] mb-1.5">
        {label} {!optional && <Text className="text-red-500 text-sm">*</Text>}
        {optional && ' (Optional)'}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={isSecure}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm font-sans ${multiline ? 'min-h-[100px]' : ''} ${(!saving && isEditable) ? '' : 'opacity-60'}`}
        editable={!saving && isEditable}
      />
    </View>
  );

  const renderPicker = (label: string, value: string, placeholder: string, onPress: () => void, optional = false) => (
    <View className="mb-4 flex-1">
      <Text className="text-xs text-[#888888] mb-1.5">
        {label} {!optional && <Text className="text-red-500 text-sm">*</Text>}
      </Text>
      <Pressable
        onPress={() => !saving && onPress()}
        disabled={saving}
        className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between ${saving ? 'opacity-60' : ''}`}
      >
        <Text className={`text-sm font-sans ${value ? 'text-white' : 'text-[#6B7280]'}`}>
          {value || placeholder}
        </Text>
        <CaretDown size={12} color="#888888" />
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B] pb-28" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-4 border-b border-[#1C1C1E]">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 bg-[#1C1C1E] rounded-full items-center justify-center mr-3 active:opacity-70"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text className="text-white text-xl font-semibold">Create Global Trainer</Text>
            <Text className="text-[#8E8E93] text-xs mt-0.5">Add a new trainer to the system</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section: Personal Info */}
          <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-3 mt-2">PERSONAL DETAILS</Text>
          {renderInput('Full Name', fullName, setFullName, 'e.g. John Doe')}
          {renderInput('Email Address', email, setEmail, 'e.g. john@example.com', 'email-address')}

          <View className="flex-row gap-3">
            <View className="flex-1">
              {renderInput('Mobile', mobile, setMobile, 'e.g. 9876543210', 'phone-pad')}
            </View>
            <View className="flex-1">
              {renderInput('Alt Mobile', alternateMobile, setAlternateMobile, 'e.g. 9876543210', 'phone-pad', true)}
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              {renderInput('Date of Birth', dateOfBirth, setDateOfBirth, 'DD/MM/YYYY')}
            </View>
            {renderPicker('Gender', gender.charAt(0).toUpperCase() + gender.slice(1), 'Select Gender', () => setGenderModalVisible(true))}
          </View>

          {/* Section: Professional Info */}
          <View className="h-[1px] bg-[#1F293D] my-4" />
          <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-3 mt-2">PROFESSIONAL DETAILS</Text>

          <View className="flex-row gap-3">
            {renderPicker('Specialization', specialization.charAt(0).toUpperCase() + specialization.slice(1), 'Select Spec', () => setSpecModalVisible(true))}
            <View className="flex-1">
              {renderInput('Experience (Years)', experience, setExperience, 'e.g. 5', 'numeric')}
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              {renderInput('Joining Date', joiningDate, setJoiningDate, 'DD/MM/YYYY')}
            </View>
            <View className="flex-1">
              {renderInput('Qualification', qualification, setQualification, 'e.g. ACE Certified')}
            </View>
          </View>

          {renderInput('Languages Spoken', languagesSpoken, setLanguagesSpoken, 'e.g. English, Hindi, Spanish')}
          {renderInput('Bio', bio, setBio, 'Tell us about the trainer...', 'default', true, true)}

          {/* Section: Location */}
          <View className="h-[1px] bg-[#1F293D] my-4" />
          <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-3 mt-2">LOCATION & SECURITY</Text>

          {renderInput('Address', address, setAddress, 'Full street address', 'default', false, true)}

          <View className="flex-row gap-3">
            <View className="flex-1">
              {renderInput('City', city, setCity, 'e.g. Hyderabad')}
            </View>
            {renderPicker('State', stateName, 'Select State', () => setStateModalVisible(true))}
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              {renderInput('Country', country, setCountry, 'e.g. India')}
            </View>
            <View className="flex-1">
              {renderInput('Pincode', pincode, setPincode, 'e.g. 500081', 'numeric')}
            </View>
          </View>

          {renderInput('Password', password, setPassword, 'Enter a secure password', 'default', false, false, !params.globalTrainerLeadId, true)}

          <View className="absolute -bottom-3 left-0 right-0 p-4 bg-[#09090B] border-t border-[#1F293D]" style={{ paddingBottom: insets.bottom + 16 }}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className={`h-14 rounded-xl items-center justify-center flex-row ${saving ? 'bg-[#CCFF00]/50' : 'bg-[#CCFF00] active:opacity-80'}`}
            >
              {saving ? (
                <Text className="text-black font-semibold text-[15px]">Creating Trainer...</Text>
              ) : (
                <>
                  <Text className="text-black font-semibold text-[15px] mr-2">Create Global Trainer</Text>
                  <CheckCircle size={20} color="#000000" weight="bold" />
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* State Selection Modal */}
      <Modal visible={stateModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#121212] h-[80%] rounded-t-3xl overflow-hidden">
            <View className="p-4 border-b border-[#2A2A2D] flex-row items-center justify-between">
              <Text className="text-white text-lg font-semibold">Select State</Text>
              <Pressable onPress={() => setStateModalVisible(false)} className="p-2 bg-[#2A2A2D] rounded-full">
                <X size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <View className="p-4">
              <View className="bg-[#1C1C1E] h-12 rounded-xl px-4 justify-center border border-[#2A2A2D]">
                <TextInput
                  placeholder="Search state..."
                  placeholderTextColor="#8E8E93"
                  className="text-white text-[15px] font-sans h-full p-0"
                  value={stateSearchQuery}
                  onChangeText={setStateSearchQuery}
                />
              </View>
            </View>
            <FlatList
              data={indianStates.filter(s => s.name.toLowerCase().includes(stateSearchQuery.toLowerCase()))}
              keyExtractor={(item) => item.isoCode}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setStateName(item.name);
                    setStateModalVisible(false);
                    setStateSearchQuery('');
                  }}
                  className={`p-4 border-b border-[#1C1C1E] flex-row items-center justify-between ${stateName === item.name ? 'bg-[#1C1C1E]' : ''}`}
                >
                  <Text className={`text-[15px] ${stateName === item.name ? 'text-[#BEF227] font-semibold' : 'text-white'}`}>
                    {item.name}
                  </Text>
                  {stateName === item.name && <CheckCircle size={20} color="#BEF227" weight="fill" />}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Gender Modal */}
      <Modal visible={genderModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#121212] pb-10 rounded-t-3xl">
            <View className="p-4 border-b border-[#2A2A2D] flex-row items-center justify-between">
              <Text className="text-white text-lg font-semibold">Select Gender</Text>
              <Pressable onPress={() => setGenderModalVisible(false)} className="p-2 bg-[#2A2A2D] rounded-full">
                <X size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            {['male', 'female', 'others'].map((g) => (
              <Pressable
                key={g}
                onPress={() => {
                  setGender(g as any);
                  setGenderModalVisible(false);
                }}
                className={`p-4 border-b border-[#1C1C1E] flex-row items-center justify-between ${gender === g ? 'bg-[#1C1C1E]' : ''}`}
              >
                <Text className={`text-[15px] capitalize ${gender === g ? 'text-[#BEF227] font-semibold' : 'text-white'}`}>
                  {g}
                </Text>
                {gender === g && <CheckCircle size={20} color="#BEF227" weight="fill" />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Specialization Modal */}
      <Modal visible={specModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#121212] pb-10 rounded-t-3xl">
            <View className="p-4 border-b border-[#2A2A2D] flex-row items-center justify-between">
              <Text className="text-white text-lg font-semibold">Select Specialization</Text>
              <Pressable onPress={() => setSpecModalVisible(false)} className="p-2 bg-[#2A2A2D] rounded-full">
                <X size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            {['strength', 'fatloss', 'crossfit'].map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setSpecialization(s as any);
                  setSpecModalVisible(false);
                }}
                className={`p-4 border-b border-[#1C1C1E] flex-row items-center justify-between ${specialization === s ? 'bg-[#1C1C1E]' : ''}`}
              >
                <Text className={`text-[15px] capitalize ${specialization === s ? 'text-[#BEF227] font-semibold' : 'text-white'}`}>
                  {s}
                </Text>
                {specialization === s && <CheckCircle size={20} color="#BEF227" weight="fill" />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
