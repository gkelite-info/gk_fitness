import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGymPayments, fetchGymPaymentsPaginated, saveGymPayment, deleteGymPayment, SaveGymPaymentParams } from '@/helpers/gymPayments';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';

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

export function useGymPaymentsPaginated(userId: string | null, page: number = 1, limit: number = 10, filters?: { tab?: string; searchQuery?: string }) {
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

export function useSaveGymPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentData: SaveGymPaymentParams) => saveGymPayment(paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymPayments'] });
    },
  });
}

export function useDeleteGymPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gymPaymentId: string) => deleteGymPayment(gymPaymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymPayments'] });
    },
  });
}
