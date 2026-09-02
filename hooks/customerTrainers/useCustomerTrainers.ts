import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCustomerTrainersByGym, fetchAssignedTrainersByCustomer, fetchCustomerTrainerById, saveCustomerTrainer, deleteCustomerTrainer, toggleCustomerTrainerActiveStatus, SaveCustomerTrainerParams } from '@/helpers/customerTrainers/customerTrainersHelper';

export function useCustomerTrainersByGym(gymId?: string) {
  return useQuery({
    queryKey: ['customerTrainers', 'gym', gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const data = await fetchCustomerTrainersByGym(gymId);
      return data;
    },
    enabled: !!gymId,
  });
}

export function useAssignedTrainersByCustomer(customerId?: string) {
  return useQuery({
    queryKey: ['customerTrainers', 'customer', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const data = await fetchAssignedTrainersByCustomer(customerId);
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCustomerTrainerById(customerTrainerId?: string) {
  return useQuery({
    queryKey: ['customerTrainers', customerTrainerId],
    queryFn: async () => {
      if (!customerTrainerId) return null;
      const data = await fetchCustomerTrainerById(customerTrainerId);
      return data;
    },
    enabled: !!customerTrainerId,
  });
}

export function useSaveCustomerTrainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: SaveCustomerTrainerParams) => {
      return await saveCustomerTrainer(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerTrainers'] });
    },
  });
}

export function useDeleteCustomerTrainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (customerTrainerId: string) => {
      return await deleteCustomerTrainer(customerTrainerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerTrainers'] });
    },
  });
}

export function useToggleCustomerTrainerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerTrainerId, currentStatus }: { customerTrainerId: string; currentStatus: boolean }) => {
      return await toggleCustomerTrainerActiveStatus(customerTrainerId, currentStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerTrainers'] });
    },
  });
}
