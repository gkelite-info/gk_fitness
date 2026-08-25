import { useQuery } from '@tanstack/react-query';
import { fetchGlobalTrainerById } from '@/helpers/globalTrainer/globalTrainerHelper';

export function useGlobalTrainer(globalTrainerId?: string | null) {
  return useQuery({
    queryKey: ['globalTrainer', globalTrainerId],
    queryFn: async () => {
      if (!globalTrainerId) return null;
      const data = await fetchGlobalTrainerById(globalTrainerId);
      return data;
    },
    enabled: !!globalTrainerId,
  });
}
