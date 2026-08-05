import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Crown,
  CheckCircle,
  CalendarBlank,
  Users,
  PencilSimple,
  ClipboardText,
  CaretLeft,
  Plus
} from 'phosphor-react-native';
import { MOCK_OWNER_PLANS, MembershipPlan } from '@/constants/membershipMockData';
import { triggerLightHaptic, triggerMediumHaptic } from '@/lib/haptics';
import { useMembership } from '@/context/MembershipContext';

export interface MembershipPlansListViewProps {
  plans?: MembershipPlan[];
  headerTitle?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  emptyCardTitle?: string;
  emptyCardSubtitle?: string;
  createButtonText?: string;
  onEdit?: (plan: MembershipPlan) => void;
  onCreate?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  refreshControl?: any;
}

export function MembershipPlansListView({
  plans = MOCK_OWNER_PLANS,
  headerTitle = 'Membership Plans',
  sectionTitle = 'Your Membership Plans',
  sectionSubtitle = 'Create and manage membership plans for your gym.',
  emptyCardTitle = 'No More Plans Yet',
  emptyCardSubtitle = 'Add more membership plans to give your members better options.',
  createButtonText = 'Create Membership Plans',
  onEdit,
  onCreate,
  onBack,
  isLoading = false,
  refreshControl,
}: MembershipPlansListViewProps) {
  const insets = useSafeAreaInsets();
  const hasPlans = plans && plans.length > 0;

  const handleCreatePress = () => {
    triggerMediumHaptic();
    if (onCreate) onCreate();
  };

  const handleEditPress = (plan: MembershipPlan) => {
    triggerLightHaptic();
    if (onEdit) onEdit(plan);
  };

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-center py-4 bg-black border-b border-[#1A1A1E] px-4 relative">
        {onBack && (
          <Pressable 
            onPress={onBack} 
            className="absolute left-4 w-9 h-9 rounded-full bg-[#18181C] items-center justify-center active:opacity-70"
          >
            <CaretLeft size={20} color="#FFFFFF" weight="bold" />
          </Pressable>
        )}
        <Text className="text-xl font-bold text-white tracking-wide">{headerTitle}</Text>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Text className="text-base font-bold text-white mb-1">{sectionTitle}</Text>
        <Text className="text-xs text-[#8E8E93] mb-6">{sectionSubtitle}</Text>

        {isLoading ? (
          <View className="flex-1 items-center justify-center mt-20">
            <ActivityIndicator size="large" color="#D4FF00" />
            <Text className="text-[#8E8E93] mt-4">Loading plans...</Text>
          </View>
        ) : hasPlans ? (
          <View>
            {plans.map((plan) => (
              <View 
                key={plan.id} 
                className="bg-[#121215] border border-[#202024] rounded-[28px] p-5 mb-5"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-[#1A1C16] border border-[#282C18] items-center justify-center mr-4">
                    <Crown size={24} color="#D4FF00" weight="fill" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-white mb-0.5">{plan.name}</Text>
                    <View className="flex-row items-baseline">
                      <Text className="text-2xl font-black text-[#D4FF00]">{plan.priceFormatted}</Text>
                      <Text className="text-sm font-medium text-[#8E8E93] ml-1.5">{plan.billingCycle}</Text>
                    </View>
                  </View>
                </View>

                <Text className="text-[11px] font-extrabold text-[#71717A] tracking-widest uppercase mt-6 mb-3">
                  INCLUDES
                </Text>
                
                <View className={`flex-row flex-wrap ${plan.twoColumnLayout ? 'justify-between' : ''}`}>
                  {plan.features.map((feature, idx) => (
                    <View 
                      key={idx} 
                      className={`flex-row items-center mb-2.5 ${plan.twoColumnLayout ? 'w-[48%]' : 'w-full'}`}
                    >
                      <CheckCircle size={18} color="#D4FF00" weight="regular" />
                      <Text className="text-xs font-medium text-white ml-2 flex-1" numberOfLines={1}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                  {plan.additionalFeaturesCount !== undefined && plan.additionalFeaturesCount > 0 && (
                    <View className="bg-[#27272A] rounded-full px-2.5 py-0.5 ml-1 my-0.5 self-start">
                      <Text className="text-[10px] text-[#D4FF00] font-semibold">
                        +{plan.additionalFeaturesCount} More
                      </Text>
                    </View>
                  )}
                </View>

                <View className="h-[1px] bg-[#1C1C20] my-4" />

                <View className="flex-row justify-between items-center mb-1">
                  <View className="flex-1 flex-row items-center">
                    <CalendarBlank size={18} color="#8E8E93" weight="regular" />
                    <View className="ml-2.5">
                      <Text className="text-[10px] font-medium text-[#71717A]">Duration</Text>
                      <Text className="text-xs font-bold text-white mt-0.5">{plan.duration}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-1 flex-row items-center">
                    <Users size={18} color="#8E8E93" weight="regular" />
                    <View className="ml-2.5">
                      <Text className="text-[10px] font-medium text-[#71717A]">Members</Text>
                      <Text className="text-xs font-bold text-white mt-0.5">{plan.membersText}</Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleEditPress(plan)}
                  className="mt-5 border border-[#D4FF00] bg-[#151518] rounded-2xl h-12 flex-row items-center justify-center active:opacity-80"
                >
                  <PencilSimple size={18} color="#D4FF00" weight="bold" />
                  <Text className="text-[#D4FF00] font-extrabold text-sm ml-2.5">Edit</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View className="bg-[#121215] border border-[#202024] rounded-[28px] p-7 items-center my-4">
            <View className="w-20 h-20 rounded-full bg-[#1A1B16] border border-[#252818] items-center justify-center mb-5">
              <ClipboardText size={36} color="#D4FF00" weight="regular" />
            </View>
            <Text className="text-white text-xl font-bold mb-2 text-center">{emptyCardTitle}</Text>
            <Text className="text-[#8E8E93] text-sm text-center px-4 mb-8 leading-5">
              {emptyCardSubtitle}
            </Text>
            
            <Pressable
              onPress={handleCreatePress}
              className="bg-[#D4FF00] rounded-2xl px-6 py-4 items-center justify-center w-full max-w-[280px] active:opacity-90"
              style={{ minHeight: 52 }}
            >
              <Text className="text-black font-black text-base tracking-wide text-center">
                {createButtonText}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {hasPlans && (
        <View 
          className="absolute items-center justify-center"
          style={{ 
            bottom: 90 + (insets.bottom || 0), 
            right: 24, 
            width: 64, 
            height: 64, 
            zIndex: 999 
          }}
        >
          <View 
            className="absolute rounded-full bg-[#D4FF00]" 
            style={{ 
              width: 30,
              height: 30,
              opacity: 0.45,
              transform: [{ scale: 1.35 }],
              shadowColor: '#D4FF00',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 20,
              elevation: 25,
            }} 
          />
          <Pressable
            onPress={handleCreatePress}
            className="rounded-full bg-[#D4FF00] items-center justify-center active:opacity-90"
            style={{ 
              width:  60, 
              height: 60,
              shadowColor: '#D4FF00',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.6,
              shadowRadius: 10,
              elevation: 15,
            }}
          >
            <Plus size={30} color="#000000" weight="bold" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

import { useUser } from '@/context/UserContext';
import { useOwnerGymId } from '@/hooks/auth/useOwnerGymId';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useMembershipFeatures } from '@/hooks/membership/useMembershipFeatures';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function MembershipPlansScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const { data: gymId } = useOwnerGymId(userId);
  const { data: features = [] } = useMembershipFeatures();
  const { data: plans = [], isLoading, refetch } = useMembershipPlans(gymId ?? null);
  const { startCreateFlow, startEditFlow } = useMembership();
  
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleEdit = (plan: MembershipPlan) => {
    startEditFlow(plan, features);
    router.push('/(owner)/membership/review');
  };

  const handleCreate = () => {
    startCreateFlow(features);
    router.push('/(owner)/membership/create');
  };

  return (
    <MembershipPlansListView
      plans={plans}
      isLoading={isLoading}
      onEdit={handleEdit}
      onCreate={handleCreate}
      onBack={() => router.back()}
      refreshControl={
        <CustomRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    />
  );
}
