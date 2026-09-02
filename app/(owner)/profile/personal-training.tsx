import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { useUser } from '@/context/UserContext';
import { RequestsTab } from '@/components/PersonalTraining/RequestsTab';
import { AssignTrainerTab } from '@/components/PersonalTraining/AssignTrainerTab';

const TAB_REQUESTS = 'requests';
const TAB_ASSIGN = 'assign';

export default function PersonalTrainingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId } = useUser();
  const [activeTab, setActiveTab] = useState(TAB_REQUESTS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const onRefreshComplete = useCallback(() => {
    setRefreshing(false);
  }, []);

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#1F1F1F] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Personal Training</Text>
      </View>

      <View className="flex-row mx-4 mt-2 mb-4 bg-[#1F1F1F] rounded-full p-1 border border-[#222222]">
        <Pressable
          onPress={() => setActiveTab(TAB_REQUESTS)}
          className={`flex-1 py-3 rounded-full items-center ${activeTab === TAB_REQUESTS ? 'bg-[#CCFF00]' : 'bg-transparent'}`}
        >
          <Text className={`font-semibold text-sm ${activeTab === TAB_REQUESTS ? 'text-black' : 'text-[#A1A1AA]'}`}>Requests</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab(TAB_ASSIGN)}
          className={`flex-1 py-3 rounded-full items-center ${activeTab === TAB_ASSIGN ? 'bg-[#CCFF00]' : 'bg-transparent'}`}
        >
          <Text className={`font-semibold text-sm ${activeTab === TAB_ASSIGN ? 'text-black' : 'text-[#A1A1AA]'}`}>Assign Trainer</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === TAB_REQUESTS && (
          <RequestsTab gymId={gymId ?? undefined} refreshing={refreshing} onRefreshComplete={onRefreshComplete} />
        )}

        {activeTab === TAB_ASSIGN && (
          <AssignTrainerTab gymId={gymId ?? undefined} refreshing={refreshing} onRefreshComplete={onRefreshComplete} />
        )}
      </ScrollView>
    </View>
  );
}
