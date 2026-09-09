import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, SafeAreaView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useSaveCustomerGymPayment } from '@/hooks/customerGymPayments/useCustomerGymPayments';
import { PaymentMethod, PaymentStatus } from '@/helpers/customerGymPayments/customerGymPayments';
import { saveGymCustomerMembershipPlan } from '@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipPlans';
import { CaretLeft, XCircle, CheckCircle, CreditCard, DeviceMobileCamera } from 'phosphor-react-native';
import { toast } from '@/lib/toast';

export default function MembershipPaymentScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();

  const { userId } = useUser();
  const { data: plans, isLoading: isCustomerPlansLoading } = useGymCustomerMembershipPlans(undefined, userId!);
  const { data: customerProfileData, isLoading: isProfileLoading } = useCustomerProfile(userId);

  const currentPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans[0];
  }, [plans]);

  const gymId = currentPlan?.gymId || customerProfileData?.customerData?.gymId;

  const { data: gymPlans, isLoading: isGymPlansLoading } = useMembershipPlans(gymId || null);

  const selectedPlanDetails = useMemo(() => {
    if (!gymPlans || !planId) return null;
    return gymPlans.find(p => p.id === planId);
  }, [gymPlans, planId]);

  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD'>('UPI');
  const [upiId, setUpiId] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutateAsync: savePayment, isPending: isPaymentProcessing } = useSaveCustomerGymPayment();
  const isBusy = isSubmitting || isPaymentProcessing;

  const handlePayment = async () => {
    if (isBusy) return;
    if (!gymId || !planId || !userId) return;

    if (paymentMethod === 'UPI' && !upiId.trim()) {
      toast.error('Please enter your UPI ID');
      return;
    }

    setIsSubmitting(true);

    try {
      await savePayment({
        customerId: userId,
        gymId: gymId,
        planId: planId,
        paymentMethod: paymentMethod === 'UPI' ? PaymentMethod.UPI : PaymentMethod.CARD,
        upiId: paymentMethod === 'UPI' ? upiId : undefined,
        amountPaid: Number(selectedPlanDetails?.priceNumeric) || 0,
        status: PaymentStatus.SUCCESSFUL,
      });

      let monthsToAdd = Number(selectedPlanDetails?.durationMonths) || 0;
      if (!monthsToAdd) {
        const durationMatch = selectedPlanDetails?.duration?.match(/\d+/);
        monthsToAdd = durationMatch ? parseInt(durationMatch[0], 10) : 1;
      }

      const nowDate = new Date();
      const calculatedStartDate = nowDate.toISOString();

      const newEndDate = new Date(nowDate);
      const targetDay = nowDate.getDate();
      newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);
      if (newEndDate.getDate() !== targetDay) {
        newEndDate.setDate(0);
      }

      await saveGymCustomerMembershipPlan({
        GymCustomerMembershipPlanId: currentPlan?.GymCustomerMembershipPlanId,
        customerId: userId,
        gymId: gymId,
        planId: planId,
        customAmount: Number(selectedPlanDetails?.priceNumeric) || 0,
        startDate: calculatedStartDate,
        endDate: newEndDate.toISOString(),
        createdBy: userId,
        is_Active: true,
      });

      const txnId = `TXN${Math.floor(Math.random() * 1000000)}`;

      router.replace({
        pathname: '/(customer)/memberships/success',
        params: {
          planName: selectedPlanDetails?.name || 'Gold Membership',
          amount: selectedPlanDetails?.priceFormatted || '₹0',
          paymentMethod: paymentMethod === 'UPI' ? 'UPI' : 'Credit / Debit Card',
          transactionId: txnId,
          upiId: paymentMethod === 'UPI' ? upiId : undefined
        }
      });
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.error(error?.message || 'Payment failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isCustomerPlansLoading || isGymPlansLoading || isProfileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0A0A0A] justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </SafeAreaView>
    );
  }

  const planName = selectedPlanDetails?.name || 'Gold Membership';
  const priceFormatted = selectedPlanDetails?.priceFormatted || '₹3,999';
  const duration = selectedPlanDetails?.duration || '1 Month';

  const handleCardNumberChange = (text: string) => {
    const formatted = text.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText.length >= 2) {
      setExpiry(`${cleanText.substring(0, 2)}/${cleanText.substring(2, 4)}`);
    } else {
      setExpiry(cleanText);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#1C1C1E]">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
            <CaretLeft size={24} color="#FFF" weight="bold" />
          </Pressable>
          <Text className="text-white text-lg font-semibold flex-1 text-center mr-8">Payment Method</Text>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text className="text-white text-[15px] mb-4">Select Payment Method</Text>
          <Pressable
            onPress={() => setPaymentMethod('UPI')}
            className={`border rounded-xl p-4 mb-3 flex-row items-center ${paymentMethod === 'UPI' ? 'border-[#CCFF00] bg-[#1A1A1A]' : 'border-[#2D2D2D] bg-[#1A1A1A]'}`}
          >
            <View className="mr-4">
              {paymentMethod === 'UPI' ? (
                <CheckCircle size={24} color="#CCFF00" weight="fill" />
              ) : (
                <XCircle size={24} color="#A0A0A0" weight="regular" />
              )}
            </View>
            <View className="w-10 h-10 rounded-lg bg-[#2D2D2D] items-center justify-center mr-4 border border-[#3D3D3D]">
              <DeviceMobileCamera size={20} color="#FFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-[15px] mb-0.5">UPI</Text>
              <Text className="text-[#A0A0A0] text-xs">Pay using any UPI app</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setPaymentMethod('CARD')}
            className={`border rounded-xl p-4 mb-6 flex-row items-center ${paymentMethod === 'CARD' ? 'border-[#CCFF00] bg-[#1A1A1A]' : 'border-[#2D2D2D] bg-[#1A1A1A]'}`}
          >
            <View className="mr-4">
              {paymentMethod === 'CARD' ? (
                <CheckCircle size={24} color="#CCFF00" weight="fill" />
              ) : (
                <XCircle size={24} color="#A0A0A0" weight="regular" />
              )}
            </View>
            <View className="w-10 h-10 rounded-lg bg-[#2D2D2D] items-center justify-center mr-4 border border-[#3D3D3D]">
              <CreditCard size={20} color="#FFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-[15px] mb-0.5">Credit / Debit Card</Text>
              <Text className="text-[#A0A0A0] text-xs">Visa, Mastercard, Rupay etc.</Text>
            </View>
          </Pressable>

          {paymentMethod === 'UPI' && (
            <View className="bg-[#1A1A1A] rounded-2xl p-5 mb-8">
              <Text className="text-white font-semibold text-[15px] mb-4">Pay Using UPI</Text>

              <Text className="text-[#A0A0A0] text-xs mb-2">Enter UPI ID</Text>
              <View className="border border-[#CCFF00] rounded-xl mb-2 px-4 h-14 justify-center bg-[#1A1A1A]">
                <TextInput
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="example@upi"
                  placeholderTextColor="#4B5563"
                  className="text-white text-[15px] flex-1 font-sans"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <Text className="text-[#A0A0A0] text-[10px] italic mb-6">Enter your UPI ID and we will send the payment request</Text>

              <View className="flex-row items-center mb-6">
                <View className="flex-1 h-[1px] bg-[#2D2D2D]" />
                <Text className="text-[#CCFF00] font-semibold text-xs px-4">OR</Text>
                <View className="flex-1 h-[1px] bg-[#2D2D2D]" />
              </View>

              <Text className="text-white font-semibold text-[14px] mb-1">Pay with Installed UPI Apps</Text>
              <Text className="text-[#A0A0A0] text-xs mb-4">Choose your preferred UPI app</Text>

              <View className="flex-row justify-between mb-2">
                <View className="items-center">
                  <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-2">
                    <Text className="font-semibold text-blue-500">GPay</Text>
                  </View>
                  <Text className="text-white text-[10px]">Google Pay</Text>
                </View>
                <View className="items-center">
                  <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-2">
                    <Text className="font-semibold text-purple-600">Pe</Text>
                  </View>
                  <Text className="text-white text-[10px]">PhonePe</Text>
                </View>
                <View className="items-center">
                  <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-2">
                    <Text className="font-semibold text-blue-400">Paytm</Text>
                  </View>
                  <Text className="text-white text-[10px]">Paytm</Text>
                </View>
                <View className="items-center">
                  <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-2">
                    <Text className="font-semibold text-orange-500">BHIM</Text>
                  </View>
                  <Text className="text-white text-[10px]">BHIM</Text>
                </View>
              </View>
            </View>
          )}

          {paymentMethod === 'CARD' && (
            <View className="bg-[#1A1A1A] rounded-2xl p-5 mb-8">
              <Text className="text-white font-semibold text-[15px] mb-4">Enter Card Details</Text>

              <Text className="text-[#A0A0A0] text-xs mb-2">Card Number</Text>
              <View className="border border-[#2D2D2D] rounded-xl mb-4 px-4 h-14 justify-center focus:border-[#CCFF00]">
                <TextInput
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="#4B5563"
                  className="text-white text-[15px] flex-1"
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>

              <View className="flex-row justify-between mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-[#A0A0A0] text-xs mb-2">Expiry Date</Text>
                  <View className="border border-[#2D2D2D] rounded-xl px-4 h-14 justify-center focus:border-[#CCFF00]">
                    <TextInput
                      value={expiry}
                      onChangeText={handleExpiryChange}
                      placeholder="MM/YY"
                      placeholderTextColor="#4B5563"
                      className="text-white text-[15px] flex-1"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-[#A0A0A0] text-xs mb-2">CVV</Text>
                  <View className="border border-[#2D2D2D] rounded-xl px-4 h-14 justify-center focus:border-[#CCFF00]">
                    <TextInput
                      value={cvv}
                      onChangeText={(t) => setCvv(t.replace(/[^0-9]/g, '').substring(0, 4))}
                      placeholder="123"
                      placeholderTextColor="#4B5563"
                      className="text-white text-[15px] flex-1"
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>

              <Text className="text-[#A0A0A0] text-xs mb-2">Name on Card</Text>
              <View className="border border-[#2D2D2D] rounded-xl mb-2 px-4 h-14 justify-center focus:border-[#CCFF00]">
                <TextInput
                  value={nameOnCard}
                  onChangeText={setNameOnCard}
                  placeholder="John Doe"
                  placeholderTextColor="#4B5563"
                  className="text-white text-[15px] flex-1"
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <View className="bg-[#1A1A1A] rounded-2xl p-5 mb-8">
            <Text className="text-white font-semibold text-[15px] mb-4">Payment Summary</Text>

            <View className="flex-row justify-between mb-3">
              <Text className="text-[#A0A0A0] text-sm">Plan</Text>
              <Text className="text-white text-sm">{planName}</Text>
            </View>

            <View className="flex-row justify-between mb-3">
              <Text className="text-[#A0A0A0] text-sm">Duration</Text>
              <Text className="text-white text-sm">{duration}</Text>
            </View>

            <View className="flex-row justify-between mb-5">
              <Text className="text-[#A0A0A0] text-sm">Amount</Text>
              <Text className="text-white text-sm">{priceFormatted}</Text>
            </View>

            <View className="h-[1px] bg-[#2D2D2D] mb-5" />

            <View className="flex-row justify-between items-center">
              <Text className="text-white font-semibold text-base">Total Amount</Text>
              <Text className="text-[#CCFF00] font-semibold text-2xl">{priceFormatted}</Text>
            </View>
          </View>

          <Text className="text-[#A0A0A0] text-[10px] text-center mt-2 mb-2 opacity-60">Your payment information is 100% secure</Text>
          <View className="p-5 bg-[#0A0A0A]/95 mt-2">
            <Pressable
              onPress={handlePayment}
              disabled={isBusy}
              className={`rounded-2xl py-4 flex-row items-center justify-center active:opacity-80 ${isBusy ? 'bg-[#CCFF00]/50' : 'bg-[#CCFF00]'}`}
            >
              {isBusy ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-black text-[16px] font-semibold tracking-wide">Pay {priceFormatted}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
