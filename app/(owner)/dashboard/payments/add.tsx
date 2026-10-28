import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretLeft, Money, QrCode, User, CaretDown, CurrencyInr, CalendarBlank, Clock, PencilSimple, Info, FileText, Crown, Camera, X } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@/context/UserContext';
import { useSaveGymPayment, uploadPaymentProof } from '@/hooks/useGymPayments';
import { useSaveGymCustomerMembershipPlan } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { calculatePlanExpiryDate, getLocalDateString } from '@/lib/dateUtils';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useGymMembershipPlans } from '@/hooks/useGymMembershipPlans';
import { useGymCustomerMembershipPlans } from '@/hooks/useGymCustomerMembershipPlans';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { compressImage } from '@/components/imageCompressor';
import { toast } from '@/lib/toast';

export default function AddPaymentScreen() {
  const { customerId: paramCustomerId, planId: paramPlanId, amount: paramAmount } = useLocalSearchParams<{
    customerId?: string;
    planId?: string;
    amount?: string;
  }>();

  const [method, setMethod] = useState<'cash' | 'qrscan'>('cash');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [amount, setAmount] = useState('');
  const now = new Date();
  const [date, setDate] = useState(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  const [time, setTime] = useState(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentProofUri, setPaymentProofUri] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { userId, gymId, gymOwnerId } = useUser();
  const savePaymentMutation = useSaveGymPayment();
  const saveCustomerPlanMutation = useSaveGymCustomerMembershipPlan();
  const { data: customers = [], isLoading: loadingCustomers, refetch: refetchCustomers } = useGymCustomers(gymId || undefined);
  const { data: plans = [], isLoading: loadingPlans, refetch: refetchPlans } = useGymMembershipPlans(userId);
  const { data: customerPlans = [], isLoading: loadingCustomerPlans, refetch: refetchCustomerPlans } = useGymCustomerMembershipPlans(userId, selectedMember?.customerId || null);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchPlans?.(),
      refetchCustomers?.(),
      refetchCustomerPlans?.(),
    ]);
    setRefreshing(false);
  };

  const pickProofImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const rawUri = result.assets[0].uri;
        const compressed = await compressImage(rawUri, { maxWidth: 1200, compress: 0.7 });
        setPaymentProofUri(compressed.uri);
      }
    } catch (err) {
      console.error('Error picking/compressing payment proof image:', err);
    }
  };

  useEffect(() => {
    if (paramCustomerId && customers && customers.length > 0) {
      const found = customers.find(c => c.customerId === paramCustomerId);
      if (found) {
        setSelectedMember(found);
      }
    }
  }, [paramCustomerId, customers]);

  useEffect(() => {
    if (paramPlanId) {
      setSelectedPlanId(paramPlanId);
    }
    if (paramAmount) {
      setAmount(paramAmount);
    }
  }, [paramPlanId, paramAmount]);

  useEffect(() => {
    if (paramPlanId || paramAmount) return;

    if (customerPlans && customerPlans.length > 0) {
      const activePlan = customerPlans.find(p => p.is_Active && !p.is_deleted) || customerPlans[0];
      if (activePlan && activePlan.planId) {
        setSelectedPlanId(activePlan.planId);
        const amountToPay = activePlan.customAmount || activePlan.gym_membership_plans?.price || 0;
        setAmount(amountToPay.toString());
      }
    } else if (selectedMember) {
      setSelectedPlanId('');
      setAmount('');
    }
  }, [customerPlans, selectedMember, paramPlanId, paramAmount]);

  const resetForm = () => {
    setMethod('cash');
    setSelectedMember(null);
    setSelectedPlanId('');
    setAmount('');
    const currentNow = new Date();
    setDate(currentNow.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    setTime(currentNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    setReference('');
    setNotes('');
    setPaymentProofUri(null);
    setIsUploadingProof(false);
  };

  const selectedPlan = plans.find(p => p.planId === selectedPlanId);

  const handleSave = async () => {
    if (!userId || !gymId || !gymOwnerId) {
      toast.error('Missing gym or user details');
      return;
    }
    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }
    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      let uploadedProofUrl: string | null = null;
      if (paymentProofUri) {
        setIsUploadingProof(true);
        const compressed = await compressImage(paymentProofUri, { maxWidth: 1200, compress: 0.7 });
        const fileExt = compressed.uri.split('.').pop() || 'jpg';
        uploadedProofUrl = await uploadPaymentProof(compressed.uri, fileExt);
        setIsUploadingProof(false);
      }

      const memberName = selectedMember?.fullName;
      const planName = selectedPlan?.planName || 'Unknown Plan';
      const savedAmount = amount;
      const savedDate = date;
      const savedTime = time;
      const savedRef = reference;
      const savedMethod = method;

      await savePaymentMutation.mutateAsync({
        customerId: selectedMember.customerId,
        gymId,
        planId: selectedPlanId || '00000000-0000-0000-0000-000000000000',
        paymentMethod: method,
        amountPaid: cleanAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentTime: new Date().toTimeString().split(' ')[0],
        transactionId: reference,
        paymentProof: uploadedProofUrl,
        notes,
        paymentTakenBy: gymOwnerId
      });

      try {
        const todayIso = getLocalDateString(new Date());
        const durationMonths = selectedPlan?.durationMonths || 1;
        const expiryIso = calculatePlanExpiryDate(todayIso, durationMonths);

        const targetCustomerPlan = Array.isArray(customerPlans)
          ? customerPlans.find((p: any) => p.is_Active && !p.is_deleted) ||
            customerPlans.find((p: any) => !p.is_deleted) ||
            customerPlans[0]
          : null;

        await saveCustomerPlanMutation.mutateAsync({
          GymCustomerMembershipPlanId: targetCustomerPlan?.GymCustomerMembershipPlanId,
          customerId: selectedMember.customerId,
          gymId,
          planId: selectedPlanId || targetCustomerPlan?.planId,
          pendingPlanId: null,
          pendingAmount: null,
          customAmount: cleanAmount,
          startDate: todayIso,
          endDate: expiryIso,
          is_Active: true,
          createdBy: gymOwnerId || userId || '',
        });
      } catch (planErr) {
        console.warn('Failed to update customer membership plan on payment:', planErr);
      }

      toast.success('Payment added successfully!');
      resetForm();

      router.push({
        pathname: '/(owner)/dashboard/payments/success',
        params: { method: savedMethod, member: memberName, plan: planName, amount: savedAmount, date: savedDate, time: savedTime, reference: savedRef }
      });
    } catch (e) {
      console.error(e);
      setIsUploadingProof(false);
      toast.error('Failed to save payment. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-[#09090B] pt-10">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="px-5 pt-4 pb-4">
          <View className="flex-row items-center gap-3 mb-2">
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-[#1A1A1A] rounded-full items-center justify-center active:opacity-70">
              <CaretLeft size={20} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-semibold">Add Payment</Text>
          </View>
          <Text className="text-[#888888] text-xs font-medium ml-1">Manually add payment received via QR or Cash</Text>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
          refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text className="text-[#888888] text-xs font-semibold mb-2">Payment Method</Text>
          <View className="flex-row bg-[#1A1A1A] border border-[#27272A] rounded-xl p-1 mb-6">
            <TouchableOpacity
              onPress={() => setMethod('cash')}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${method === 'cash' ? 'bg-[#CCF200]' : ''}`}
            >
              <Money size={18} color={method === 'cash' ? '#000' : '#888'} weight={method === 'cash' ? 'bold' : 'regular'} />
              <Text className={`ml-2 text-sm font-semibold ${method === 'cash' ? 'text-black' : 'text-[#888888]'}`}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMethod('qrscan')}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${method === 'qrscan' ? 'bg-[#CCF200]' : ''}`}
            >
              <QrCode size={18} color={method === 'qrscan' ? '#000' : '#888'} weight={method === 'qrscan' ? 'bold' : 'regular'} />
              <Text className={`ml-2 text-sm font-semibold ${method === 'qrscan' ? 'text-black' : 'text-[#888888]'}`}>QR Code</Text>
            </TouchableOpacity>
          </View>

          {/* Select Member */}
          <Text className="text-[#888888] text-xs font-semibold mb-2">Select Member</Text>
          <TouchableOpacity onPress={() => setShowMemberModal(true)} className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-6 active:opacity-70">
            <User size={18} color="#CCF200" />
            <Text className={`flex-1 ml-3 text-sm font-medium ${selectedMember ? 'text-white' : 'text-[#888888]'}`}>
              {selectedMember ? selectedMember.fullName : 'Search member by name or mobile...'}
            </Text>
            <CaretDown size={16} color="#CCF200" />
          </TouchableOpacity>

          {/* Membership Plan */}
          <Text className="text-[#888888] text-xs font-semibold mb-2">Membership Plan</Text>
          <TouchableOpacity onPress={() => setShowPlanModal(true)} className="bg-[#121214] border border-[#27272A] rounded-xl p-3 flex-row items-center mb-6 active:opacity-70">
            <View className="w-10 h-10 bg-[#1A1A1A] rounded-lg items-center justify-center border border-[#27272A]">
              <Crown size={20} color="#CCF200" weight="fill" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white text-sm font-semibold mb-0.5">
                {selectedPlan ? selectedPlan.planName : 'Select a Plan'}
              </Text>
              <Text className="text-[#888888] text-[10px] font-medium">
                {selectedPlan ? `${selectedPlan.durationMonths} Months` : '---'}
              </Text>
            </View>
            <CaretDown size={16} color="#CCF200" />
          </TouchableOpacity>

          {/* Amount */}
          <Text className="text-[#888888] text-xs font-semibold mb-2">Amount</Text>
          <View className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-1">
            <CurrencyInr size={18} color="#CCF200" weight="bold" />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              className="flex-1 text-white ml-3 text-sm font-semibold"
              keyboardType="numeric"
            />
          </View>
          {method === 'qrscan' && (
            <View className="flex-row items-center bg-[#1A1A1A] border border-[#27272A] border-dashed rounded-lg p-3 mb-6 mt-1">
              <Info size={14} color="#CCF200" />
              <Text className="text-[#888888] text-[10px] font-medium ml-2">Amount is auto-filled based on the selected membership plan.</Text>
            </View>
          )}
          {method === 'cash' && <View className="h-5" />}

          {/* Date & Time */}
          <Text className="text-[#888888] text-xs font-semibold mb-2">Payment Date</Text>
          <TouchableOpacity className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-6 active:opacity-70">
            <CalendarBlank size={18} color="#CCF200" />
            <Text className="flex-1 text-white ml-3 text-sm font-semibold">{date}</Text>
            <CaretDown size={16} color="#CCF200" />
          </TouchableOpacity>

          <Text className="text-[#888888] text-xs font-semibold mb-2">Payment Time</Text>
          <TouchableOpacity className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-6 active:opacity-70">
            <Clock size={18} color="#CCF200" />
            <Text className="flex-1 text-white ml-3 text-sm font-semibold">{time}</Text>
            <CaretDown size={16} color="#CCF200" />
          </TouchableOpacity>

          {method === 'qrscan' && (
            <>
              <Text className="text-[#888888] text-xs font-semibold mb-2">Transaction Reference (Optional)</Text>
              <View className="bg-[#121214] border border-[#27272A] rounded-xl p-4 py-1.5 flex-row items-center mb-1">
                <FileText size={18} color="#CCF200" />
                <TextInput
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Enter UTR / Transaction ID"
                  placeholderTextColor="#555"
                  className="flex-1 text-white ml-3 text-sm font-medium"
                />
              </View>
              <Text className="text-[#555] text-[10px] font-medium mb-6">Enter UTR or Transaction ID from your bank statement (if any).</Text>
            </>
          )}

          <Text className="text-[#888888] text-xs font-semibold mb-2">Notes (Optional)</Text>
          <View className="bg-[#121214] border border-[#27272A] rounded-xl p-4 mb-4">
            <View className="flex-row items-start h-20">
              <PencilSimple size={18} color="#CCF200" style={{ marginTop: 4 }} />
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes..."
                placeholderTextColor="#555"
                multiline
                className="flex-1 text-white ml-3 text-sm font-medium h-full"
                textAlignVertical="top"
              />
            </View>
            <Text className="text-[#555] text-[10px] text-right">{notes.length}/100</Text>
          </View>

          <Text className="text-[#888888] text-xs font-semibold mb-2">Payment Proof (Optional)</Text>
          {paymentProofUri ? (
            <View className="bg-[#121214] border border-[#27272A] rounded-xl p-3 mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Image
                  source={{ uri: paymentProofUri }}
                  className="w-12 h-12 rounded-lg border border-[#27272A]"
                  resizeMode="cover"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                    Payment Proof Attached
                  </Text>
                  <Text className="text-[#888888] text-[10px]">Tap remove to choose another</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setPaymentProofUri(null)}
                className="w-8 h-8 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#27272A] active:opacity-70"
              >
                <X size={14} color="#EF4444" weight="bold" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickProofImage}
              className="bg-[#121214] border border-dashed border-[#27272A] rounded-xl p-4 mb-6 flex-row items-center justify-center active:opacity-70"
            >
              <Camera size={18} color="#CCF200" />
              <Text className="text-white text-xs font-medium ml-2">Upload Screenshot / Receipt</Text>
            </TouchableOpacity>
          )}

          {/* Info Alert (Cash only for layout match, though we can show it generally) */}
          {method === 'cash' && (
            <View className="flex-row items-center bg-[#181A0B] border border-[#242611] rounded-xl p-4 mb-6">
              <Info size={20} color="#CCF200" />
              <Text className="flex-1 text-[#888888] text-[11px] font-medium ml-3 leading-4">
                This payment will be recorded under the selected membership plan.
              </Text>
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity onPress={handleSave} disabled={savePaymentMutation.isPending || isUploadingProof} className="bg-[#CCF200] rounded-xl py-4 items-center mb-4 active:opacity-80 flex-row justify-center">
            {savePaymentMutation.isPending || isUploadingProof ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black text-base font-semibold">Save Payment</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} className="py-4 items-center active:opacity-70 mb-4">
            <Text className="text-[#CCF200] text-base font-semibold">Cancel</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Member Selection Modal */}
      <Modal visible={showMemberModal} transparent animationType="slide">
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-[#121214] border-t border-[#27272A] rounded-t-3xl h-[70%] p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-semibold">Select Member</Text>
              <TouchableOpacity onPress={() => setShowMemberModal(false)} className="p-2">
                <Text className="text-[#CCF200] font-semibold">Close</Text>
              </TouchableOpacity>
            </View>

            {loadingCustomers ? (
              <ActivityIndicator color="#CCF200" size="large" className="mt-10" />
            ) : customers.length > 0 ? (
              <FlatList
                data={customers}
                keyExtractor={(item) => item.customerId}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedMember(item);
                      setShowMemberModal(false);
                    }}
                    className="py-4 border-b border-[#27272A] flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-white font-semibold text-base">{item.fullName}</Text>
                      <Text className="text-[#888888] text-xs mt-1 font-sans">{item.phone}</Text>
                    </View>
                    {selectedMember?.customerId === item.customerId && (
                      <View className="w-3 h-3 rounded-full bg-[#CCF200]" />
                    )}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text className="text-[#888888] text-center mt-10">No members found.</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Plan Selection Modal */}
      <Modal visible={showPlanModal} transparent animationType="slide">
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-[#121214] border-t border-[#27272A] rounded-t-3xl h-[70%] p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-semibold">Select Membership Plan</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)} className="p-2">
                <Text className="text-[#CCF200] font-semibold">Close</Text>
              </TouchableOpacity>
            </View>

            {loadingPlans ? (
              <ActivityIndicator color="#CCF200" size="large" className="mt-10" />
            ) : plans.length > 0 ? (
              <FlatList
                data={plans}
                keyExtractor={(item) => item.planId}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPlanId(item.planId);
                      setAmount((item.price || 0).toString());
                      setShowPlanModal(false);
                    }}
                    className="py-4 border-b border-[#27272A] flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-white font-semibold text-base">{item.planName}</Text>
                      <Text className="text-[#888888] text-xs mt-1 font-sans">{item.durationMonths} Months • ₹{item.price?.toLocaleString()}</Text>
                    </View>
                    {selectedPlanId === item.planId && (
                      <View className="w-3 h-3 rounded-full bg-[#CCF200]" />
                    )}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text className="text-[#888888] text-center mt-10">No plans found.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
