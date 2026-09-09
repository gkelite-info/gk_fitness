import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchCustomerGymPayments, 
  fetchCustomerGymPaymentById, 
  saveCustomerGymPayment, 
  deleteCustomerGymPayment,
  SaveCustomerGymPaymentParams,
  fetchCustomerGymPaymentsPaginated
} from '@/helpers/customerGymPayments/customerGymPayments';

export function useCustomerGymPayments(gymId?: string, customerId?: string) {
  return useQuery({
    queryKey: ['customerGymPayments', gymId, customerId],
    queryFn: async () => {
      const data = await fetchCustomerGymPayments(gymId, customerId);
      return data;
    },
    enabled: !!gymId || !!customerId,
  });
}

export function useCustomerGymPayment(id?: string) {
  return useQuery({
    queryKey: ['customerGymPayment', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await fetchCustomerGymPaymentById(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useSaveCustomerGymPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentData: SaveCustomerGymPaymentParams) => saveCustomerGymPayment(paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerGymPayments'] });
      queryClient.invalidateQueries({ queryKey: ['customerGymPayment'] });
    },
  });
}

export function useDeleteCustomerGymPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCustomerGymPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerGymPayments'] });
    },
  });
}

export function useCustomerGymPaymentsPaginated(gymId: string, page: number, limit: number, searchQuery?: string, sortOrder: 'newest' | 'oldest' = 'newest', customerId?: string) {
  return useQuery({
    queryKey: ['customerGymPaymentsPaginated', gymId, page, limit, searchQuery, sortOrder, customerId],
    queryFn: async () => {
      return await fetchCustomerGymPaymentsPaginated(gymId, page, limit, searchQuery, sortOrder, customerId);
    },
    enabled: !!gymId,
    placeholderData: (previousData) => previousData,
  });
}
