import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  X,
  FileText,
  Tag,
  CreditCard,
  CalendarBlank,
  NotePencil,
  Pen,
  Trash,
  MagnifyingGlassPlus,
  DownloadSimple,
  ArrowsOut,
  Buildings,
} from 'phosphor-react-native';
import { ExpenseData } from './AddExpenseModal';
import ExpenseReceiptZoom from './ExpenseReceiptZoom';
import { useGym } from '@/hooks/gyms/useGym';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
  triggerErrorHaptic,
} from '@/lib/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseData: ExpenseData | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ExpenseDetailsModal({
  isOpen,
  onClose,
  expenseData,
  onEdit,
  onDelete,
}: ExpenseDetailsModalProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  const { gymId } = useUser();
  const { data: gymData } = useGym(gymId);

  if (!isOpen || !expenseData) return null;

  const dateStr = expenseData.date
    ? new Date(expenseData.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const monthYearFormatted = expenseData.date
    ? new Date(expenseData.date).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Current';

  const amountNumber = parseFloat(expenseData.amount) || 0;
  const amountStr = amountNumber.toLocaleString('en-IN');
  const titleStr = expenseData.name || 'Expense';
  const categoryLabel = expenseData.category || 'Rent';
  const paymentMethodStr = (expenseData.paymentMethod || 'Bank Transfer').replace('_', ' ');
  const invoiceIdStr = expenseData.id ? expenseData.id.slice(0, 8).toUpperCase() : 'EXP-001';

  // Download Attached Receipt Image/File
  const handleDownloadReceipt = async () => {
    if (!expenseData.receiptUrl) return;
    try {
      triggerLightHaptic();
      setIsDownloadingReceipt(true);

      const url = expenseData.receiptUrl;
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const fileUri = `${FileSystem.cacheDirectory}receipt_${Date.now()}.${ext}`;

      if (url.startsWith('file://')) {
        // Already local file on device
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          triggerSuccessHaptic();
          await Sharing.shareAsync(url, {
            mimeType: ext.toLowerCase() === 'pdf' ? 'application/pdf' : `image/${ext}`,
            dialogTitle: `Download Receipt - ${titleStr}`,
          });
        } else {
          toast.error('Sharing is not available on this device');
        }
      } else {
        // Fetch via HTTP and write to cacheDirectory using Base64 (bypasses Android DownloadManager bug)
        const response = await fetch(url);
        const blob = await response.blob();

        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const result = reader.result as string;
              const base64Data = result.includes(',') ? result.split(',')[1] : result;
              await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });

              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                triggerSuccessHaptic();
                await Sharing.shareAsync(fileUri, {
                  mimeType: ext.toLowerCase() === 'pdf' ? 'application/pdf' : `image/${ext}`,
                  dialogTitle: `Download Receipt - ${titleStr}`,
                });
              } else {
                await Linking.openURL(url);
              }
              resolve();
            } catch (writeErr) {
              reject(writeErr);
            }
          };
          reader.onerror = () => reject(new Error('Failed to convert file blob'));
          reader.readAsDataURL(blob);
        });
      }
    } catch (error: any) {
      triggerErrorHaptic();
      console.warn('[ExpenseDetailsModal] Download Receipt Catch:', error);
      // Fallback: Directly open URL in browser / external viewer
      try {
        if (
          expenseData.receiptUrl &&
          (expenseData.receiptUrl.startsWith('http://') || expenseData.receiptUrl.startsWith('https://'))
        ) {
          await Linking.openURL(expenseData.receiptUrl);
          toast.success('Opening receipt in browser...');
        } else {
          toast.error('Failed to download receipt.');
        }
      } catch (linkErr) {
        toast.error('Failed to open receipt.');
      }
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const handleDeletePress = () => {
    triggerWarningHaptic();
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expenseData.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            triggerMediumHaptic();
            onDelete();
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/75">
          <Pressable className="flex-1" onPress={onClose} />
          <View
            style={{ maxHeight: SCREEN_HEIGHT * 0.94 }}
            className="bg-[#0F141C] border-t border-[#1E293B] rounded-t-[32px] overflow-hidden"
          >
            {/* Top Handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1.5 rounded-full bg-[#334155]" />
            </View>

            {/* Header (matches Next.js ExpenseDetailsModal) */}
            <View className="flex-row items-center justify-between px-5 pt-3 pb-4 border-b border-[#1E293B]/60 bg-[#0F141C]">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-[#CCFF00]/5 border border-[#CCFF00]/20 items-center justify-center">
                  <FileText size={20} color="#CCFF00" weight="fill" />
                </View>
                <View>
                  <Text className="text-white text-base font-bold tracking-tight">
                    Expense Details
                  </Text>
                  <Text className="text-[#94A3B8] text-xs">
                    View complete expense information and receipt.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={12}
                className="w-8 h-8 rounded-xl bg-[#1E293B]/40 border border-[#1E293B] items-center justify-center active:opacity-70"
              >
                <X size={16} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Scrollable details body */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 18, paddingBottom: 28, gap: 14 }}
            >
              {/* 1. Quick Overview Bar (matches Next.js) */}
              <View className="flex-row flex-wrap items-center justify-between p-3.5 bg-[#090D13] border border-[#1E293B]/60 rounded-xl gap-2.5">
                <View className="min-w-[90px] flex-1">
                  <Text className="text-[9px] uppercase font-semibold tracking-wider text-[#64748B]">
                    Expense Title
                  </Text>
                  <Text className="text-xs font-bold text-white mt-0.5 truncate" numberOfLines={1}>
                    {titleStr}
                  </Text>
                </View>

                <View className="min-w-[70px]">
                  <Text className="text-[9px] uppercase font-semibold tracking-wider text-[#64748B]">
                    Category
                  </Text>
                  <View className="px-1.5 py-0.5 rounded border border-[#522D1B] bg-[#332219] self-start mt-0.5">
                    <Text className="text-[10px] font-medium text-[#EA580C] capitalize">
                      {categoryLabel}
                    </Text>
                  </View>
                </View>

                <View className="min-w-[70px]">
                  <Text className="text-[9px] uppercase font-semibold tracking-wider text-[#64748B]">
                    Amount
                  </Text>
                  <Text className="text-xs font-bold text-[#CCFF00] mt-0.5">
                    ₹{amountStr}
                  </Text>
                </View>

                <View className="min-w-[70px]">
                  <Text className="text-[9px] uppercase font-semibold tracking-wider text-[#64748B]">
                    Date
                  </Text>
                  <Text className="text-xs font-medium text-[#E2E8F0] mt-0.5">
                    {dateStr}
                  </Text>
                </View>

                <View className="min-w-[85px]">
                  <Text className="text-[9px] uppercase font-semibold tracking-wider text-[#64748B]">
                    Payment Method
                  </Text>
                  <View className="px-1.5 py-0.5 rounded border border-[#273648] bg-[#1A232F] self-start mt-0.5">
                    <Text className="text-[10px] font-medium text-[#D1D5DB] capitalize">
                      {paymentMethodStr}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. Expense Information Card (matches Next.js) */}
              <View className="bg-[#131922] border border-[#1E293B] rounded-xl overflow-hidden">
                <View className="flex-row items-center gap-2 px-4 py-3 border-b border-[#1E293B]">
                  <FileText size={16} color="#94A3B8" />
                  <Text className="font-bold text-xs text-white">Expense Information</Text>
                </View>
                <View className="px-4 py-1">
                  <View className="flex-row justify-between items-center py-2.5 border-b border-[#1E293B]/50">
                    <Text className="text-xs font-medium text-[#64748B]">Expense Title</Text>
                    <Text className="text-xs font-medium text-[#E2E8F0] max-w-[200px] text-right" numberOfLines={1}>
                      {titleStr}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center py-2.5 border-b border-[#1E293B]/50">
                    <Text className="text-xs font-medium text-[#64748B]">Category</Text>
                    <View className="px-2 py-0.5 rounded border border-[#522D1B] bg-[#332219]">
                      <Text className="text-[11px] font-medium text-[#EA580C] capitalize">
                        {categoryLabel}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between items-center py-2.5 border-b border-[#1E293B]/50">
                    <Text className="text-xs font-medium text-[#64748B]">Amount</Text>
                    <Text className="text-xs font-bold text-white">₹{amountStr}</Text>
                  </View>
                  <View className="flex-row justify-between items-center py-2.5 border-b border-[#1E293B]/50">
                    <Text className="text-xs font-medium text-[#64748B]">Date</Text>
                    <Text className="text-xs font-medium text-[#E2E8F0]">{dateStr}</Text>
                  </View>
                  <View className="flex-row justify-between items-center py-2.5 border-b border-[#1E293B]/50">
                    <Text className="text-xs font-medium text-[#64748B]">Payment Method</Text>
                    <View className="px-2 py-0.5 rounded border border-[#273648] bg-[#1A232F]">
                      <Text className="text-[11px] font-medium text-[#D1D5DB] capitalize">
                        {paymentMethodStr}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between items-center py-2.5 border-b border-[#1E293B]/50">
                    <Text className="text-xs font-medium text-[#64748B]">Added By</Text>
                    <Text className="text-xs font-medium text-[#E2E8F0]">
                      {expenseData.addedBy || 'Unknown'}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center py-2.5">
                    <Text className="text-xs font-medium text-[#64748B]">Recorded On</Text>
                    <Text className="text-xs font-medium text-[#E2E8F0]">{dateStr}</Text>
                  </View>
                </View>
              </View>

              {/* 3. Receipt / Invoice Card (exact voucher design from Next.js + Download options) */}
              <View className="bg-[#131922] border border-[#1E293B] rounded-xl overflow-hidden">
                <View className="flex-row justify-between items-center px-4 py-3 border-b border-[#1E293B]">
                  <View className="flex-row items-center gap-2">
                    <FileText size={16} color="#94A3B8" />
                    <Text className="font-bold text-xs text-white">Receipt</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setIsZoomOpen(true);
                    }}
                    hitSlop={8}
                    className="w-6 h-6 rounded bg-[#1E293B]/50 items-center justify-center active:opacity-70"
                  >
                    <ArrowsOut size={13} color="#94A3B8" />
                  </Pressable>
                </View>

                <View className="p-4 gap-3 items-center">
                  {/* The Crisp Invoice Document */}
                  <View className="w-full bg-white rounded-xl p-3 shadow-sm">
                    {/* Header */}
                    <View className="flex-row justify-between items-start mb-2 border-b border-gray-200 pb-1.5">
                      <Text className="font-bold text-black text-sm tracking-tight">
                        {gymData?.gymName || 'GK Gym Life'}
                      </Text>
                      <View className="items-end">
                        <Text className="font-bold text-black text-[9px] tracking-wider uppercase">
                          INVOICE
                        </Text>
                        <Text className="text-gray-400 text-[8px] font-mono">
                          #{invoiceIdStr}
                        </Text>
                      </View>
                    </View>

                    {/* Bill To & Dates */}
                    <View className="flex-row justify-between mb-2 gap-2">
                      <View className="flex-1">
                        <Text className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          BILL TO
                        </Text>
                        <Text className="font-bold text-black text-[10px]">
                          {gymData?.gymName || 'GK Gym Life'}
                        </Text>
                        <Text className="text-[8px] text-gray-500 leading-tight">
                          {gymData?.address || '123 Fitness Street'}
                        </Text>
                        <Text className="text-[8px] text-gray-500 leading-tight">
                          {gymData?.city || 'Indore'}, {gymData?.state || 'Madhya Pradesh'}
                        </Text>
                      </View>

                      <View className="items-end">
                        <View className="flex-row items-center gap-1 mb-0.5">
                          <Text className="text-[8px] text-gray-500">Invoice Date:</Text>
                          <Text className="text-[8px] font-bold text-black">{dateStr}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Text className="text-[8px] text-gray-500">Due Date:</Text>
                          <Text className="text-[8px] font-bold text-black">{dateStr}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Line Items Table */}
                    <View className="flex-row justify-between border-t border-b border-gray-100 py-1 mb-1.5">
                      <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                        DESCRIPTION
                      </Text>
                      <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                        AMOUNT
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-[10px] font-medium text-black flex-1 mr-2" numberOfLines={1}>
                        {titleStr}
                      </Text>
                      <Text className="text-[10px] font-bold text-black">
                        ₹{amountStr}
                      </Text>
                    </View>

                    {/* Total Amount */}
                    <View className="flex-row justify-between items-center bg-gray-50 p-2 rounded-md">
                      <Text className="text-[10px] font-extrabold text-black uppercase tracking-wider">
                        TOTAL AMOUNT
                      </Text>
                      <Text className="text-[11px] font-extrabold text-black">
                        ₹{amountStr}
                      </Text>
                    </View>

                    {/* Attached Receipt Thumbnail if any */}
                    {expenseData.receiptUrl && (
                      <Pressable
                        onPress={() => {
                          triggerLightHaptic();
                          setIsZoomOpen(true);
                        }}
                        className="mt-3 pt-2.5 border-t border-gray-100 items-center active:opacity-85"
                      >
                        <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          ATTACHED RECEIPT
                        </Text>
                        <Image
                          source={{ uri: expenseData.receiptUrl }}
                          className="w-full h-24 rounded border border-gray-100"
                          resizeMode="contain"
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* Download Receipt Button (Matches Next.js) */}
                  {expenseData.receiptUrl ? (
                    <Pressable
                      onPress={handleDownloadReceipt}
                      disabled={isDownloadingReceipt}
                      className="flex-row justify-center items-center gap-2 w-full h-9 mt-1 rounded-lg border border-[#1E293B] bg-[#1E293B]/40 active:bg-[#1E293B] transition-colors"
                    >
                      {isDownloadingReceipt ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <DownloadSimple size={15} color="#FFFFFF" />
                          <Text className="text-white font-semibold text-xs">
                            Download Receipt
                          </Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* 4. Expense Summary Small Cards (matches Next.js) */}
              <View className="bg-[#131922] border border-[#1E293B] rounded-xl p-3.5">
                <View className="flex-row items-center gap-2 mb-2.5">
                  <FileText size={15} color="#94A3B8" />
                  <Text className="font-bold text-xs text-white">Expense Summary</Text>
                </View>

                <View className="flex-row gap-2">
                  <View className="flex-1 items-center bg-[#1A1C19] border border-[#262B21] rounded-lg p-2 gap-1">
                    <View className="w-6 h-6 rounded bg-[#332219] items-center justify-center">
                      <Tag size={12} color="#EA580C" weight="fill" />
                    </View>
                    <Text className="text-[8px] font-semibold text-[#64748B] uppercase">
                      Category
                    </Text>
                    <Text className="text-[10px] font-bold text-[#EA580C] capitalize" numberOfLines={1}>
                      {categoryLabel}
                    </Text>
                  </View>

                  <View className="flex-1 items-center bg-[#141C24] border border-[#1B2735] rounded-lg p-2 gap-1">
                    <View className="w-6 h-6 rounded bg-[#1A232F] items-center justify-center">
                      <CreditCard size={12} color="#38BDF8" weight="fill" />
                    </View>
                    <Text className="text-[8px] font-semibold text-[#64748B] uppercase">
                      Payment
                    </Text>
                    <Text className="text-[10px] font-bold text-[#38BDF8] capitalize" numberOfLines={1}>
                      {paymentMethodStr}
                    </Text>
                  </View>

                  <View className="flex-1 items-center bg-[#1D1726] border border-[#2A2136] rounded-lg p-2 gap-1">
                    <View className="w-6 h-6 rounded bg-[#281B36] items-center justify-center">
                      <CalendarBlank size={12} color="#C084FC" weight="fill" />
                    </View>
                    <Text className="text-[8px] font-semibold text-[#64748B] uppercase">
                      Month
                    </Text>
                    <Text className="text-[10px] font-bold text-[#C084FC]" numberOfLines={1}>
                      {monthYearFormatted}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 5. Notes Section (matches Next.js) */}
              <View className="bg-[#131922] border border-[#1E293B] rounded-xl overflow-hidden">
                <View className="flex-row items-center gap-2 px-4 py-3 border-b border-[#1E293B]">
                  <NotePencil size={15} color="#94A3B8" />
                  <Text className="font-bold text-xs text-white">Notes</Text>
                </View>
                <View className="p-4">
                  <Text className="text-xs text-[#94A3B8] leading-5">
                    {expenseData.notes && expenseData.notes.trim() !== ''
                      ? expenseData.notes
                      : 'Monthly rent payment for gym facility. Payment made via bank transfer as per rental agreement.'}
                  </Text>
                </View>
              </View>

              {/* 6. Footer Actions (matches Next.js) */}
              <View className="flex-row gap-2.5 pt-1">
                <Pressable
                  onPress={onEdit}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-[#1E293B]/50 border border-[#1E293B] active:opacity-75"
                >
                  <Pen size={14} color="#FFFFFF" />
                  <Text className="text-white text-xs font-semibold">Edit Expense</Text>
                </Pressable>

                <Pressable
                  onPress={handleDeletePress}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-[#E11D48]/15 border border-[#E11D48]/30 active:opacity-75"
                >
                  <Trash size={14} color="#F43F5E" />
                  <Text className="text-[#F43F5E] text-xs font-semibold">Delete Expense</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Screen Receipt Zoom */}
      <ExpenseReceiptZoom
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        receiptUrl={expenseData.receiptUrl}
        expenseTitle={expenseData.name}
      />
    </>
  );
}
