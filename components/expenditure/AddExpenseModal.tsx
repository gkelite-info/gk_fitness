import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  FileText,
  House,
  Users,
  Gear,
  Lightning,
  Megaphone,
  Barbell,
  Package,
  DotsThree,
  QrCode,
  Bank,
  Money,
  CreditCard,
  UploadSimple,
  FloppyDisk,
  CalendarBlank,
  Trash,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useSaveGymExpense } from '@/hooks/gymExpenses/useGymExpenses';
import { uploadGymExpenseReceipt } from '@/helpers/gymExpenses/gymExpensesHelper';
import { toast } from '@/lib/toast';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ExpenseData {
  id?: string;
  name: string;
  category: string;
  amount: string;
  date: string;
  paymentMethod: string;
  notes?: string;
  receiptUrl?: string | null;
  addedBy?: string;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ExpenseData | null;
  onSuccess?: (savedData: ExpenseData) => void;
}

const CATEGORIES = [
  { id: 'rent', label: 'Rent', icon: House, color: '#FBBF24', activeBg: '#2E1A05', activeBorder: '#D97706', border: '#45270A' },
  { id: 'salaries', label: 'Staff Salaries', icon: Users, color: '#C084FC', activeBg: '#2E0854', activeBorder: '#9333EA', border: '#581C87' },
  { id: 'maintenance', label: 'Maintenance', icon: Gear, color: '#2DD4BF', activeBg: '#042F2E', activeBorder: '#0D9488', border: '#115E59' },
  { id: 'utilities', label: 'Utilities', icon: Lightning, color: '#38BDF8', activeBg: '#082F49', activeBorder: '#0284C7', border: '#0369A1' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, color: '#F472B6', activeBg: '#500724', activeBorder: '#DB2777', border: '#9D174D' },
  { id: 'equipment', label: 'Equipment', icon: Barbell, color: '#FB7185', activeBg: '#4C0519', activeBorder: '#E11D48', border: '#9F1239' },
  { id: 'supplies', label: 'Supplies', icon: Package, color: '#A3E635', activeBg: '#1A2E05', activeBorder: '#65A30D', border: '#3F6212' },
  { id: 'others', label: 'Other', icon: DotsThree, color: '#94A3B8', activeBg: '#1E293B', activeBorder: '#64748B', border: '#334155' },
];

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: QrCode, color: '#A855F7', activeBg: 'rgba(59,7,100,0.6)', activeBorder: '#A855F7' },
  { id: 'bank', label: 'Bank Transfer', icon: Bank, color: '#38BDF8', activeBg: 'rgba(8,47,73,0.6)', activeBorder: '#38BDF8' },
  { id: 'cash', label: 'Cash', icon: Money, color: '#34D399', activeBg: 'rgba(6,78,59,0.6)', activeBorder: '#34D399' },
  { id: 'creditcard', label: 'Credit Card', icon: CreditCard, color: '#FBBF24', activeBg: 'rgba(120,53,15,0.6)', activeBorder: '#FBBF24' },
  { id: 'debitcard', label: 'Debit Card', icon: CreditCard, color: '#22D3EE', activeBg: 'rgba(8,51,68,0.6)', activeBorder: '#22D3EE' },
];

export default function AddExpenseModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: AddExpenseModalProps) {
  const { gymId, userId, name: currentUserName } = useUser();
  const saveExpenseMutation = useSaveGymExpense();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('rent');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sync initialData when editing
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.name || '');
      setCategory(initialData.category?.toLowerCase() || 'rent');
      setAmount(initialData.amount ? initialData.amount.toString() : '');
      setDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      
      const pm = (initialData.paymentMethod || 'upi').toLowerCase().replace('_', '').replace(' ', '');
      setPaymentMethod(pm.includes('debit') ? 'debitcard' : pm.includes('credit') ? 'creditcard' : pm);
      
      setNotes(initialData.notes || '');
      setExistingReceiptUrl(initialData.receiptUrl || null);
      setReceiptUri(null);
    } else {
      setTitle('');
      setCategory('rent');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('upi');
      setNotes('');
      setExistingReceiptUrl(null);
      setReceiptUri(null);
    }
  }, [initialData, isOpen]);

  const handlePickImage = async () => {
    try {
      triggerLightHaptic();
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permission to access photos is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
        triggerSuccessHaptic();
      }
    } catch (err) {
      console.error('[AddExpenseModal] Pick Image Error:', err);
      toast.error('Failed to pick image.');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      triggerErrorHaptic();
      toast.error('Please enter an Expense Title.');
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      triggerErrorHaptic();
      toast.error('Please enter a valid Amount.');
      return;
    }
    if (!date) {
      triggerErrorHaptic();
      toast.error('Please select a Date.');
      return;
    }
    if (!gymId) {
      triggerErrorHaptic();
      toast.error('Gym ID not found. Please re-login.');
      return;
    }
    if (!userId) {
      triggerErrorHaptic();
      toast.error('User not authenticated.');
      return;
    }

    setIsSubmitting(true);
    triggerMediumHaptic();

    try {
      let finalReceiptUrl = existingReceiptUrl;

      if (receiptUri) {
        const fileExt = receiptUri.split('.').pop() || 'jpg';
        const uploadedUrl = await uploadGymExpenseReceipt(receiptUri, fileExt);
        if (uploadedUrl) {
          finalReceiptUrl = uploadedUrl;
        }
      }

      const payload = {
        gymExpenseId: initialData?.id,
        expenseTitle: title.trim(),
        category,
        amount: parseFloat(amount),
        date,
        paymentMethod,
        notes: notes.trim() || null,
        receiptUrl: finalReceiptUrl,
        gymId,
        createdBy: userId,
      };

      const result = await saveExpenseMutation.mutateAsync(payload);

      triggerSuccessHaptic();
      toast.success(initialData ? 'Expense updated successfully!' : 'Expense saved successfully!');

      if (onSuccess && result) {
        onSuccess({
          id: result.gymExpenseId,
          name: result.expenseTitle,
          category: result.category,
          amount: result.amount.toString(),
          date: result.date,
          paymentMethod: result.paymentMethod,
          notes: result.notes || '',
          receiptUrl: result.receiptUrl || null,
          addedBy: currentUserName || 'Owner',
        });
      }
      onClose();
    } catch (err: any) {
      triggerErrorHaptic();
      console.error('[AddExpenseModal] Save Error:', err);
      toast.error(err.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }) : 'mm/dd/yyyy';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/70"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View
          style={{ maxHeight: SCREEN_HEIGHT * 0.92 }}
          className="bg-[#0F141C] border-t border-[#1E293B] rounded-t-[32px] overflow-hidden"
        >
          {/* Top Drag Handle Indicator */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1.5 rounded-full bg-[#334155]" />
          </View>

          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1E293B]/70">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-[#1A2E05] border border-[#CCFF00]/40 items-center justify-center shadow-sm">
                <FileText size={20} color="#CCFF00" weight="fill" />
              </View>
              <View>
                <Text className="text-white text-lg font-bold">
                  {initialData ? 'Edit Expense' : 'Add Expense'}
                </Text>
                <Text className="text-[#94A3B8] text-xs">
                  {initialData ? 'Update expense details' : 'Record a new expense'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="w-8 h-8 rounded-full bg-[#1E293B] items-center justify-center active:opacity-70"
            >
              <X size={16} color="#94A3B8" weight="bold" />
            </Pressable>
          </View>

          {/* Scrollable Form Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 18 }}
          >
            {/* 1. Expense Title */}
            <View className="gap-2">
              <Text className="text-[#CBD5E1] text-xs font-semibold">
                Expense Title <Text className="text-[#F87171]">*</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Gym Rent - July 2024"
                placeholderTextColor="#64748B"
                className="bg-[#090D13] border border-[#1E293B] rounded-xl px-4 py-3 text-sm text-white focus:border-[#CCFF00]"
              />
            </View>

            {/* 2. Category Grid */}
            <View className="gap-2">
              <Text className="text-[#CBD5E1] text-xs font-semibold">
                Category <Text className="text-[#F87171]">*</Text>
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = category.toLowerCase() === cat.id;
                  const IconComp = cat.icon;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        triggerLightHaptic();
                        setCategory(cat.id);
                      }}
                      style={{
                        width: '48.5%',
                        backgroundColor: isSelected ? cat.activeBg : '#090D13',
                        borderColor: isSelected ? cat.activeBorder : cat.border,
                      }}
                      className="flex-row items-center px-3.5 py-3 rounded-xl border gap-2.5 active:opacity-80"
                    >
                      <IconComp
                        size={18}
                        color={cat.color}
                        weight={isSelected ? 'fill' : 'regular'}
                      />
                      <Text
                        numberOfLines={1}
                        style={{ color: cat.color }}
                        className="text-xs font-semibold flex-1"
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 3. Amount & Date Row */}
            <View className="flex-row gap-3">
              {/* Amount */}
              <View className="flex-1 gap-2">
                <Text className="text-[#CBD5E1] text-xs font-semibold">
                  Amount <Text className="text-[#F87171]">*</Text>
                </Text>
                <View className="flex-row items-center bg-[#090D13] border border-[#1E293B] rounded-xl px-3.5 py-2.5 focus:border-[#CCFF00]">
                  <Text className="text-white font-bold text-base mr-1.5">₹</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    className="flex-1 text-sm text-white p-0 font-medium"
                  />
                </View>
              </View>

              {/* Date */}
              <View className="flex-1 gap-2">
                <Text className="text-[#CBD5E1] text-xs font-semibold">
                  Date <Text className="text-[#F87171]">*</Text>
                </Text>
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setShowDatePicker(true);
                  }}
                  className="flex-row items-center justify-between bg-[#090D13] border border-[#1E293B] rounded-xl px-3.5 py-3 active:opacity-80"
                >
                  <Text className="text-sm text-white font-medium">
                    {formattedDate}
                  </Text>
                  <CalendarBlank size={16} color="#94A3B8" />
                </Pressable>

                {showDatePicker && (
                  <DateTimePicker
                    value={date ? new Date(date) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setDate(selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
              </View>
            </View>

            {/* 4. Payment Method Selection */}
            <View className="gap-2">
              <Text className="text-[#CBD5E1] text-xs font-semibold">
                Payment Method <Text className="text-[#F87171]">*</Text>
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = paymentMethod === pm.id;
                  const IconComp = pm.icon;
                  return (
                    <Pressable
                      key={pm.id}
                      onPress={() => {
                        triggerLightHaptic();
                        setPaymentMethod(pm.id);
                      }}
                      style={{
                        backgroundColor: isSelected ? pm.activeBg : '#090D13',
                        borderColor: isSelected ? pm.activeBorder : 'rgba(30,41,59,0.8)',
                      }}
                      className="flex-row items-center px-3.5 py-2.5 rounded-xl border gap-2 active:opacity-80"
                    >
                      <IconComp
                        size={16}
                        color={pm.color}
                        weight={isSelected ? 'fill' : 'regular'}
                      />
                      <Text
                        style={{ color: isSelected ? '#FFFFFF' : pm.color }}
                        className="text-xs font-semibold"
                      >
                        {pm.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 5. Notes */}
            <View className="gap-2">
              <Text className="text-[#CBD5E1] text-xs font-semibold">Notes</Text>
              <View className="relative bg-[#090D13] border border-[#1E293B] rounded-xl p-3">
                <TextInput
                  value={notes}
                  onChangeText={(t) => {
                    if (t.length <= 500) setNotes(t);
                  }}
                  placeholder="Add notes about this expense (optional)..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="text-xs text-white min-h-[70px] p-0"
                />
                <Text className="text-[10px] text-[#64748B] self-end mt-1">
                  {notes.length}/500
                </Text>
              </View>
            </View>

            {/* 6. Receipt Upload */}
            <View className="gap-2">
              <Text className="text-[#CBD5E1] text-xs font-semibold">
                Receipt Upload <Text className="text-[#64748B] font-normal">(optional)</Text>
              </Text>

              {receiptUri || existingReceiptUrl ? (
                <View className="flex-row items-center justify-between p-3 bg-[#090D13] border border-[#1E293B] rounded-xl">
                  <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <Image
                      source={{ uri: receiptUri || existingReceiptUrl! }}
                      className="w-12 h-12 rounded-lg bg-black/40 border border-[#1E293B]"
                      resizeMode="cover"
                    />
                    <View className="flex-1">
                      <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                        Attached Receipt
                      </Text>
                      <Text className="text-[#64748B] text-[10px]">
                        Tap icon to remove
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setReceiptUri(null);
                      setExistingReceiptUrl(null);
                    }}
                    className="w-8 h-8 rounded-lg bg-[#E11D48]/20 items-center justify-center active:opacity-70"
                  >
                    <Trash size={16} color="#FB7185" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handlePickImage}
                  className="items-center justify-center border-2 border-dashed border-[#1E293B] rounded-2xl py-6 px-4 bg-[#090D13]/60 active:opacity-75"
                >
                  <View className="w-10 h-10 rounded-full bg-[#1E293B] items-center justify-center mb-2">
                    <UploadSimple size={20} color="#94A3B8" />
                  </View>
                  <Text className="text-white font-semibold text-xs mb-0.5">
                    Click to upload or take a photo
                  </Text>
                  <Text className="text-[#64748B] text-[10px]">
                    JPG, PNG, PDF (Max 5 MB)
                  </Text>
                </Pressable>
              )}
            </View>

            {/* 7. Action Buttons */}
            <View className="flex-row gap-3 pt-2">
              <Pressable
                onPress={onClose}
                disabled={isSubmitting}
                className="flex-1 items-center justify-center py-3.5 rounded-xl border border-[#1E293B] bg-[#090D13] active:opacity-70"
              >
                <Text className="text-[#CBD5E1] text-xs font-semibold">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={isSubmitting}
                className="flex-[1.5] flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-[#CCFF00] active:opacity-85 shadow-lg shadow-[#CCFF00]/20"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <FloppyDisk size={18} color="#000000" weight="bold" />
                    <Text className="text-black text-xs font-bold">
                      {initialData ? 'Update Expense' : 'Save Expense'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
