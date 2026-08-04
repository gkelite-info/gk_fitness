import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CaretLeft, Money, QrCode, User, CaretDown, CurrencyInr, CalendarBlank, Clock, PencilSimple, Info, FileText, Crown } from 'phosphor-react-native';

export default function AddPaymentScreen() {
  const [method, setMethod] = useState<'cash' | 'qr'>('cash');
  const [member, setMember] = useState('');
  const [plan, setPlan] = useState('Gold Membership');
  const [amount, setAmount] = useState('3,999');
  const [date, setDate] = useState('29 Jul 2026');
  const [time, setTime] = useState('06:42 PM');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    // In a real app, save to DB then navigate
    router.push({
      pathname: '/(owner)/dashboard/payments/success',
      params: { method, member, plan, amount, date, time, reference }
    });
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
            <Text className="text-white text-xl font-bold">Add Payment</Text>
          </View>
          <Text className="text-[#888888] text-xs font-medium ml-1">Manually add payment received via QR or Cash</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
          
          {/* Payment Method Toggle */}
          <Text className="text-[#888888] text-xs font-bold mb-2">Payment Method</Text>
          <View className="flex-row bg-[#1A1A1A] border border-[#27272A] rounded-xl p-1 mb-6">
            <TouchableOpacity
              onPress={() => setMethod('cash')}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${method === 'cash' ? 'bg-[#CCF200]' : ''}`}
            >
              <Money size={18} color={method === 'cash' ? '#000' : '#888'} weight={method === 'cash' ? 'bold' : 'regular'} />
              <Text className={`ml-2 text-sm font-bold ${method === 'cash' ? 'text-black' : 'text-[#888888]'}`}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMethod('qr')}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${method === 'qr' ? 'bg-[#CCF200]' : ''}`}
            >
              <QrCode size={18} color={method === 'qr' ? '#000' : '#888'} weight={method === 'qr' ? 'bold' : 'regular'} />
              <Text className={`ml-2 text-sm font-bold ${method === 'qr' ? 'text-black' : 'text-[#888888]'}`}>QR Code</Text>
            </TouchableOpacity>
          </View>

          {/* Select Member */}
          <Text className="text-[#888888] text-xs font-bold mb-2">Select Member</Text>
          <TouchableOpacity className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-6 active:opacity-70">
            <User size={18} color="#CCF200" />
            <Text className="flex-1 text-[#888888] ml-3 text-sm font-medium">Search member by name or mobile...</Text>
            <CaretDown size={16} color="#CCF200" />
          </TouchableOpacity>

          {/* Membership Plan */}
          <Text className="text-[#888888] text-xs font-bold mb-2">Membership Plan</Text>
          <TouchableOpacity className="bg-[#121214] border border-[#27272A] rounded-xl p-3 flex-row items-center mb-6 active:opacity-70">
            <View className="w-10 h-10 bg-[#1A1A1A] rounded-lg items-center justify-center border border-[#27272A]">
               <Crown size={20} color="#CCF200" weight="fill" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white text-sm font-bold mb-0.5">{plan}</Text>
              <Text className="text-[#888888] text-[10px] font-medium">1 Month</Text>
            </View>
            <CaretDown size={16} color="#CCF200" />
          </TouchableOpacity>

          {/* Amount */}
          <Text className="text-[#888888] text-xs font-bold mb-2">Amount</Text>
          <View className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-1">
            <CurrencyInr size={18} color="#CCF200" weight="bold" />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              className="flex-1 text-white ml-3 text-sm font-bold"
              keyboardType="numeric"
            />
          </View>
          {method === 'qr' && (
             <View className="flex-row items-center bg-[#1A1A1A] border border-[#27272A] border-dashed rounded-lg p-3 mb-6 mt-1">
                <Info size={14} color="#CCF200" />
                <Text className="text-[#888888] text-[10px] font-medium ml-2">Amount is auto-filled based on the selected membership plan.</Text>
             </View>
          )}
          {method === 'cash' && <View className="h-5" />}

          {/* Date & Time */}
          <Text className="text-[#888888] text-xs font-bold mb-2">Payment Date</Text>
          <TouchableOpacity className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-6 active:opacity-70">
            <CalendarBlank size={18} color="#CCF200" />
            <Text className="flex-1 text-white ml-3 text-sm font-bold">{date}</Text>
            <CaretDown size={16} color="#CCF200" />
          </TouchableOpacity>

          <Text className="text-[#888888] text-xs font-bold mb-2">Payment Time</Text>
          <TouchableOpacity className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex-row items-center mb-6 active:opacity-70">
            <Clock size={18} color="#CCF200" />
            <Text className="flex-1 text-white ml-3 text-sm font-bold">{time}</Text>
            <CaretDown size={16} color="#CCF200" />
          </TouchableOpacity>

          {/* Transaction Reference (QR Only) */}
          {method === 'qr' && (
            <>
              <Text className="text-[#888888] text-xs font-bold mb-2">Transaction Reference (Optional)</Text>
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
          <Text className="text-[#888888] text-xs font-bold mb-2">Notes (Optional)</Text>
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
          <TouchableOpacity onPress={handleSave} className="bg-[#CCF200] rounded-xl py-4 items-center mb-4 active:opacity-80">
            <Text className="text-black text-base font-bold">Save Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} className="py-4 items-center active:opacity-70 mb-4">
            <Text className="text-[#CCF200] text-base font-bold">Cancel</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
