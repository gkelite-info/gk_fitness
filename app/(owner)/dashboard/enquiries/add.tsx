import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { toast } from '@/lib/toast';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, CaretDown, Crown, CalendarBlank, UserCheck, ArrowRight } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateEnquiry } from '@/hooks/enquiries/useCreateEnquiry';
import { useEnquiryById } from '@/hooks/enquiries/useEnquiries';
import { useGymMembershipPlans } from '@/hooks/useGymMembershipPlans';
import { useUser } from '@/context/UserContext';
import { SaveGymEnquiryParams } from '@/helpers/enquiries/enquiriesHelper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'others' }
];

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

  const { userId } = useUser();
  const { data: existingEnquiry, isLoading: isLoadingEnquiry } = useEnquiryById(id);
  const { mutateAsync: saveEnquiry, isPending } = useCreateEnquiry();
  const { data: plans = [], isLoading: isLoadingPlans } = useGymMembershipPlans(userId ?? null);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a: any, b: any) => {
      const priceA = typeof a.price === 'number' ? a.price : parseFloat(a.price) || 0;
      const priceB = typeof b.price === 'number' ? b.price : parseFloat(b.price) || 0;
      return priceA - priceB;
    });
  }, [plans]);

  const [form, setForm] = useState<Partial<SaveGymEnquiryParams>>({
    fullName: '',
    mobile: '',
    email: '',
    gender: '',
    interestedIn: '',
    planId: null,
    enquirySource: '',
    enquiryCategory: '',
    status: 'new',
    notes: '',
    addedThrough: 'owner',
    followUpDate: ''
  });

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isEdit && existingEnquiry) {
      setForm({
        gymEnquiryId: existingEnquiry.gymEnquiryId,
        fullName: existingEnquiry.fullName || '',
        mobile: existingEnquiry.mobile || '',
        email: existingEnquiry.email || '',
        gender: existingEnquiry.gender || '',
        interestedIn: existingEnquiry.interestedIn || '',
        planId: existingEnquiry.planId || null,
        enquirySource: existingEnquiry.enquirySource || '',
        enquiryCategory: existingEnquiry.enquiryCategory || '',
        status: existingEnquiry.status || 'new',
        notes: existingEnquiry.notes || '',
        addedThrough: existingEnquiry.addedThrough || 'owner',
        followUpDate: existingEnquiry.followUpDate ? new Date(existingEnquiry.followUpDate).toISOString() : ''
      });
    }
  }, [isEdit, existingEnquiry]);

  const handleMobileChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length === 1 && !['6', '7', '8', '9'].includes(cleaned)) {
      toast.error('Phone number must start with 6, 7, 8, or 9');
      return;
    }
    setForm((prev) => ({ ...prev, mobile: cleaned }));
  };

  const handleSave = async () => {
    const trimmedName = form.fullName?.trim() || '';
    const trimmedMobile = form.mobile?.trim() || '';
    const trimmedEmail = form.email?.trim() || '';

    if (!trimmedName && !trimmedMobile) {
      toast.error('Customer name and phone number are required');
      return;
    }

    if (!trimmedName) {
      toast.error('Customer name is mandatory');
      return;
    }

    if (!trimmedMobile) {
      toast.error('Phone number is mandatory');
      return;
    }

    if (!/^[6-9]/.test(trimmedMobile)) {
      toast.error('Phone number must start with 6, 7, 8, or 9');
      return;
    }

    if (trimmedMobile.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!form.interestedIn) {
      toast.error('Please select service interest');
      return;
    }

    if (form.interestedIn === 'membership' && sortedPlans.length > 0 && !form.planId) {
      toast.error('Please select a membership plan');
      return;
    }

    if (!form.enquirySource) {
      toast.error('Please select enquiry source');
      return;
    }

    if (!form.enquiryCategory) {
      toast.error('Please select lead category');
      return;
    }

    const finalStatus = (!isEdit || !form.status) ? (form.status || 'new') : form.status;

    if (finalStatus === 'converted' && existingEnquiry?.status !== 'converted') {
      toast.error('Enquiries cannot be marked Converted directly. Please register the customer first.');
      return;
    }

    if (!form.followUpDate) {
      toast.error('Next follow-up date is mandatory');
      return;
    }

    try {
      await saveEnquiry({
        ...form,
        fullName: trimmedName,
        mobile: trimmedMobile,
        email: trimmedEmail,
        status: finalStatus,
        followUpDate: form.followUpDate,
        planId: form.interestedIn === 'membership' ? (form.planId || null) : null,
      } as SaveGymEnquiryParams);
      toast.success(`Enquiry ${isEdit ? 'updated' : 'saved'} successfully!`);
      router.back();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save enquiry. Please try again.');
    }
  };

  const isStatusLocked = (statusVal: string) => {
    if (statusVal === 'new') return false;
    if (!isEdit) {
      // At initial while saving, all remaining statuses ('followup', 'notinterested', 'converted') are locked!
      return true;
    }
    // When editing:
    if (statusVal === 'converted') {
      return existingEnquiry?.status !== 'converted';
    }
    return false;
  };

  const handleStatusSelect = (statusVal: string) => {
    if (!isEdit && statusVal !== 'new') {
      toast.error('New enquiries must be created with "New" status first. You can follow up or convert after saving.');
      return;
    }

    if (statusVal === 'converted') {
      if (existingEnquiry?.status === 'converted') {
        setForm((prev) => ({ ...prev, status: 'converted' }));
        return;
      }
      if (isEdit && existingEnquiry?.gymEnquiryId) {
        toast.success('Redirecting to customer registration...');
        router.push(`/(owner)/dashboard/add-customer?enquiryId=${existingEnquiry.gymEnquiryId}`);
        return;
      } else {
        toast.error('Please save the enquiry first before converting to a customer.');
        return;
      }
    }
    setForm((prev) => ({ ...prev, status: statusVal as any }));
  };

  const selectedPlan = sortedPlans.find((p: any) => p.planId === form.planId);

  if (isEdit && isLoadingEnquiry) {
    return (
      <View className="flex-1 bg-[#0A0A0A] justify-center items-center">
        <ActivityIndicator color="#CCF200" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0A0A0A] pt-5"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center justify-between px-4 pt-6 pb-4 bg-[#0A0A0A] border-b border-[#1F293D]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">{isEdit ? 'Edit Enquiry' : 'Add Enquiry'}</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <Text className="text-gray-400 mb-6 text-sm">Capture customer details and track follow-up for new enquiries.</Text>

        {/* Customer Name */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">
            Customer Name <Text className="text-red-500 font-bold">*</Text>
          </Text>
          <TextInput
            className="bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl px-4 py-3 font-sans"
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#666"
            value={form.fullName}
            onChangeText={(t) => setForm({ ...form, fullName: t })}
          />
        </View>

        {/* Phone Number */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">
            Phone Number <Text className="text-red-500 font-bold">*</Text>
          </Text>
          <TextInput
            className="bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl px-4 py-3 font-sans"
            placeholder="e.g. 9876543210"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={form.mobile}
            maxLength={10}
            onChangeText={handleMobileChange}
          />
          <Text className="text-gray-500 text-[11px] mt-1 ml-1">Must be 10 digits starting with 6, 7, 8, or 9.</Text>
        </View>

        {/* Email Address */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">Email Address</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl px-4 py-3 font-sans"
            placeholder="e.g. rahul@gmail.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
          />
        </View>

        {/* Gender */}
        <Text className="text-white font-semibold text-xs uppercase tracking-widest mb-3">Gender</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {GENDERS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setForm({ ...form, gender: item.value as any })}
              className={`px-4 py-2 rounded-full border ${form.gender === item.value ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.gender === item.value ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Service Interest */}
        <Text className="text-[#CCF200] font-semibold text-xs uppercase tracking-widest mb-3">
          Service Interest <Text className="text-red-500 font-bold">*</Text>
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {INTERESTS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => {
                const isMembership = item.value === 'membership';
                setForm({
                  ...form,
                  interestedIn: item.value as any,
                  planId: isMembership ? form.planId : null
                });
              }}
              className={`px-4 py-2 rounded-full border ${form.interestedIn === item.value ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'}`}
            >
              <Text className={`text-xs font-semibold ${form.interestedIn === item.value ? 'text-[#CCF200]' : 'text-gray-400'}`}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Membership Plan Selection (shown when Gym Membership is selected, sorted ascending by price) */}
        {form.interestedIn === 'membership' && (
          <View className="mb-6">
            <Text className="text-white font-semibold mb-2">
              Select Membership Plan <Text className="text-red-500 font-bold">*</Text>
            </Text>
            {isLoadingPlans ? (
              <ActivityIndicator color="#CCF200" size="small" className="py-3" />
            ) : sortedPlans.length > 0 ? (
              <Pressable
                onPress={() => setShowPlanModal(true)}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 flex-row items-center justify-between active:opacity-75"
              >
                <View className="flex-row items-center gap-3 flex-1 mr-2">
                  <View className="w-9 h-9 rounded-lg bg-[#242424] items-center justify-center border border-[#333]">
                    <Crown size={18} color="#CCF200" weight="fill" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-semibold">
                      {selectedPlan ? selectedPlan.planName : 'Choose a Plan...'}
                    </Text>
                    {selectedPlan && (
                      <Text className="text-gray-400 text-xs mt-0.5">
                        {selectedPlan.durationMonths} Months • ₹{selectedPlan.price?.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
                <CaretDown size={18} color="#CCF200" />
              </Pressable>
            ) : (
              <Text className="text-gray-500 text-xs py-2">No active membership plans found.</Text>
            )}
          </View>
        )}

        {/* Enquiry Source */}
        <Text className="text-[#CCF200] font-semibold text-xs uppercase tracking-widest mb-3">
          Enquiry Source <Text className="text-red-500 font-bold">*</Text>
        </Text>
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

        {/* Lead Category */}
        <Text className="text-[#CCF200] font-semibold text-xs uppercase tracking-widest mb-3">
          Lead Category <Text className="text-red-500 font-bold">*</Text>
        </Text>
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

        {/* Current Status */}
        <Text className="text-[#CCF200] font-semibold text-xs uppercase tracking-widest mb-3">
          Current Status <Text className="text-red-500 font-bold">*</Text>
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {STATUSES_MAPPED.map((item) => {
            const isSelected = form.status === item.value;
            const isLocked = isStatusLocked(item.value);
            return (
              <Pressable
                key={item.value}
                onPress={() => handleStatusSelect(item.value)}
                className={`px-4 py-2 rounded-full border ${isSelected ? 'bg-[#2A2A2A] border-[#CCF200]' : 'bg-[#161616] border-[#2A2A2A]'} ${isLocked && !isSelected ? 'opacity-50' : ''}`}
              >
                <Text className={`text-xs font-semibold ${isSelected ? 'text-[#CCF200]' : 'text-gray-400'}`}>
                  {item.label} {isLocked ? '🔒' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isEdit && existingEnquiry && existingEnquiry.status !== 'converted' && (
          <View className="mb-6 p-4 rounded-xl bg-[#141B24] border border-[#22C55E]/30 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <UserCheck size={16} color="#22C55E" weight="bold" />
                <Text className="text-white font-semibold text-sm">Convert to Customer</Text>
              </View>
              <Text className="text-gray-400 text-xs">
                Register customer in gym_customers to automatically mark this enquiry as Converted.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(`/(owner)/dashboard/add-customer?enquiryId=${existingEnquiry.gymEnquiryId}`)}
              className="bg-[#CCF200] px-3.5 py-2.5 rounded-lg active:opacity-80 flex-row items-center gap-1"
            >
              <Text className="text-black font-semibold text-xs">Register</Text>
              <ArrowRight size={14} color="#000" weight="bold" />
            </Pressable>
          </View>
        )}

        {/* Follow-up Date (Mandatory) */}
        <View className="mb-6">
          <Text className="text-white font-semibold mb-2">
            Next Follow-up Date <Text className="text-red-500 font-bold">*</Text>
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 flex-row items-center justify-between active:opacity-75"
          >
            <View className="flex-row items-center gap-2">
              <CalendarBlank size={18} color="#CCF200" />
              <Text className={`text-sm font-semibold ${form.followUpDate ? 'text-white' : 'text-gray-500'}`}>
                {form.followUpDate ? format(new Date(form.followUpDate), 'dd MMM yyyy') : 'Select Follow-up Date...'}
              </Text>
            </View>
            <CaretDown size={18} color="#888" />
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={form.followUpDate ? new Date(form.followUpDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event: any, selectedDate?: Date) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setForm({ ...form, followUpDate: selectedDate.toISOString() });
                }
              }}
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <Pressable onPress={() => setShowDatePicker(false)} className="items-end py-2">
              <Text className="text-[#CCF200] font-semibold">Done</Text>
            </Pressable>
          )}
        </View>

        {/* Notes / Remarks */}
        <View className="mb-8">
          <Text className="text-white font-semibold mb-2">Notes / Remarks</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl px-4 py-3 font-sans h-24"
            placeholder="Add notes about customer requirements..."
            placeholderTextColor="#666"
            multiline
            textAlignVertical="top"
            value={form.notes || ''}
            onChangeText={(t) => setForm({ ...form, notes: t })}
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isPending}
          className={`flex-row justify-center items-center h-14 rounded-xl ${isPending ? 'bg-[#CCF200]/50' : 'bg-[#CCF200]'}`}
        >
          {isPending ? <ActivityIndicator color="#000" /> : <Text className="text-black font-semibold text-lg">{isEdit ? 'Update Enquiry' : 'Save Enquiry'}</Text>}
        </Pressable>
      </ScrollView>

      {/* Plan Selection Modal (Sorted Ascending by Amount) */}
      <Modal visible={showPlanModal} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/80 justify-end" onPress={() => setShowPlanModal(false)}>
          <Pressable className="bg-[#121214] border-t border-[#27272A] rounded-t-3xl max-h-[75%] p-5" onPress={(e) => e.stopPropagation()}>
            <View className="w-12 h-1 bg-[#2C3A4A] rounded-full self-center mb-4" />
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-semibold">Select Membership Plan</Text>
              <Pressable onPress={() => setShowPlanModal(false)} className="p-2">
                <Text className="text-[#CCF200] font-semibold">Close</Text>
              </Pressable>
            </View>

            {isLoadingPlans ? (
              <ActivityIndicator color="#CCF200" size="large" className="my-8" />
            ) : sortedPlans.length > 0 ? (
              <FlatList
                data={sortedPlans}
                keyExtractor={(item) => item.planId}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setForm({ ...form, planId: item.planId });
                      setShowPlanModal(false);
                    }}
                    className={`py-3.5 px-3 border-b border-[#27272A] rounded-xl flex-row justify-between items-center ${form.planId === item.planId ? 'bg-[#1A2330]' : ''}`}
                  >
                    <View>
                      <Text className="text-white font-semibold text-sm">{item.planName}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">{item.durationMonths} Months • ₹{item.price?.toLocaleString()}</Text>
                    </View>
                    {form.planId === item.planId && (
                      <View className="w-3 h-3 rounded-full bg-[#CCF200]" />
                    )}
                  </Pressable>
                )}
              />
            ) : (
              <Text className="text-gray-400 text-center my-8">No plans found.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
