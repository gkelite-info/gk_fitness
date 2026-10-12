import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Image, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Buildings,
  MapPin,
  CalendarBlank,
  User,
  Phone,
  EnvelopeSimple,
  Globe,
  Briefcase,
  Image as ImageIcon,
  Tag,
  CaretDown,
} from 'phosphor-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useGymLeadById } from '@/hooks/gymLeads/useGymLeads';
import { getGymLeadLogoUrl, updateGymLeadStatus } from '@/helpers/gymLeads/gymLeadsHelper';
import { useSubscriptions } from '@/hooks/superadmin/subscriptions/subscriptions';
import { updateGymLabel, GymLabelType } from '@/helpers/gym/gymHelper';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from '@/lib/toast';

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return '#84CC16';
    case 'underreview':
      return '#FBBF24';
    case 'rejected':
      return '#EF4444';
    case 'submitted':
    default:
      return '#38BDF8';
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'Approved';
    case 'underreview':
      return 'Under Review';
    case 'rejected':
      return 'Rejected';
    case 'submitted':
    default:
      return 'Submitted';
  }
};

const mapPlanToGymLabel = (plan: any, labelStr?: string | null): GymLabelType => {
  const name = (plan?.planName || labelStr || '').toLowerCase().replace(/[^a-z]/g, '');
  if (name.includes('premiumwhite')) return 'premiumwhite';
  if (name.includes('white')) return 'white';
  if (name.includes('silver')) return 'silver';
  return 'basic';
};

export default function GymLeadDetailsScreen() {
  const { gymLeadId } = useLocalSearchParams<{ gymLeadId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useGymLeadById(gymLeadId);
  const { data: subscriptions = [], isLoading: isLoadingSubscriptions } = useSubscriptions(
    undefined,
    'gyms'
  );

  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchExistingGymLabel = async () => {
      if (!lead) return;
      const email = lead.gymEmail || lead.email;
      if (!email) return;

      const { data: gymData } = await supabase
        .from('gyms')
        .select('label')
        .eq('gymEmail', email)
        .maybeSingle();

      if (gymData?.label && subscriptions.length > 0 && !selectedPlan) {
        const matching = subscriptions.find(
          (p: any) =>
            p.planName?.toLowerCase().replace(/[^a-z]/g, '') ===
            gymData.label?.toLowerCase().replace(/[^a-z]/g, '')
        );
        if (matching) {
          setSelectedPlan(matching);
          setSelectedLabel(matching.planName);
        } else {
          setSelectedLabel(gymData.label);
        }
      }
    };
    fetchExistingGymLabel();
  }, [lead, subscriptions]);

  const handleOpenStatusModal = () => {
    if (!selectedPlan && !selectedLabel) {
      toast.error('Selecting a subscription plan is mandatory to change status.');
      setIsPlanDropdownOpen(true);
      return;
    }
    setStatusModalVisible(true);
  };

  const handleConfirmApprove = async () => {
    setConfirmModalVisible(false);
    if (!lead || !gymLeadId) return;

    if (!selectedPlan && !selectedLabel) {
      toast.error('Selecting a subscription plan is mandatory to save changes.');
      return;
    }

    setIsUpdating(true);
    try {
      const matchedLabel: GymLabelType = mapPlanToGymLabel(selectedPlan, selectedLabel);
      const gymEmailToFind = lead.gymEmail || lead.email;

      let existingGymId: string | null = null;
      if (gymEmailToFind) {
        const { data: existingGym } = await supabase
          .from('gyms')
          .select('gymId')
          .eq('gymEmail', gymEmailToFind)
          .maybeSingle();

        if (existingGym?.gymId) {
          existingGymId = existingGym.gymId;
        }
      }

      if (existingGymId) {
        await updateGymLabel(existingGymId, matchedLabel);
        await updateGymLeadStatus(gymLeadId, 'approved');
        toast.success(`Gym lead approved and gym label updated to "${matchedLabel}"!`);

        await queryClient.invalidateQueries({ queryKey: ['gymLead', gymLeadId] });
        await queryClient.invalidateQueries({ queryKey: ['gymLeads'] });
        await queryClient.invalidateQueries({ queryKey: ['gyms'] });
      } else {
        await updateGymLeadStatus(gymLeadId, 'underreview');
        toast.success(
          `Lead set to Under Review with "${matchedLabel}" plan. Redirecting to registration...`
        );

        await queryClient.invalidateQueries({ queryKey: ['gymLead', gymLeadId] });
        await queryClient.invalidateQueries({ queryKey: ['gymLeads'] });

        router.push({
          pathname: '/(superadmin)/dashboard/register',
          params: { gymLeadId: gymLeadId, label: matchedLabel },
        });
      }
    } catch (error) {
      console.error('[handleConfirmApprove] Error:', error);
      toast.error('Failed to process approval');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmReject = async () => {
    setRejectModalVisible(false);
    if (!lead || !gymLeadId) return;

    if (!selectedPlan && !selectedLabel) {
      toast.error('Selecting a subscription plan is mandatory to save changes.');
      return;
    }

    setIsUpdating(true);
    try {
      await updateGymLeadStatus(gymLeadId, 'rejected');
      toast.success('Gym Lead Rejected!');

      await queryClient.invalidateQueries({ queryKey: ['gymLead', gymLeadId] });
      await queryClient.invalidateQueries({ queryKey: ['gymLeads'] });
    } catch (error) {
      toast.error('Failed to process rejection');
    } finally {
      setIsUpdating(false);
    }
  };

  const changeStatus = async (
    newStatus: 'submitted' | 'underreview' | 'approved' | 'rejected'
  ) => {
    if (!lead || !gymLeadId) return;

    if (!selectedPlan && !selectedLabel) {
      toast.error('Selecting a subscription plan is mandatory to save changes.');
      return;
    }

    setIsUpdating(true);
    try {
      await updateGymLeadStatus(gymLeadId, newStatus);
      toast.success(`Status updated to ${getStatusLabel(newStatus)}`);

      await queryClient.invalidateQueries({ queryKey: ['gymLead', gymLeadId] });
      await queryClient.invalidateQueries({ queryKey: ['gymLeads'] });
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
      setStatusModalVisible(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0E1014] justify-center items-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#C8F51D" />
      </View>
    );
  }

  if (!lead) {
    return (
      <View className="flex-1 bg-[#0E1014] justify-center items-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-white text-lg font-semibold">Lead not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-[#1D1F27] px-4 py-2 rounded-xl border border-[#20232C]"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const appliedDate = lead.createdAt
    ? new Date(lead.createdAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : 'Unknown';

  return (
    <View className="flex-1 bg-[#09090B]" style={{ paddingTop: insets.top + 20 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 pb-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#1D1F27] rounded-full items-center justify-center mr-4 active:opacity-70 border border-[#20232C]"
        >
          <CaretLeft size={20} color="#A1A1AA" />
        </Pressable>
        <View>
          <Text className="text-[#C8F51D] text-xl font-semibold">
            Gym Owner <Text className="text-white font-semibold">Details</Text>
          </Text>
          <Text className="text-[#A1A1AA] text-xs mt-0.5">Review registration request</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row justify-between items-start">
            <View className="flex-row items-center flex-1">
              <View className="w-14 h-14 rounded-xl bg-[#0E1014] items-center justify-center mr-4 border border-[#20232C]">
                <Buildings size={28} color="#C8F51D" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-semibold mb-1" numberOfLines={1}>
                  {lead.gymName}
                </Text>
                <View className="flex-row items-center mb-1">
                  <MapPin size={14} color="#A1A1AA" />
                  <Text className="text-[#A1A1AA] text-xs ml-1 flex-1" numberOfLines={1}>
                    {lead.gymCity}, {lead.gymState}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <CalendarBlank size={14} color="#A1A1AA" />
                  <Text className="text-[#A1A1AA] text-xs ml-1 flex-1" numberOfLines={1}>
                    Applied on {appliedDate}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleOpenStatusModal}
              className="px-3 py-1.5 rounded-md border flex-row items-center active:opacity-70"
              style={{
                backgroundColor: `${getStatusColor(lead.status)}15`,
                borderColor: `${getStatusColor(lead.status)}30`,
              }}
            >
              <Text
                className="text-[10px] font-semibold tracking-wider mr-1"
                style={{ color: getStatusColor(lead.status) }}
              >
                {getStatusLabel(lead.status).toUpperCase()}
              </Text>
              <CaretDown size={12} color={getStatusColor(lead.status)} />
            </Pressable>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <User size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Basic Information</Text>
          </View>
          <View className="bg-[#0E1014] rounded-xl border border-[#20232C] overflow-hidden">
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Category</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">Gym</Text>
            </View>
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Owner Name</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">{lead.fullName}</Text>
            </View>
            <View className="flex-row py-3 px-4">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Gym Name</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">{lead.gymName}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <Phone size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Contact Information</Text>
          </View>
          <View className="bg-[#0E1014] rounded-xl border border-[#20232C] overflow-hidden">
            <View className="flex-row py-3 px-4 border-b border-[#20232C] items-center">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Gym Email</Text>
              <View className="flex-row flex-1 items-center">
                <EnvelopeSimple size={16} color="#A1A1AA" />
                <Text className="text-[#E4E4E7] text-sm font-medium ml-2 shrink-1" numberOfLines={1}>
                  {lead.gymEmail || lead.email}
                </Text>
              </View>
            </View>
            <View className="flex-row py-3 px-4 border-b border-[#20232C] items-center">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Mobile Number</Text>
              <View className="flex-row flex-1 items-center">
                <Phone size={16} color="#A1A1AA" />
                <Text className="text-[#E4E4E7] text-sm font-medium ml-2">
                  {lead.gymMobile || lead.mobile}
                </Text>
              </View>
            </View>
            <View className="flex-row py-3 px-4 items-center">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Alternate Mobile Number</Text>
              <View className="flex-row flex-1 items-center">
                <Phone size={16} color="#A1A1AA" />
                <Text className="text-[#E4E4E7] text-sm font-medium ml-2">
                  {lead.gymAlternateMobile || lead.alternateMobile || '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <MapPin size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Address</Text>
          </View>
          <View className="bg-[#0E1014] rounded-xl border border-[#20232C] overflow-hidden mb-3">
            <View className="flex-row py-3 px-4 items-center">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Address</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium" numberOfLines={2}>
                {lead.gymAddress}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between">
            <View className="bg-[#0E1014] rounded-xl border border-[#20232C] px-3 py-2 flex-1 mr-2 flex-row items-center">
              <Globe size={16} color="#A1A1AA" />
              <Text className="text-[#A1A1AA] text-xs ml-2 mr-1">Country</Text>
              <Text className="text-[#E4E4E7] text-sm font-medium ml-auto">India</Text>
            </View>
            <View className="bg-[#0E1014] rounded-xl border border-[#20232C] px-3 py-2 flex-1 ml-2 flex-row items-center">
              <Buildings size={16} color="#A1A1AA" />
              <Text className="text-[#A1A1AA] text-xs ml-2 mr-1">State</Text>
              <Text className="text-[#E4E4E7] text-sm font-medium ml-auto" numberOfLines={1}>
                {lead.gymState}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between mt-3">
            <View className="bg-[#0E1014] rounded-xl border border-[#20232C] px-3 py-2 flex-1 mr-2 flex-row items-center">
              <MapPin size={16} color="#A1A1AA" />
              <Text className="text-[#A1A1AA] text-xs ml-2 mr-1">PIN Code</Text>
              <Text className="text-[#E4E4E7] text-sm font-medium ml-auto">{lead.gymPincode}</Text>
            </View>
            <View className="bg-[#0E1014] rounded-xl border border-[#20232C] px-3 py-2 flex-1 ml-2 flex-row items-center">
              <Buildings size={16} color="#A1A1AA" />
              <Text className="text-[#A1A1AA] text-xs ml-2 mr-1">City</Text>
              <Text className="text-[#E4E4E7] text-sm font-medium ml-auto" numberOfLines={1}>
                {lead.gymCity}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <Briefcase size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Business Information</Text>
          </View>
          <View className="bg-[#0E1014] rounded-xl border border-[#20232C] overflow-hidden">
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">No. of Branches</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">{lead.noOfBranches}</Text>
            </View>
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Establish Year</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium">{lead.establishYear}</Text>
            </View>
            <View className="flex-row py-3 px-4 border-b border-[#20232C]">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Note</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium" numberOfLines={3}>
                {lead.note || '-'}
              </Text>
            </View>
            <View className="flex-row py-3 px-4">
              <Text className="flex-1 text-[#A1A1AA] text-sm">Website</Text>
              <Text className="flex-1 text-[#E4E4E7] text-sm font-medium" numberOfLines={1}>
                {lead.website || '-'}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center mb-4">
            <ImageIcon size={18} color="#C8F51D" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Branding</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[#A1A1AA] text-sm">Logo</Text>
            <View className="w-24 h-12 bg-[#0E1014] rounded-xl border border-[#20232C] items-center justify-center overflow-hidden">
              {lead.logo ? (
                <Image
                  source={{ uri: getGymLeadLogoUrl(lead.logo) as string }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-[#C8F51D] text-[10px] font-semibold text-center">NO LOGO</Text>
              )}
            </View>
          </View>
        </View>

        {/* Subscription Plan Selection (Mandatory) */}
        <View className="bg-[#14151B] rounded-2xl p-4 mb-4 border border-[#20232C]">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Tag size={18} color="#C8F51D" weight="fill" />
              <Text className="text-white font-semibold text-base ml-2">
                Select Subscription Plan <Text className="text-red-500">*</Text>
              </Text>
            </View>
            {/* <View className="bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
              <Text className="text-red-400 text-[10px] font-semibold uppercase">Required</Text>
            </View> */}
          </View>

          <Pressable
            onPress={() => setIsPlanDropdownOpen(!isPlanDropdownOpen)}
            className={`flex-row items-center justify-between bg-[#0E1014] rounded-xl border px-4 py-3 ${!selectedPlan && !selectedLabel ? 'border-red-500/40' : 'border-[#20232C]'
              }`}
          >
            <Text
              className={`text-sm ${selectedPlan?.planName || selectedLabel ? 'text-white font-medium' : 'text-[#8E8E93]'
                }`}
            >
              {selectedPlan?.planName || selectedLabel || 'Choose Plan (Required)'}
            </Text>
            <CaretDown size={16} color="#A1A1AA" />
          </Pressable>

          {!selectedPlan && !selectedLabel && (
            <Text className="text-red-400 text-xs mt-2 ml-1">
              * Selecting a subscription plan is mandatory to save status changes
            </Text>
          )}

          {isPlanDropdownOpen && (
            <View className="mt-2 bg-[#2B2F3D] rounded-xl border border-[#20232C] overflow-hidden">
              {isLoadingSubscriptions ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#C8F51D" />
                </View>
              ) : subscriptions && subscriptions.length > 0 ? (
                subscriptions.map((plan: any, index: number) => (
                  <Pressable
                    key={plan.subscriptionPlanId || index}
                    onPress={() => {
                      setSelectedPlan(plan);
                      setSelectedLabel(plan.planName);
                      setIsPlanDropdownOpen(false);
                    }}
                    className={`px-4 py-3 flex-row items-center justify-between ${index < subscriptions.length - 1 ? 'border-b border-white/10' : ''
                      } ${selectedPlan?.subscriptionPlanId === plan.subscriptionPlanId ||
                        selectedLabel === plan.planName
                        ? 'bg-white/10'
                        : ''
                      }`}
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-white text-sm font-medium">{plan.planName}</Text>
                      {plan.price != null && (
                        <Text className="text-[#A1A1AA] text-xs mt-0.5">₹{plan.price}</Text>
                      )}
                    </View>
                    {plan.label ? (
                      <View className="bg-[#C8F51D]/15 px-2 py-0.5 rounded border border-[#C8F51D]/30">
                        <Text className="text-[#C8F51D] text-[10px] font-semibold">{plan.label}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))
              ) : (
                <View className="py-4 items-center">
                  <Text className="text-[#8E8E93] text-sm">No gym subscription plans available</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Save & Change Status Action Button */}
        <View className="p-4" style={{ paddingBottom: insets.bottom + 12 }}>
          <Pressable
            onPress={handleOpenStatusModal}
            disabled={isUpdating}
            className={`rounded-xl py-3.5 items-center justify-center active:opacity-80 ${!selectedPlan && !selectedLabel ? 'bg-[#C8F51D]/60' : 'bg-[#C8F51D]'
              }`}
          >
            <Text className="text-black font-semibold text-base">Save & Change Status</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Status Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/60"
          onPress={() => setStatusModalVisible(false)}
        >
          <Pressable
            className="bg-[#1C1C1E] rounded-t-3xl p-6 pb-10"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-[#2A2A2D] rounded-full mb-4" />
              <Text className="text-white text-lg font-semibold">Change Status</Text>
              <Text className="text-[#8E8E93] text-sm mt-1">
                {lead.gymName} ({lead.fullName})
              </Text>
              <View className="mt-2 bg-[#C8F51D]/15 px-2.5 py-1 rounded-md border border-[#C8F51D]/30">
                <Text className="text-[#C8F51D] text-xs font-medium">
                  Plan: {selectedPlan?.planName || selectedLabel}
                </Text>
              </View>
            </View>

            <View className="gap-3">
              {[
                { id: 'submitted', label: 'Submitted', color: '#3B82F6' },
                { id: 'underreview', label: 'Under Review', color: '#FBBF24' },
                { id: 'approved', label: 'Approve', color: '#84CC16' },
                { id: 'rejected', label: 'Reject', color: '#EF4444' },
              ].map((s) => {
                const isDisabled =
                  isUpdating || lead.status === s.id || s.id === 'submitted';
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      if (!selectedPlan && !selectedLabel) {
                        toast.error(
                          'Selecting a subscription plan is mandatory to save changes.'
                        );
                        setStatusModalVisible(false);
                        setIsPlanDropdownOpen(true);
                        return;
                      }

                      if (s.id === 'approved') {
                        setStatusModalVisible(false);
                        setConfirmModalVisible(true);
                      } else if (s.id === 'rejected') {
                        setStatusModalVisible(false);
                        setRejectModalVisible(true);
                      } else {
                        changeStatus(s.id as any);
                      }
                    }}
                    disabled={isDisabled}
                    className={`flex-row items-center justify-between p-4 rounded-xl border ${lead.status === s.id
                        ? 'border-white/20 bg-[#2A2A2D]'
                        : 'border-[#2A2A2D] bg-[#121212]'
                      } ${isDisabled ? 'opacity-50' : 'active:opacity-70'}`}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: s.color }}
                      />
                      <Text
                        className={`text-base font-semibold ${lead.status === s.id ? 'text-white' : 'text-[#E0E0E0]'
                          }`}
                      >
                        {s.label}
                      </Text>
                    </View>
                    {lead.status === s.id && (
                      <Text className="text-[#8E8E93] text-xs">Current</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirm Approve Modal */}
      <ConfirmModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={handleConfirmApprove}
        title="Approve Lead & Register Gym"
        description={`Are you sure you want to approve "${lead.gymName || 'this gym'}" with the "${selectedPlan?.planName || selectedLabel || 'selected'}" plan? This will set the lead status to "Under Review" and redirect you to complete the registration.`}
        confirmText="Confirm"
        cancelText="Cancel"
        confirmButtonColor="bg-[#BEF227]"
        confirmTextColor="text-black"
        icon={<Buildings size={40} color="#BEF227" />}
        isLoading={isUpdating}
      />

      {/* Confirm Reject Modal */}
      <ConfirmModal
        visible={rejectModalVisible}
        onClose={() => setRejectModalVisible(false)}
        onConfirm={handleConfirmReject}
        title="Reject Gym Lead"
        description={`Are you sure you want to reject "${lead.gymName || 'this gym'}"?`}
        confirmText="Reject"
        cancelText="Cancel"
        confirmButtonColor="bg-[#EF4444]"
        confirmTextColor="text-white"
        icon={<Buildings size={40} color="#EF4444" />}
        isLoading={isUpdating}
      />
    </View>
  );
}
