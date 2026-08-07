import React, { ReactNode } from 'react';
import { View, Pressable, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: string;
  confirmTextColor?: string;
  icon?: ReactNode;
}

export default function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonColor = 'bg-red-500',
  confirmTextColor = 'text-white',
  icon,
}: ConfirmModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View className="bg-[#121214] border border-[#27272A] w-full max-w-[340px] rounded-3xl p-6 items-center shadow-2xl">
          {icon && (
            <View className="mb-4">
              {icon}
            </View>
          )}
          <Text className="text-white text-lg font-semibold mb-2">{title}</Text>
          <Text className="text-[#8E8E93] text-sm text-center mb-6 leading-5">
            {description}
          </Text>

          <View className="flex-row gap-3 w-full">
            <Pressable
              onPress={onClose}
              className="flex-1 bg-[#1C1C1E] rounded-xl py-3 items-center active:opacity-90"
            >
              <Text className="text-white font-semibold text-sm">{cancelText}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className={`flex-1 ${confirmButtonColor} rounded-xl py-3 items-center active:opacity-90`}
            >
              <Text className={`${confirmTextColor} font-semibold text-sm`}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
