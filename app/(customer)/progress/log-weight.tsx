import React, { useState } from 'react';
import { View, Pressable, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { X, CalendarBlank, CaretDown, CheckCircle } from 'phosphor-react-native';

export default function LogWeightModal() {
  const router = useRouter();
  const [weight, setWeight] = useState(72.4);
  const [notes, setNotes] = useState('');

  const handleIncrement = () => setWeight(prev => Number((prev + 0.1).toFixed(1)));
  const handleDecrement = () => setWeight(prev => Number((prev - 0.1).toFixed(1)));

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#09090B]"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 px-5 pt-8" style={{ paddingBottom: 75 }}>
          
          {/* Header */}
          <View className="flex-row justify-between items-center mb-10">
            <Text className="text-white text-[28px] font-bold tracking-tight">Today's Weight</Text>
            <Pressable 
              className="w-8 h-8 rounded-full bg-[#1C1C1E] items-center justify-center active:opacity-70"
              onPress={() => router.back()}
            >
              <X size={16} color="#8E8E93" weight="bold" />
            </Pressable>
          </View>

          {/* Current Reading Counter */}
          <View className="bg-[#1C1C1E] rounded-3xl p-6 items-center justify-center mb-8 border border-[#2A2A2D]/50">
            <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] uppercase mb-6">Current Reading</Text>
            
            <View className="flex-row items-center justify-between w-full px-4">
              <Pressable 
                className="w-14 h-14 rounded-full bg-[#2A2A2D] items-center justify-center active:opacity-70"
                onPress={handleDecrement}
              >
                <Text className="text-white text-3xl font-light leading-none mb-1">-</Text>
              </Pressable>
              
              <View className="items-center">
                <View className="flex-row items-baseline gap-1 border-b-[3px] border-[#D4FF00] pb-1 px-2">
                  <Text className="text-[#D4FF00] text-[54px] font-bold tracking-tight leading-none">{weight.toFixed(1)}</Text>
                  <Text className="text-white text-2xl font-medium">kg</Text>
                </View>
              </View>

              <Pressable 
                className="w-14 h-14 rounded-full bg-[#2A2A2D] items-center justify-center active:opacity-70"
                onPress={handleIncrement}
              >
                <Text className="text-white text-3xl font-light leading-none mb-1">+</Text>
              </Pressable>
            </View>
          </View>

          {/* Log Date */}
          <View className="mb-6">
            <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] uppercase mb-3 px-1">Log Date</Text>
            <Pressable className="flex-row items-center justify-between bg-[#1C1C1E] rounded-2xl p-4 border border-[#2A2A2D]/50 active:opacity-80">
              <View className="flex-row items-center gap-3">
                <CalendarBlank size={20} color="#D4FF00" weight="bold" />
                <Text className="text-white text-[15px] font-medium">Today, June 20</Text>
              </View>
              <CaretDown size={18} color="#8E8E93" weight="bold" />
            </Pressable>
          </View>

          {/* Notes */}
          <View className="mb-8 flex-1">
            <Text className="text-[#8E8E93] text-[11px] font-bold tracking-[1.5px] uppercase mb-3 px-1">Notes (Optional)</Text>
            <View className="bg-[#1C1C1E] rounded-2xl border border-[#2A2A2D]/50 min-h-[120px] p-4">
              <TextInput
                className="flex-1 text-white text-[15px]"
                placeholder="How are you feeling today?"
                placeholderTextColor="#6B6B6B"
                multiline
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
                style={{ paddingTop: 0 }}
              />
            </View>
          </View>

          {/* Save Button */}
          <View className="pb-8">
            <Pressable 
              className="bg-[#D4FF00] rounded-full py-4 flex-row items-center justify-center active:opacity-80 shadow-lg"
              onPress={() => router.back()}
            >
              <Text className="text-[#09090B] font-bold text-[17px] mr-2">Save Weight</Text>
              <CheckCircle size={20} weight="regular" color="#09090B" />
            </Pressable>
          </View>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
