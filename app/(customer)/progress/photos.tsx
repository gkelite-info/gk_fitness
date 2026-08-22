import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretDown, CaretRight, Plus, CaretLeft } from 'phosphor-react-native';

const TIMELINE_PHOTOS = [
  { id: 1, day: 'Day 90', date: 'May 14, 2025', isCurrent: true, image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop' },
  { id: 2, day: 'Day 60', date: 'Apr 14, 2025', isCurrent: false, image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop' },
  { id: 3, day: 'Day 30', date: 'Mar 15, 2025', isCurrent: false, image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop' },
  { id: 4, day: 'Day 1', date: 'Feb 13, 2025', isCurrent: false, image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop' },
];

export default function ProgressPhotosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const currentPhoto = TIMELINE_PHOTOS[0];

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
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
            <Text className="text-white text-[28px] font-bold tracking-tight">Progress Photos</Text>
          </View>

          {/* Current Physique Section */}
          <Text className="text-[#D4FF00] text-[11px] font-bold tracking-[1.5px] uppercase mb-1">Current Physique</Text>
          <Text className="text-[#8E8E93] text-[13px] mb-4">{currentPhoto.date}</Text>

          <View className="w-full h-64 bg-[#1C1C1E] rounded-3xl overflow-hidden mb-8 border border-[#2A2A2D]/50">
            <Image 
              source={{ uri: currentPhoto.image }} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>

          {/* Timeline Header */}
          <View className="flex-row justify-between items-end mb-6">
            <Text className="text-[#D4FF00] text-[11px] font-bold tracking-[1.5px] uppercase">Timeline</Text>
            <View className="flex-row items-center">
              <Text className="text-[#D4FF00] text-[13px] font-medium mr-1">Newest First</Text>
              <CaretDown size={14} color="#D4FF00" weight="bold" />
            </View>
          </View>

          {/* Timeline List */}
          <View className="mb-6 pl-2">
            {TIMELINE_PHOTOS.map((photo, index) => {
              const isLast = index === TIMELINE_PHOTOS.length - 1;
              return (
                <View key={photo.id} className="flex-row items-stretch">
                  {/* Timeline Graphic */}
                  <View className="items-center mr-4">
                    <View className={`w-5 h-5 rounded-full border-[2.5px] items-center justify-center ${photo.isCurrent ? 'border-[#D4FF00]' : 'border-[#2A2A2D]'}`}>
                      {photo.isCurrent && <View className="w-1.5 h-1.5 rounded-full bg-[#D4FF00]" />}
                    </View>
                    {!isLast && (
                      <View className="w-[1px] flex-1 bg-[#2A2A2D] my-1" />
                    )}
                  </View>
                  
                  {/* Record Row */}
                  <Pressable className="flex-1 flex-row justify-between items-center mb-6 active:opacity-80">
                    <View>
                      <Text className="text-white text-[17px] font-bold mb-1">{photo.day}</Text>
                      <Text className="text-[#8E8E93] text-[13px] mb-2">{photo.date}</Text>
                      {photo.isCurrent && (
                        <View className="bg-[#2E3113] px-2 py-0.5 rounded self-start border border-[#D4FF00]/20">
                          <Text className="text-[#D4FF00] text-[9px] font-bold tracking-widest uppercase">Current</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center gap-3">
                      <View className="w-[100px] h-[60px] rounded-xl overflow-hidden bg-[#1C1C1E] border border-[#2A2A2D]/50">
                        <Image 
                          source={{ uri: photo.image }} 
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </View>
                      <CaretRight size={16} color="#6B6B6B" weight="bold" />
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Add New Photo Card */}
          <Pressable 
            className="w-full bg-transparent rounded-3xl border border-dashed border-[#2A2A2D] p-8 items-center justify-center active:opacity-70 mt-2"
            onPress={() => router.push('/(customer)/progress/preview-photo')}
          >
            <View className="w-16 h-16 rounded-full border-2 border-[#D4FF00] items-center justify-center mb-4">
              <Plus size={28} color="#D4FF00" weight="regular" />
            </View>
            <Text className="text-[#D4FF00] text-[17px] font-bold mb-1">Add New Photo</Text>
            <Text className="text-[#8E8E93] text-[13px]">Track your progress over time.</Text>
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}
