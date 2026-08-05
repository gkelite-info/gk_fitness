import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchGymInventories, fetchGymInventoryById } from '@/helpers/gymInventory/gymInventory';
import { fetchGymInventoryHistory } from '@/helpers/gymInventory/inventoryHistory';

export function useGymInventoryList(gymId: string | null | undefined) {
  return useQuery({
    queryKey: ['gymInventoryList', gymId],
    queryFn: async () => {
      if (!gymId) return [];
      
      const data = await fetchGymInventories(gymId);
      
      if (!data || data.length === 0) return [];

      const inventoryIds = data.map((item: any) => item.gymInventoryId);
      const { data: historyData, error: historyError } = await supabase
        .from('gym_inventory_histories')
        .select('*')
        .in('gymInventoryId', inventoryIds);

      if (!historyError && historyData) {
        return data.map((item: any) => {
          let itemMaint = 0;
          let itemOS = 0;
          
          const itemLogs = historyData.filter(log => log.gymInventoryId === item.gymInventoryId);
          itemLogs.forEach(log => {
            if (log.action === 'maintenance') {
              itemMaint += log.quantity;
            } else if (log.action === 'out_of_service') {
              itemOS += log.quantity;
            } else if (log.action === 'restore_maintenance') {
              itemMaint = Math.max(0, itemMaint - log.quantity);
            } else if (log.action === 'restore_out_of_service') {
              itemOS = Math.max(0, itemOS - log.quantity);
            }
          });
          
          return {
            ...item,
            underMaint: itemMaint,
            outOfService: itemOS,
            available: Math.max(0, (item.quantity || 0) - itemMaint - itemOS)
          };
        });
      }

      return data.map((item: any) => ({ ...item, underMaint: 0, outOfService: 0, available: item.quantity || 0 }));
    },
    enabled: !!gymId,
  });
}

export function useGymInventoryDetail(gymInventoryId: string | null | undefined) {
  return useQuery({
    queryKey: ['gymInventoryDetail', gymInventoryId],
    queryFn: async () => {
      if (!gymInventoryId) return null;
      
      const [data, history] = await Promise.all([
        fetchGymInventoryById(gymInventoryId),
        fetchGymInventoryHistory(gymInventoryId),
      ]);
      
      return { data, history };
    },
    enabled: !!gymInventoryId,
  });
}
