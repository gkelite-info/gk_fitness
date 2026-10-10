import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateEnquiry } from '@/hooks/enquiries/useCreateEnquiry';
import { useEnquiryById } from '@/hooks/enquiries/useEnquiries';
import { SaveGymEnquiryParams } from '@/helpers/enquiries/enquiriesHelper';

const INTERESTS = [
  { label: 'Gym Membership', value: 'membership' },
  { label: 'Personal Training', value: 'personaltraining' },
  { label: 'Group Class', value: 'groupclass' },
  { label: 'Other', value: 'others' }
];

const SOURCES = [
  { label: 'Walk-in', value: 'walkin' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Google', value: 'google' },
  { label: 'Referral', value: 'referral' },
  { label: 'Owner Added', value: 'owner' }
];

const CATEGORIES = [
  { label: 'Hot', value: 'hot' },
  { label: 'Warm', value: 'warm' },
  { label: 'Cold', value: 'cold' }
];

const STATUSES = [
  { label: 'New', value: 'new' },
  { label: 'Follow-up', value: 'followup' },
  { label: 'In Progress', value: 'inprogress' }, // note: backend doesn't have inprogress in type but we can map it or stick to strict type
  { label: 'Converted', value: 'converted' }
];
// Wait, the status type is: 'new' | 'followup' | 'converted' | 'notinterested'. So I will use notinterested instead of inprogress for strict compatibility.

const STATUSES_MAPPED = [
  { label: 'New', value: 'new' },
  { label: 'Follow-up', value: 'followup' },
  { label: 'Not Interested', value: 'notinterested' },
  { label: 'Converted', value: 'converted' }
];

export default function AddEnquiryScreen() {
  const insets = useSafeAreaInsets();
  const { id, edit } = useLocalSearchParams<{ id?: string; edit?: string }>();
  const isEdit = edit === 'true';

  const { data: existingEnquiry, isLoading: isLoadingEnquiry } = useEnquiryById(id);
  const { mutateAsync: saveEnquiry, isPending } = useCreateEnquiry();

  const [form, setForm] = useState<Partial<SaveGymEnquiryParams>>({
    fullName: '',
    mobile: '',
    email: '',
    interestedIn: 'membership',
    enquirySource: 'walkin',
    enquiryCategory: 'warm',
    status: 'new',
    addedThrough: 'owner',
    followUpDate: new Date().toISOString()
  });

  useEffect(() => {
    if (isEdit && existingEnquiry) {
      setForm({
        gymEnquiryId: existingEnquiry.gymEnquiryId,
        fullName: existingEnquiry.fullName || '',
        mobile: existingEnquiry.mobile || '',
        email: existingEnquiry.email || '',
        interestedIn: existingEnquiry.interestedIn || 'membership',
        enquirySource: existingEnquiry.enquirySource || 'walkin',
        enquiryCategory: existingEnquiry.enquiryCategory || 'warm',
        status: existingEnquiry.status || 'new',
        addedThrough: existingEnquiry.addedThrough || 'owner',
        followUpDate: existingEnquiry.followUpDate || new Date().toISOString()
      });
    }
  }, [isEdit, existingEnquiry]);

  const handleSave = async () => {
    if (!form.fullName || !form.mobile) {
      Alert.alert('Validation Error', 'Please enter at least name and phone number.');
      return;
    }
    
    try {
      await saveEnquiry(form as SaveGymEnquiryParams);
      Alert.alert('Success', `Enquiry ${isEdit ? 'updated' : 'saved'} successfully!`);
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save enquiry. Please try again.');
    }
  };

  if (isEdit && isLoadingEnquiry) {
    return (
      <View className="flex-1 bg-[#0A0A0A] justify-center items-center">
        <ActivityIndicator color="#CCF200" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-[#0A0A0A]" 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center justify-between px-4 pt-6 pb-4 bg-[#0A0A0A] border-b border-[#1F293D]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">{isEdit ? 'Edit Enquiry' : 'Add Enquiry'}</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <Text className="text-gray-400 mb-6 text-sm">Capture customer details and track follow-up for new enquiries.</Text>

        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">Customer Name</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl px-4 py-3"
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#666"
            value={form.fullName}
            onChangeText={(t) => setForm({ ...form, fullName: t })}
          />
        </View>

        <View className="mb-6">
          <Text className="text-white font-semibold mb-2">Phone Number</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl px-4 py-3"
            placeholder="e.g. 9876543210"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={form.mobile}
            onChangeText={(t) => setForm({ ...form, mobile: t })}
          />
        </View>

        <Text className="text-[#CCF200] font-bold text-xs uppercase tracking-widest mb-3">Service Interest</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {INTERESTS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setForm({ ...form, interestedIn: item.value as any })}
              className={`px-4 py-2 rounded-full border ${form.interestedIn === item.value ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.interestedIn === item.value ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-[#CCF200] font-bold text-xs uppercase tracking-widest mb-3">Enquiry Source</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {SOURCES.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setForm({ ...form, enquirySource: item.value as any })}
              className={`px-4 py-2 rounded-full border ${form.enquirySource === item.value ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.enquirySource === item.value ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-[#CCF200] font-bold text-xs uppercase tracking-widest mb-3">Lead Category</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CATEGORIES.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setForm({ ...form, enquiryCategory: item.value as any })}
              className={`px-4 py-2 rounded-full border ${form.enquiryCategory === item.value ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.enquiryCategory === item.value ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-[#CCF200] font-bold text-xs uppercase tracking-widest mb-3">Current Status</Text>
        <View className="flex-row flex-wrap gap-2 mb-10">
          {STATUSES_MAPPED.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setForm({ ...form, status: item.value as any })}
              className={`px-4 py-2 rounded-full border ${form.status === item.value ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.status === item.value ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isPending}
          className={`flex-row justify-center items-center h-14 rounded-xl ${isPending ? 'bg-[#CCF200]/50' : 'bg-[#CCF200]'}`}
        >
          {isPending ? <ActivityIndicator color="#000" /> : <Text className="text-black font-bold text-lg">{isEdit ? 'Update Enquiry' : 'Save Enquiry'}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
