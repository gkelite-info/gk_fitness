import React from 'react';
import { Modal, View, Pressable, Platform, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ActionOption {
  label: string;
  destructive?: boolean;
  keepOpen?: boolean;
  onPress: () => void;
}

interface ActionSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: ActionOption[];
}

export function ActionSheetModal({ visible, onClose, title, message, options }: ActionSheetModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        
        <View 
          className="bg-[#121214] rounded-t-3xl px-5 pt-6 border-t border-[#27272A]"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {/* Drag Handle Indicator */}
          <View className="absolute top-3 self-center w-12 h-1.5 bg-[#27272A] rounded-full" />

          {title && (
            <Text className="text-white font-bold text-lg text-center mb-1">{title}</Text>
          )}
          {message && (
            <Text className="text-[#A1A1AA] text-sm text-center mb-6 leading-5">{message}</Text>
          )}

          <View className={!title && !message ? "mt-2" : ""}>
            {options.map((option, index) => (
              <Pressable
                key={index}
                className={`py-4 flex-row justify-center items-center ${
                  index !== options.length - 1 ? 'border-b border-[#1F1F22]' : ''
                }`}
                onPress={() => {
                  if (option.keepOpen) {
                    option.onPress();
                  } else {
                    onClose();
                    setTimeout(() => {
                      option.onPress();
                    }, 400); // Wait for modal to fully close before triggering actions like ImagePicker
                  }
                }}
              >
                <Text 
                  className={`text-[16px] font-bold ${
                    option.destructive ? 'text-[#EF4444]' : 'text-white'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          
          <Pressable
            className="mt-4 py-4 rounded-2xl bg-[#18181B] border border-[#27272A] items-center justify-center active:opacity-70"
            onPress={onClose}
          >
            <Text className="text-white font-bold text-[16px]">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
