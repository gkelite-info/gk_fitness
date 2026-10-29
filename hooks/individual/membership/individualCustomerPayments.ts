import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualCustomerPayments,
  fetchIndividualCustomerPaymentById,
  saveIndividualCustomerPayment,
  deleteIndividualCustomerPayment,
  SaveIndividualCustomerPaymentParams,
} from '@/helpers/individual/membership/individualCustomerPayments';

export function useIndividualCustomerPayments(
  userId?: string | null,
  subscriptionPlanId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerPayments', userId, subscriptionPlanId],
    queryFn: async () => {
      return await fetchIndividualCustomerPayments(userId, subscriptionPlanId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : (!!userId || !!subscriptionPlanId),
    ...options,
  });
}

export function useIndividualCustomerPaymentById(id?: string | null) {
  return useQuery({
    queryKey: ['individualCustomerPayment', id],
    queryFn: async () => {
      if (!id) return null;
      return await fetchIndividualCustomerPaymentById(id);
    },
    enabled: !!id,
  });
}

export function useSaveIndividualCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveIndividualCustomerPaymentParams) => {
      return await saveIndividualCustomerPayment(params);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPayments'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualCustomerPlan'] });
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPayments', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans', variables.userId] });
      }
    },
  });
}

export function useDeleteIndividualCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteIndividualCustomerPayment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPayments'] });
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPlans'] });
    },
  });
}

