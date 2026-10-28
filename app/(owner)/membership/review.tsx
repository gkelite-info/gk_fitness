import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, Platform, Modal, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CaretDown,
  CheckCircle,
  PencilSimple,
  Trash,
  Check,
  X
} from 'phosphor-react-native';
import {
  MOCK_DRAFT_PLANS,
  DraftPlan,
  MembershipFeatureItem
} from '@/constants/membershipMockData';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useMembership } from '@/context/MembershipContext';

const DURATION_OPTIONS = ['1 Month', '3 Months', '6 Months', '1 Year'];

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
  isPublishing?: boolean;
  isDeleting?: boolean;
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
  isPublishing = false,
  isDeleting = false,
}: ReviewAndPublishPlansViewProps) {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<DraftPlan[]>(initialPlans);
  const [activePlanId, setActivePlanId] = useState<string>(initialPlans[0]?.id || 'plan-1');
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    setShowDurationModal(true);
  };

  const handlePublishClick = () => {
    triggerSuccessHaptic();
    const invalidPlan = plans.find(p => !p.price || parseInt(p.price, 10) <= 0);
    if (invalidPlan) {
      toast.error(`Please enter a valid price for ${invalidPlan.name}`);
      return;
    }
    if (onPublish) {
      onPublish(plans);
    }
  };

  const handleDeleteClick = () => {
    triggerLightHaptic();
    setShowDeleteModal(true);
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
        <Text className="text-base font-semibold text-white tracking-wide">{headerTitle}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 160 + (insets.bottom || 0) }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl text-white mb-2 leading-8 font-semibold">{pageHeading}</Text>
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
                  className={`text-xs font-semibold tracking-wide text-center ${isSelected ? 'text-black' : 'text-[#8E8E93]'}`}
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
            <Text className="text-sm font-semibold text-[#8E8E93] ml-2">
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
            <Text className="text-sm font-semibold text-white">{activePlan.duration}</Text>
            <CaretDown size={18} color="#71717A" weight="bold" />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-base font-semibold text-white">Included Features</Text>

          <Pressable
            onPress={() => onEditFeatures?.(activePlan.id, plans)}
            className="flex-row items-center px-2 py-1 active:opacity-70"
          >
            <Text className="text-xs font-sans text-[#D4FF00] mr-1.5">Edit</Text>
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
            disabled={isPublishing || isDeleting}
            className="bg-[#D4FF00] rounded-[24px] h-14 items-center justify-center mb-3.5 active:opacity-90 min-h-[56px] flex-row gap-2"
          >
            {isPublishing && <ActivityIndicator size="small" color="#000000" />}
            <Text className="text-black font-semibold text-base tracking-wide">
              {isPublishing ? 'Publishing...' : publishButtonText}
            </Text>
          </Pressable>
          <Text className="text-[11px] font-semibold text-[#71717A] text-center mb-4">
            {publishHelperText}
          </Text>

          {isEditingExisting && (
            <Pressable
              onPress={handleDeleteClick}
              disabled={isDeleting || isPublishing}
              className="bg-transparent border border-red-500 rounded-[24px] h-14 flex-row items-center justify-center mb-6 active:opacity-60 min-h-[56px]"
            >
              {isDeleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Trash size={18} color="#EF4444" weight="bold" />}
              <Text className="text-red-500 font-semibold text-base ml-2">
                {isDeleting ? 'Deleting...' : 'Delete Plan'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Duration Selection Modal */}
      <Modal
        visible={showDurationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDurationModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/70 justify-end"
          onPress={() => setShowDurationModal(false)}
        >
          <Pressable
            className="bg-[#121216] border-t border-[#27272A] rounded-t-3xl p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-white text-base font-semibold">Select Billing Cycle</Text>
                <Text className="text-[#8E8E93] text-xs mt-0.5">Choose billing frequency for this plan</Text>
              </View>
              <Pressable
                onPress={() => setShowDurationModal(false)}
                className="w-8 h-8 rounded-full bg-[#18181B] items-center justify-center border border-[#27272A] active:opacity-70"
              >
                <X size={16} color="#8E8E93" />
              </Pressable>
            </View>

            <View className="mt-2 mb-2">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = activePlan.duration === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      triggerLightHaptic();
                      updatePlanField('duration', opt);
                      setShowDurationModal(false);
                      toast.success(`Billing cycle set to ${opt}`);
                    }}
                    className={`flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2.5 ${
                      isSelected
                        ? 'bg-[#D4FF00]/10 border border-[#D4FF00]/40'
                        : 'bg-[#18181D] border border-[#27272A] active:bg-[#202026]'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected ? 'bg-[#D4FF00]' : 'bg-[#555555]'
                        }`}
                      />
                      <Text
                        className={`text-sm ${
                          isSelected ? 'text-[#D4FF00] font-bold' : 'text-white font-medium'
                        }`}
                      >
                        {opt}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color="#D4FF00" weight="bold" />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/75 justify-center items-center px-5"
          onPress={() => setShowDeleteModal(false)}
        >
          <Pressable
            className="w-full bg-[#141418] border border-[#27272A] rounded-3xl p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center mb-4 border border-red-500/20">
              <Trash size={22} color="#EF4444" weight="bold" />
            </View>

            <Text className="text-white text-lg font-bold mb-2">Delete Plan</Text>
            <Text className="text-[#8E8E93] text-sm leading-5 mb-6">
              Are you sure you want to delete <Text className="text-white font-semibold">{activePlan.name}</Text>? This action cannot be undone.
            </Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                className="flex-1 py-3.5 rounded-2xl bg-[#1F1F24] border border-[#2B2B32] items-center justify-center active:opacity-70"
              >
                <Text className="text-white font-semibold text-sm">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  triggerLightHaptic();
                  if (onDelete) onDelete(activePlan.id);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-red-600 items-center justify-center active:opacity-80"
              >
                <Text className="text-white font-bold text-sm">Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

import { useMembershipFeatures } from '@/hooks/membership/useMembershipFeatures';
import { useUpsertMembershipPlans, useDeleteMembershipPlan } from '@/hooks/membership/useMutateMembershipPlan';
import { useUser } from '@/context/UserContext';
import { useOwnerGymId } from '@/hooks/auth/useOwnerGymId';

export default function ReviewMembershipPlansScreen() {
  const router = useRouter();
  const { drafts, setDrafts, isEditingExisting } = useMembership();

  const { userId } = useUser();
  const { data: gymId } = useOwnerGymId(userId);
  const { data: availableFeatures = [] } = useMembershipFeatures();

  const upsertMutation = useUpsertMembershipPlans();
  const deleteMutation = useDeleteMembershipPlan();

  const handlePublish = (finalDrafts: DraftPlan[]) => {
    if (!gymId || !userId) {
      toast.error('Missing gym or user context.');
      return;
    }

    upsertMutation.mutate({ gymId, userId, plans: finalDrafts }, {
      onSuccess: () => {
        if (isEditingExisting) {
          toast.success('Membership plan updated successfully!');
        } else {
          toast.success('Membership plans published successfully!');
        }
        router.push('/(owner)/membership');
      },
      onError: (error) => {
        toast.error('Failed to save plans: ' + error.message);
      }
    });
  };

  const handleEditFeatures = (planId: string, currentDrafts: DraftPlan[]) => {
    setDrafts(currentDrafts);
    router.push('/(owner)/membership/create');
  };

  const handleDelete = (planId: string) => {
    deleteMutation.mutate(planId, {
      onSuccess: () => {
        toast.success('Membership plan deleted successfully!');
        router.push('/(owner)/membership');
      },
      onError: (error) => {
        toast.error('Failed to delete plan: ' + error.message);
      }
    });
  };

  return (
    <ReviewAndPublishPlansView
      plans={drafts}
      availableFeatures={availableFeatures}
      isEditingExisting={isEditingExisting}
      isPublishing={upsertMutation.isPending}
      isDeleting={deleteMutation.isPending}
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
