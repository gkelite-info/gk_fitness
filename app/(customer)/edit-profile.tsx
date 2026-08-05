import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Modal, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useUpdateCustomerProfile } from '@/hooks/auth/useUpdateCustomerProfile';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  CaretLeft, Info, Camera, CaretRight,
  User, Envelope, Phone, Heart, CalendarBlank,
  Ruler, Scales, Target, ChartBar
} from 'phosphor-react-native';

import { mockProfileData } from '@/constants/mockProfileData';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' }
];

const FITNESS_GOAL_OPTIONS = [
  { label: 'Lose Weight', value: 'loseweight' },
  { label: 'Build Muscle', value: 'buildmuscle' },
  { label: 'Stay Fit', value: 'stayfit' },
  { label: 'Gain Weight', value: 'gainweight' },
  { label: 'Improve Endurance', value: 'imporoveendurance' }
];

const ACTIVITY_LEVEL_OPTIONS = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Lightly Active', value: 'lightly_active' },
  { label: 'Moderately Active', value: 'moderately_active' },
  { label: 'Very Active', value: 'very_active' },
  { label: 'Super Active', value: 'super_active' }
];

const getLabel = (value: string, options: any[]) => {
  if (!value) return '';
  const match = options.find(o => o.value === value);
  return match ? match.label : value;
};

export default function EditProfileScreen() {
  const userContext = useUser();
  const userId = userContext.userId;
  const { data, isLoading } = useCustomerProfile(userId);

  return <EditProfileView 
    data={mockProfileData} 
    customerData={data?.customerData} 
    onboardingData={data?.onboardingData} 
    loading={isLoading} 
    fallbackUser={userContext} 
    userId={userId} 
  />;
}

function EditProfileView({ data, customerData, onboardingData, loading, fallbackUser, userId }: { data: typeof mockProfileData, customerData: any, onboardingData: any, loading: boolean, fallbackUser: any, userId: string | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    height: '',
    weight: '',
    fitnessGoal: '',
    activityLevel: ''
  });
  
  const updateMutation = useUpdateCustomerProfile();
  
  const [selectorState, setSelectorState] = useState<{ visible: boolean, type: keyof typeof form | '', title: string, options: any[] }>({
    visible: false,
    type: '',
    title: '',
    options: []
  });

  React.useEffect(() => {
    setForm({
      fullName: customerData?.fullName || fallbackUser?.name || data.user.fullName,
      email: customerData?.email || fallbackUser?.email || data.user.email,
      phone: customerData?.phone || fallbackUser?.phone || data.user.phone,
      gender: customerData?.gender || data.user.gender,
      dateOfBirth: customerData?.dateOfBirth || data.user.dateOfBirth,
      height: onboardingData?.height || data.physical.height,
      weight: onboardingData?.weight || data.physical.weight,
      fitnessGoal: onboardingData?.primaryGoal || data.physical.fitnessGoal,
      activityLevel: data.physical.activityLevel,
    });
  }, [customerData, onboardingData, fallbackUser, data]);

  const handleSave = () => {
    if (!userId) return;
    
    if (form.phone) {
      const cleanPhone = form.phone.replace(/[^\d+]/g, '');
      const numberPart = cleanPhone.startsWith('+91') ? cleanPhone.slice(3) : cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;
      
      if (numberPart.length !== 10) {
        toast.error('Phone number must be exactly 10 digits.');
        return;
      }
    }

    updateMutation.mutate(
      { userId, form },
      {
        onSuccess: () => {
          toast.success('Profile updated successfully!');
          router.navigate('/(customer)/profile');
        },
        onError: (err) => {
          console.error('[EditProfile] Error saving:', err);
          toast.error('Failed to save changes.');
        }
      }
    );
  };
  
  const openSelector = (type: keyof typeof form, title: string, options: any[]) => {
    Keyboard.dismiss();
    setSelectorState({ visible: true, type, title, options });
  };
  
  const handleSelect = (value: string) => {
    if (selectorState.type) {
      setForm(prev => ({ ...prev, [selectorState.type as keyof typeof form]: value }));
    }
  };

  const getFeetInches = (cm: string) => {
    const num = parseInt(cm.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return '';
    const totalInches = num / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}' ${inches}"`;
  };

  const getLbs = (kg: string) => {
    const num = parseInt(kg.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return '';
    const lbs = Math.round(num * 2.20462);
    return `${lbs} lbs`;
  };

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-[#1A1A1A]">
        <Pressable onPress={() => router.navigate('/(customer)/profile')} className="p-2">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="flex-1 text-center text-white text-lg font-bold">Personal Information</Text>
        <Pressable className="p-2">
          <Info size={24} color="#D4FF00" weight="regular" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mt-6 mb-6">
          <View className="relative">
            <View className="w-28 h-28 rounded-full border-[3px] border-[#D4FF00] p-0.5">
               <Image 
                  source={{ uri: data.user.avatarUrl }} 
                  className="w-full h-full rounded-full bg-[#27272A]" 
                />
            </View>
            <View className="absolute bottom-0 right-1 bg-[#D4FF00] w-8 h-8 rounded-full items-center justify-center border-[3px] border-[#0F0F0F]">
              <Camera size={14} color="#000000" weight="fill" />
            </View>
          </View>
          {loading ? (
            <>
              <Skeleton className="w-40 h-8 mt-4" />
              <Skeleton className="w-48 h-4 mt-2" />
            </>
          ) : (
            <>
              <Text className="text-white text-2xl font-bold mt-4">{form.fullName}</Text>
              <Text className="text-[#8E8E93] text-sm mt-1">{form.email}</Text>
            </>
          )}
          <Pressable className="mt-3 flex-row items-center">
            <Text className="text-[#D4FF00] text-sm font-bold mr-1">Change Photo</Text>
            <CaretRight size={14} color="#D4FF00" weight="bold" />
          </Pressable>
        </View>

        <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1px] mb-3 mt-2 ml-1">PERSONAL DETAILS</Text>
        
        <InputField icon={<User size={20} color="#D4FF00" />} label="FULL NAME" value={form.fullName} onChangeText={(val: string) => setForm(prev => ({...prev, fullName: val}))} />
        <InputField icon={<Envelope size={20} color="#D4FF00" />} label="EMAIL ADDRESS" value={form.email} editable={false} />
        <InputField 
          icon={<Phone size={20} color="#D4FF00" />} 
          label="PHONE NUMBER" 
          value={form.phone} 
          keyboardType="phone-pad"
          onChangeText={(val: string) => {
            let clean = val.replace(/[^\d+]/g, '');
            if (clean.includes('+')) {
              clean = (clean.startsWith('+') ? '+' : '') + clean.replace(/\+/g, '');
            }
            
            let prefix = '';
            let number = clean;
            
            if (clean.startsWith('+91')) {
               prefix = '+91';
               number = clean.slice(3);
            } else if (clean.startsWith('+')) {
               prefix = '+';
               number = clean.slice(1);
            }
            
            if (number.length > 10) {
               number = number.slice(0, 10);
            }
            
            setForm(prev => ({...prev, phone: prefix + (prefix && prefix !== '+' ? ' ' : '') + number}));
          }} 
        />
        
        <InputField 
          icon={<Heart size={20} color="#D4FF00" />} 
          label="GENDER" 
          value={form.gender ? getLabel(form.gender, GENDER_OPTIONS) : 'Select Gender'} 
          onPress={() => openSelector('gender', 'Select Gender', GENDER_OPTIONS)} 
        />
        
        <InputField icon={<CalendarBlank size={20} color="#D4FF00" />} label="DATE OF BIRTH" value={form.dateOfBirth} onChangeText={(val: string) => setForm(prev => ({...prev, dateOfBirth: val}))} />

        <Text className="text-[#8E8E93] text-[10px] font-bold tracking-[1px] mt-6 mb-3 ml-1">PHYSICAL INFORMATION</Text>
        
        <View className="flex-row gap-x-3">
          <View className="flex-1">
            <InputField 
              icon={<Ruler size={20} color="#D4FF00" />} 
              label="HEIGHT" 
              value={form.height ? form.height.toString() : ''} 
              onChangeText={(val: string) => setForm(prev => ({...prev, height: val}))} 
              suffix="cm"
            />
            {form.height ? (
               <Text className="text-[#8E8E93] text-[10px] font-medium mt-1 ml-1 text-center">~ {getFeetInches(form.height.toString())}</Text>
            ) : null}
          </View>
          <View className="flex-1">
            <InputField 
              icon={<Scales size={20} color="#D4FF00" />} 
              label="WEIGHT" 
              value={form.weight ? form.weight.toString() : ''} 
              onChangeText={(val: string) => setForm(prev => ({...prev, weight: val}))} 
              suffix="kg"
            />
            {form.weight ? (
               <Text className="text-[#8E8E93] text-[10px] font-medium mt-1 ml-1 text-center">~ {getLbs(form.weight.toString())}</Text>
            ) : null}
          </View>
        </View>
        
        <View className="flex-row gap-x-3 mt-4">
          <View className="flex-1">
            <InputField 
              icon={<Target size={20} color="#D4FF00" />} 
              label="FITNESS GOAL" 
              value={form.fitnessGoal ? getLabel(form.fitnessGoal, FITNESS_GOAL_OPTIONS) : 'Select Goal'} 
              onPress={() => openSelector('fitnessGoal', 'Select Fitness Goal', FITNESS_GOAL_OPTIONS)} 
            />
          </View>
          <View className="flex-1">
            <InputField 
              icon={<ChartBar size={20} color="#D4FF00" />} 
              label="ACTIVITY LEVEL" 
              value={form.activityLevel ? getLabel(form.activityLevel, ACTIVITY_LEVEL_OPTIONS) : 'Select Activity'} 
              onPress={() => openSelector('activityLevel', 'Select Activity Level', ACTIVITY_LEVEL_OPTIONS)} 
            />
          </View>
        </View>

        <Pressable 
          onPress={handleSave} 
          disabled={updateMutation.isPending}
          className="bg-[#D4FF00] rounded-xl py-4 items-center justify-center mt-8 active:opacity-80"
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text className="text-black text-base font-bold">Save Changes</Text>
          )}
        </Pressable>
        <Pressable className="border border-[#27272A] bg-transparent rounded-xl py-4 items-center justify-center mt-3 active:opacity-50" onPress={() => router.navigate('/(customer)/profile')}>
          <Text className="text-[#D4FF00] text-base font-bold">Cancel</Text>
        </Pressable>
      </ScrollView>
      
      <BottomSelector 
        visible={selectorState.visible}
        onClose={() => setSelectorState(prev => ({ ...prev, visible: false }))}
        title={selectorState.title}
        options={selectorState.options}
        selectedValue={selectorState.type ? form[selectorState.type as keyof typeof form] : ''}
        onSelect={handleSelect}
      />
    </View>
  );
}

function InputField({ icon, label, value, onChangeText, editable = true, onPress, suffix, keyboardType, maxLength }: any) {
  const Component = onPress ? Pressable : View;
  return (
    <Component 
      onPress={onPress}
      className={`bg-[#1A1A1A] rounded-2xl p-4 flex-row items-center mb-1 border border-[#27272A] ${onPress ? 'active:opacity-70' : ''}`}
    >
      <View className="mr-4">
        {icon}
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-[#8E8E93] text-[8px] uppercase tracking-wider font-bold mb-1">{label}</Text>
        {onPress ? (
          <Text className="text-white text-[15px] font-medium p-0" numberOfLines={1}>{value}</Text>
        ) : (
          <TextInput 
            value={value} 
            onChangeText={onChangeText}
            editable={editable}
            className="text-white text-[15px] font-medium p-0"
            placeholderTextColor="#8E8E93"
            keyboardType={keyboardType || (suffix ? 'numeric' : 'default')}
            maxLength={maxLength}
          />
        )}
      </View>
      {!editable && !onPress && (
        <View className="bg-[#27272A] px-2 py-1 rounded">
          <Text className="text-[#8E8E93] text-[10px] font-bold">LOCKED</Text>
        </View>
      )}
      {suffix && (
        <Text className="text-[#8E8E93] text-sm ml-2 font-bold">{suffix}</Text>
      )}
      {onPress && (
        <CaretRight size={16} color="#8E8E93" />
      )}
    </Component>
  );
}

function BottomSelector({ visible, onClose, options, selectedValue, onSelect, title }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable className="bg-[#1A1A1A] rounded-t-3xl min-h-[40%] max-h-[80%] border-t border-[#27272A]">
          <View className="items-center py-3 border-b border-[#27272A]">
            <View className="w-12 h-1 bg-[#27272A] rounded-full mb-3" />
            <Text className="text-white text-lg font-bold">{title}</Text>
          </View>
          <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
            {options.map((option: any, index: number) => {
              const isSelected = selectedValue === option.value;
              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect(option.value);
                    onClose();
                  }}
                  className={`py-4 px-4 rounded-2xl mb-2 flex-row justify-between items-center ${isSelected ? 'bg-[#D4FF00]/10 border border-[#D4FF00]/20' : 'bg-[#27272A]'}`}
                >
                  <Text className={`text-base font-bold ${isSelected ? 'text-[#D4FF00]' : 'text-white'}`}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <View className="w-3 h-3 rounded-full bg-[#D4FF00]" />
                  )}
                </Pressable>
              );
            })}
            <View className="h-10" />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
