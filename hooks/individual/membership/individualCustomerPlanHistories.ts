import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualCustomerPlanHistories,
  fetchIndividualCustomerPlanHistoryById,
  fetchIndividualCustomerPlanHistoriesPaginated,
  saveIndividualCustomerPlanHistory,
  updateIndividualCustomerPlanHistory,
  deleteIndividualCustomerPlanHistory,
  SaveIndividualCustomerPlanHistoryParams,
  FetchIndividualCustomerPlanHistoriesPaginatedParams,
} from '@/helpers/individual/membership/individualCustomerPlanHistories';

/**
 * Hook to fetch plan histories for an individual customer/user or plan.
 */
export function useIndividualCustomerPlanHistories(
  userId?: string,
  individualCustomerPlanId?: string,
  subscriptionPlanId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerPlanHistories', userId, individualCustomerPlanId, subscriptionPlanId],
    queryFn: async () => {
      return await fetchIndividualCustomerPlanHistories(userId, individualCustomerPlanId, subscriptionPlanId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : (!!userId || !!individualCustomerPlanId || !!subscriptionPlanId),
    ...options,
  });
}

/**
 * Hook to fetch a single individual customer plan history record by ID.
 */
export function useIndividualCustomerPlanHistoryById(
  id?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerPlanHistory', id],
    queryFn: async () => {
      if (!id) return null;
      return await fetchIndividualCustomerPlanHistoryById(id);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    ...options,
  });
}

/**
 * Hook to fetch paginated individual customer plan histories with filters.
 */
export function useIndividualCustomerPlanHistoriesPaginated(
  params: FetchIndividualCustomerPlanHistoriesPaginatedParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [
      'individualCustomerPlanHistoriesPaginated',
      params.userId,
      params.individualCustomerPlanId,
      params.subscriptionPlanId,
      params.page,
      params.limit,
      params.searchQuery,
      params.sortOrder,
      params.actionType,
      params.paymentStatus,
    ],
    queryFn: async () => {
      return await fetchIndividualCustomerPlanHistoriesPaginated(params);
    },
    enabled: options?.enabled !== undefined ? options.enabled : (!!params.userId || !!params.individualCustomerPlanId || !!params.subscriptionPlanId || params.page !== undefined),
    ...options,
  });
}

/**
 * Hook to save or log an individual customer plan history entry.
 */
export function useSaveIndividualCustomerPlanHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveIndividualCustomerPlanHistoryParams) => {
      return await saveIndividualCustomerPlanHistory(params);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistories'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistoriesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlansPaginated'] });

      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistories', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan', variables.userId] });
      }

      if (variables.individualCustomerPlanId) {
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPlan', variables.individualCustomerPlanId] });
      }
    },
  });
}

/**
 * Alias for useSaveIndividualCustomerPlanHistory for backwards compatibility.
 */
export const useLogIndividualCustomerPlanHistory = useSaveIndividualCustomerPlanHistory;

/**
 * Hook to update an existing individual customer plan history entry.
 */
export function useUpdateIndividualCustomerPlanHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SaveIndividualCustomerPlanHistoryParams>;
    }) => {
      return await updateIndividualCustomerPlanHistory(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistories'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistory', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistoriesPaginated'] });

      if (variables.updates.userId) {
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistories', variables.updates.userId] });
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans', variables.updates.userId] });
      }
    },
  });
}

/**
 * Hook to soft delete an individual customer plan history entry.
 */
export function useDeleteIndividualCustomerPlanHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteIndividualCustomerPlanHistory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistories'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlanHistoriesPaginated'] });
    },
  });
}

