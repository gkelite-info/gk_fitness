import { useQuery } from '@tanstack/react-query';
import { fetchGlobalTrainers } from '@/helpers/globalTrainer/globalTrainerHelper';

export function useGlobalTrainers() {
  return useQuery({
    queryKey: ['globalTrainers'],
    queryFn: async () => {
      const data = await fetchGlobalTrainers();
      return data;
    },
  });
}
