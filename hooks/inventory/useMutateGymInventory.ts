import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveGymInventory } from '@/helpers/gymInventory/gymInventory';
import { updateGymInventoryStock } from '@/helpers/gymInventory/inventoryHistory';

export function useSaveGymInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      return await saveGymInventory(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gymInventoryList', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['gymInventoryDetail', variables.gymInventoryId] });
    },
  });
}

export function useUpdateGymInventoryStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      return await updateGymInventoryStock(payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gymInventoryList'] });
      queryClient.invalidateQueries({ queryKey: ['gymInventoryDetail', variables.gymInventoryId] });
    },
  });
}
