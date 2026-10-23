import { fetchIndividualCustomerPaymentById, fetchIndividualCustomerPayments, saveIndividualCustomerPayment, SaveIndividualCustomerPaymentParams } from '@/helpers/individual/membership/individualCustomerTrainerPayments';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
export function useIndividualCustomerPayments(
  userId?: string,
  globalTrainerId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerPayments', userId, globalTrainerId],
    queryFn: async () => {
      if (!userId) return [];
      return await fetchIndividualCustomerPayments(userId, globalTrainerId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!userId,
  });
}

export function useIndividualCustomerPaymentById(
  individualCustomerPaymentId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualCustomerPayment', individualCustomerPaymentId],
    queryFn: async () => {
      if (!individualCustomerPaymentId) return null;
      return await fetchIndividualCustomerPaymentById(individualCustomerPaymentId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!individualCustomerPaymentId,
  });
}

export function useSaveIndividualCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveIndividualCustomerPaymentParams) => {
      return await saveIndividualCustomerPayment(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['individualCustomerPayments'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['individualCustomerPayments', data.userId] });
      }
    },
    onError: (error) => {
      console.error('[useIndividualCustomerPayments] Save payment mutation error:', error);
    },
  });
}
