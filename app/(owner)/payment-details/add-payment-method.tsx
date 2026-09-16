import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Platform, StatusBar, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { useOwnerPaymentDetails } from '@/hooks/paymentDetails/useOwnerPaymentDetails';
import { useSaveOwnerPaymentDetails } from '@/hooks/paymentDetails/useSaveOwnerPaymentDetails';
import { toast } from '@/lib/toast';
import {
  CaretLeft,
  Bank,
  User,
  CreditCard,
  DotsNine,
  Info,
  CaretRight,
  Gear,
  CurrencyInrIcon,
  BankIcon
} from 'phosphor-react-native';

const CustomInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType = 'default' }: any) => (
  <View className="mb-4">
    <Text className="text-[#8C8C91] text-xs mb-2">{label}</Text>
    <View className="flex-row items-center bg-[#171719] border border-[#2E311A] rounded-xl px-4 py-2">
      {Icon && <Icon size={18} color="#5E5E65" weight="fill" />}
      <TextInput
        className="flex-1 text-white text-[13px] font-sans ml-1"
        placeholder={placeholder}
        placeholderTextColor="#5E5E65"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isUpdate = mode === 'update';
  const insets = useSafeAreaInsets();

  const { gymId, userId } = useUser();
  const { data: existingDetails } = useOwnerPaymentDetails(gymId);
  const saveMutation = useSaveOwnerPaymentDetails();

  const [primaryMethod, setPrimaryMethod] = useState<'bank' | 'upi'>('bank');

  const [form, setForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    upiId: ''
  });

  useEffect(() => {
    if (isUpdate && existingDetails) {
      setForm({
        accountHolderName: existingDetails.accountHolderName || '',
        bankName: existingDetails.bankName || '',
        accountNumber: existingDetails.accountNumber || '',
        confirmAccountNumber: existingDetails.accountNumber || '',
        ifscCode: existingDetails.ifscCode || '',
        upiId: existingDetails.upiId || ''
      });
      setPrimaryMethod(existingDetails.primarySettlementMethod || 'bank');
    }
  }, [isUpdate, existingDetails]);

  const updateForm = (key: keyof typeof form, value: string) => {
    let formattedValue = value;
    if (key === 'accountHolderName' || key === 'bankName') {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, '');
      formattedValue = formattedValue.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    } else if (key === 'accountNumber' || key === 'confirmAccountNumber') {
      formattedValue = value.replace(/[^0-9]/g, '');
    } else if (key === 'ifscCode') {
      formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    }
    setForm(prev => ({ ...prev, [key]: formattedValue }));
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight }}>
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70 p-1">
          <CaretLeft size={24} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">{isUpdate ? 'Update Payment Details' : 'Add Payment Details'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[#8C8C91] text-[13px] mb-6 mt-1 leading-5">
          {isUpdate ? 'Edit your business settlement account information.' : 'Set up your settlement account for membership and pass payments.'}
        </Text>

        <View className="border border-[#1F1F22] bg-[#0A0A0A] rounded-3xl p-5 mb-6">
          <View className="flex-row mb-6">
            <View className="w-[46px] h-[46px] rounded-[14px] bg-[#1D1E18] items-center justify-center mr-4">
              <Bank size={24} color="#D2FE03" weight="fill" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-white text-[15px] font-semibold mb-1">Bank Account Details</Text>
              <Text className="text-[#8C8C91] text-[11px] leading-[15px]">
                Provide your bank account information to receive payouts from memberships and passes.
              </Text>
            </View>
          </View>

          <CustomInput
            label="Account Holder Name"
            icon={User}
            placeholder="Enter account holder name"
            value={form.accountHolderName}
            onChangeText={(v: string) => updateForm('accountHolderName', v)}
          />
          <CustomInput
            label="Bank Name"
            icon={Bank}
            placeholder="Enter bank name"
            value={form.bankName}
            onChangeText={(v: string) => updateForm('bankName', v)}
          />
          <CustomInput
            label="Account Number"
            icon={CreditCard}
            placeholder="Enter account number"
            keyboardType="number-pad"
            value={form.accountNumber}
            onChangeText={(v: string) => updateForm('accountNumber', v)}
          />
          <CustomInput
            label="Confirm Account Number"
            icon={CreditCard}
            placeholder="Re-enter account number"
            keyboardType="number-pad"
            value={form.confirmAccountNumber}
            onChangeText={(v: string) => updateForm('confirmAccountNumber', v)}
          />
          <CustomInput
            label="IFSC Code"
            icon={DotsNine}
            placeholder="Enter IFSC code (e.g. SBIN0001234)"
            value={form.ifscCode}
            onChangeText={(v: string) => updateForm('ifscCode', v)}
          />

          <View className="mb-2">
            <Text className="text-[#8C8C91] text-xs mb-2">UPI ID</Text>
            <View className="flex-row items-center bg-[#171719] border border-[#2E311A] rounded-xl px-4 py-2">
              <TextInput
                className="flex-1 text-white text-[13px] font-sans"
                placeholder="Enter UPI ID (e.g. yourname@upi)"
                placeholderTextColor="#5E5E65"
                value={form.upiId}
                onChangeText={(v: string) => updateForm('upiId', v)}
              />
            </View>
          </View>
        </View>

        <View className="bg-[#181818] border border-[#282828] rounded-3xl p-5 mb-6">
          <View className="flex-row mb-5 items-center">
            <View className="w-10 h-10 rounded-[12px] bg-[#232B13] items-center justify-center mr-3">
              <Gear size={20} color="#D2FE03" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-[15px] font-semibold mb-0.5">Primary Settlement Method</Text>
              <Text className="text-[#8E8E93] text-[11px] leading-[15px]">
                Choose how you want to receive your payouts.
              </Text>
            </View>
          </View>

          <View className="flex-row">
            <Pressable
              className={`flex-1 rounded-2xl p-3 flex-row items-center justify-between border mr-1.5 ${primaryMethod === 'bank' ? 'border-[#D2FE03]' : 'border-transparent bg-[#282828]'}`}
              style={{ backgroundColor: primaryMethod === 'bank' ? 'transparent' : undefined }}
              onPress={() => setPrimaryMethod('bank')}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-lg bg-[#282828] items-center justify-center mr-2">
                  <BankIcon size={18} color='#D2FF00' />
                </View>
                <View>
                  <Text className="text-white text-[12px] font-semibold mb-0.5">Bank Transfer</Text>
                  <Text className="text-[#8E8E93] text-[10px]">Set as primary</Text>
                </View>
              </View>
              {/* <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${primaryMethod === 'bank' ? 'border-[#D2FE03]' : 'border-[#8E8E93]'}`} /> */}
            </Pressable>

            <Pressable
              className={`flex-1 rounded-2xl p-3 flex-row items-center justify-between border ml-1.5 ${primaryMethod === 'upi' ? 'border-[#D2FE03]' : 'border-transparent bg-[#282828]'}`}
              style={{ backgroundColor: primaryMethod === 'upi' ? 'transparent' : undefined }}
              onPress={() => setPrimaryMethod('upi')}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-lg bg-[#282828] items-center justify-center mr-2">
                  <CurrencyInrIcon size={18} color='#D2FF00' />
                </View>
                <View>
                  <Text className="text-white text-[12px] font-semibold mb-0.5">UPI (Optional)</Text>
                  <Text className="text-[#8E8E93] text-[10px]">Keep as backup</Text>
                </View>
              </View>
              {/* <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${primaryMethod === 'upi' ? 'border-[#D2FE03]' : 'border-[#8E8E93]'}`} /> */}
            </Pressable>
          </View>
        </View>

        <View className="bg-[#171719] border border-[#2E311A] rounded-2xl p-4 mb-8 flex-row items-start">
          <View className="w-5 h-5 rounded-full bg-[#D2FE03] items-center justify-center mr-3 mt-0.5">
            <Info size={14} color="#000000" weight="bold" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-[14px] font-semibold mb-1">
              {isUpdate ? 'Your updated details may require verification.' : 'Important Note'}
            </Text>
            <Text className="text-[#8C8C91] text-[11px] leading-[15px]">
              {isUpdate
                ? 'We may run a quick verification before ongoing payouts are sent to your updated account.'
                : 'All membership and pass payments will be credited to this bank account. Please verify your details before saving.'}
            </Text>
          </View>
        </View>

        <Pressable
          className={`bg-[#D2FE03] rounded-xl py-4 flex-row items-center justify-center mb-4 active:opacity-80 ${saveMutation.isPending ? 'opacity-50' : ''}`}
          disabled={saveMutation.isPending}
          onPress={async () => {
            if (!gymId || !userId) {
              toast.error('Session expired. Please log in again.');
              return;
            }

            if (!form.accountHolderName || !form.bankName || !form.accountNumber || !form.confirmAccountNumber || !form.ifscCode) {
              toast.error('Please fill in all required fields.');
              return;
            }

            if (form.accountNumber !== form.confirmAccountNumber) {
              toast.error('Account numbers do not match!');
              return;
            }

            try {
              const payload = {
                paymentDetailsId: existingDetails?.paymentDetailsId,
                accountHolderName: form.accountHolderName,
                bankName: form.bankName,
                accountNumber: form.accountNumber,
                ifscCode: form.ifscCode,
                upiId: form.upiId || null,
                gymId: gymId,
                createdBy: userId,
                primarySettlementMethod: primaryMethod,
                isVerified: false,
              };
              const result = await saveMutation.mutateAsync(payload);

              toast.success('Payment details saved successfully');

              router.push({
                pathname: '/(owner)/payment-details/payment-verification',
                params: {
                  accountHolderName: form.accountHolderName,
                  bankName: form.bankName,
                  accountNumber: form.accountNumber,
                  ifscCode: form.ifscCode,
                  upiId: form.upiId || ''
                }
              });
            } catch (error) {
              toast.error('Failed to save payment details');
            }
          }}
        >
          <Text className="text-black text-[15px] font-semibold mr-1.5">
            {saveMutation.isPending ? 'Saving...' : (isUpdate ? 'Save Changes' : 'Save Payment Details')}
          </Text>
          <CaretRight size={16} color="#000000" weight="bold" />
        </Pressable>

        <Pressable
          className="bg-transparent border border-[#D2FE03] rounded-xl py-4 flex-row items-center justify-center active:opacity-70"
          onPress={() => router.push('/(owner)/payment-details')}
        >
          <Text className="text-[#D2FE03] text-[15px] font-semibold">Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
