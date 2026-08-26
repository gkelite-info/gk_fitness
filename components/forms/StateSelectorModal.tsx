import React, { useState } from 'react';
import { Modal, Pressable, View, TextInput, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { MagnifyingGlass } from 'phosphor-react-native';
import { State } from 'country-state-city';

interface StateSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectState: (stateName: string) => void;
  selectedState: string;
}

export function StateSelectorModal({
  visible,
  onClose,
  onSelectState,
  selectedState,
}: StateSelectorModalProps) {
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const indianStates = State.getStatesOfCountry('IN');

  const filteredStates = indianStates.filter((s) =>
    s.name.toLowerCase().includes(stateSearchQuery.toLowerCase())
  );

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
          className="w-full max-w-sm bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 max-h-[70%]"
        >
          <View className="flex-row items-center justify-between mb-4 border-b border-[#1F293D] pb-3">
            <Text className="text-lg font-semibold text-white">Select State</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#CCFF00] font-semibold text-sm">Close</Text>
            </Pressable>
          </View>

          <View className="bg-[#111622] border border-[#1F293D] rounded-xl px-3.5 py-2 mb-3 flex-row items-center gap-2">
            <MagnifyingGlass size={16} color="#888888" />
            <TextInput
              value={stateSearchQuery}
              onChangeText={setStateSearchQuery}
              placeholder="Search state..."
              placeholderTextColor="#6B7280"
              className="flex-1 text-white text-sm py-1.5"
            />
          </View>

          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.isoCode}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelectState(item.name);
                  onClose();
                }}
                className={`py-3 px-2 border-b border-[#1F293D]/50 rounded-lg ${
                  selectedState === item.name ? 'bg-[#111622]' : 'active:bg-[#111622]'
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedState === item.name
                      ? 'text-[#CCFF00] font-semibold'
                      : 'text-white'
                  }`}
                >
                  {item.name}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View className="py-6 items-center">
                <Text className="text-[#888888] text-sm">No states found</Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
