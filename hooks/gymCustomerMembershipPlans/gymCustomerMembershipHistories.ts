import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGymCustomerMembershipHistories,
  fetchGymCustomerMembershipHistoryById,
  fetchGymCustomerMembershipHistoriesPaginated,
  saveGymCustomerMembershipHistory,
  updateGymCustomerMembershipHistory,
  deleteGymCustomerMembershipHistory,
  SaveGymCustomerMembershipHistoryParams,
  FetchGymCustomerMembershipHistoriesPaginatedParams,
} from '@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipHistories';

/**
 * Hook to fetch membership histories for a gym or customer.
 */
export function useGymCustomerMembershipHistories(
  gymId?: string,
  customerId?: string
) {
  return useQuery({
    queryKey: ['gymCustomerMembershipHistories', gymId, customerId],
    queryFn: async () => {
      return await fetchGymCustomerMembershipHistories(gymId, customerId);
    },
    enabled: !!gymId || !!customerId,
  });
}

/**
 * Hook to fetch a single membership history record by ID.
 */
export function useGymCustomerMembershipHistoryById(id?: string) {
  return useQuery({
    queryKey: ['gymCustomerMembershipHistory', id],
    queryFn: async () => {
      if (!id) return null;
      return await fetchGymCustomerMembershipHistoryById(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch paginated membership histories with filters.
 */
export function useGymCustomerMembershipHistoriesPaginated(
  params: FetchGymCustomerMembershipHistoriesPaginatedParams
) {
  return useQuery({
    queryKey: [
      'gymCustomerMembershipHistoriesPaginated',
      params.gymId,
      params.customerId,
      params.page,
      params.limit,
      params.searchQuery,
      params.sortOrder,
      params.actionType,
      params.paymentStatus,
    ],
    queryFn: async () => {
      return await fetchGymCustomerMembershipHistoriesPaginated(params);
    },
    enabled: !!params.gymId || !!params.customerId,
  });
}

/**
 * Hook to create/log a gym customer membership history entry.
 */
export function useSaveGymCustomerMembershipHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveGymCustomerMembershipHistoryParams) => {
      return await saveGymCustomerMembershipHistory(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipHistories'] });
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipPlans'] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
    },
  });
}

/**
 * Alias for useSaveGymCustomerMembershipHistory for backwards compatibility.
 */
export const useLogGymCustomerMembershipHistory = useSaveGymCustomerMembershipHistory;

/**
 * Hook to update an existing gym customer membership history entry.
 */
export function useUpdateGymCustomerMembershipHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SaveGymCustomerMembershipHistoryParams>;
    }) => {
      return await updateGymCustomerMembershipHistory(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipHistories'] });
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipHistory', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipPlans'] });
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
    },
  });
}

/**
 * Hook to delete (soft delete) a membership history entry.
 */
export function useDeleteGymCustomerMembershipHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteGymCustomerMembershipHistory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipHistories'] });
      queryClient.invalidateQueries({ queryKey: ['gymCustomerMembershipPlans'] });
    },
  });
}
