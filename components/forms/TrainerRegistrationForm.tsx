import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  Clipboard,
  Share,
  Linking
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  User,
  CaretDown,
  Phone,
  Briefcase,
  Clock,
  FileText,
  LockKey,
  Info,
  CalendarBlank,
  Check,
  WarningCircle,
  ClipboardText,
  ShareNetwork,
  EnvelopeSimple,
  Copy,
  Barbell
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { saveGymTrainer, SaveGymTrainerParams } from '@/helpers/trainers/trainerHelper';
import { router } from 'expo-router';
import { triggerSuccessHaptic, triggerErrorHaptic, triggerLightHaptic } from '@/lib/haptics';
import { DatePickerModal } from '@/components/DatePickerModal';
import { toast } from '@/lib/toast';

interface GeneratedCredentials {
  fullName: string;
  email: string;
  phone: string;
  temporaryPassword: string;
  specialization: string;
  dateOfJoining: string;
}

export interface TrainerRegistrationFormProps {
  onRegisterSubmit?: (fn: () => void, loading: boolean) => void;
}

export function TrainerRegistrationForm({ onRegisterSubmit }: TrainerRegistrationFormProps = {}) {
  const { userId } = useUser();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdCredentials, setCreatedCredentials] = useState<GeneratedCredentials | null>(null);

  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [joiningModalVisible, setJoiningModalVisible] = useState(false);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Select gender'>('Select gender');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [activeSpec, setActiveSpec] = useState<'strength' | 'fatloss' | 'crossfit' | string>('strength');
  const [experience, setExperience] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qualification, setQualification] = useState('');

  const [activeShift, setActiveShift] = useState<'morning' | 'evening' | 'both'>('morning');
  const [activeDays, setActiveDays] = useState<string[]>(['mon', 'wed', 'fri']);

  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('English, Hindi, Telugu');

  const toggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      if (activeDays.length === 1) {
        toast.error('At least one working day must remain selected.');
        return;
      }
      setActiveDays(activeDays.filter((d) => d !== day));
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  const clearError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleGenderSelect = () => {
    clearError('gender');
    const options = ['Cancel', 'Male', 'Female', 'Other'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) setGender('Male');
          if (buttonIndex === 2) setGender('Female');
          if (buttonIndex === 3) setGender('Other');
        }
      );
    } else {
      Alert.alert('Select Gender', 'Choose trainer gender', [
        { text: 'Male', onPress: () => setGender('Male') },
        { text: 'Female', onPress: () => setGender('Female') },
        { text: 'Other', onPress: () => setGender('Other') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const getSpecName = (specKey: string) => {
    switch (specKey) {
      case 'strength': return 'Strength Training';
      case 'fatloss': return 'Fat Loss';
      case 'crossfit': return 'Cross Fit';
      default: return 'General Fitness';
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = 'Please enter a full name (minimum 3 characters).';
    }

    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required.';
    } else {
      const birthDate = new Date(dateOfBirth);
      const age = (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 16) {
        newErrors.dateOfBirth = 'Trainer must be at least 16 years old.';
      }
    }

    if (gender === 'Select gender') {
      newErrors.gender = 'Please select a gender.';
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (!cleanPhoneDigits || cleanPhoneDigits.length < 10) {
      newErrors.phone = 'Please enter a valid phone number (at least 10 digits).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (experience.trim() && isNaN(Number(experience.trim()))) {
      newErrors.experience = 'Experience must be a numeric value in years.';
    }

    if (activeDays.length === 0) {
      newErrors.activeDays = 'Please assign at least one working day.';
    }

    setErrors(newErrors);
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      triggerErrorHaptic();
      toast.error(newErrors[errorKeys[0]]);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!userId) {
      triggerErrorHaptic();
      toast.error('Please make sure you are signed in as an owner.');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Creating trainer account...');

      const specName = getSpecName(activeSpec);
      const cleanEmail = email.trim();
      const cleanPhone = `${phoneCode} ${phone.trim()}`;
      const doj = joiningDate || new Date().toISOString().split('T')[0];

      const params: SaveGymTrainerParams = {
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth,
        gender: gender.toLowerCase(),
        phone: cleanPhone,
        email: cleanEmail,
        specialization: specName,
        experienceYears: experience ? parseInt(experience, 10) : 1,
        dateOfJoining: doj,
        qualification: qualification || 'Certified Personal Trainer',
        bio: bio.trim() || null,
        languagesSpeaks: languages,
        createdBy: userId,
        shiftPreference: activeShift,
        workingDays: activeDays,
        is_Active: true,
      };

      const result = await saveGymTrainer(params);
      toast.dismiss();
      toast.success('Trainer profile created successfully!');
      triggerSuccessHaptic();

      setCreatedCredentials({
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        temporaryPassword: result.temporaryPassword || 'TR-XXXXX-X',
        specialization: specName,
        dateOfJoining: doj,
      });

      sendCredentialEmail(fullName.trim(), cleanEmail, result.temporaryPassword || 'TR-XXXXX-X', specName);
    } catch (err: any) {
      console.error('[TrainerRegistrationForm] Save Error:', err);
      toast.dismiss();
      triggerErrorHaptic();
      toast.error('Unable to create trainer account. Please ensure email or phone is unique and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (onRegisterSubmit) {
      onRegisterSubmit(handleSubmit, loading);
    }
  }, [onRegisterSubmit, handleSubmit, loading]);

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    triggerLightHaptic();
    const credText = `Trainer Credentials:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.temporaryPassword}`;
    Clipboard.setString(credText);
    toast.success('Credentials copied to clipboard!');
  };

  const handleShare = async () => {
    if (!createdCredentials) return;
    try {
      triggerLightHaptic();
      await Share.share({
        message: `Login Credentials for ${createdCredentials.fullName}:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.temporaryPassword}\n\nPlease change your password upon first login.`,
      });
    } catch (err: any) {
      console.error('Error sharing credentials:', err);
    }
  };

  const sendCredentialEmail = (name: string, mail: string, password: string, spec: string) => {
    const subject = encodeURIComponent('Your Gym Trainer Login Credentials');
    const body = encodeURIComponent(
      `Hello ${name},\n\nYou have been registered as a ${spec} Trainer at our gym.\n\nHere are your official login credentials for access:\n\nEmail: ${mail}\nTemporary Password: ${password}\n\nYou will be prompted to update this temporary password when you first sign in.\n\nWelcome aboard,\nGym Management`
    );
    Linking.openURL(`mailto:${mail}?subject=${subject}&body=${body}`).catch(() => {
    });
  };

  const handleEmailBtn = () => {
    if (!createdCredentials) return;
    triggerLightHaptic();
    sendCredentialEmail(
      createdCredentials.fullName,
      createdCredentials.email,
      createdCredentials.temporaryPassword,
      createdCredentials.specialization
    );
  };

  if (createdCredentials) {
    return (
      <View className="py-2">
        <View className="bg-[#111622] border border-[#1F293D] rounded-2xl p-5 mb-6 shadow-xl">
          <View className="flex-row items-center gap-3.5 mb-4">
            <View className="w-14 h-14 rounded-xl bg-[#0A0E17] border border-[#1F293D] items-center justify-center">
              <Barbell size={28} color="#C3F400" weight="duotone" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white leading-5">{createdCredentials.fullName}</Text>
              <Text className="text-xs text-[#C3F400] mt-0.5 font-semibold">{createdCredentials.specialization}</Text>
              <Text className="text-[11px] text-[#888888] mt-1">Joined: {createdCredentials.dateOfJoining}</Text>
            </View>
            <View className="bg-[#064E3B]/50 border border-[#059669]/40 px-3 py-1 rounded-full">
              <Text className="text-[#10B981] text-[10px] font-extrabold tracking-wider">ACTIVE</Text>
            </View>
          </View>

          <View className="h-[1px] bg-[#1F293D] my-3.5" />

          <Text className="text-xs font-bold text-[#C3F400] tracking-wider uppercase mb-3">Trainer Contact Details</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-xs text-[#888888]">Email Address</Text>
            <Text className="text-xs text-white font-medium">{createdCredentials.email}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-[#888888]">Phone Number</Text>
            <Text className="text-xs text-white font-medium">{createdCredentials.phone}</Text>
          </View>
        </View>

        <View className="bg-[#111622] border border-[#1F293D] rounded-2xl p-5 mb-6 shadow-xl">
          <Text className="text-xs font-bold text-[#C3F400] tracking-wider uppercase mb-4">Login Credentials</Text>

          <Text className="text-[10px] text-[#888888] mb-1.5 font-bold tracking-wider uppercase">Email / Username</Text>
          <View className="bg-[#0A0E17] border border-[#1F293D] rounded-xl p-3.5 mb-4">
            <Text className="text-white text-sm font-medium">{createdCredentials.email}</Text>
          </View>

          <Text className="text-[10px] text-[#888888] mb-1.5 font-bold tracking-wider uppercase">Temporary Password</Text>
          <View className="bg-[#0A0E17] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between">
            <Text className="text-[#C3F400] text-base font-mono font-bold">{createdCredentials.temporaryPassword}</Text>
            <Pressable onPress={handleCopyCredentials} className="active:opacity-75 p-1">
              <ClipboardText size={20} color="#C3F400" />
            </Pressable>
          </View>

          <View className="flex-row items-start gap-2.5 mt-4 bg-[#C3F400]/10 border border-[#C3F400]/20 rounded-xl p-3.5">
            <View className="mt-0.5">
              <WarningCircle size={16} color="#C3F400" weight="fill" />
            </View>
            <Text className="flex-1 text-xs text-[#C3F400] leading-4 font-medium">
              Account created and verified! An onboarding email has been prepared for the trainer with instructions to update this temporary password upon first login.
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3.5 mb-8">
          <Pressable
            onPress={handleCopyCredentials}
            className="flex-1 bg-[#111622] border border-[#1F293D] rounded-2xl py-4 items-center justify-center active:opacity-75"
          >
            <Copy size={22} color="#FFFFFF" />
            <Text className="text-[#A1A1AA] text-[10px] font-bold tracking-wider uppercase mt-1.5">COPY</Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            className="flex-1 bg-[#111622] border border-[#1F293D] rounded-2xl py-4 items-center justify-center active:opacity-75"
          >
            <ShareNetwork size={22} color="#FFFFFF" />
            <Text className="text-[#A1A1AA] text-[10px] font-bold tracking-wider uppercase mt-1.5">SHARE</Text>
          </Pressable>

          <Pressable
            onPress={handleEmailBtn}
            className="flex-1 bg-[#111622] border border-[#1F293D] rounded-2xl py-4 items-center justify-center active:opacity-75"
          >
            <EnvelopeSimple size={22} color="#FFFFFF" />
            <Text className="text-[#A1A1AA] text-[10px] font-bold tracking-wider uppercase mt-1.5">EMAIL</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{ minHeight: 56 }}
          className="w-full h-14 rounded-2xl bg-[#C3F400] flex-row items-center justify-center shadow-lg active:opacity-85 px-4"
        >
          <Text className="text-black font-black text-base uppercase tracking-wider">RETURN TO TRAINERS</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <DatePickerModal
        visible={dobModalVisible}
        title="Select Date of Birth"
        initialDate={dateOfBirth || '1995-05-15'}
        onClose={() => setDobModalVisible(false)}
        onSelectDate={(dateStr) => {
          clearError('dateOfBirth');
          setDateOfBirth(dateStr);
        }}
        minYear={1950}
        maxYear={2008}
      />

      <DatePickerModal
        visible={joiningModalVisible}
        title="Select Joining Date"
        initialDate={joiningDate || new Date().toISOString().split('T')[0]}
        onClose={() => setJoiningModalVisible(false)}
        onSelectDate={(dateStr) => setJoiningDate(dateStr)}
        minYear={2020}
        maxYear={2030}
      />

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <User size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Personal Information</Text>
        </View>
        
        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Full Name *</Text>
          <TextInput
            placeholder="Enter full name"
            placeholderTextColor="#666"
            clearButtonMode="while-editing"
            value={fullName}
            onChangeText={(txt) => {
              clearError('fullName');
              setFullName(txt);
            }}
            className={`text-white px-4 py-3.5 rounded-xl border ${errors.fullName ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
          />
          {errors.fullName && (
            <View className="flex-row items-center mt-1.5 ml-1">
              <WarningCircle size={14} color="#EF4444" />
              <Text className="text-red-400 text-xs ml-1">{errors.fullName}</Text>
            </View>
          )}
        </View>
        
        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Date of Birth *</Text>
          <Pressable
            onPress={() => setDobModalVisible(true)}
            className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl border active:opacity-80 ${errors.dateOfBirth ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
          >
            <Text className={dateOfBirth ? 'text-white font-medium' : 'text-[#666]'}>
              {dateOfBirth || 'Select Date of Birth (YYYY-MM-DD)'}
            </Text>
            <CalendarBlank size={18} color={errors.dateOfBirth ? '#EF4444' : '#A1A1AA'} />
          </Pressable>
          {errors.dateOfBirth && (
            <View className="flex-row items-center mt-1.5 ml-1">
              <WarningCircle size={14} color="#EF4444" />
              <Text className="text-red-400 text-xs ml-1">{errors.dateOfBirth}</Text>
            </View>
          )}
        </View>
        
        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Gender *</Text>
          <Pressable 
            onPress={handleGenderSelect} 
            className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl border active:opacity-80 ${errors.gender ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
          >
            <Text className={gender === 'Select gender' ? 'text-[#666]' : 'text-white font-medium'}>{gender}</Text>
            <CaretDown size={18} color={errors.gender ? '#EF4444' : '#A1A1AA'} />
          </Pressable>
          {errors.gender && (
            <View className="flex-row items-center mt-1.5 ml-1">
              <WarningCircle size={14} color="#EF4444" />
              <Text className="text-red-400 text-xs ml-1">{errors.gender}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <Phone size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Contact Information</Text>
        </View>
        
        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Phone Number *</Text>
          <View className="flex-row gap-2">
            <Pressable className="bg-[#161616] flex-row items-center px-3 py-3.5 rounded-xl border border-[#242424]">
              <Text className="text-white mr-1">{phoneCode}</Text>
              <CaretDown size={14} color="#A1A1AA" />
            </Pressable>
            <TextInput
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              clearButtonMode="while-editing"
              value={phone}
              onChangeText={(txt) => {
                clearError('phone');
                setPhone(txt);
              }}
              className={`flex-1 text-white px-4 py-3.5 rounded-xl border ${errors.phone ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
            />
          </View>
          {errors.phone && (
            <View className="flex-row items-center mt-1.5 ml-1">
              <WarningCircle size={14} color="#EF4444" />
              <Text className="text-red-400 text-xs ml-1">{errors.phone}</Text>
            </View>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Email Address *</Text>
          <TextInput
            placeholder="trainer@gymname.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            clearButtonMode="while-editing"
            value={email}
            onChangeText={(txt) => {
              clearError('email');
              setEmail(txt);
            }}
            className={`text-white px-4 py-3.5 rounded-xl border ${errors.email ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
          />
          {errors.email && (
            <View className="flex-row items-center mt-1.5 ml-1">
              <WarningCircle size={14} color="#EF4444" />
              <Text className="text-red-400 text-xs ml-1">{errors.email}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <Briefcase size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Professional Information</Text>
        </View>
        
        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Specialization</Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable 
              onPress={() => setActiveSpec('strength')}
              className={`px-4 py-2 rounded-full border ${activeSpec === 'strength' ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#242424]'}`}
            >
              <Text className={`text-xs ${activeSpec === 'strength' ? 'text-black font-semibold' : 'text-[#888]'}`}>Strength Training</Text>
            </Pressable>
            <Pressable 
              onPress={() => setActiveSpec('fatloss')}
              className={`px-4 py-2 rounded-full border ${activeSpec === 'fatloss' ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#242424]'}`}
            >
              <Text className={`text-xs ${activeSpec === 'fatloss' ? 'text-black font-semibold' : 'text-[#888]'}`}>Fat Loss</Text>
            </Pressable>
            <Pressable 
              onPress={() => setActiveSpec('crossfit')}
              className={`px-4 py-2 rounded-full border ${activeSpec === 'crossfit' ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#242424]'}`}
            >
              <Text className={`text-xs ${activeSpec === 'crossfit' ? 'text-black font-semibold' : 'text-[#888]'}`}>Cross Fit</Text>
            </Pressable>
          </View>
        </View>
        
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Experience (Years)</Text>
            <TextInput
              placeholder="e.g. 5"
              placeholderTextColor="#666"
              keyboardType="numeric"
              clearButtonMode="while-editing"
              value={experience}
              onChangeText={(txt) => {
                clearError('experience');
                setExperience(txt);
              }}
              className={`text-white px-4 py-3.5 rounded-xl border ${errors.experience ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
            />
          </View>
          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Joining Date</Text>
            <Pressable
              onPress={() => setJoiningModalVisible(true)}
              className="bg-[#161616] flex-row items-center justify-between px-3 py-3.5 rounded-xl border border-[#242424] active:opacity-80"
            >
              <Text className={joiningDate ? 'text-white text-xs font-medium' : 'text-[#666] text-xs'}>
                {joiningDate || 'Select Date'}
              </Text>
              <CalendarBlank size={16} color="#A1A1AA" />
            </Pressable>
          </View>
        </View>
        
        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Qualification / Certification</Text>
          <TextInput
            placeholder="NASM Certified Trainer, BSc Sports Science"
            placeholderTextColor="#666"
            clearButtonMode="while-editing"
            value={qualification}
            onChangeText={setQualification}
            className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
          />
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <Clock size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Working Schedule</Text>
        </View>
        
        <View className="bg-[#161616] border border-[#242424] rounded-xl p-4">
          <Text className="text-white text-xs mb-3">Shift Preference</Text>
          
          <Pressable className="flex-row items-center mb-3" onPress={() => setActiveShift('morning')}>
            <View className="w-5 h-5 rounded-full border border-[#242424] items-center justify-center mr-3">
              {activeShift === 'morning' && <View className="w-3 h-3 rounded-full bg-[#C3F400]" />}
            </View>
            <Text className="text-[#A1A1AA] text-sm">Morning (06:00 AM – 02:00 PM)</Text>
          </Pressable>
          
          <Pressable className="flex-row items-center mb-5" onPress={() => setActiveShift('evening')}>
            <View className="w-5 h-5 rounded-full border border-[#242424] items-center justify-center mr-3">
              {activeShift === 'evening' && <View className="w-3 h-3 rounded-full bg-[#C3F400]" />}
            </View>
            <Text className="text-[#A1A1AA] text-sm">Evening (02:00 PM – 10:00 PM)</Text>
          </Pressable>
          
          <Text className="text-white text-xs mb-3">Working Days</Text>
          <View className="flex-row flex-wrap gap-2">
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => {
              const isActive = activeDays.includes(day);
              return (
                <Pressable 
                  key={day}
                  onPress={() => toggleDay(day)}
                  className={`w-[45px] h-9 items-center justify-center rounded border ${isActive ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#242424]'}`}
                >
                  <Text className={`text-[10px] font-bold uppercase ${isActive ? 'text-black' : 'text-[#888]'}`}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <FileText size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Additional Information</Text>
        </View>
        
        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Bio / About Trainer</Text>
          <TextInput
            placeholder="Brief history of achievements..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={bio}
            onChangeText={setBio}
            className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424] min-h-[100px]"
          />
        </View>
        
        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Languages Spoken (comma separated)</Text>
          <TextInput
            placeholder="e.g. English, Hindi, Telugu"
            placeholderTextColor="#666"
            value={languages}
            onChangeText={setLanguages}
            className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
          />
        </View>
      </View>

      <View className="mb-6">
        <View className="flex-row items-center mb-4">
          <LockKey size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Account Information</Text>
        </View>
        
        <View className="flex-row items-start p-4 border border-dashed border-[#242424] rounded-xl bg-[#0A0A0A]">
          <Info size={18} color="#C3F400" style={{ marginTop: 2 }} />
          <Text className="text-[#888] text-xs ml-3 flex-1 leading-5">
            Upon submission, an account with a unique login password will be generated automatically and shared with the trainer via the provided email address.
          </Text>
        </View>
      </View>

      <View className="pt-4 pb-16 mt-2">
        <Pressable
          disabled={loading}
          onPress={handleSubmit}
          style={{ minHeight: 56 }}
          className="w-full h-14 rounded-2xl bg-[#C3F400] flex-row items-center justify-center shadow-lg active:opacity-85 disabled:opacity-50 gap-2.5 px-4"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Check size={24} color="#000" weight="bold" />
          )}
          <Text className="text-black font-black text-base uppercase tracking-wider">
            {loading ? 'CREATING ACCOUNT...' : 'SAVE & CREATE TRAINER'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
