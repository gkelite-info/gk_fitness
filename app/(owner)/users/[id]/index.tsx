import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Linking, Image, Modal } from 'react-native';
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
  Barbell,
  CheckCircle,
  X,
  Check,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useUserById } from '@/hooks/users/useUsers';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import {
  useGymCustomerMembershipPlans,
  useSaveGymCustomerMembershipPlan,
} from '@/hooks/gymCustomerMembershipPlans/useGymCustomerMembershipPlans';
import { useGymMembershipPlans } from '@/hooks/useGymMembershipPlans';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

export default function UserProfileHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(id);
  const targetUserId = customer?.userId || id;
  const { data: userDetails } = useUserById(targetUserId);
  const { data: trainers, isLoading: isTrainersLoading } = useAssignedTrainersByCustomer(id);
  const {
    data: plans,
    isLoading: isPlansLoading,
    refetch: refetchCustomerPlans,
  } = useGymCustomerMembershipPlans(customer?.gymId, id);
  const { data: availablePlans = [] } = useGymMembershipPlans(userId);

  const savePlanMutation = useSaveGymCustomerMembershipPlan();

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
        <Text className="text-white text-lg font-semibold mb-2">Member Not Found</Text>
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

  const handleConfirmChangePlan = async () => {
    if (!selectedPlanId || !customer?.gymId) {
      toast.error('Please select a membership plan.');
      return;
    }

    const chosenPlan = availablePlans.find((p: any) => p.planId === selectedPlanId);
    if (!chosenPlan) {
      toast.error('Invalid plan selected.');
      return;
    }

    setIsUpdatingPlan(true);
    try {
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];
      const endDate = new Date(now);
      const months = Number(chosenPlan.durationMonths) || 1;
      endDate.setMonth(endDate.getMonth() + months);
      const endDateStr = endDate.toISOString().split('T')[0];

      await savePlanMutation.mutateAsync({
        customerId: id,
        gymId: customer.gymId,
        planId: chosenPlan.planId,
        customAmount: chosenPlan.price,
        startDate,
        endDate: endDateStr,
        createdBy: userId || 'owner',
        is_Active: true,
      });

      triggerSuccessHaptic();
      toast.success('Membership plan updated successfully!');
      setShowChangePlanModal(false);
      await refetchCustomerPlans();
    } catch (err: any) {
      triggerErrorHaptic();
      toast.error(err?.message || 'Failed to update membership plan.');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-10" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1F1F22]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">Member Profile</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
          <View className="flex-row items-center mb-4">
            <View className="relative mr-4">
              {customer?.user?.profilePhoto || userDetails?.profilePhoto ? (
                <Image
                  source={{ uri: customer?.user?.profilePhoto || userDetails?.profilePhoto }}
                  className="w-16 h-16 rounded-2xl border border-[#333]"
                />
              ) : (
                <View className="w-16 h-16 rounded-2xl bg-[#1C1F26] border border-[#333] items-center justify-center">
                  <Text className="text-[#CCF200] text-xl font-semibold">{initials}</Text>
                </View>
              )}
              <View
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#141416] ${isActive ? 'bg-[#CCF200]' : 'bg-[#EF4444]'
                  }`}
              />
            </View>

            <View className="flex-1 justify-center">
              <View className="flex-row items-center">
                <Text className="text-white text-xl font-semibold mr-2" numberOfLines={1}>
                  {customer.fullName}
                </Text>
                {isActive && <CheckCircle size={16} color="#CCF200" weight="fill" />}
              </View>
              <Text className="text-[#CCF200] text-xs font-semibold mt-0.5 tracking-wider">
                {memberCode}
              </Text>

              <View
                className={`self-start px-2.5 py-0.5 rounded-md mt-2 ${isActive ? 'bg-[#373F0E]' : 'bg-[#4A1D1D]'
                  }`}
              >
                <Text
                  className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'text-[#CCF200]' : 'text-[#FFB6C1]'
                    }`}
                >
                  {isActive ? 'Active Member' : 'Inactive Member'}
                </Text>
              </View>
            </View>
          </View>

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

        <View className="gap-3 mt-4">
          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-2.5">
                  <Medal size={16} color="#CCF200" weight="fill" />
                </View>
                <Text className="text-white text-sm font-semibold">Active Membership</Text>
              </View>
              {planStats.isActive ? (
                <View className="px-2 py-0.5 rounded bg-[#CCF200]/20 border border-[#CCF200]/30">
                  <Text className="text-[#CCF200] text-[10px] font-semibold">
                    {planStats.remainingDays} Days Left
                  </Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30">
                  <Text className="text-red-400 text-[10px] font-semibold">Expired</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-white text-base font-semibold mb-0.5">{planStats.name}</Text>
                <Text className="text-gray-400 text-xs">
                  {planStats.duration} • {planStats.startDate} - {planStats.expiryDate}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setShowChangePlanModal(true);
                }}
                className={`${activePlan ? 'bg-[#242428] border border-[#333]' : 'bg-[#CCF200]'} px-3.5 py-1.5 rounded-lg active:opacity-70`}
              >
                <Text className={`text-xs font-semibold ${activePlan ? 'text-white' : 'text-black'}`}>
                  {activePlan ? 'Change Plan' : 'Assign Plan'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-2.5">
                  <Barbell size={16} color="#CCF200" weight="fill" />
                </View>
                <Text className="text-white text-sm font-semibold">Assigned Trainer</Text>
              </View>
              {activeTrainerAssignment ? (
                <View className="px-2 py-0.5 rounded bg-[#373F0E]">
                  <Text className="text-[#CCF200] text-[10px] font-semibold">Assigned</Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded bg-[#2A2A2E]">
                  <Text className="text-gray-400 text-[10px] font-semibold">None</Text>
                </View>
              )}
            </View>

            {activeTrainerAssignment?.trainer ? (
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-base font-semibold">
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
                  <Text className="text-black text-xs font-semibold">Assign Trainer</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <Text className="text-[#CCF200] text-xs font-semibold uppercase tracking-wider mt-6 mb-3">
          Member Sub-Pages & Details
        </Text>

        <View className="bg-[#141416] border border-[#242424] rounded-2xl overflow-hidden">
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

      {/* Change Membership Modal */}
      <Modal
        visible={showChangePlanModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangePlanModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View
            className="bg-[#121214] border-t border-[#27272A] rounded-t-3xl p-5 max-h-[85%]"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-[#222226]">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-xl bg-[#CCF200]/10 border border-[#CCF200]/20 items-center justify-center mr-3">
                  <Medal size={20} color="#CCF200" weight="fill" />
                </View>
                <View>
                  <Text className="text-white text-base font-bold">Change Membership</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {customer.fullName} • {memberCode}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowChangePlanModal(false)}
                className="w-8 h-8 rounded-full bg-[#1C1F26] items-center justify-center active:opacity-70"
              >
                <X size={16} color="#A1A1AA" />
              </Pressable>
            </View>

            {/* Current Plan Badge */}
            <View className="bg-[#181B22] border border-[#252A36] rounded-xl p-3 my-4 flex-row items-center justify-between">
              <View>
                <Text className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">
                  Current Plan
                </Text>
                <Text className="text-white text-sm font-semibold mt-0.5">{planStats.name}</Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">
                  Status
                </Text>
                <Text
                  className={`text-xs font-semibold mt-0.5 ${
                    planStats.isActive ? 'text-[#CCF200]' : 'text-red-400'
                  }`}
                >
                  {planStats.isActive ? `${planStats.remainingDays} Days Left` : 'Expired'}
                </Text>
              </View>
            </View>

            {/* Select New Plan List */}
            <Text className="text-[#CCF200] text-xs font-semibold uppercase tracking-wider mb-2.5">
              Select New Plan
            </Text>

            <ScrollView className="max-h-72" showsVerticalScrollIndicator={false}>
              {availablePlans.length === 0 ? (
                <View className="bg-[#18181B] rounded-xl p-6 items-center">
                  <Text className="text-gray-400 text-xs">No gym membership plans found.</Text>
                </View>
              ) : (
                <View className="gap-2.5 pb-2">
                  {availablePlans.map((plan: any) => {
                    const isSelected = selectedPlanId === plan.planId;
                    return (
                      <Pressable
                        key={plan.planId}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedPlanId(plan.planId);
                        }}
                        className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                          isSelected
                            ? 'bg-[#1C2010] border-[#CCF200]'
                            : 'bg-[#18181B] border-[#27272A] active:border-[#3F3F46]'
                        }`}
                      >
                        <View className="flex-1 pr-3">
                          <Text
                            className={`text-sm font-semibold ${
                              isSelected ? 'text-[#CCF200]' : 'text-white'
                            }`}
                          >
                            {plan.planName}
                          </Text>
                          <Text className="text-gray-400 text-xs mt-0.5">
                            Duration: {plan.durationMonths || 1} Month(s)
                            {plan.description ? ` • ${plan.description}` : ''}
                          </Text>
                        </View>

                        <View className="items-end">
                          <Text className="text-[#CCF200] text-sm font-bold">
                            ₹{Number(plan.price || 0).toLocaleString('en-IN')}
                          </Text>
                          <View
                            className={`w-5 h-5 rounded-full border mt-1 items-center justify-center ${
                              isSelected
                                ? 'bg-[#CCF200] border-[#CCF200]'
                                : 'border-[#444]'
                            }`}
                          >
                            {isSelected && <Check size={12} color="#000" weight="bold" />}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View className="mt-4 gap-2.5">
              <Pressable
                disabled={!selectedPlanId || isUpdatingPlan}
                onPress={handleConfirmChangePlan}
                className={`py-3.5 rounded-2xl items-center justify-center flex-row gap-2 ${
                  !selectedPlanId || isUpdatingPlan
                    ? 'bg-[#CCF200]/40'
                    : 'bg-[#CCF200] active:opacity-85'
                }`}
              >
                {isUpdatingPlan ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#000000" weight="bold" />
                    <Text className="text-black font-bold text-sm">Confirm & Update Plan</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowChangePlanModal(false);
                  router.push({
                    pathname: '/(owner)/dashboard/payments/add' as any,
                    params: { customerId: id },
                  });
                }}
                className="py-3 rounded-xl bg-[#1C1F26] border border-[#2A2E38] items-center justify-center active:opacity-75"
              >
                <Text className="text-gray-300 text-xs font-semibold">
                  Record New Payment & Receipt →
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
