import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeftIcon as CaretLeft, SunIcon as Sun, StarIcon as Star, CheckIcon as Check } from 'phosphor-react-native';

export default function SwapMeal() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<string | null>('Teriyaki Chicken Bowl');
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);

  const alternatives = [
    {
      id: '1',
      name: 'Teriyaki Chicken Bowl',
      desc: 'High protein bowl with brown rice, veggies and teriyaki glaze.',
      kcal: 510,
      p: 40,
      c: 24,
      f: 16,
      bestMatch: true
    },
    {
      id: '2',
      name: 'Quinoa & Chickpea Bowl',
      desc: 'Protein-packed quinoa with chickpeas, veggies and lemon dressing.',
      kcal: 495,
      p: 36,
      c: 28,
      f: 15,
      bestMatch: false
    },
    {
      id: '3',
      name: 'Tuna Salad Bowl',
      desc: 'Fresh tuna with greens, olives, boiled egg and olive oil.',
      kcal: 505,
      p: 39,
      c: 22,
      f: 17,
      bestMatch: false
    },
    {
      id: '4',
      name: 'Paneer Tikka Bowl',
      desc: 'Grilled paneer with quinoa, veggies and mint chutney.',
      kcal: 500,
      p: 35,
      c: 26,
      f: 16,
      bestMatch: false
    }
  ];

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <View className="flex-row items-center px-5 mb-4">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold flex-1 text-center pr-8">Swap Meal</Text>
      </View>

      <Text className="text-[#8E8E93] text-sm text-center mb-6">
        Replace your lunch with a healthier alternative
      </Text>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-white text-base font-bold mb-4">Current Meal</Text>
        
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-8 flex-row">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center mb-1">
              <Sun size={14} color="#C4EF00" weight="fill" style={{ marginRight: 6 }} />
              <Text className="text-[#C4EF00] text-[10px] font-bold tracking-widest">LUNCH</Text>
            </View>
            <Text className="text-white text-base font-bold mb-2">Grilled Chicken Bowl</Text>
            <Text className="text-[#8E8E93] text-[11px] leading-4 mb-4">
              A wholesome bowl with grilled chicken, quinoa, veggies and healthy fats.
            </Text>
            
            <View className="flex-row items-center gap-x-4">
              <Text className="text-white text-[11px] font-bold"><Text className="text-[#4ADE80]">P</Text> 38g</Text>
              <View className="w-[1px] h-3 bg-[#333333]" />
              <Text className="text-white text-[11px] font-bold"><Text className="text-[#FBBF24]">C</Text> 25g</Text>
              <View className="w-[1px] h-3 bg-[#333333]" />
              <Text className="text-white text-[11px] font-bold"><Text className="text-[#A78BFA]">F</Text> 18g</Text>
            </View>
          </View>

          <View className="bg-[#0A0A0A] border border-[#222222] rounded-[16px] w-[50px] h-[50px] items-center justify-center">
            <Text className="text-white text-sm font-bold mb-0.5">520</Text>
            <Text className="text-[#8E8E93] text-[8px] uppercase tracking-wider">Kcal</Text>
          </View>
        </View>

        <Text className="text-white text-base font-bold mb-4">Choose an alternative</Text>

        <View className="gap-y-4">
          {alternatives.map((alt) => {
            const isSelected = selectedMeal === alt.name;
            return (
              <Pressable
                key={alt.id}
                onPress={() => setSelectedMeal(alt.name)}
                className={`bg-[#141414] border rounded-[24px] p-5 flex-row ${isSelected ? 'border-[#C4EF00]' : 'border-[#222222]'}`}
              >
                <View className="flex-1 pr-4">
                  {alt.bestMatch && (
                    <View className="bg-[#1A2E00] self-start px-2 py-1 rounded mb-2 flex-row items-center">
                      <Star size={10} color="#C4EF00" weight="fill" style={{ marginRight: 4 }} />
                      <Text className="text-[#C4EF00] text-[9px] font-bold">BEST MATCH</Text>
                    </View>
                  )}
                  <Text className="text-white text-base font-bold mb-2 mt-1">{alt.name}</Text>
                  <Text className="text-[#8E8E93] text-[11px] leading-4 mb-4">
                    {alt.desc}
                  </Text>
                  
                  <View className="flex-row items-center">
                    <View className="mr-4">
                      <Text className="text-white text-[12px] font-bold mb-0.5">{alt.kcal}</Text>
                      <Text className="text-[#8E8E93] text-[8px] uppercase tracking-wider">Kcal</Text>
                    </View>
                    <View className="w-[1px] h-6 bg-[#333333] mr-4" />
                    <View className="flex-row items-center gap-x-3">
                      <Text className="text-white text-[10px] font-bold"><Text className="text-[#4ADE80]">P</Text> {alt.p}g</Text>
                      <Text className="text-white text-[10px] font-bold"><Text className="text-[#FBBF24]">C</Text> {alt.c}g</Text>
                      <Text className="text-white text-[10px] font-bold"><Text className="text-[#A78BFA]">F</Text> {alt.f}g</Text>
                    </View>
                  </View>
                </View>

                <View className="justify-center pl-2">
                  <View className={`border rounded-full px-3 py-1.5 ${isSelected ? 'bg-[#C4EF00] border-[#C4EF00]' : 'border-[#444444] bg-transparent'}`}>
                    <Text className={`text-[11px] font-bold ${isSelected ? 'text-black' : 'text-[#8E8E93]'}`}>Replace</Text>
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 120 }}>
        <Pressable 
          onPress={() => setIsSuccessModalVisible(true)}
          className="bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90"
        >
          <Text className="text-black font-bold text-lg">Confirm Replacement</Text>
        </Pressable>
      </View>

      <Modal
        visible={isSuccessModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSuccessModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#1C1C1C] rounded-t-[40px] px-6 pt-4 pb-10 items-center">
            <View className="w-12 h-1 bg-[#333333] rounded-full mb-10" />
            
            <View className="w-24 h-24 rounded-full border-4 border-[#C4EF00] items-center justify-center mb-6">
              <Check size={48} color="#C4EF00" weight="bold" />
            </View>

            <Text className="text-white text-[28px] font-bold mb-3 text-center">
              <Text className="text-[#C4EF00]">Lunch</Text> Replaced
            </Text>
            
            <Text className="text-[#8E8E93] text-[15px] text-center mb-10 leading-6">
              Your nutrition plan has been updated{'\n'}successfully.
            </Text>

            <Pressable 
              onPress={() => {
                setIsSuccessModalVisible(false);
                router.back();
              }}
              className="w-full bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90"
            >
              <Text className="text-black font-bold text-lg">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
