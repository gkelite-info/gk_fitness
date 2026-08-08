import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CaretLeft, Money, QrCode, User, CaretDown, CurrencyInr, CalendarBlank, Clock, PencilSimple, Info, FileText, Crown } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useSaveGymPayment } from '@/hooks/useGymPayments';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { useGymMembershipPlans } from '@/hooks/useGymMembershipPlans';
import { useGymCustomerMembershipPlans } from '@/hooks/useGymCustomerMembershipPlans';

export default function AddPaymentScreen() {
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

  const { userId, gymId, gymOwnerId } = useUser();
  const savePaymentMutation = useSaveGymPayment();
  const { data: customers = [], isLoading: loadingCustomers } = useGymCustomers(gymId || undefined);
  const { data: plans = [], isLoading: loadingPlans } = useGymMembershipPlans(userId);
  const { data: customerPlans = [], isLoading: loadingCustomerPlans } = useGymCustomerMembershipPlans(userId, selectedMember?.customerId || null);

  useEffect(() => {
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
  }, [customerPlans, selectedMember]);

  const selectedPlan = plans.find(p => p.planId === selectedPlanId);

  const handleSave = async () => {
    if (!userId || !gymId || !gymOwnerId) return;
    try {

      // Note: plan should be valid UUID from a dropdown picker
      await savePaymentMutation.mutateAsync({
        customerId: selectedMember?.customerId || '00000000-0000-0000-0000-000000000000', // Placeholder if none selected
        gymId,
        planId: selectedPlanId || '00000000-0000-0000-0000-000000000000', // Placeholder
        paymentMethod: method,
        amountPaid: parseFloat(amount.replace(/,/g, '')),
        paymentDate: new Date().toISOString().split('T')[0], // Use current date for now
        paymentTime: new Date().toTimeString().split(' ')[0], // Use current time for now
        transactionId: reference,
        notes,
        paymentTakenBy: gymOwnerId
      });

      router.push({
        pathname: '/(owner)/dashboard/payments/success',
        params: { method, member: selectedMember?.fullName, plan: selectedPlan?.planName || 'Unknown Plan', amount, date, time, reference }
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <View className="flex-row items-center gap-3 mb-2">
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-[#1A1A1A] rounded-full items-center justify-center active:opacity-70">
              <CaretLeft size={20} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-semibold">Add Payment</Text>
          </View>
          <Text className="text-[#888888] text-xs font-medium ml-1">Manually add payment received via QR or Cash</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>

          {/* Payment Method Toggle */}
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

          {/* Transaction Reference (QR Only) */}
          {method === 'qrscan' && (
            <>
              <Text className="text-[#888888] text-xs font-semibold mb-2">Transaction Reference (Optional)</Text>
              <View className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-1">
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

          {/* Notes */}
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
          <TouchableOpacity onPress={handleSave} disabled={savePaymentMutation.isPending} className="bg-[#CCF200] rounded-xl py-4 items-center mb-4 active:opacity-80 flex-row justify-center">
            {savePaymentMutation.isPending ? (
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
                      <Text className="text-[#888888] text-xs mt-1">{item.phone}</Text>
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
                      <Text className="text-[#888888] text-xs mt-1">{item.durationMonths} Months • ₹{item.price?.toLocaleString()}</Text>
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
