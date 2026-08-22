import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretRight, CalendarBlank, FileText, CaretLeft } from 'phosphor-react-native';

const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest', defaultValue: '102', unit: 'cm' },
  { key: 'waist', label: 'Waist', defaultValue: '84', unit: 'cm' },
  { key: 'shoulders', label: 'Shoulders', defaultValue: '118', unit: 'cm' },
  { key: 'biceps', label: 'Biceps', defaultValue: '39', unit: 'cm' },
  { key: 'forearms', label: 'Forearms', defaultValue: '31', unit: 'cm' },
  { key: 'thighs', label: 'Thighs', defaultValue: '60', unit: 'cm' },
  { key: 'calves', label: 'Calves', defaultValue: '40', unit: 'cm' },
  { key: 'neck', label: 'Neck', defaultValue: '38', unit: 'cm' },
  { key: 'bodyFat', label: 'Body Fat', defaultValue: '18', unit: '%' },
];

export default function UpdateMeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [values, setValues] = useState<Record<string, string>>(
    MEASUREMENT_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: field.defaultValue }), {})
  );
  const [notes, setNotes] = useState('');

  const updateValue = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#09090B]"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <ScrollView 
            className="flex-1"
            contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="px-5 pt-6 pb-4">
              
              <View className="flex-row items-center mb-6">
                <Pressable 
                  className="mr-3 p-1 -ml-1 active:opacity-70"
                  onPress={() => router.back()}
                >
                  <CaretLeft size={28} color="#FFFFFF" weight="bold" />
                </Pressable>
                <Text className="text-white text-[28px] font-bold tracking-tight">Update</Text>
              </View>

              {/* Header Box */}
              <View className="bg-[#1C1C1E] rounded-2xl p-4 flex-row items-center mb-8 border border-[#2A2A2D]/50">
                <View className="w-14 h-14 rounded-xl bg-[#2E3113] mr-4 border border-[#D4FF00]/20" />
                <View className="flex-1">
                  <Text className="text-white text-[15px] font-bold mb-1">Track your progress</Text>
                  <Text className="text-[#8E8E93] text-[13px] leading-tight">Accurate measurements help you see real transformation.</Text>
                </View>
              </View>

              <Text className="text-[#D4FF00] text-[11px] font-bold tracking-[1.5px] uppercase mb-4 pl-1">Measurements</Text>

              {/* Inputs List */}
              <View className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-[#2A2A2D]/50 mb-6">
                {MEASUREMENT_FIELDS.map((field, index) => {
                  const isLast = index === MEASUREMENT_FIELDS.length - 1;
                  return (
                    <View 
                      key={field.key}
                      className={`flex-row items-center justify-between px-5 py-4 ${!isLast ? 'border-b border-[#2A2A2D]/50' : ''}`}
                    >
                      <Text className="text-white text-[15px]">{field.label}</Text>
                      <View className="flex-row items-center">
                        <View className="bg-[#09090B] rounded-lg px-3 py-1.5 min-w-[60px] items-center border border-[#2A2A2D]/30 mr-2">
                          <TextInput
                            className="text-white text-[15px] font-bold p-0 text-center"
                            keyboardType="numeric"
                            value={values[field.key]}
                            onChangeText={(val) => updateValue(field.key, val)}
                          />
                        </View>
                        <Text className="text-[#8E8E93] text-[13px] w-6">{field.unit}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Date Card */}
              <Pressable className="bg-[#1C1C1E] rounded-2xl p-4 flex-row items-center mb-4 border border-[#2A2A2D]/50 active:opacity-80">
                <View className="w-10 h-10 rounded-xl bg-[#2E3113] items-center justify-center mr-4">
                  <CalendarBlank size={20} color="#D4FF00" weight="regular" />
                </View>
                <View>
                  <Text className="text-[#8E8E93] text-[11px] mb-1">Date</Text>
                  <Text className="text-white text-[15px] font-medium">May 14, 2025</Text>
                </View>
              </Pressable>

              {/* Notes Card */}
              <View className="bg-[#1C1C1E] rounded-2xl p-4 flex-row mb-4 border border-[#2A2A2D]/50">
                <View className="w-10 h-10 rounded-xl bg-[#2E3113] items-center justify-center mr-4 mt-1">
                  <FileText size={20} color="#D4FF00" weight="regular" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#8E8E93] text-[11px] mb-1">Notes (optional)</Text>
                  <TextInput
                    className="text-[#E5E5EA] text-[15px] p-0"
                    placeholder="Add any notes about your measurements..."
                    placeholderTextColor="#6B6B6B"
                    multiline
                    maxLength={120}
                    value={notes}
                    onChangeText={setNotes}
                    style={{ minHeight: 60, textAlignVertical: 'top' }}
                  />
                  <Text className="text-[#6B6B6B] text-[11px] text-right mt-2">{notes.length}/120</Text>
                </View>
              </View>

            </View>
          </ScrollView>

          {/* Floating Action Button */}
          <View 
            className="absolute left-0 right-0 px-5 pt-4 pb-4 bg-transparent" 
            style={{ bottom: 75 + insets.bottom + 10 }}
          >
            <Pressable 
              className="bg-[#D4FF00] rounded-full py-4 flex-row items-center justify-between px-6 active:opacity-80 shadow-lg"
              onPress={() => router.back()}
            >
              <View className="flex-1 items-center">
                <Text className="text-[#09090B] text-[17px] font-bold">Save Measurements</Text>
              </View>
              <CaretRight size={20} weight="bold" color="#09090B" />
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
