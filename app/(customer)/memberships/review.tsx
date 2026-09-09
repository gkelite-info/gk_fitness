import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useMembershipPlans } from '@/hooks/membership/useMembershipPlans';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import {
  CaretLeft,
  Crown,
  CaretRight,
  Barbell,
  UserCircle,
  LockKey,
  Users,
  Ruler,
  AppleLogo,
  CheckCircle,
  Star,
  Calendar,
  Wallet,
  Money
} from 'phosphor-react-native';

export default function MembershipReviewScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();

  const { userId } = useUser();
  const { data: plans, isLoading: isCustomerPlansLoading } = useGymCustomerMembershipPlans(undefined, userId!);
  const { data: customerProfileData } = useCustomerProfile(userId);

  const currentPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans[0];
  }, [plans]);

  const gymId = currentPlan?.gymId || customerProfileData?.customerData?.gymId;

  const { data: gymPlans, isLoading: isGymPlansLoading } = useMembershipPlans(gymId || null);

  const selectedPlanDetails = useMemo(() => {
    if (!gymPlans || !planId) return null;
    return gymPlans.find(p => p.id === planId);
  }, [gymPlans, planId]);

  if (isCustomerPlansLoading || isGymPlansLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0A0A0A] justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </SafeAreaView>
    );
  }

  const planName = selectedPlanDetails?.name || 'Gold Membership';
  const priceFormatted = selectedPlanDetails?.priceFormatted || '₹3,999';
  const duration = selectedPlanDetails?.duration || '1 Month';
  const billingCycle = selectedPlanDetails?.billingCycle || 'Monthly';

  const getFeatureIcon = (feature: string) => {
    const lower = feature.toLowerCase();
    if (lower.includes('access') || lower.includes('gym')) return <Barbell size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('pt') || lower.includes('trainer') || lower.includes('session')) return <UserCircle size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('locker')) return <LockKey size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('class') || lower.includes('group')) return <Users size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('body') || lower.includes('assessment') || lower.includes('progress')) return <Ruler size={20} color="#CCFF00" weight="fill" />;
    if (lower.includes('nutrition') || lower.includes('diet') || lower.includes('recipe')) return <AppleLogo size={20} color="#CCFF00" weight="fill" />;
    return <CheckCircle size={20} color="#CCFF00" weight="fill" />;
  };

  const defaultBenefits = [
    { icon: <Barbell size={20} color="#CCFF00" weight="fill" />, title: 'Unlimited\nGym Access' },
    { icon: <UserCircle size={20} color="#CCFF00" weight="fill" />, title: '12 PT Sessions\n/ Month' },
    { icon: <LockKey size={20} color="#CCFF00" weight="fill" />, title: 'Locker\nAccess' },
    { icon: <Users size={20} color="#CCFF00" weight="fill" />, title: 'Group\nClasses' },
    { icon: <Ruler size={20} color="#CCFF00" weight="fill" />, title: 'Monthly Body\nAssessment' },
    { icon: <AppleLogo size={20} color="#CCFF00" weight="fill" />, title: 'Nutrition\nConsultation' },
  ];

  const dynamicBenefits = selectedPlanDetails?.features?.map(f => ({
    icon: getFeatureIcon(f),
    title: f.replace(/(\w+\s\w+)\s/, '$1\n')
  })) || defaultBenefits;

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#1C1C1E]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#FFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Membership</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        <Text className="text-[#C6C9AB] text-base mb-4">Review your Membership renewal</Text>

        <View className="bg-[#1F1F1F] border border-[#CCFF00]/50 rounded-2xl p-5 mb-8 flex-row justify-between items-center relative overflow-hidden">
          <View className="absolute top-0 right-0 w-32 h-32 bg-[#CCFF00]/5 rounded-full blur-3xl -mr-10 -mt-10" />
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/30 items-center justify-center mr-4">
              <Crown size={32} color="#FFD700" weight="fill" />
            </View>
            <View>
              <Text className="text-[#CCFF00] text-base font-semibold mb-0.5">{planName}</Text>
              <Text className="text-[#C6C9AB] text-xs mb-2">Premium Plan</Text>
              {/* <View className="border border-[#D4AF37]/50 rounded-full px-2 py-1 self-start">
                <Text className="text-[#D4AF37] text-[9px] font-semibold tracking-widest uppercase">ACTIVE PLAN</Text>
              </View> */}
            </View>
          </View>

          <View className="items-end">
            <Text className="text-[#CCFF00] text-2xl font-semibold">{priceFormatted}</Text>
            <Text className="text-[#C6C9AB] text-xs mt-1">/ Month</Text>
          </View>
        </View>

        <Text className="text-[#C6C9AB] text-sm mb-4">Plan Includes</Text>
        <View className="flex-row flex-wrap justify-between mb-8">
          {dynamicBenefits.map((benefit, index) => (
            <View key={index} className="w-[48%] bg-[#1F1F1F] border border-[#2A2A2A] rounded-xl p-4 flex-row items-center mb-3">
              <View className="w-8 h-8 rounded-full bg-[#CCFF00]/10 items-center justify-center mr-3">
                {benefit.icon}
              </View>
              <Text className="text-[#C6C9AB] text-xs font-medium leading-tight flex-1">{benefit.title}</Text>
            </View>
          ))}
        </View>

        <Text className="text-[#C6C9AB] text-sm mb-4">Renewal Summary</Text>
        <View className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-2xl p-5 mb-8">

          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center">
              <Star size={18} color="#C6C9AB" weight="fill" style={{ marginRight: 12 }} />
              <Text className="text-[#C6C9AB] text-sm">Current Plan</Text>
            </View>
            <Text className="text-white text-sm font-medium">{planName}</Text>
          </View>

          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center">
              <Calendar size={18} color="#C6C9AB" weight="regular" style={{ marginRight: 12 }} />
              <Text className="text-[#C6C9AB] text-sm">Plan Duration</Text>
            </View>
            <Text className="text-white text-sm font-medium">{duration}</Text>
          </View>

          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center">
              <Wallet size={18} color="#C6C9AB" weight="regular" style={{ marginRight: 12 }} />
              <Text className="text-[#C6C9AB] text-sm">Billing Cycle</Text>
            </View>
            <Text className="text-white text-sm font-medium">{billingCycle}</Text>
          </View>

          <View className="h-[1px] bg-[#2A2A2A] mb-5 w-full" />

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Money size={18} color="#CCFF00" weight="fill" style={{ marginRight: 12 }} />
              <Text className="text-white text-sm">Amount Payable</Text>
            </View>
            <Text className="text-[#CCFF00] text-xl font-semibold">{priceFormatted}</Text>
          </View>

        </View>

        <View className="p-5 bg-[#0A0A0A]/95">
          <Pressable
            onPress={() => router.push({ pathname: '/(customer)/memberships/payment', params: { planId: planId } })}
            className="bg-[#CCFF00] rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
          >
            <Text className="text-black text-[15px] font-semibold mr-2 tracking-wide uppercase">Continue to Payment</Text>
            <CaretRight size={16} color="#000" weight="bold" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
