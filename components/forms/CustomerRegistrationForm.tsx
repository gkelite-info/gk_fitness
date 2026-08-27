import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Alert, ActionSheetIOS, Platform, ActivityIndicator, Keyboard, Share, Linking } from 'react-native';
import { ActionSheet } from '@/components/ActionSheet';
import { Text } from '@/components/nativewindui/Text';
import {
  User,
  CalendarBlank,
  CaretDown,
  Phone,
  ShieldCheck,
  IdentificationCard,
  LockKey,
  Info,
  Check,
  WarningCircle,
  ClipboardText,
  ShareNetwork,
  EnvelopeSimple,
  Copy
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { triggerSuccessHaptic, triggerErrorHaptic, triggerLightHaptic } from '@/lib/haptics';
import { DatePickerModal } from '@/components/DatePickerModal';
import { toast } from '@/lib/toast';
import { useUser } from '@/context/UserContext';
import { saveGymCustomer, SaveGymCustomerParams } from '@/helpers/customers/customerHelper';
import * as Crypto from 'expo-crypto';
import { useGymMembershipPlans } from '@/hooks/useGymMembershipPlans';
import { saveGymCustomerMembershipPlan } from '@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipPlans';

interface GeneratedCredentials {
  fullName: string;
  email: string;
  phone: string;
  temporaryPassword: string;
  plan: string;
  startDate: string;
}

export interface CustomerRegistrationFormProps {
  onRegisterSubmit?: (fn: () => void, loading: boolean) => void;
}

export function CustomerRegistrationForm({ onRegisterSubmit }: CustomerRegistrationFormProps = {}) {
  const { userId, gymOwnerId } = useUser();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdCredentials, setCreatedCredentials] = useState<GeneratedCredentials | null>(null);

  const { data: membershipPlans } = useGymMembershipPlans(userId);


  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [expiryModalVisible, setExpiryModalVisible] = useState(false);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Select gender');
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);
  const [planModalVisible, setPlanModalVisible] = useState(false);

  const [phoneCode, setPhoneCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Select relationship');
  const [emergencyPhoneCode, setEmergencyPhoneCode] = useState('+91');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [plan, setPlan] = useState('Select membership plan');

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const nxt = { ...prev };
        delete nxt[field];
        return nxt;
      });
    }
  };

  const handleGenderSelect = () => {
    Keyboard.dismiss();
    clearError('gender');
    const options = ['Cancel', 'Male', 'Female', 'Other'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) setGender('Male');
          if (idx === 2) setGender('Female');
          if (idx === 3) setGender('Other');
        }
      );
    } else {
      setGenderModalVisible(true);
    }
  };

  const handleRelationshipSelect = () => {
    Keyboard.dismiss();
    clearError('emergencyRelationship');
    const options = ['Cancel', 'Parent', 'Spouse', 'Sibling', 'Friend', 'Other'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (idx) => {
          if (idx > 0) setEmergencyRelationship(options[idx]);
        }
      );
    } else {
      setRelationshipModalVisible(true);
    }
  };

  const handlePlanSelect = () => {
    Keyboard.dismiss();
    clearError('plan');
    const planOptions = membershipPlans?.map(p => `${p.planName} (${p.durationMonths} Months)`) || [];
    const options = ['Cancel', ...planOptions];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (idx) => {
          if (idx > 0 && membershipPlans) {
            const selectedPlan = membershipPlans[idx - 1];
            setPlan(selectedPlan.planName);
            updateExpiry(parseInt(selectedPlan.durationMonths) || 1);
          }
        }
      );
    } else {
      setPlanModalVisible(true);
    }
  };

  const updateExpiry = (monthsToAdd: number) => {
    try {
      const d = startDate ? new Date(startDate) : new Date();
      if (!isNaN(d.getTime())) {
        d.setMonth(d.getMonth() + monthsToAdd);
        setExpiryDate(d.toISOString().split('T')[0]);
      }
    } catch {
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      newErrors.fullName = 'Please enter customer full name (minimum 3 characters).';
    }

    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required.';
    } else {
      const birth = new Date(dateOfBirth);
      const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 12) {
        newErrors.dateOfBirth = 'Customer must be at least 12 years old.';
      }
    }

    if (gender === 'Select gender') {
      newErrors.gender = 'Please select gender.';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number starting with 6-9.';
    }

    if (email.trim() || email.length === 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email format.';
      }
    }

    if (!emergencyName.trim() || emergencyName.trim().length < 2) {
      newErrors.emergencyName = 'Please enter emergency contact name.';
    }

    if (emergencyRelationship === 'Select relationship') {
      newErrors.emergencyRelationship = 'Please choose emergency relationship.';
    }

    const cleanEmergPhone = emergencyPhone.replace(/\D/g, '');
    if (!cleanEmergPhone || cleanEmergPhone.length !== 10 || !/^[6-9]/.test(cleanEmergPhone)) {
      newErrors.emergencyPhone = 'Valid emergency phone (10 digits starting with 6-9) required.';
    }

    if (plan === 'Select membership plan') {
      newErrors.plan = 'Please choose a membership plan.';
    }

    if (!startDate) {
      newErrors.startDate = 'Start Date is required.';
    }
    if (!expiryDate) {
      newErrors.expiryDate = 'Expiry Date is required.';
    } else if (startDate && new Date(expiryDate) <= new Date(startDate)) {
      newErrors.expiryDate = 'Expiry Date must be after Start Date.';
    }

    setErrors(newErrors);
    const errKeys = Object.keys(newErrors);
    if (errKeys.length > 0) {
      triggerErrorHaptic();
      toast.error(newErrors[errKeys[0]]);
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
      toast.loading('Creating customer account...');

      const cleanPhoneVal = `${phoneCode} ${phone.trim()}`;
      const fallbackEmail = email.trim() || `customer.${Crypto.randomUUID().slice(0, 8)}@gkfitness.local`;
      const cleanEmergPhone = `${emergencyPhoneCode} ${emergencyPhone.trim()}`;

      const params: SaveGymCustomerParams = {
        fullName: fullName.trim(),
        phone: cleanPhoneVal,
        email: fallbackEmail,
        dateOfBirth: dateOfBirth,
        gender: gender.toLowerCase(),
        emergencyContactName: emergencyName.trim(),
        relationship: emergencyRelationship.trim(),
        emergencyContactNumber: cleanEmergPhone,
        createdBy: userId,
        is_Active: true,
      };

      const result = await saveGymCustomer(params);

      const selectedPlanObj = membershipPlans?.find(p => p.planName === plan);
      if (selectedPlanObj && result.customerId && result.gymId) {
        await saveGymCustomerMembershipPlan({
          customerId: result.customerId,
          gymId: result.gymId,
          planId: selectedPlanObj.planId,
          startDate: startDate,
          endDate: expiryDate,
          createdBy: gymOwnerId || userId || '',
          is_Active: true,
        });
      }

      toast.dismiss();
      toast.success('Customer account created successfully!');
      triggerSuccessHaptic();

      setCreatedCredentials({
        fullName: fullName.trim(),
        email: fallbackEmail,
        phone: cleanPhoneVal,
        temporaryPassword: result.temporaryPassword || 'CS-XXXXX-X',
        plan: plan,
        startDate: startDate,
      });

    } catch (err: any) {
      console.error('[CustomerRegistrationForm] Save Error:', err);
      toast.dismiss();
      triggerErrorHaptic();
      toast.error('Unable to register customer. Please verify details and ensure email/phone is unique.');
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
    const credText = `New Customer Account\nName: ${createdCredentials.fullName}\nEmail: ${createdCredentials.email}\nPhone: ${createdCredentials.phone}\nTemporary Password: ${createdCredentials.temporaryPassword}\nPlan: ${createdCredentials.plan}`;
    toast.success('Credentials copied to clipboard');
    triggerLightHaptic();
  };

  const handleShare = async () => {
    if (!createdCredentials) return;
    try {
      await Share.share({
        message: `New Customer Account\nName: ${createdCredentials.fullName}\nEmail: ${createdCredentials.email}\nPhone: ${createdCredentials.phone}\nTemporary Password: ${createdCredentials.temporaryPassword}\nPlan: ${createdCredentials.plan}`,
      });
      triggerLightHaptic();
    } catch (err: any) {
      console.error('Error sharing credentials:', err);
    }
  };

  const handleEmailBtn = () => {
    if (!createdCredentials) return;
    const subject = encodeURIComponent('Your New Gym Membership');
    const body = encodeURIComponent(
      `Hello ${createdCredentials.fullName},\n\nYour gym membership has been registered successfully.\n\nHere are your temporary login credentials:\n\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.temporaryPassword}\nPlan: ${createdCredentials.plan}\n\nYou will be prompted to change this password on your first login.\n\nBest regards,\nGym Administration`
    );
    Linking.openURL(`mailto:${createdCredentials.email}?subject=${subject}&body=${body}`).catch((err) => {
      toast.error('Could not open email application.');
      console.error('Error opening email client:', err);
    });
    triggerLightHaptic();
  };

  if (createdCredentials) {
    return (
      <View className="flex-1 pb-10">
        <View className="bg-[#111622] border border-[#1F293D] rounded-2xl p-5 mb-6 shadow-xl">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-semibold text-white leading-5">{createdCredentials.fullName}</Text>
              <Text className="text-xs text-[#C3F400] mt-0.5 font-semibold">{createdCredentials.plan}</Text>
              <Text className="text-[11px] text-[#888888] mt-1">Start: {createdCredentials.startDate}</Text>
            </View>
            <View className="bg-[#064E3B]/50 border border-[#059669]/40 px-3 py-1 rounded-full">
              <Text className="text-[#10B981] text-[10px] font-extrabold tracking-wider">ACTIVE</Text>
            </View>
          </View>

          <View className="h-[1px] bg-[#1F293D] my-3.5" />

          <Text className="text-xs font-semibold text-[#C3F400] tracking-wider uppercase mb-3">Customer Contact Details</Text>
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
          <Text className="text-xs font-semibold text-[#C3F400] tracking-wider uppercase mb-4">Login Credentials</Text>

          <Text className="text-[10px] text-[#888888] mb-1.5 font-semibold tracking-wider uppercase">Email / Username</Text>
          <View className="bg-[#0A0E17] border border-[#1F293D] rounded-xl p-3.5 mb-4">
            <Text className="text-white text-sm font-medium">{createdCredentials.email}</Text>
          </View>

          <Text className="text-[10px] text-[#888888] mb-1.5 font-semibold tracking-wider uppercase">Temporary Password</Text>
          <View className="bg-[#0A0E17] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between">
            <Text className="text-[#C3F400] text-base font-mono font-semibold">{createdCredentials.temporaryPassword}</Text>
            <Pressable onPress={handleCopyCredentials} className="active:opacity-75 p-1">
              <ClipboardText size={20} color="#C3F400" />
            </Pressable>
          </View>

          <View className="flex-row items-start gap-2.5 mt-4 bg-[#C3F400]/10 border border-[#C3F400]/20 rounded-xl p-3.5">
            <View className="mt-0.5">
              <WarningCircle size={16} color="#C3F400" weight="fill" />
            </View>
            <Text className="flex-1 text-xs text-[#C3F400] leading-4 font-medium">
              Account created and verified! An onboarding email has been prepared for the customer with instructions to update this temporary password upon first login.
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3.5 mb-8">
          <Pressable
            onPress={handleCopyCredentials}
            className="flex-1 bg-[#111622] border border-[#1F293D] rounded-2xl py-4 items-center justify-center active:opacity-75"
          >
            <Copy size={22} color="#FFFFFF" />
            <Text className="text-[#A1A1AA] text-[10px] font-semibold tracking-wider uppercase mt-1.5">COPY</Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            className="flex-1 bg-[#111622] border border-[#1F293D] rounded-2xl py-4 items-center justify-center active:opacity-75"
          >
            <ShareNetwork size={22} color="#FFFFFF" />
            <Text className="text-[#A1A1AA] text-[10px] font-semibold tracking-wider uppercase mt-1.5">SHARE</Text>
          </Pressable>

          <Pressable
            onPress={handleEmailBtn}
            className="flex-1 bg-[#111622] border border-[#1F293D] rounded-2xl py-4 items-center justify-center active:opacity-75"
          >
            <EnvelopeSimple size={22} color="#FFFFFF" />
            <Text className="text-[#A1A1AA] text-[10px] font-semibold tracking-wider uppercase mt-1.5">EMAIL</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{ minHeight: 56 }}
          className="w-full h-14 rounded-2xl bg-[#C3F400] flex-row items-center justify-center shadow-lg active:opacity-85 px-4"
        >
          <Text className="text-black font-black text-base uppercase tracking-wider font-semibold">RETURN TO CUSTOMERS</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <DatePickerModal
        visible={dobModalVisible}
        title="Select Date of Birth"
        initialDate={dateOfBirth || '1998-08-20'}
        onClose={() => setDobModalVisible(false)}
        onSelectDate={(dateStr) => {
          clearError('dateOfBirth');
          setDateOfBirth(dateStr);
        }}
        minYear={1940}
        maxYear={2012}
      />

      <DatePickerModal
        visible={startModalVisible}
        title="Select Plan Start Date"
        initialDate={startDate}
        onClose={() => setStartModalVisible(false)}
        onSelectDate={(dateStr) => {
          clearError('startDate');
          setStartDate(dateStr);
        }}
        minYear={2020}
        maxYear={2030}
      />

      <DatePickerModal
        visible={expiryModalVisible}
        title="Select Plan Expiry Date"
        initialDate={expiryDate}
        onClose={() => setExpiryModalVisible(false)}
        onSelectDate={(dateStr) => {
          clearError('expiryDate');
          setExpiryDate(dateStr);
        }}
        minYear={2020}
        maxYear={2032}
      />

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <User size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-semibold tracking-wider ml-2 uppercase text-sm">Personal Information</Text>
        </View>

        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Full Name <Text className="text-red-500">*</Text></Text>
          <TextInput
            placeholder="Enter full name"
            placeholderTextColor="#666"
            clearButtonMode="while-editing"
            value={fullName}
            onChangeText={(txt) => {
              clearError('fullName');
              setFullName(txt);
            }}
            className={`text-white px-4 py-3.5 rounded-xl border font-sans ${errors.fullName ? 'bg-[#291111] border-red-500 font-sans' : 'bg-[#161616] border-[#242424] font-sans'}`}
          />
          {errors.fullName && (
            <View className="flex-row items-center mt-1.5 ml-1">
              <WarningCircle size={14} color="#EF4444" />
              <Text className="text-red-400 text-xs ml-1">{errors.fullName}</Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Date of Birth <Text className="text-red-500">*</Text></Text>
            <Pressable
              onPress={() => setDobModalVisible(true)}
              className={`flex-row items-center justify-between px-3.5 py-3.5 rounded-xl border active:opacity-80 ${errors.dateOfBirth ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
            >
              <Text className={dateOfBirth ? 'text-white text-xs font-medium' : 'text-[#666] text-xs'}>
                {dateOfBirth || 'YYYY-MM-DD'}
              </Text>
              <CalendarBlank size={16} color={errors.dateOfBirth ? '#EF4444' : '#A1A1AA'} />
            </Pressable>
            {errors.dateOfBirth && (
              <View className="flex-row items-center mt-1 ml-1">
                <WarningCircle size={12} color="#EF4444" />
                <Text className="text-red-400 text-[10px] ml-1">{errors.dateOfBirth}</Text>
              </View>
            )}
          </View>

          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Gender <Text className="text-red-500">*</Text></Text>
            <Pressable
              onPress={handleGenderSelect}
              className={`flex-row items-center justify-between px-3.5 py-3.5 rounded-xl border active:opacity-80 ${errors.gender ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
            >
              <Text className={gender === 'Select gender' ? 'text-[#666] text-xs' : 'text-white text-xs font-medium'}>{gender}</Text>
              <CaretDown size={16} color={errors.gender ? '#EF4444' : '#A1A1AA'} />
            </Pressable>
            {errors.gender && (
              <View className="flex-row items-center mt-1 ml-1">
                <WarningCircle size={12} color="#EF4444" />
                <Text className="text-red-400 text-[10px] ml-1">{errors.gender}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <Phone size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-semibold tracking-wider ml-2 uppercase text-sm">Contact Information</Text>
        </View>

        <View className="flex-row gap-4">
          <View className="flex-[1.2]">
            <Text className="text-white text-xs mb-2">Phone Number <Text className="text-red-500">*</Text></Text>
            <View className="flex-row gap-4">
              <Pressable className="bg-[#161616] flex-row items-center px-3 py-3.5 rounded-xl border border-[#242424]">
                <Text className="text-white mr-1">{phoneCode}</Text>
                <CaretDown size={12} color="#A1A1AA" />
              </Pressable>
              <TextInput
                placeholder="Mobile no."
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                clearButtonMode="while-editing"
                maxLength={10}
                value={phone}
                onChangeText={(txt) => {
                  clearError('phone');
                  let cleaned = txt.replace(/\D/g, '');
                  if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) {
                    cleaned = '';
                  }
                  setPhone(cleaned);
                }}
                className={`flex-1 text-white px-3 py-3.5 rounded-xl border font-sans ${errors.phone ? 'bg-[#291111] border-red-500 font-sans' : 'bg-[#161616] border-[#242424] font-sans'}`}
              />
            </View>
            {errors.phone && (
              <View className="flex-row items-center mt-1 ml-1">
                <WarningCircle size={12} color="#EF4444" />
                <Text className="text-red-400 text-[10px] ml-1">{errors.phone}</Text>
              </View>
            )}
          </View>

        </View>

        <View className="flex-1 mt-6">
          <Text className="text-white text-xs mb-2">Email Address <Text className="text-red-500">*</Text></Text>
          <TextInput
            placeholder="customer@email.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            clearButtonMode="while-editing"
            value={email}
            onChangeText={(txt) => {
              clearError('email');
              setEmail(txt);
            }}
            className={`text-white px-3 py-3.5 rounded-xl border font-sans ${errors.email ? 'bg-[#291111] border-red-500 font-sans' : 'bg-[#161616] border-[#242424] font-sans'}`}
          />
          {errors.email && (
            <View className="flex-row items-center mt-1 ml-1">
              <WarningCircle size={12} color="#EF4444" />
              <Text className="text-red-400 text-[10px] ml-1">{errors.email}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <ShieldCheck size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-semibold tracking-wider ml-2 uppercase text-sm">Emergency Contact <Text className="text-red-500">*</Text></Text>
        </View>

        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Contact Name <Text className="text-red-500">*</Text></Text>
            <TextInput
              placeholder="Enter contact name"
              placeholderTextColor="#666"
              clearButtonMode="while-editing"
              value={emergencyName}
              onChangeText={(txt) => {
                clearError('emergencyName');
                setEmergencyName(txt);
              }}
              className={`text-white px-4 py-3.5 rounded-xl border font-sans ${errors.emergencyName ? 'bg-[#291111] border-red-500 font-sans' : 'bg-[#161616] border-[#242424] font-sans'}`}
            />
            {errors.emergencyName && (
              <View className="flex-row items-center mt-1 ml-1">
                <WarningCircle size={12} color="#EF4444" />
                <Text className="text-red-400 text-[10px] ml-1">{errors.emergencyName}</Text>
              </View>
            )}
          </View>

        </View>
        <View className="flex-1">
          <Text className="text-white text-xs mb-2">Relationship <Text className="text-red-500">*</Text></Text>
          <Pressable
            onPress={handleRelationshipSelect}
            className={`flex-row items-center justify-between px-3.5 py-3.5 rounded-xl border active:opacity-80 ${errors.emergencyRelationship ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
          >
            <Text className={emergencyRelationship === 'Select relationship' ? 'text-[#666] text-xs' : 'text-white text-xs font-medium'}>{emergencyRelationship}</Text>
            <CaretDown size={16} color={errors.emergencyRelationship ? '#EF4444' : '#A1A1AA'} />
          </Pressable>
          {errors.emergencyRelationship && (
            <View className="flex-row items-center mt-1 ml-1">
              <WarningCircle size={12} color="#EF4444" />
              <Text className="text-red-400 text-[10px] ml-1">{errors.emergencyRelationship}</Text>
            </View>
          )}
        </View>

        <View className="pr-2 mt-6">
          <Text className="text-white text-xs mb-2">Contact Phone <Text className="text-red-500">*</Text></Text>
          <View className="flex-row gap-4">
            <Pressable className="bg-[#161616] flex-row items-center px-3 py-3.5 rounded-xl border border-[#242424]">
              <Text className="text-white mr-1">{emergencyPhoneCode}</Text>
              <CaretDown size={12} color="#A1A1AA" />
            </Pressable>
            <TextInput
              placeholder="Contact number"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              clearButtonMode="while-editing"
              maxLength={10}
              value={emergencyPhone}
              onChangeText={(txt) => {
                clearError('emergencyPhone');
                let cleaned = txt.replace(/\D/g, '');
                if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) {
                  cleaned = '';
                }
                setEmergencyPhone(cleaned);
              }}
              className={`flex-1 text-white px-3 py-3.5 rounded-xl border font-sans ${errors.emergencyPhone ? 'bg-[#291111] border-red-500 font-sans' : 'bg-[#161616] border-[#242424] font-sans'}`}
            />
          </View>
          {errors.emergencyPhone && (
            <View className="flex-row items-center mt-1 ml-1">
              <WarningCircle size={12} color="#EF4444" />
              <Text className="text-red-400 text-[10px] ml-1">{errors.emergencyPhone}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row items-center mb-4">
          <IdentificationCard size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-semibold tracking-wider ml-2 uppercase text-sm">Membership Information <Text className="text-red-500">*</Text></Text>
        </View>

        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Membership Plan <Text className="text-red-500">*</Text></Text>
          <Pressable
            onPress={handlePlanSelect}
            className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl border active:opacity-80 ${errors.plan ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
          >
            <Text className={plan === 'Select membership plan' ? 'text-[#666]' : 'text-white font-medium'}>{plan}</Text>
            <CaretDown size={18} color={errors.plan ? '#EF4444' : '#A1A1AA'} />
          </Pressable>
          {errors.plan && (
            <View className="flex-row items-center mt-1.5 ml-1">
              <WarningCircle size={14} color="#EF4444" />
              <Text className="text-red-400 text-xs ml-1">{errors.plan}</Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Start Date <Text className="text-red-500">*</Text></Text>
            <Pressable
              onPress={() => setStartModalVisible(true)}
              className={`flex-row items-center justify-between px-3.5 py-3.5 rounded-xl border active:opacity-80 ${errors.startDate ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
            >
              <Text className={startDate ? 'text-white text-xs font-medium' : 'text-[#666] text-xs'}>
                {startDate || 'YYYY-MM-DD'}
              </Text>
              <CalendarBlank size={16} color={errors.startDate ? '#EF4444' : '#A1A1AA'} />
            </Pressable>
            {errors.startDate && (
              <View className="flex-row items-center mt-1 ml-1">
                <WarningCircle size={12} color="#EF4444" />
                <Text className="text-red-400 text-[10px] ml-1">{errors.startDate}</Text>
              </View>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Expiry Date <Text className="text-red-500">*</Text></Text>
            <Pressable
              onPress={() => setExpiryModalVisible(true)}
              className={`flex-row items-center justify-between px-3.5 py-3.5 rounded-xl border active:opacity-80 ${errors.expiryDate ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
            >
              <Text className={expiryDate ? 'text-white text-xs font-medium' : 'text-[#666] text-xs'}>
                {expiryDate || 'YYYY-MM-DD'}
              </Text>
              <CalendarBlank size={16} color={errors.expiryDate ? '#EF4444' : '#A1A1AA'} />
            </Pressable>
            {errors.expiryDate && (
              <View className="flex-row items-center mt-1 ml-1">
                <WarningCircle size={12} color="#EF4444" />
                <Text className="text-red-400 text-[10px] ml-1">{errors.expiryDate}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="mb-6">
        <View className="flex-row items-center mb-4">
          <LockKey size={20} color="#C3F400" weight="fill" />
          <Text className="text-[#C3F400] font-semibold tracking-wider ml-2 uppercase text-sm">Account Information</Text>
        </View>

        <View className="flex-row items-start p-4 border border-dashed border-[#242424] rounded-xl bg-[#0A0A0A]">
          <Info size={18} color="#C3F400" style={{ marginTop: 2 }} />
          <Text className="text-[#888] text-xs ml-3 flex-1 leading-5">
            Login credentials will be generated automatically and shared with the customer.
          </Text>
        </View>
      </View>

      <View className="pt-4 mt-2">
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
          <Text className="text-[#000] text-base font-semibold uppercase tracking-wider">
            {loading ? 'CREATING PROFILE...' : 'SAVE & CREATE CUSTOMER'}
          </Text>
        </Pressable>
      </View>

      <ActionSheet
        visible={genderModalVisible}
        onClose={() => setGenderModalVisible(false)}
        title="Select Gender"
        options={['Male', 'Female', 'Other']}
        onSelect={(idx) => {
          if (idx === 0) setGender('Male');
          if (idx === 1) setGender('Female');
          if (idx === 2) setGender('Other');
        }}
      />

      <ActionSheet
        visible={relationshipModalVisible}
        onClose={() => setRelationshipModalVisible(false)}
        title="Select Relationship"
        options={['Parent', 'Spouse', 'Sibling', 'Friend', 'Other']}
        onSelect={(idx) => {
          const list = ['Parent', 'Spouse', 'Sibling', 'Friend', 'Other'];
          setEmergencyRelationship(list[idx]);
        }}
      />

      <ActionSheet
        visible={planModalVisible}
        onClose={() => setPlanModalVisible(false)}
        title="Select Plan"
        options={membershipPlans?.map(p => `${p.planName} (${p.durationMonths} Months)`) || []}
        onSelect={(idx) => {
          if (membershipPlans) {
            const selectedPlan = membershipPlans[idx];
            setPlan(selectedPlan.planName);
            updateExpiry(parseInt(selectedPlan.durationMonths) || 1);
          }
        }}
      />
    </View>
  );
}
