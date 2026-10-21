import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualCustomerPlans,
  fetchIndividualCustomerPlanById,
  fetchActiveIndividualCustomerPlan,
  saveIndividualCustomerPlan,
  deleteIndividualCustomerPlan,
  toggleIndividualCustomerPlanActiveStatus,
  fetchIndividualCustomerPlansPaginated,
  SaveIndividualCustomerPlanParams,
} from '@/helpers/individual/membership/individualCustomerPlan';

export function useIndividualCustomerPlans(
  userId?: string,
  subscriptionPlanId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerPlans', userId, subscriptionPlanId],
    queryFn: async () => {
      return await fetchIndividualCustomerPlans(userId, subscriptionPlanId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : (!!userId || !!subscriptionPlanId),
    ...options,
  });
}

export function useIndividualCustomerPlan(individualCustomerPlanId?: string | null) {
  return useQuery({
    queryKey: ['individualCustomerPlan', individualCustomerPlanId],
    queryFn: async () => {
      if (!individualCustomerPlanId) return null;
      return await fetchIndividualCustomerPlanById(individualCustomerPlanId);
    },
    enabled: !!individualCustomerPlanId,
  });
}

export function useActiveIndividualCustomerPlan(
  userId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['activeIndividualCustomerPlan', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await fetchActiveIndividualCustomerPlan(userId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!userId,
    ...options,
  });
}

export function useIndividualCustomerPlansPaginated(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string,
  sortOrder: 'newest' | 'oldest' = 'newest',
  subscriptionPlanId?: string,
  isActive?: boolean
) {
  return useQuery({
    queryKey: [
      'individualCustomerPlansPaginated',
      page,
      limit,
      searchQuery,
      sortOrder,
      subscriptionPlanId,
      isActive,
    ],
    queryFn: async () => {
      return await fetchIndividualCustomerPlansPaginated(
        page,
        limit,
        searchQuery,
        sortOrder,
        subscriptionPlanId,
        isActive
      );
    },
  });
}

export function useSaveIndividualCustomerPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveIndividualCustomerPlanParams) => {
      return await saveIndividualCustomerPlan(params);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlansPaginated'] });
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans', variables.userId] });
      }
      if (variables.individualCustomerPlanId) {
        queryClient.invalidateQueries({
          queryKey: ['individualCustomerPlan', variables.individualCustomerPlanId],
        });
      }
    },
    onError: (error) => {
      console.error('[useSaveIndividualCustomerPlan] Error saving individual customer plan:', error);
    },
  });
}

export function useDeleteIndividualCustomerPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (individualCustomerPlanId: string) => {
      return await deleteIndividualCustomerPlan(individualCustomerPlanId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlansPaginated'] });
    },
    onError: (error) => {
      console.error('[useDeleteIndividualCustomerPlan] Error deleting individual customer plan:', error);
    },
  });
}

interface ToggleIndividualCustomerPlanStatusParams {
  individualCustomerPlanId: string;
  currentStatus: boolean;
}

export function useToggleIndividualCustomerPlanActiveStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      individualCustomerPlanId,
      currentStatus,
    }: ToggleIndividualCustomerPlanStatusParams) => {
      return await toggleIndividualCustomerPlanActiveStatus(
        individualCustomerPlanId,
        currentStatus
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlansPaginated'] });
    },
    onError: (error) => {
      console.error(
        '[useToggleIndividualCustomerPlanActiveStatus] Error toggling status:',
        error
      );
    },
  });
}
