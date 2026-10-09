import React from 'react';
import { View, Text, Modal, Pressable, Image, Dimensions } from 'react-native';
import { X } from 'phosphor-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExpenseReceiptZoomProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl?: string | null;
  expenseTitle?: string;
}

export default function ExpenseReceiptZoom({
  isOpen,
  onClose,
  receiptUrl,
  expenseTitle,
}: ExpenseReceiptZoomProps) {
  if (!isOpen || !receiptUrl) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/90 items-center justify-center p-4">
        {/* Close Button */}
        <Pressable
          onPress={onClose}
          className="absolute top-12 right-5 z-20 w-10 h-10 rounded-full bg-white/20 items-center justify-center active:opacity-70"
        >
          <X size={20} color="#FFFFFF" weight="bold" />
        </Pressable>

        {expenseTitle && (
          <View className="absolute top-14 left-5 right-20 z-10">
            <Text className="text-white text-sm font-semibold truncate" numberOfLines={1}>
              {expenseTitle}
            </Text>
            <Text className="text-[#94A3B8] text-[11px]">Receipt Preview</Text>
          </View>
        )}

        <Image
          source={{ uri: receiptUrl }}
          style={{ width: SCREEN_WIDTH * 0.92, height: SCREEN_HEIGHT * 0.75 }}
          resizeMode="contain"
          className="rounded-2xl"
        />
      </View>
    </Modal>
  );
}
