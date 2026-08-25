import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FileText, Check, Bell, CaretLeft, X } from 'phosphor-react-native';
import { fetchGymLeadById } from '@/helpers/gymLeads/gymLeadsHelper';
import { fetchGlobalTrainerLeadById } from '@/helpers/globalTrainerLeads/globalTrainerLeadsHelper';

export default function RegistrationStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const gymLeadId = params.gymLeadId as string;
  const globalTrainerLeadId = params.globalTrainerLeadId as string;
  const [lead, setLead] = useState<any>(null);

  useEffect(() => {
    if (gymLeadId) {
      fetchGymLeadById(gymLeadId).then(data => {
        if (data) setLead(data);
      }).catch(err => {
        console.error('Error fetching gym lead:', err);
      });
    } else if (globalTrainerLeadId) {
      fetchGlobalTrainerLeadById(globalTrainerLeadId).then(data => {
        if (data) setLead(data);
      }).catch(err => {
        console.error('Error fetching global trainer lead:', err);
      });
    }

    const backAction = () => {
      router.replace('/auth/otp-auth');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [gymLeadId]);

  const handleBack = () => {
    router.replace('/auth/otp-auth');
  };

  const status = lead?.status || 'submitted';
  const createdAt = lead?.createdAt ? new Date(lead.createdAt) : new Date();

  const isSubmitted = true;
  const isUnderReview = status === 'underreview' || status === 'approved' || status === 'rejected';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  const PRIMARY_COLOR = '#84CC16';
  const REJECTED_COLOR = '#EF4444';

  return (
    <SafeAreaView className="flex-1 bg-[#09090B]">
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <View className="pt-6 pb-6">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 bg-[#121212] border border-[#1E1E1E] rounded-full items-center justify-center"
          >
            <CaretLeft size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="items-center mb-5">
          <View className="w-24 h-24 rounded-full border border-[#1E1E1E] items-center justify-center mb-2 relative">
            <View className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-[#1E1E1E]" />
            <View className="absolute top-4 right-4 w-2 h-2 text-[#84CC16]">
              <Text style={{ color: '#1E1E1E', fontSize: 16 }}>+</Text>
            </View>
            <View className="absolute bottom-4 right-2 w-1.5 h-1.5">
              <Text style={{ color: '#1E1E1E', fontSize: 16 }}>+</Text>
            </View>

            <View className="relative">
              <FileText size={48} color={PRIMARY_COLOR} weight="fill" />
              <View className="absolute -bottom-2 -right-2 bg-[#09090B] rounded-full p-0.5">
                <View className="bg-[#84CC16] rounded-full p-1">
                  <Check size={14} color="#000000" weight="bold" />
                </View>
              </View>
            </View>
          </View>

          <Text className="text-white text-3xl font-semibold mb-3 text-center">
            Request <Text style={{ color: PRIMARY_COLOR }}>Submitted!</Text>
          </Text>
          <Text className="text-[#8E8E93] text-[15px] text-center leading-6">
            Your registration request to become a{'\n'}
            <Text style={{ color: PRIMARY_COLOR }}>{globalTrainerLeadId ? 'Global Trainer' : 'Gym Owner'}</Text> is under review.
          </Text>
        </View>

        <View className="bg-[#121212] border border-[#1E1E1E] rounded-2xl p-6 mb-6">
          <Text className="text-white text-lg font-medium mb-8">Registration Status</Text>

          <View className="flex-row mb-6">
            <View className="items-center mr-4">
              <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: isSubmitted ? PRIMARY_COLOR : '#1E1E1E' }}>
                <Check size={14} color="#000000" weight="bold" />
              </View>
              <View className="w-0.5 h-10 mt-2" style={{ backgroundColor: PRIMARY_COLOR }} />
            </View>
            <View className="flex-1 mt-0.5">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-white text-[15px] font-medium">Request Submitted</Text>
                <Text className="text-[#6B6B6B] text-[12px]">{createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text className="text-[#8E8E93] text-[13px]">We've received your request.</Text>
            </View>
          </View>

          <View className="flex-row mb-6">
            <View className="items-center mr-4">
              <View className="w-6 h-6 rounded-full border-2 items-center justify-center" style={{ borderColor: isUnderReview ? PRIMARY_COLOR : '#2A2A2A', backgroundColor: '#121212' }}>
                {(isApproved || isRejected) && <Check size={12} color={PRIMARY_COLOR} weight="bold" />}
              </View>
              <View className="w-0.5 h-10 mt-2" style={{ backgroundColor: isUnderReview ? PRIMARY_COLOR : '#2A2A2A', opacity: isUnderReview ? 1 : 0.5 }} />
            </View>
            <View className="flex-1 mt-0.5">
              <Text className="text-white text-[15px] font-medium mb-1">Under Review</Text>
              <Text className="text-[#8E8E93] text-[13px]">Our team is reviewing your details.</Text>
            </View>
          </View>

          <View className="flex-row">
            <View className="items-center mr-4">
              <View className="w-6 h-6 rounded-full border-2 items-center justify-center" style={{
                borderColor: isApproved ? PRIMARY_COLOR : (isRejected ? REJECTED_COLOR : '#2A2A2A'),
                backgroundColor: isApproved ? PRIMARY_COLOR : (isRejected ? REJECTED_COLOR : '#121212')
              }}>
                {isApproved && <Check size={12} color="#000000" weight="bold" />}
                {isRejected && <X size={12} color="#FFFFFF" weight="bold" />}
              </View>
            </View>
            <View className="flex-1 mt-0.5">
              <Text className="text-white text-[15px] font-medium mb-1">
                {isRejected ? 'Rejected' : 'Approved'}
              </Text>
              <Text className="text-[#8E8E93] text-[13px]">
                {isRejected ? 'Unfortunately, your request was not approved.' : 'You will be notified once approved.'}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-[#121212] border border-[#1E1E1E] rounded-2xl p-5 flex-row items-center">
          <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: 'rgba(132, 204, 22, 0.1)' }}>
            <Bell size={20} color={PRIMARY_COLOR} weight="fill" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-[15px] font-medium mb-1">We'll notify you!</Text>
            <Text className="text-[#8E8E93] text-[13px] leading-5">You will receive an email once your request is approved by our team.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
