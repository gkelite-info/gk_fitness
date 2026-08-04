import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CaretDown,
  CheckCircle,
  PencilSimple,
  Trash
} from 'phosphor-react-native';
import { 
  MOCK_DRAFT_PLANS, 
  DraftPlan, 
  MembershipFeatureItem 
} from '@/constants/membershipMockData';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useMembership } from '@/context/MembershipContext';

const DURATION_OPTIONS = ['1 Month', '3 Months', '6 Months', '1 Year', 'Cancel'];

export interface ReviewAndPublishPlansViewProps {
  plans?: DraftPlan[];
  availableFeatures?: MembershipFeatureItem[];
  headerTitle?: string;
  pageHeading?: string;
  pageSubtitle?: string;
  publishButtonText?: string;
  publishHelperText?: string;
  isEditingExisting?: boolean;
  onPublish?: (updatedPlans: DraftPlan[]) => void;
  onEditFeatures?: (planId: string, currentDrafts: DraftPlan[]) => void;
  onDelete?: (planId: string) => void;
  onBack?: () => void;
}

export function ReviewAndPublishPlansView({
  plans: initialPlans = MOCK_DRAFT_PLANS,
  availableFeatures = [],
  headerTitle = 'Create Membership Plans',
  pageHeading = 'Review & Publish Your Plans',
  pageSubtitle = 'Review the details of all plans before publishing.\nYou can edit any plan if needed.',
  publishButtonText = 'Publish Plans',
  publishHelperText = 'Plans will be visible to your members after publishing.',
  isEditingExisting = false,
  onPublish,
  onEditFeatures,
  onDelete,
  onBack,
}: ReviewAndPublishPlansViewProps) {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<DraftPlan[]>(initialPlans);
  const [activePlanId, setActivePlanId] = useState<string>(initialPlans[0]?.id || 'plan-1');

  const activePlan = plans.find(p => p.id === activePlanId) || plans[0];

  const handleTabSelect = (planId: string) => {
    triggerLightHaptic();
    setActivePlanId(planId);
  };

  const updatePlanField = (field: keyof DraftPlan, value: any) => {
    setPlans(prev => prev.map(p => p.id === activePlan.id ? { ...p, [field]: value } : p));
  };

  const handleDurationClick = () => {
    triggerLightHaptic();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: DURATION_OPTIONS,
          cancelButtonIndex: 4,
          title: 'Select Billing Cycle / Duration',
        },
        (buttonIndex) => {
          if (buttonIndex !== 4) {
            updatePlanField('duration', DURATION_OPTIONS[buttonIndex]);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Duration',
        'Choose billing cycle duration for this plan',
        [
          { text: '1 Month', onPress: () => updatePlanField('duration', '1 Month') },
          { text: '3 Months', onPress: () => updatePlanField('duration', '3 Months') },
          { text: '6 Months', onPress: () => updatePlanField('duration', '6 Months') },
          { text: '1 Year', onPress: () => updatePlanField('duration', '1 Year') },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  };

  const handlePublishClick = () => {
    triggerSuccessHaptic();
    if (onPublish) {
      onPublish(plans);
    }
  };

  const handleDeleteClick = () => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this membership plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            triggerLightHaptic();
            if (onDelete) onDelete(activePlan.id);
          }
        },
      ]
    );
  };

  const getTabLabel = (plan: DraftPlan, index: number) => {
    if (index === 0) return plan.name;
    return plan.name.replace(/\s+Membership$/i, '');
  };

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-5 py-3 mb-2">
        <Pressable 
          onPress={onBack} 
          className="w-10 h-10 rounded-full bg-[#18181B] items-center justify-center mr-3 active:opacity-80 border border-[#27272A]"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-base font-extrabold text-white tracking-wide">{headerTitle}</Text>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 160 + (insets.bottom || 0) }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-black text-white mb-2 leading-8">{pageHeading}</Text>
        <Text className="text-xs font-medium text-[#8E8E93] leading-5 mb-6">{pageSubtitle}</Text>

        <View className="bg-[#121216] border border-[#1D1D22] rounded-[24px] p-2 flex-row items-center mb-8">
          {plans.map((plan, idx) => {
            const isSelected = plan.id === activePlanId;
            const label = getTabLabel(plan, idx);

            return (
              <Pressable
                key={plan.id}
                onPress={() => handleTabSelect(plan.id)}
                className={`flex-1 py-3 px-2 rounded-[18px] items-center justify-center ${isSelected ? 'bg-[#D4FF00]' : 'bg-transparent'}`}
              >
                <Text 
                  className={`text-xs font-extrabold tracking-wide text-center ${isSelected ? 'text-black font-black' : 'text-[#8E8E93]'}`}
                  numberOfLines={1}
                >
                  {label || `Plan ${idx + 1}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mb-8">
          <View className="flex-row items-baseline mb-2">
            <Text className="text-4xl font-black text-[#D4FF00]">₹</Text>
            <View className="bg-[#121216] border border-[#1F1F26] rounded-xl px-3 py-1 ml-1 min-w-[120px]">
              <TextInput
                value={activePlan.price}
                onChangeText={(val) => updatePlanField('price', val.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={{ color: '#D4FF00', fontSize: 32, fontWeight: '900', padding: 0 }}
                maxLength={6}
              />
            </View>
            <Text className="text-sm font-bold text-[#8E8E93] ml-2">
              {activePlan.duration === '1 Year' ? '/ Year' : '/ Month'}
            </Text>
          </View>
          <Text className="text-[11px] font-semibold text-[#66666A]">
            Tap amount to edit price
          </Text>
        </View>

        <View className="mb-9">
          <Text className="text-xs font-extrabold text-white mb-2 tracking-wide">
            BILLING CYCLE
          </Text>
          <Pressable 
            onPress={handleDurationClick}
            className="bg-[#121216] border border-[#1C1C22] rounded-2xl p-4 flex-row items-center justify-between active:bg-[#18181D]"
          >
            <Text className="text-sm font-bold text-white">{activePlan.duration}</Text>
            <CaretDown size={18} color="#71717A" weight="bold" />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-base font-extrabold text-white">Included Features</Text>
          
          <Pressable 
            onPress={() => onEditFeatures?.(activePlan.id, plans)} 
            className="flex-row items-center px-2 py-1 active:opacity-70"
          >
            <Text className="text-xs font-black text-[#D4FF00] mr-1.5">Edit</Text>
            <PencilSimple size={15} color="#D4FF00" weight="bold" />
          </Pressable>
        </View>

        <View className="mb-6">
          {availableFeatures
            .filter(f => activePlan.selectedFeatureIds.includes(f.id))
            .map((feature) => (
              <View key={feature.id} className="flex-row items-center mb-4">
                <CheckCircle size={20} color="#D4FF00" weight="regular" />
                <Text className="text-sm font-semibold text-[#E4E4E8] ml-3.5">
                  {feature.title}
                </Text>
              </View>
            ))}
        </View>

        <View className="mt-4">
          <Pressable
            onPress={handlePublishClick}
            className="bg-[#D4FF00] rounded-[24px] h-14 items-center justify-center mb-3.5 active:opacity-90 min-h-[56px]"
          >
            <Text className="text-black font-black text-base tracking-wide">
              {publishButtonText}
            </Text>
          </Pressable>
          <Text className="text-[11px] font-semibold text-[#71717A] text-center mb-4">
            {publishHelperText}
          </Text>
          
          {isEditingExisting && (
            <Pressable
              onPress={handleDeleteClick}
              className="bg-transparent border border-red-500 rounded-[24px] h-14 flex-row items-center justify-center mb-6 active:opacity-60 min-h-[56px]"
            >
              <Trash size={18} color="#EF4444" weight="bold" />
              <Text className="text-red-500 font-bold text-base ml-2">
                Delete Plan
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default function ReviewMembershipPlansScreen() {
  const router = useRouter();
  const { drafts, setDrafts, publishPlans, deletePlan, isEditingExisting, availableFeatures } = useMembership();

  const handlePublish = async (finalDrafts: DraftPlan[]) => {
    await publishPlans(finalDrafts);
    if (isEditingExisting) {
      toast.success('Membership plan updated successfully!');
    } else {
      toast.success('Membership plans published successfully!');
    }
    router.push('/(owner)/membership');
  };

  const handleEditFeatures = (planId: string, currentDrafts: DraftPlan[]) => {
    setDrafts(currentDrafts);
    router.push('/(owner)/membership/create');
  };

  const handleDelete = async (planId: string) => {
    await deletePlan(planId);
    toast.success('Membership plan deleted successfully!');
    router.push('/(owner)/membership');
  };

  return (
    <ReviewAndPublishPlansView
      plans={drafts}
      availableFeatures={availableFeatures}
      isEditingExisting={isEditingExisting}
      headerTitle={isEditingExisting ? 'Edit Membership Plan' : 'Create Membership Plans'}
      pageHeading={isEditingExisting ? 'Review Plan Details' : 'Review & Publish Your Plans'}
      publishButtonText={isEditingExisting ? 'Save Changes' : 'Publish Plans'}
      onPublish={handlePublish}
      onEditFeatures={handleEditFeatures}
      onDelete={handleDelete}
      onBack={() => router.back()}
    />
  );
}
