import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGymExpenses,
  fetchGymExpensesPaginated,
  fetchGymExpenseById,
  saveGymExpense,
  deleteGymExpense,
  SaveGymExpenseParams,
  GymExpenseAttributes,
  FetchGymExpensesFilters,
} from '@/helpers/gymExpenses/gymExpensesHelper';

export function useGymExpenses(gymId?: string | null) {
  return useQuery<GymExpenseAttributes[]>({
    queryKey: ['gymExpenses', gymId],
    queryFn: async () => {
      if (!gymId) return [];
      return await fetchGymExpenses(gymId);
    },
    enabled: !!gymId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useGymExpensesPaginated(
  gymId?: string | null,
  page = 1,
  limit = 10,
  filters?: FetchGymExpensesFilters
) {
  return useQuery({
    queryKey: ['gymExpensesPaginated', gymId, page, limit, filters],
    queryFn: async () => {
      if (!gymId) return { data: [], total: 0 };
      const res = await fetchGymExpensesPaginated(gymId, page, limit, filters);
      if (!res.success) throw new Error(res.error || 'Failed to fetch expenses');
      return { data: res.data || [], total: res.total || 0 };
    },
    enabled: !!gymId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useGymExpense(gymExpenseId?: string | null) {
  return useQuery<GymExpenseAttributes | null>({
    queryKey: ['gymExpense', gymExpenseId],
    queryFn: async () => {
      if (!gymExpenseId) return null;
      return await fetchGymExpenseById(gymExpenseId);
    },
    enabled: !!gymExpenseId,
  });
}

export function useSaveGymExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveGymExpenseParams) => saveGymExpense(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gymExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['gymExpensesPaginated'] });
      if (variables.gymExpenseId) {
        queryClient.invalidateQueries({ queryKey: ['gymExpense', variables.gymExpenseId] });
      }
    },
  });
}

export function useDeleteGymExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gymExpenseId: string) => deleteGymExpense(gymExpenseId),
    onSuccess: (_, gymExpenseId) => {
      queryClient.invalidateQueries({ queryKey: ['gymExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['gymExpensesPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['gymExpense', gymExpenseId] });
    },
  });
}
