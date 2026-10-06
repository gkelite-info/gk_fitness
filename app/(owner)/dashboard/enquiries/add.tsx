import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useCreateEnquiry } from '@/hooks/enquiries/useCreateEnquiry';

const INTERESTS = ['Gym Membership', 'Personal Training', 'Group Class', 'Other'];
const SOURCES = ['Walk-in', 'Instagram', 'Facebook', 'Google', 'Referral', 'Owner Added'];
const CATEGORIES = ['Hot', 'Warm', 'Cold'];
const STATUSES = ['New', 'Follow-up', 'In Progress', 'Converted'];

export default function AddEnquiryScreen() {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    interestedIn: 'Gym Membership',
    source: 'Walk-in',
    enquiryCategory: 'Warm',
    status: 'New',
  });

  const handleSave = () => {
    if (!form.name || !form.phone) {
      Alert.alert('Validation Error', 'Please enter at least name and phone number.');
      return;
    }
    
    Alert.alert('Success', 'Enquiry saved locally! (Static mode)');
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-[#0A0A0A]" 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center justify-between px-4 pt-6 pb-4 bg-[#0A0A0A] border-b border-[#1F293D]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Add Enquiry</Text>
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
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />
        </View>

        <View className="mb-6">
          <Text className="text-white font-semibold mb-2">Phone Number</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl px-4 py-3"
            placeholder="e.g. 9876543210"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(t) => setForm({ ...form, phone: t })}
          />
        </View>

        <Text className="text-[#CCF200] font-bold text-xs uppercase tracking-widest mb-3">Service Interest</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {INTERESTS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setForm({ ...form, interestedIn: item })}
              className={`px-4 py-2 rounded-full border ${form.interestedIn === item ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.interestedIn === item ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-[#CCF200] font-bold text-xs uppercase tracking-widest mb-3">Enquiry Source</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {SOURCES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setForm({ ...form, source: item })}
              className={`px-4 py-2 rounded-full border ${form.source === item ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.source === item ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-[#CCF200] font-bold text-xs uppercase tracking-widest mb-3">Lead Category</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {CATEGORIES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setForm({ ...form, enquiryCategory: item })}
              className={`px-4 py-2 rounded-full border ${form.enquiryCategory === item ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.enquiryCategory === item ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-[#CCF200] font-bold text-xs uppercase tracking-widest mb-3">Current Status</Text>
        <View className="flex-row flex-wrap gap-2 mb-10">
          {STATUSES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setForm({ ...form, status: item })}
              className={`px-4 py-2 rounded-full border ${form.status === item ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.status === item ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleSave}
          className="flex-row justify-center items-center h-14 rounded-xl bg-[#CCF200]"
        >
          <Text className="text-black font-bold text-lg">Save Enquiry</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
