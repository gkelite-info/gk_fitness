import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { X, Check, Receipt, Info } from 'phosphor-react-native';
import { ExpenseData } from './AddExpenseModal';
import { triggerLightHaptic, triggerMediumHaptic } from '@/lib/haptics';

interface ExpenseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseData: ExpenseData | null;
  onAddAnother: () => void;
}

export default function ExpenseSuccessModal({
  isOpen,
  onClose,
  expenseData,
  onAddAnother,
}: ExpenseSuccessModalProps) {
  if (!isOpen || !expenseData) return null;

  const amountNumber = parseFloat(expenseData.amount) || 0;
  const dateFormatted = expenseData.date
    ? new Date(expenseData.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/80 items-center justify-center p-5">
        <View className="w-full max-w-sm bg-[#0F141C] border border-[#1E293B] rounded-[28px] overflow-hidden p-6 gap-5 shadow-2xl">
          {/* Close button */}
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 items-center justify-center active:opacity-70 z-10"
          >
            <X size={16} color="#94A3B8" weight="bold" />
          </Pressable>

          {/* Lime check badge */}
          <View className="items-center mt-2">
            <View className="w-16 h-16 rounded-full border-2 border-[#CCFF00] bg-[#CCFF00]/10 items-center justify-center shadow-lg shadow-[#CCFF00]/20 mb-3">
              <Check size={32} color="#CCFF00" weight="bold" />
            </View>
            <Text className="text-white text-lg font-bold text-center">
              Expense Added Successfully!
            </Text>
            <Text className="text-[#94A3B8] text-xs text-center mt-1">
              The expense has been recorded and added to your expenditure list.
            </Text>
          </View>

          {/* Expense Summary Box */}
          <View className="bg-[#090D13] border border-[#1E293B] rounded-2xl overflow-hidden">
            <View className="flex-row items-center gap-2 px-3.5 py-2.5 bg-white/[0.02] border-b border-[#1E293B]">
              <Receipt size={16} color="#CCFF00" weight="fill" />
              <Text className="text-white text-xs font-bold">Expense Summary</Text>
            </View>

            <View className="p-3 gap-2">
              <View className="flex-row justify-between items-center py-1 border-b border-[#1E293B]/50">
                <Text className="text-[#64748B] text-xs">Expense Title</Text>
                <Text className="text-[#E2E8F0] text-xs font-semibold max-w-[180px]" numberOfLines={1}>
                  {expenseData.name}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-1 border-b border-[#1E293B]/50">
                <Text className="text-[#64748B] text-xs">Category</Text>
                <Text className="text-[#E2E8F0] text-xs font-semibold capitalize">
                  {expenseData.category}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-1 border-b border-[#1E293B]/50">
                <Text className="text-[#64748B] text-xs">Amount</Text>
                <Text className="text-[#CCFF00] text-xs font-extrabold">
                  ₹{amountNumber.toLocaleString('en-IN')}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-1 border-b border-[#1E293B]/50">
                <Text className="text-[#64748B] text-xs">Date</Text>
                <Text className="text-[#E2E8F0] text-xs font-medium">
                  {dateFormatted}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-1 border-b border-[#1E293B]/50">
                <Text className="text-[#64748B] text-xs">Payment Method</Text>
                <Text className="text-[#E2E8F0] text-xs font-semibold capitalize">
                  {expenseData.paymentMethod.replace('_', ' ')}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-1">
                <Text className="text-[#64748B] text-xs">Added By</Text>
                <Text className="text-[#E2E8F0] text-xs font-medium">
                  {expenseData.addedBy || 'Owner'}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 pt-1">
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              className="flex-1 items-center justify-center py-3 rounded-xl border border-[#1E293B] active:opacity-70"
            >
              <Text className="text-white text-xs font-bold">View Expenses</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerMediumHaptic();
                onAddAnother();
              }}
              className="flex-1 items-center justify-center py-3 rounded-xl bg-[#CCFF00] active:opacity-85 shadow-md shadow-[#CCFF00]/20"
            >
              <Text className="text-black text-xs font-bold">Add Another</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
