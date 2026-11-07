import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCustomerOnboarding,
  fetchCustomerOnboardingById,
  fetchCustomerOnboardingsByGymId,
  saveCustomerOnboarding,
  updateCustomerOnboarding,
  CustomerOnboarding,
  CustomerOnboardingUpdatePayload,
} from '@/helpers/onboardingHelper';
import { OnboardingData } from '@/app/(customer)/(onboarding)/_OnboardingContext';

export function useCustomerOnboardingData(userId?: string | null) {
  const cleanId = userId ? (Array.isArray(userId) ? userId[0] : String(userId).trim()) : null;
  return useQuery<CustomerOnboarding | null>({
    queryKey: ['customerOnboarding', cleanId],
    queryFn: async () => {
      if (!cleanId) return null;
      const res = await fetchCustomerOnboarding(cleanId);
      return res;
    },
    enabled: !!cleanId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useCustomerOnboardingById(onboardingId?: string | null) {
  return useQuery<CustomerOnboarding | null>({
    queryKey: ['customerOnboardingById', onboardingId],
    queryFn: async () => {
      if (!onboardingId) return null;
      return await fetchCustomerOnboardingById(onboardingId);
    },
    enabled: !!onboardingId,
  });
}

export function useCustomerOnboardingsByGymId(gymId?: string | null) {
  return useQuery<CustomerOnboarding[]>({
    queryKey: ['customerOnboardingsByGymId', gymId],
    queryFn: async () => {
      if (!gymId) return [];
      return await fetchCustomerOnboardingsByGymId(gymId);
    },
    enabled: !!gymId,
  });
}

export function useUpdateCustomerOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CustomerOnboardingUpdatePayload) => {
      return await updateCustomerOnboarding(payload);
    },
    onSuccess: (_, variables) => {
      if (variables.createdBy) {
        queryClient.invalidateQueries({ queryKey: ['customerOnboarding', variables.createdBy] });
        queryClient.invalidateQueries({ queryKey: ['customerOnboardingStatus', variables.createdBy] });
      }
      if (variables.gymId) {
        queryClient.invalidateQueries({ queryKey: ['customerOnboardingsByGymId', variables.gymId] });
      }
      queryClient.invalidateQueries({ queryKey: ['customerOnboarding'] });
      queryClient.invalidateQueries({ queryKey: ['customerOnboardingById', variables.onboardingId] });
    },
  });
}

export function useSaveCustomerOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
      customAllergy,
    }: {
      userId: string;
      data: OnboardingData;
      customAllergy?: string;
    }) => {
      return await saveCustomerOnboarding(userId, data, customAllergy);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerOnboarding', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['customerOnboardingStatus', variables.userId] });
      if (variables.data.gymId) {
        queryClient.invalidateQueries({ queryKey: ['customerOnboardingsByGymId', variables.data.gymId] });
      }
      queryClient.invalidateQueries({ queryKey: ['customerOnboarding'] });
    },
  });
}

export type {
  CustomerOnboarding,
  CustomerOnboardingUpdatePayload,
  CustomerPrimaryGoal,
  CustomerWorkoutLocation,
  CustomerPreferWorkoutTime,
  CustomerDietType,
} from '@/helpers/onboardingHelper';
