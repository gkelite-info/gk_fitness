import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Check,
  Plus,
  Info,
  ArrowRight
} from 'phosphor-react-native';
import { 
  MOCK_DRAFT_PLANS, 
  MOCK_SELECTABLE_FEATURES, 
  DraftPlan, 
  MembershipFeatureItem 
} from '@/constants/membershipMockData';
import { triggerLightHaptic, triggerMediumHaptic } from '@/lib/haptics';
import { useMembership } from '@/context/MembershipContext';

export interface CreateMembershipPlansViewProps {
  initialPlans?: DraftPlan[];
  availableFeatures?: MembershipFeatureItem[];
  headerTitle?: string;
  pageHeading?: string;
  pageSubtitle?: string;
  infoTitle?: string;
  infoSubtitle?: string;
  continueButtonText?: string;
  onContinue?: (drafts: DraftPlan[]) => void;
  onBack?: () => void;
}

export function CreateMembershipPlansView({
  initialPlans = [MOCK_DRAFT_PLANS[0]], // Defaults to Plan 1 as in Screenshot 3
  availableFeatures = MOCK_SELECTABLE_FEATURES,
  headerTitle = 'Create Membership Plans',
  pageHeading = 'Name your membership plans',
  pageSubtitle = 'Give a name to each plan.\nYou can change the names later anytime.',
  infoTitle = 'You can edit plan names later',
  infoSubtitle = "Don't worry, you can always update plan names from the Memberships section.",
  continueButtonText = 'Continue',
  onContinue,
  onBack,
}: CreateMembershipPlansViewProps) {
  const insets = useSafeAreaInsets();
  const [drafts, setDrafts] = useState<DraftPlan[]>(initialPlans);
  const [activePlanId, setActivePlanId] = useState<string>(initialPlans[0]?.id || 'plan-1');

  const handleAddPlan = () => {
    triggerMediumHaptic();
    const nextIdx = drafts.length;
    const template = MOCK_DRAFT_PLANS[nextIdx] || {
      id: `plan-${nextIdx + 1}`,
      planNumberLabel: `PLAN ${nextIdx + 1}`,
      name: `Custom Plan ${nextIdx + 1}`,
      price: '1499',
      duration: '1 Month',
      selectedFeatureIds: availableFeatures.map(f => f.id),
      isExpanded: true,
    };

    const updated = drafts.map(p => ({ ...p, isExpanded: false })).concat({ ...template, isExpanded: true });
    setDrafts(updated);
    setActivePlanId(template.id);
  };

  const toggleFeature = (planId: string, featureId: string) => {
    triggerLightHaptic();
    setDrafts(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const exists = p.selectedFeatureIds.includes(featureId);
      const updatedIds = exists 
        ? p.selectedFeatureIds.filter(id => id !== featureId)
        : [...p.selectedFeatureIds, featureId];
      return { ...p, selectedFeatureIds: updatedIds };
    }));
  };

  const updatePlanName = (planId: string, newName: string) => {
    if (newName.length > 30) return;
    setDrafts(prev => prev.map(p => p.id === planId ? { ...p, name: newName } : p));
  };

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top }}>
      {/* Header Bar */}
      <View className="flex-row items-center px-5 py-3 mb-2">
        <Pressable 
          onPress={onBack} 
          className="w-9 h-9 rounded-full bg-[#18181D] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-base font-semibold text-white">{headerTitle}</Text>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 160 + (insets.bottom || 0) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Heading & Subtitle */}
        <Text className="text-2xl font-black text-white mb-2 leading-8">{pageHeading}</Text>
        <Text className="text-xs font-medium text-[#8E8E93] leading-5 mb-7">{pageSubtitle}</Text>

        {/* Dynamic Plan List */}
        {drafts.map((plan) => {
          const isFocused = plan.id === activePlanId;
          const charCount = plan.name.length;

          return (
            <View key={plan.id} className="mb-4">
              {/* Plan Input Card */}
              <Pressable 
                onPress={() => setActivePlanId(plan.id)}
                className={`bg-[#141418] rounded-[24px] p-5 mb-5 border ${isFocused ? 'border-[#D4FF00]' : 'border-[#222226]'}`}
              >
                <Text className="text-xs font-black text-[#D4FF00] tracking-wider mb-4 uppercase">
                  {plan.planNumberLabel}
                </Text>
                
                <Text className="text-[11px] font-bold text-[#8E8E93] mb-2">Plan Name</Text>
                
                <View className="bg-black border border-[#27272D] rounded-2xl px-4 py-3.5 mb-2">
                  <TextInput
                    value={plan.name}
                    onChangeText={(val) => updatePlanName(plan.id, val)}
                    onFocus={() => setActivePlanId(plan.id)}
                    placeholder="e.g. Basic Membership"
                    placeholderTextColor="#66666A"
                    style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', padding: 0 }}
                    maxLength={30}
                  />
                </View>

                <Text className="text-right text-[11px] font-semibold text-[#71717A]">
                  {charCount}/30
                </Text>
              </Pressable>

              {/* Clean INCLUDED FEATURES Section Label (No extra circles) */}
              <Text className="text-xs font-extrabold text-[#94949C] tracking-widest uppercase px-1 mb-3.5">
                INCLUDED FEATURES
              </Text>

              {/* Selectable Feature Checkbox Cards */}
              <View className="mt-1">
                {availableFeatures.map((feature) => {
                  const isChecked = plan.selectedFeatureIds.includes(feature.id);

                  return (
                    <Pressable
                      key={feature.id}
                      onPress={() => toggleFeature(plan.id, feature.id)}
                      className="bg-[#121216] border border-[#1C1C22] rounded-[20px] p-4.5 mb-3 flex-row items-center justify-between active:bg-[#1A1A20]"
                    >
                      <View className="flex-1 mr-4">
                        <Text className="text-sm font-bold text-white mb-1">{feature.title}</Text>
                        <Text className="text-xs text-[#71717A] leading-4">{feature.subtitle}</Text>
                      </View>

                      <View className={`w-6 h-6 rounded-lg items-center justify-center border-2 ${isChecked ? 'bg-white border-white' : 'border-[#3E3E48]'}`}>
                        {isChecked && <Check size={14} color="#000000" weight="bold" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Smaller Circular Plus (+) Button below features */}
        <View className="items-end my-2 mr-1">
          <Pressable
            onPress={handleAddPlan}
            className="w-9 h-9 rounded-full bg-[#18181D] border border-[#2B2B33] items-center justify-center active:opacity-80"
            style={{ width: 36, height: 36 }}
          >
            <Plus size={16} color="#D4FF00" weight="bold" />
          </Pressable>
        </View>

        {/* Info Callout Card */}
        <View className="bg-[#141418] border border-[#202025] rounded-[24px] p-4 flex-row items-start mt-4 mb-6">
          <View className="mr-3.5 mt-0.5">
            <Info size={22} color="#D4FF00" weight="fill" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-white mb-1">{infoTitle}</Text>
            <Text className="text-xs text-[#8E8E93] leading-4">{infoSubtitle}</Text>
          </View>
        </View>

        {/* Continue Button */}
        <Pressable
          onPress={() => onContinue?.(drafts)}
          className="bg-[#D4FF00] rounded-2xl h-14 flex-row items-center justify-center active:opacity-90 shadow-lg min-h-[56px] mb-4"
        >
          <Text className="text-black font-extrabold text-base tracking-wide mr-2">
            {continueButtonText}
          </Text>
          <ArrowRight size={20} color="#000000" weight="bold" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default function CreateMembershipPlansScreen() {
  const router = useRouter();
  const { drafts, setDrafts } = useMembership();

  const handleContinue = (updatedDrafts: DraftPlan[]) => {
    setDrafts(updatedDrafts);
    router.push('/(owner)/membership/review');
  };

  return (
    <CreateMembershipPlansView 
      initialPlans={drafts.length > 0 ? drafts : [MOCK_DRAFT_PLANS[0]]}
      onContinue={handleContinue}
      onBack={() => router.back()} 
    />
  );
}
