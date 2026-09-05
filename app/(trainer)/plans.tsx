import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, Image, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Plus, Barbell, BowlFood, MagnifyingGlass, CaretRight, Fire, Heartbeat, User } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useTrainerWorkoutPlansByCreator } from '@/hooks/trainerWorkoutPlans/useTrainerWorkoutPlans';

export default function PlansScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const [activeTab, setActiveTab] = useState('workout');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: fetchedPlans, isLoading } = useTrainerWorkoutPlansByCreator(userId);

  const filteredPlans = useMemo(() => {
    if (!fetchedPlans) return [];
    if (!searchQuery.trim()) return fetchedPlans;
    const lowerQuery = searchQuery.toLowerCase();
    return fetchedPlans.filter((plan: any) => {
      const name = plan.customer?.fullName?.toLowerCase() || '';
      const customId = plan.customer?.customId?.toLowerCase() || '';
      return name.includes(lowerQuery) || customId.includes(lowerQuery);
    });
  }, [fetchedPlans, searchQuery]);

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 15 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-start justify-between mb-8">
          <View className="flex-1 mr-4">
            <Text className="text-white text-[28px] font-semibold">Workout Plans</Text>
            <Text className="text-[#9CA3AF] text-sm mt-1">Manage workout plans for your PT customers.</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(trainer)/create-workout-plan' as any)}
            className="w-10 h-10 rounded-full border border-[#CCFF00] items-center justify-center active:opacity-70 mt-1"
          >
            <Plus size={20} color="#CCFF00" weight="bold" />
          </Pressable>
        </View>

        <View className="bg-[#16181D] rounded-2xl p-1 flex-row mb-6 border border-[#262932]">
          <Pressable
            onPress={() => setActiveTab('workout')}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${activeTab === 'workout' ? 'bg-[#262932]' : ''}`}
          >
            <Barbell size={18} color={activeTab === 'workout' ? '#CCFF00' : '#9CA3AF'} weight={activeTab === 'workout' ? 'fill' : 'regular'} />
            <Text className={`ml-2 text-sm font-semibold ${activeTab === 'workout' ? 'text-[#CCFF00]' : 'text-[#9CA3AF]'}`}>Workout Plans</Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('diet')}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${activeTab === 'diet' ? 'bg-[#262932]' : ''}`}
          >
            <BowlFood size={18} color={activeTab === 'diet' ? '#CCFF00' : '#9CA3AF'} weight={activeTab === 'diet' ? 'fill' : 'regular'} />
            <Text className={`ml-2 text-sm font-semibold ${activeTab === 'diet' ? 'text-[#CCFF00]' : 'text-[#9CA3AF]'}`}>Diet Plans</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center bg-[#16181D] rounded-xl px-4 py-1.5 mb-8 border border-[#262932]">
          <MagnifyingGlass size={20} color="#6B7280" />
          <TextInput
            placeholder="Search customer or plan..."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white ml-3 text-base font-sans"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-lg font-semibold">Assigned Workout Plans</Text>
          <Text className="text-[#CCFF00] text-sm font-semibold">{filteredPlans.length} Plans</Text>
        </View>

        {isLoading ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
          </View>
        ) : filteredPlans.length === 0 ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-[#9CA3AF] text-sm">No workout plans found.</Text>
          </View>
        ) : (
          filteredPlans.map((plan: any) => (
            <PlanCard key={plan.planId} plan={plan} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PlanCard({ plan }: { plan: any }) {
  const router = useRouter();
  
  const customerName = plan.customer?.fullName || 'Unknown Customer';
  const customId = plan.customer?.customId || 'No ID';
  const profilePhoto = plan.customer?.users?.profilePhoto;
  
  const workoutDaysCount = plan.days?.filter((d: any) => d.workoutType !== 'Rest').length || 0;
  
  // Format date nicely
  const updateDate = plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown';

  const handlePress = () => {
    // Optionally navigate to view/edit the plan
    // router.push({ pathname: '/(trainer)/workoutPlan/edit', params: { planId: plan.planId } });
  };

  return (
    <Pressable onPress={handlePress} className="bg-[#16181D] rounded-[24px] p-5 mb-4 border border-[#262932] active:opacity-80">
      <View className="flex-row items-center">
        <View className="w-[60px] self-start mt-1">
          <View className="w-14 h-14 bg-gray-700 rounded-full overflow-hidden items-center justify-center">
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} className="w-full h-full" />
            ) : (
              <User size={24} color="#9CA3AF" weight="fill" />
            )}
          </View>
        </View>

        <View className="flex-1 pr-2">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-white text-[17px] font-semibold mr-3">{customerName}</Text>
            <View className={`px-3 py-1 rounded-full border ${plan.isActive ? 'bg-[#282F1A] border-[#CCFF00]/40' : 'bg-red-500/10 border-red-500/40'}`}>
              <Text className={`text-[10px] font-semibold ${plan.isActive ? 'text-[#CCFF00]' : 'text-red-500'}`}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View className="bg-[#262932] self-start px-2 py-0.5 rounded-md mb-3 border border-[#374151]/30">
            <Text className="text-[#9CA3AF] text-[10px] font-medium">{customId}</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <Barbell size={16} color="#CCFF00" weight="fill" />
            <Text className="text-[#CCFF00] text-[13px] font-semibold ml-2">Custom Workout Plan</Text>
          </View>

          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-[#9CA3AF] text-[11px] font-medium">{workoutDaysCount} Days / Week</Text>
            </View>
            <View className="items-end">
              <Text className="text-[#6B7280] text-[10px] mb-0.5 font-medium">Updated</Text>
              <Text className="text-[#9CA3AF] text-[11px] font-medium">{updateDate}</Text>
            </View>
          </View>
        </View>

        <View className="justify-center">
          <CaretRight size={20} color="#6B7280" />
        </View>
      </View>
    </Pressable>
  );
}
