import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCustomerOnboarding,
  fetchCustomerOnboardingById,
  updateCustomerOnboarding,
  CustomerOnboarding,
  CustomerOnboardingUpdatePayload,
} from '@/helpers/onboardingHelper';

export function useCustomerOnboardingData(userId?: string | null) {
  return useQuery<CustomerOnboarding | null>({
    queryKey: ['customerOnboarding', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await fetchCustomerOnboarding(userId);
    },
    enabled: !!userId,
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
      queryClient.invalidateQueries({ queryKey: ['customerOnboarding'] });
      queryClient.invalidateQueries({ queryKey: ['customerOnboardingById', variables.onboardingId] });
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
