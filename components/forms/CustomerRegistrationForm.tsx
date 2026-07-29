import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Alert, ActionSheetIOS, Platform, ActivityIndicator, Keyboard } from 'react-native';
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
  WarningCircle
} from 'phosphor-react-native';
import { router } from 'expo-router';
import { triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';
import { DatePickerModal } from '@/components/DatePickerModal';
import { toast } from '@/lib/toast';
import { createUser } from '@/helpers/otpHelper';
import * as Crypto from 'expo-crypto';

export interface CustomerRegistrationFormProps {
  onRegisterSubmit?: (fn: () => void, loading: boolean) => void;
}

export function CustomerRegistrationForm({ onRegisterSubmit }: CustomerRegistrationFormProps = {}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  const [plan, setPlan] = useState('Select customership plan');

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
    const options = ['Cancel', 'Monthly Plan (1 Month)', 'Quarterly Plan (3 Months)', 'Annual Plan (12 Months)'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) {
            setPlan('Monthly Plan');
            updateExpiry(1);
          }
          if (idx === 2) {
            setPlan('Quarterly Plan');
            updateExpiry(3);
          }
          if (idx === 3) {
            setPlan('Annual Plan');
            updateExpiry(12);
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
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (email.trim()) {
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
    if (!cleanEmergPhone || cleanEmergPhone.length < 10) {
      newErrors.emergencyPhone = 'Valid emergency phone (min 10 digits) required.';
    }

    if (plan === 'Select customership plan') {
      newErrors.plan = 'Please choose a customership plan.';
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

    try {
      setLoading(true);
      toast.loading('Creating customer account...');

      const cleanPhoneVal = `${phoneCode} ${phone.trim()}`;
      const fallbackEmail = email.trim() || `customer.${Crypto.randomUUID().slice(0, 8)}@gkfitness.local`;

      await createUser({
        userId: Crypto.randomUUID(),
        name: fullName.trim(),
        email: fallbackEmail,
        phone: cleanPhoneVal,
        role: 'customer',
      });

      toast.dismiss();
      toast.success('Customer account created successfully!');
      triggerSuccessHaptic();

      setTimeout(() => {
        router.back();
      }, 400);
    } catch (err: any) {
      console.error('[CustomerRegistrationForm] Save Error:', err);
      toast.dismiss();
      triggerErrorHaptic();
      toast.error('Unable to register customer. Please verify details and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (onRegisterSubmit) {
      onRegisterSubmit(handleSubmit, loading);
    }
  }, [onRegisterSubmit, handleSubmit, loading]);

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

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Date of Birth *</Text>
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
            <Text className="text-white text-xs mb-2">Gender *</Text>
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
            <Text className="text-white text-xs mb-2">Phone Number *</Text>
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
                value={phone}
                onChangeText={(txt) => {
                  clearError('phone');
                  setPhone(txt);
                }}
                className={`flex-1 text-white px-3 py-3.5 rounded-xl border ${errors.phone ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
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
          <Text className="text-white text-xs mb-2">Email Address</Text>
          <TextInput
            placeholder="customer@email.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            clearButtonMode="while-editing"
            value={email}
            onChangeText={(txt) => {
              clearError('email');
              setEmail(txt);
            }}
            className={`text-white px-3 py-3.5 rounded-xl border ${errors.email ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
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
          <Text className="text-[#C3F400] font-semibold tracking-wider ml-2 uppercase text-sm">Emergency Contact *</Text>
        </View>

        <View className="flex-row gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-white text-xs mb-2">Contact Name *</Text>
            <TextInput
              placeholder="Enter contact name"
              placeholderTextColor="#666"
              clearButtonMode="while-editing"
              value={emergencyName}
              onChangeText={(txt) => {
                clearError('emergencyName');
                setEmergencyName(txt);
              }}
              className={`text-white px-4 py-3.5 rounded-xl border ${errors.emergencyName ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
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
          <Text className="text-white text-xs mb-2">Relationship *</Text>
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

        <View className="w-[60%] pr-2 mt-6">
          <Text className="text-white text-xs mb-2">Contact Phone *</Text>
          <View className="flex-row gap-2">
            <Pressable className="bg-[#161616] flex-row items-center px-3 py-3.5 rounded-xl border border-[#242424]">
              <Text className="text-white mr-1">{emergencyPhoneCode}</Text>
              <CaretDown size={12} color="#A1A1AA" />
            </Pressable>
            <TextInput
              placeholder="Contact number"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              clearButtonMode="while-editing"
              value={emergencyPhone}
              onChangeText={(txt) => {
                clearError('emergencyPhone');
                setEmergencyPhone(txt);
              }}
              className={`flex-1 text-white px-3 py-3.5 rounded-xl border ${errors.emergencyPhone ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
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
          <Text className="text-[#C3F400] font-semibold tracking-wider ml-2 uppercase text-sm">Customership Information *</Text>
        </View>

        <View className="mb-4">
          <Text className="text-white text-xs mb-2">Customership Plan *</Text>
          <Pressable
            onPress={handlePlanSelect}
            className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl border active:opacity-80 ${errors.plan ? 'bg-[#291111] border-red-500' : 'bg-[#161616] border-[#242424]'}`}
          >
            <Text className={plan === 'Select customership plan' ? 'text-[#666]' : 'text-white font-medium'}>{plan}</Text>
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
            <Text className="text-white text-xs mb-2">Start Date *</Text>
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
            <Text className="text-white text-xs mb-2">Expiry Date *</Text>
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
        options={['Monthly Plan (1 Month)', 'Quarterly Plan (3 Months)', 'Annual Plan (12 Months)']}
        onSelect={(idx) => {
          if (idx === 0) {
            setPlan('Monthly Plan');
            updateExpiry(1);
          }
          if (idx === 1) {
            setPlan('Quarterly Plan');
            updateExpiry(3);
          }
          if (idx === 2) {
            setPlan('Annual Plan');
            updateExpiry(12);
          }
        }}
      />
    </View>
  );
}
