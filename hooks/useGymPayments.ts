import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchGymPayments, 
  fetchGymPaymentsPaginated, 
  fetchGymPaymentById,
  saveGymPayment, 
  deleteGymPayment, 
  uploadPaymentProof,
  deletePaymentProof,
  GymPaymentAttributes,
  SaveGymPaymentParams 
} from '@/helpers/gymPayments';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';

export { GymPaymentAttributes, SaveGymPaymentParams, uploadPaymentProof, deletePaymentProof };

export function useGymPayments(userId: string | null) {
  return useQuery({
    queryKey: ['gymPayments', userId],
    queryFn: async () => {
      if (!userId) return [];
      const gymId = await getOwnerGymId(userId);
      if (!gymId) return [];
      
      return await fetchGymPayments(gymId);
    },
    enabled: !!userId,
  });
}

export function useGymPaymentById(paymentId: string | null) {
  return useQuery({
    queryKey: ['gymPayment', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      return await fetchGymPaymentById(paymentId);
    },
    enabled: !!paymentId,
  });
}

export function useGymPaymentsPaginated(
  userId: string | null,
  page: number = 1,
  limit: number = 10,
  filters?: { tab?: string; searchQuery?: string; customerId?: string; dateRange?: string; customDate?: string }
) {
  return useQuery({
    queryKey: ['gymPaymentsPaginated', userId, page, limit, filters],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      const gymId = await getOwnerGymId(userId);
      if (!gymId) return { data: [], total: 0 };

      return await fetchGymPaymentsPaginated(gymId, page, limit, filters);
    },
    enabled: !!userId,
  });
}

export function useCustomerGymPaymentsPaginated(customerId: string | null, page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ['customerGymPaymentsPaginated', customerId, page, limit],
    queryFn: async () => {
      if (!customerId) return { data: [], total: 0 };
      return await fetchGymPaymentsPaginated(undefined, page, limit, { customerId });
    },
    enabled: !!customerId,
  });
}

export function useSaveGymPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentData: SaveGymPaymentParams) => saveGymPayment(paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymPayments'] });
      queryClient.invalidateQueries({ queryKey: ['gymPaymentsPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['customerGymPaymentsPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['gymPayment'] });
    },
  });
}

export function useDeleteGymPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gymPaymentId: string) => deleteGymPayment(gymPaymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymPayments'] });
      queryClient.invalidateQueries({ queryKey: ['gymPaymentsPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['customerGymPaymentsPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['gymPayment'] });
    },
  });
}

export function useUploadPaymentProof() {
  return useMutation({
    mutationFn: ({ uri, fileExtension }: { uri: string; fileExtension?: string }) =>
      uploadPaymentProof(uri, fileExtension),
  });
}

export function useDeletePaymentProof() {
  return useMutation({
    mutationFn: (fileNameOrUrl: string) => deletePaymentProof(fileNameOrUrl),
  });
}
