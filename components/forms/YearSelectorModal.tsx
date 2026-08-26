import React from 'react';
import { Modal, Pressable, View, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';

interface YearSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectYear: (year: string) => void;
  selectedYear: string;
}

export function YearSelectorModal({
  visible,
  onClose,
  onSelectYear,
  selectedYear,
}: YearSelectorModalProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/60 justify-center items-center p-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 max-h-[60%]"
        >
          <View className="flex-row items-center justify-between mb-4 border-b border-[#1F293D] pb-3">
            <Text className="text-lg font-semibold text-white">Select Year</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#CCFF00] font-semibold text-sm">Close</Text>
            </Pressable>
          </View>

          <FlatList
            data={years}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelectYear(item);
                  onClose();
                }}
                className={`py-3 px-2 border-b border-[#1F293D]/50 rounded-lg ${
                  selectedYear === item ? 'bg-[#111622]' : 'active:bg-[#111622]'
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedYear === item
                      ? 'text-[#CCFF00] font-semibold'
                      : 'text-white'
                  }`}
                >
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
