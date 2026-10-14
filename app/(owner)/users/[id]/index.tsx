import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Linking, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CaretRight,
  User,
  CreditCard,
  CalendarBlank,
  Users,
  Phone,
  EnvelopeSimple,
  Medal,
  Clock,
  Sparkle,
  Barbell,
  CheckCircle,
} from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymCustomerMembershipPlans } from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { triggerLightHaptic } from '@/lib/haptics';

export default function UserProfileHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(id);
  const { data: trainers, isLoading: isTrainersLoading } = useAssignedTrainersByCustomer(id);
  const { data: plans, isLoading: isPlansLoading } = useGymCustomerMembershipPlans(customer?.gymId, id);

  const activeTrainerAssignment = useMemo(() => {
    if (!trainers || trainers.length === 0) return null;
    return trainers.find((t: any) => t.isActive && !t.is_deleted) || null;
  }, [trainers]);

  const activePlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans.find((p: any) => p.is_Active && !p.is_deleted) || plans[0];
  }, [plans]);

  const memberCode = useMemo(() => {
    if (!id) return 'CUST-XXXX';
    return `CUST-${id.substring(0, 6).toUpperCase()}`;
  }, [id]);

  const planStats = useMemo(() => {
    if (!activePlan) {
      return {
        name: 'No Plan Assigned',
        duration: '0 Months',
        startDate: '-',
        expiryDate: '-',
        remainingDays: 0,
        isActive: false,
      };
    }

    const start = new Date(activePlan.startDate || activePlan.createdAt);
    const end = activePlan.endDate ? new Date(activePlan.endDate) : null;
    const now = new Date();

    const formattedStart = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedEnd = end
      ? end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

    const remaining = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24))) : 0;
    const rawDuration = (activePlan as any)?.plan?.durationMonths || (activePlan as any)?.durationMonths || 1;

    return {
      name: (activePlan as any)?.plan?.planName || (activePlan as any)?.planName || 'Fitness Plan',
      duration: `${rawDuration} Month(s)`,
      startDate: formattedStart,
      expiryDate: formattedEnd,
      remainingDays: remaining,
      isActive: Boolean(activePlan.is_Active),
    };
  }, [activePlan]);

  const isLoading = isCustomerLoading || isTrainersLoading || isPlansLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading member profile...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center px-6">
        <Text className="text-white text-lg font-bold mb-2">Member Not Found</Text>
        <Text className="text-gray-400 text-sm text-center mb-6">
          Could not find customer details with ID: {id}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-[#1A1A1A] border border-[#27272A] px-6 py-3 rounded-xl active:opacity-70"
        >
          <Text className="text-[#CCF200] font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isActive = Boolean(customer.is_Active);
  const initials = customer.fullName
    ? customer.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  const navigateTo = (subroute: string) => {
    triggerLightHaptic();
    router.push(`/(owner)/users/${id}/${subroute}` as any);
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1F1F22]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Member Profile</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Banner Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
          <View className="flex-row items-center mb-4">
            <View className="relative mr-4">
              {customer?.user?.profilePhoto ? (
                <Image
                  source={{ uri: customer.user.profilePhoto }}
                  className="w-16 h-16 rounded-2xl border border-[#333]"
                />
              ) : (
                <View className="w-16 h-16 rounded-2xl bg-[#1C1F26] border border-[#333] items-center justify-center">
                  <Text className="text-[#CCF200] text-xl font-bold">{initials}</Text>
                </View>
              )}
              <View
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#141416] ${
                  isActive ? 'bg-[#CCF200]' : 'bg-[#EF4444]'
                }`}
              />
            </View>

            <View className="flex-1 justify-center">
              <View className="flex-row items-center">
                <Text className="text-white text-xl font-bold mr-2" numberOfLines={1}>
                  {customer.fullName}
                </Text>
                {isActive && <CheckCircle size={16} color="#CCF200" weight="fill" />}
              </View>
              <Text className="text-[#CCF200] text-xs font-semibold mt-0.5 tracking-wider">
                {memberCode}
              </Text>

              <View
                className={`self-start px-2.5 py-0.5 rounded-md mt-2 ${
                  isActive ? 'bg-[#373F0E]' : 'bg-[#4A1D1D]'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? 'text-[#CCF200]' : 'text-[#FFB6C1]'
                  }`}
                >
                  {isActive ? 'Active Member' : 'Inactive Member'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Contact Bar */}
          <View className="pt-3 border-t border-[#222226] flex-row flex-wrap gap-2">
            {customer.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${customer.phone}`)}
                className="flex-row items-center bg-[#1C1F26] border border-[#2A2E38] px-3 py-1.5 rounded-xl active:opacity-70"
              >
                <Phone size={14} color="#CCF200" />
                <Text className="text-gray-200 text-xs ml-2 font-medium">{customer.phone}</Text>
              </Pressable>
            )}
            {customer.email && (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${customer.email}`)}
                className="flex-row items-center bg-[#1C1F26] border border-[#2A2E38] px-3 py-1.5 rounded-xl active:opacity-70"
              >
                <EnvelopeSimple size={14} color="#A1A1AA" />
                <Text className="text-gray-300 text-xs ml-2 font-medium" numberOfLines={1}>
                  {customer.email}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Overview Row: Membership & Trainer Cards */}
        <View className="gap-3 mt-4">
          {/* Membership Card */}
          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-2.5">
                  <Medal size={16} color="#CCF200" weight="fill" />
                </View>
                <Text className="text-white text-sm font-bold">Active Membership</Text>
              </View>
              {planStats.isActive ? (
                <View className="px-2 py-0.5 rounded bg-[#CCF200]/20 border border-[#CCF200]/30">
                  <Text className="text-[#CCF200] text-[10px] font-bold">
                    {planStats.remainingDays} Days Left
                  </Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30">
                  <Text className="text-red-400 text-[10px] font-bold">Expired</Text>
                </View>
              )}
            </View>

            <Text className="text-white text-base font-bold mb-1">{planStats.name}</Text>
            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-[#222226]">
              <Text className="text-gray-400 text-xs">Validity</Text>
              <Text className="text-gray-200 text-xs font-medium">
                {planStats.startDate} - {planStats.expiryDate}
              </Text>
            </View>
          </View>

          {/* Assigned Trainer Card */}
          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-2.5">
                  <Barbell size={16} color="#CCF200" weight="fill" />
                </View>
                <Text className="text-white text-sm font-bold">Assigned Trainer</Text>
              </View>
              {activeTrainerAssignment ? (
                <View className="px-2 py-0.5 rounded bg-[#373F0E]">
                  <Text className="text-[#CCF200] text-[10px] font-bold">Assigned</Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded bg-[#2A2A2E]">
                  <Text className="text-gray-400 text-[10px] font-bold">None</Text>
                </View>
              )}
            </View>

            {activeTrainerAssignment?.trainer ? (
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-base font-bold">
                    {activeTrainerAssignment.trainer.fullName}
                  </Text>
                  <Text className="text-[#CCF200] text-xs mt-0.5">
                    {activeTrainerAssignment.trainer.specialization || 'Personal Trainer'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => navigateTo('change-trainer')}
                  className="bg-[#242428] px-3 py-1.5 rounded-lg border border-[#333] active:opacity-70"
                >
                  <Text className="text-white text-xs font-semibold">Change</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-400 text-xs">No trainer currently assigned</Text>
                <Pressable
                  onPress={() => navigateTo('change-trainer')}
                  className="bg-[#CCF200] px-3 py-1.5 rounded-lg active:opacity-80"
                >
                  <Text className="text-black text-xs font-bold">Assign Trainer</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Member Sub-Pages Section */}
        <Text className="text-[#CCF200] text-xs font-bold uppercase tracking-wider mt-6 mb-3">
          Member Sub-Pages & Details
        </Text>

        <View className="bg-[#141416] border border-[#242424] rounded-2xl overflow-hidden">
          {/* 1. Personal Details */}
          <Pressable
            onPress={() => navigateTo('personal-details')}
            className="flex-row items-center justify-between p-4 border-b border-[#222226] active:bg-[#1E1E22]"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3.5">
                <User size={20} color="#CCF200" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold mb-0.5">Personal Details</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  Contact, address, emergency info & stats
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#71717A" />
          </Pressable>

          {/* 2. Attendance History */}
          <Pressable
            onPress={() => navigateTo('attendance-history')}
            className="flex-row items-center justify-between p-4 border-b border-[#222226] active:bg-[#1E1E22]"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3.5">
                <CalendarBlank size={20} color="#CCF200" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold mb-0.5">Attendance History</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  View check-ins, monthly calendar & streaks
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#71717A" />
          </Pressable>

          {/* 3. Assigned Trainer */}
          <Pressable
            onPress={() => navigateTo('assigned-trainer')}
            className="flex-row items-center justify-between p-4 border-b border-[#222226] active:bg-[#1E1E22]"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3.5">
                <Users size={20} color="#CCF200" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold mb-0.5">Assigned Trainer</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  View trainer schedule & manage assignment
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#71717A" />
          </Pressable>

          {/* 4. Membership Payments */}
          <Pressable
            onPress={() => navigateTo('membership-payments')}
            className="flex-row items-center justify-between p-4 active:bg-[#1E1E22]"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center mr-3.5">
                <CreditCard size={20} color="#CCF200" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold mb-0.5">Membership & Payments</Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  Payment history, receipts & invoices
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#71717A" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
