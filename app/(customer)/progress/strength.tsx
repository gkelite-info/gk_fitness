import React, { useState, useMemo } from 'react';
import { View, ActivityIndicator, Pressable, TextInput, FlatList, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretLeft, Barbell, Trophy, TrendUp, MagnifyingGlass } from 'phosphor-react-native';
import { useStrengthData, StrengthRecord } from '@/hooks/fitness/useStrengthData';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Other'];

export default function StrengthAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: strengthData, isLoading } = useStrengthData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');

  const filteredData = useMemo(() => {
    if (!strengthData) return [];
    
    return strengthData.filter(record => {
      const matchesSearch = record.exerciseName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let cat = record.category || 'Other';
      cat = cat.charAt(0).toUpperCase() + cat.slice(1);
      
      const matchesGroup = selectedGroup === 'All' || cat === selectedGroup;
      
      return matchesSearch && matchesGroup;
    });
  }, [strengthData, searchQuery, selectedGroup]);

  const renderHeader = () => (
    <>
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-6">
          <Pressable 
            className="w-10 h-10 rounded-xl bg-[#1C1C1E] border border-[#2A2A2D]/50 items-center justify-center active:opacity-70"
            onPress={() => router.back()}
          >
            <CaretLeft size={20} color="#E5E5EA" weight="bold" />
          </Pressable>
          <Text className="text-white text-[17px] font-bold">Strength Analytics</Text>
          <View className="w-10" />
        </View>

        <Text className="text-white text-[28px] font-bold mb-2 tracking-tight">Your Gains</Text>
        <Text className="text-[#8E8E93] text-[15px] mb-6">
          Analyze your lifting performance by exercise.
        </Text>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-[#1C1C1E] border border-[#2A2A2D]/50 rounded-2xl px-4 py-3 mb-4">
          <View className="mr-2">
            <MagnifyingGlass size={20} color="#8E8E93" weight="bold" />
          </View>
          <TextInput
            className="flex-1 text-white text-base font-medium"
            placeholder="Search exercises..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor="#D4FF00"
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View className="mb-2">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          className="pb-2"
        >
          {MUSCLE_GROUPS.map((group) => {
            const isSelected = selectedGroup === group;
            return (
              <Pressable
                key={group}
                onPress={() => setSelectedGroup(group)}
                className={`px-4 py-2 rounded-full mr-3 border ${
                  isSelected 
                    ? 'bg-[#D4FF00] border-[#D4FF00]' 
                    : 'bg-[#1C1C1E] border-[#2A2A2D]/50'
                }`}
              >
                <Text 
                  className={`text-[13px] font-bold ${
                    isSelected ? 'text-black' : 'text-[#8E8E93]'
                  }`}
                >
                  {group}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {filteredData.length > 0 && (
        <View className="px-5 pt-4">
          <Text className="text-[#D4FF00] text-xs font-bold tracking-[2px] uppercase mb-4">
            {selectedGroup === 'All' ? 'All Exercises' : `${selectedGroup} Exercises`}
          </Text>
        </View>
      )}
    </>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="py-20 items-center justify-center">
          <ActivityIndicator color="#D4FF00" size="large" />
        </View>
      );
    }
    
    if (!strengthData || strengthData.length === 0) {
      return (
        <View className="px-5">
          <View className="py-20 mt-4 items-center justify-center bg-[#1C1C1E] rounded-3xl border border-[#2A2A2D]/50">
            <View className="mb-4">
              <Barbell size={48} color="#8E8E93" weight="thin" />
            </View>
            <Text className="text-white text-lg font-bold mb-2">No Data Yet</Text>
            <Text className="text-[#8E8E93] text-center px-8">
              Complete workouts and log your sets to see your strength analytics here.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View className="py-20 mt-4 items-center justify-center">
        <Text className="text-[#8E8E93] text-base font-medium">No exercises match your filter.</Text>
      </View>
    );
  };

  const renderItem = ({ item: record, index }: { item: StrengthRecord; index: number }) => (
    <View className="px-5">
      <Pressable 
        className="bg-[#1C1C1E] rounded-3xl p-5 mb-4 border border-[#2A2A2D]/50 active:opacity-70"
        onPress={() => router.push(`/(customer)/progress/strength/${encodeURIComponent(record.exerciseName)}` as any)}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1 pr-4">
            <View className="w-10 h-10 rounded-full bg-[#2A2A2D] items-center justify-center mr-3">
              <Barbell size={20} color="#D4FF00" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-bold" numberOfLines={1}>{record.exerciseName}</Text>
              <Text className="text-[#8E8E93] text-xs font-medium capitalize mt-0.5">{record.category}</Text>
            </View>
          </View>
          {index === 0 && record.maxWeight > 0 && selectedGroup === 'All' && !searchQuery && (
            <View className="bg-[#D4FF00]/20 px-2 py-1 rounded">
              <Text className="text-[#D4FF00] text-[10px] font-bold uppercase">Best Lift</Text>
            </View>
          )}
        </View>

        <View className="flex-row">
          <View className="flex-1 bg-[#09090B] rounded-2xl p-4 mr-2">
            <View className="flex-row items-center mb-1 gap-2">
              <Trophy size={14} color="#D4FF00" weight="fill" />
              <Text className="text-[#8E8E93] text-xs font-medium">Max Weight</Text>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-white text-2xl font-bold">{record.maxWeight}</Text>
              <Text className="text-[#8E8E93] text-[10px] ml-1 uppercase">kg</Text>
            </View>
          </View>
          
          <View className="flex-1 bg-[#09090B] rounded-2xl p-4 ml-2">
            <View className="flex-row items-center mb-1 gap-2">
              <TrendUp size={14} color="#D4FF00" weight="bold" />
              <Text className="text-[#8E8E93] text-xs font-medium">Total Volume</Text>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-white text-2xl font-bold">{(record.totalVolume / 1000).toFixed(1)}</Text>
              <Text className="text-[#8E8E93] text-[10px] ml-1 uppercase">tons</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B]">
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.exerciseName}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty()}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
